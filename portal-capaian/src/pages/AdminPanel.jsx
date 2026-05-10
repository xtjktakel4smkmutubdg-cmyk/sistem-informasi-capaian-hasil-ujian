import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion } from 'framer-motion';
import {
  Users, FileSpreadsheet, UploadCloud, Settings,
  LogOut, Search, Filter, Save, Calendar, Eye, EyeOff, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('data-entry');
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const navigate = useNavigate();
  const initRef = useRef(false);

  // Data Entry State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [scores, setScores] = useState({ Matematika: 0, 'Bahasa Indonesia': 0, 'Bahasa Inggris': 0 });
  const [teacherNotes, setTeacherNotes] = useState('');

  // Publication State
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Management State
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInitialData = useCallback(async () => {
    try {
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      // Assuming simple admin check or separate route for now

      // Fetch users (students)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (!usersError && usersData) {
        setStudents(usersData);
      }

      // Fetch results
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*, users:user_id(nama, username, no_peserta)')
        .order('created_at', { ascending: false });

      if (!resultsError && resultsData) {
        setResults(resultsData);
        // Assuming global release date or just taking from the first result
        if (resultsData.length > 0) {
          if (resultsData[0].release_at) {
             const d = new Date(resultsData[0].release_at);
             // Format for datetime-local input: YYYY-MM-DDThh:mm
             const formattedDate = d.toISOString().slice(0, 16);
             setReleaseDate(formattedDate);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [navigate]);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      fetchInitialData();
    }
  }, [fetchInitialData]);



  const handleScoreChange = (subject, value) => {
    setScores(prev => ({ ...prev, [subject]: Number(value) }));
  };

  const calculateAverage = (scoresObj) => {
    const vals = Object.values(scoresObj);
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return (sum / vals.length).toFixed(2);
  };

  const handleSaveResult = async () => {
    if (!selectedStudent) return alert('Pilih siswa terlebih dahulu');

    try {
      const avg = calculateAverage(scores);

      const { error } = await supabase.from('results').upsert({
        user_id: selectedStudent,
        scores,
        average_score: parseFloat(avg),
        teacher_notes: teacherNotes,
        release_at: releaseDate ? new Date(releaseDate).toISOString() : null
      }, { onConflict: 'user_id' });

      if (error) throw error;
      alert('Data berhasil disimpan');
      fetchInitialData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data;
        // In a real app, map CSV rows to users by NIS, then insert into results.
        // Simplified here.
        console.log("CSV Data:", data);
        alert('Fitur Bulk Upload sedang disimulasikan. Data CSV terbaca.');
      }
    });
  };

  const handlePublishToggle = async () => {
    const newState = !isPublished;
    setIsPublished(newState);

    // In a real scenario, this might update a `settings` table or set release_at to null/past date for all records
    // Simplified: we'll update the release_at of all results to either a future date (if scheduled) or null/past if immediate
    try {
        if (newState) {
            // Publish now -> set release_at to now
            const nowStr = new Date().toISOString();
            await supabase.from('results').update({ release_at: nowStr }).neq('id', '00000000-0000-0000-0000-000000000000');
        } else {
             // Unpublish -> set release_at to far future or null (if null means hidden in your logic)
             // Using year 2099 as 'hidden'
             await supabase.from('results').update({ release_at: '2099-12-31T23:59:59Z' }).neq('id', '00000000-0000-0000-0000-000000000000');
        }
        alert(`Status publikasi diubah menjadi: ${newState ? 'Published' : 'Hidden'}`);
    } catch(e) {
        console.error(e);
    }
  };


  const filteredResults = results.filter(r =>
    r.users?.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.users?.username?.includes(searchQuery)
  );

  const statsData = [
    { name: '0-50', count: results.filter(r => r.average_score <= 50).length },
    { name: '51-75', count: results.filter(r => r.average_score > 50 && r.average_score <= 75).length },
    { name: '76-90', count: results.filter(r => r.average_score > 75 && r.average_score <= 90).length },
    { name: '91-100', count: results.filter(r => r.average_score > 90).length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-blue-500" />
            Admin Panel
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'data-entry', label: 'Data Entry', icon: FileSpreadsheet },
            { id: 'publication', label: 'Publication', icon: Calendar },
            { id: 'management', label: 'Student Management', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Activity },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => { supabase.auth.signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-6xl mx-auto space-y-8"
        >
          {/* Data Entry Tab */}
          {activeTab === 'data-entry' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Data Entry Module</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4">Input Nilai Manual</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Siswa</label>
                      <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Pilih Siswa --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nama} ({s.username || s.no_peserta})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">Nilai Mata Pelajaran</label>
                      {Object.keys(scores).map(subject => (
                        <div key={subject} className="flex items-center gap-4">
                          <span className="w-1/3 text-sm text-slate-600">{subject}</span>
                          <input
                            type="number"
                            min="0" max="100"
                            value={scores[subject]}
                            onChange={(e) => handleScoreChange(subject, e.target.value)}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Wali Kelas</label>
                      <div className="bg-white">
                        <ReactQuill theme="snow" value={teacherNotes} onChange={setTeacherNotes} className="h-40 mb-12" />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveResult}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      Simpan Data
                    </button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UploadCloud size={20} className="text-emerald-500" />
                    Bulk Upload (CSV)
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">Unggah file CSV dengan format: NIS, Matematika, Bahasa Indonesia, Bahasa Inggris, Catatan</p>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud size={40} className="mx-auto text-slate-400 mb-3" />
                    <span className="text-slate-600 font-medium">Klik atau seret file kesini</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Publication Tab */}
          {activeTab === 'publication' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Publication & Scheduling</h2>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Status Publikasi Global</h3>
                    <p className="text-sm text-slate-500">Tentukan apakah hasil ujian dapat dilihat siswa.</p>
                  </div>
                  <button
                    onClick={handlePublishToggle}
                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
                      isPublished ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isPublished ? <><Eye size={20}/> Published</> : <><EyeOff size={20}/> Hidden</>}
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Jadwalkan Rilis</h3>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal & Waktu Rilis</label>
                      <input
                        type="datetime-local"
                        value={releaseDate}
                        onChange={(e) => setReleaseDate(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                       onClick={() => alert(`Jadwal diatur ke: ${releaseDate}. (Implementasi simpan ke DB diperlukan)`)}
                       className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                    >
                      Set Jadwal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Management Tab */}
          {activeTab === 'management' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Student & Grade Management</h2>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama atau NIS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button className="px-4 py-2.5 border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-50">
                    <Filter size={18} />
                    Filter
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="py-3 px-4 font-medium">Siswa</th>
                        <th className="py-3 px-4 font-medium">NIS</th>
                        <th className="py-3 px-4 font-medium">Rata-rata</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result) => (
                        <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{result.users?.nama}</td>
                          <td className="py-3 px-4 text-slate-600">{result.users?.username || result.users?.no_peserta}</td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">{result.average_score}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                              result.average_score >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.average_score >= 75 ? 'Lulus' : 'Remedial'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h2>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                  <h4 className="text-blue-600 text-sm font-semibold mb-2">Total Data Masuk</h4>
                  <p className="text-3xl font-bold text-blue-900">{results.length}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <h4 className="text-emerald-600 text-sm font-semibold mb-2">Rata-rata Kelas</h4>
                  <p className="text-3xl font-bold text-emerald-900">
                    {results.length > 0
                      ? (results.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / results.length).toFixed(2)
                      : 0}
                  </p>
                </div>
                <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                  <h4 className="text-purple-600 text-sm font-semibold mb-2">Siswa Lulus (&gt; 75)</h4>
                  <p className="text-3xl font-bold text-purple-900">
                    {results.filter(r => r.average_score > 75).length}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold mb-6">Distribusi Nilai Rata-rata</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
