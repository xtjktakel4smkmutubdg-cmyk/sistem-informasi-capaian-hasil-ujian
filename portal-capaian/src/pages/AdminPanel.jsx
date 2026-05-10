import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { motion } from 'framer-motion';
import {
  Users, FileSpreadsheet, Settings,
  LogOut, Search, Save, Calendar, Eye, EyeOff, Activity, Trash2, Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('data-entry');
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const navigate = useNavigate();
  const initRef = useRef(false);

  // Data Entry State
  const [selectedStudent, setSelectedStudent] = useState('');
  const [scores, setScores] = useState({});
  const [teacherNotes, setTeacherNotes] = useState('');

  // Publication State
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [newStudent, setNewStudent] = useState({ nama: '', username: '', password: '' });
  const [csvText, setCsvText] = useState('');

  // Settings State
  const [newSubject, setNewSubject] = useState('');

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'admin') {
        navigate('/login');
        return;
      }

      // Fetch dynamic subjects
      const { data: subjs } = await supabase.from('mata_pelajaran').select('*').order('created_at');
      if (subjs) {
        setSubjects(subjs);
        const initScores = {};
        subjs.forEach(s => initScores[s.nama] = 0);
        setScores(initScores);
      }

      // Fetch users (students from usercapaian)
      const { data: usersData } = await supabase.from('usercapaian').select('*');
      if (usersData) setStudents(usersData);

      // Fetch results
      const { data: resultsData } = await supabase
        .from('student_results')
        .select('*, usercapaian!inner(nama, username)')
        .order('created_at', { ascending: false });

      if (resultsData) {
        setResults(resultsData);
        if (resultsData.length > 0) {
          if (resultsData[0].release_at) {
             const d = new Date(resultsData[0].release_at);
             const formattedDate = d.toISOString().slice(0, 16);
             setReleaseDate(formattedDate);
             setIsPublished(d <= new Date());
          } else {
             setReleaseDate('');
             setIsPublished(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [navigate]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      fetchInitialData();
    }
  }, [fetchInitialData]);

  // Effect to populate scores when student changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedStudent && results.length > 0) {
       const existingResult = results.find(r => r.user_id === selectedStudent);
       if (existingResult) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setScores(existingResult.scores || {});
          setTeacherNotes(existingResult.teacher_notes || '');
       } else {
          const initScores = {};
          subjects.forEach(s => initScores[s.nama] = 0);
          setScores(initScores);
          setTeacherNotes('');
       }
    }
  }, [selectedStudent, results, subjects]);


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
      const { error } = await supabase.from('student_results').upsert({
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

  const handlePublishToggle = async () => {
    const newState = !isPublished;
    try {
      if (newState) {
        const nowStr = new Date().toISOString();
        const { error } = await supabase.from('student_results').update({ release_at: nowStr }).neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        setIsPublished(true);
        setReleaseDate(nowStr.slice(0, 16));
        alert('Status publikasi diubah menjadi: Published (Sekarang)');
      } else {
        const { error } = await supabase.from('student_results').update({ release_at: null }).neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        setIsPublished(false);
        setReleaseDate('');
        alert('Status publikasi diubah menjadi: Hidden');
      }
      fetchInitialData();
    } catch(e) {
      alert('Error updating publication status: ' + e.message);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!releaseDate) return alert('Silahkan pilih tanggal dan waktu rilis.');
    try {
      const scheduleDate = new Date(releaseDate).toISOString();
      const { error } = await supabase.from('student_results').update({ release_at: scheduleDate }).neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      const isNowPublished = new Date(releaseDate) <= new Date();
      setIsPublished(isNowPublished);
      alert('Jadwal rilis berhasil disimpan: ' + releaseDate);
      fetchInitialData();
    } catch (e) {
      alert('Error saving schedule: ' + e.message);
    }
  };

  // Student CRUD
  const handleAddStudent = async () => {
    if(!newStudent.nama || !newStudent.username || !newStudent.password) return alert('Lengkapi data siswa');
    try {
      const { error } = await supabase.from('usercapaian').insert([newStudent]);
      if(error) throw error;
      setNewStudent({ nama: '', username: '', password: '' });
      fetchInitialData();
      alert('Siswa berhasil ditambahkan');
    } catch(e) { alert('Gagal menambah siswa: ' + e.message); }
  };

  const handleDeleteStudent = async (id) => {
    if(!confirm('Yakin hapus siswa ini?')) return;
    try {
      await supabase.from('student_results').delete().eq('user_id', id);
      const { error } = await supabase.from('usercapaian').delete().eq('id', id);
      if(error) throw error;
      fetchInitialData();
    } catch(e) { alert('Gagal menghapus: ' + e.message); }
  };


    const handleBulkImportSubmit = () => {
    if (!csvText.trim()) return alert('Data CSV kosong.');

    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const validData = rows.map(row => {
          const nama = row[0]?.trim();
          const username = row[1]?.trim();
          if (!nama || !username) return null;
          return {
            nama,
            username,
            password: row[2]?.trim() || 'password123',
            kelas: row[3]?.trim() || null,
            no_peserta: row[4]?.trim() || null,
          };
        }).filter(Boolean);

        if (validData.length === 0) {
          return alert('Format tidak valid. Pastikan setidaknya Nama dan Username ada.');
        }

        try {
          const { error } = await supabase.from('usercapaian').insert(validData);
          if (error) throw error;

          alert(`${validData.length} siswa berhasil ditambahkan!`);
          setCsvText('');
          fetchInitialData();
        } catch (err) {
          alert('Error saat import: ' + err.message);
        }
      }
    });
  };

  // Subject CRUD
  const handleAddSubject = async () => {
    if(!newSubject) return;
    try {
      const { error } = await supabase.from('mata_pelajaran').insert([{ nama: newSubject }]);
      if(error) throw error;
      setNewSubject('');
      fetchInitialData();
    } catch(e) { alert('Gagal menambah mapel: ' + e.message); }
  };

  const handleDeleteSubject = async (id) => {
    if(!confirm('Yakin hapus mata pelajaran ini?')) return;
    try {
      const { error } = await supabase.from('mata_pelajaran').delete().eq('id', id);
      if(error) throw error;
      fetchInitialData();
    } catch(e) { alert('Gagal menghapus: ' + e.message); }
  };

  const filteredStudents = students.filter(s =>
    s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username?.includes(searchQuery)
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
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
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
            { id: 'settings', label: 'Settings', icon: Settings },
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
            onClick={() => { supabase.auth.signOut(); navigate('/admin'); }}
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
                        <option value="">Pilih siswa...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.nama} ({s.username})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      {subjects.map((subj) => (
                        <div key={subj.id}>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{subj.nama}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scores[subj.nama] || ''}
                            onChange={(e) => handleScoreChange(subj.nama, e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
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
                       onClick={handleScheduleSubmit}
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
              <h2 className="text-2xl font-bold text-slate-800">Student Management (usercapaian)</h2>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">

                <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                   <h3 className="font-semibold mb-4 text-slate-800">Tambah Siswa Baru</h3>
                   <div className="flex flex-col sm:flex-row gap-4">
                     <input type="text" placeholder="Nama" value={newStudent.nama} onChange={e=>setNewStudent({...newStudent, nama: e.target.value})} className="flex-1 p-2 rounded border" />
                     <input type="text" placeholder="Username" value={newStudent.username} onChange={e=>setNewStudent({...newStudent, username: e.target.value})} className="flex-1 p-2 rounded border" />
                     <input type="password" placeholder="Password" value={newStudent.password} onChange={e=>setNewStudent({...newStudent, password: e.target.value})} className="flex-1 p-2 rounded border" />
                     <button onClick={handleAddStudent} className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2"><Plus size={16}/> Tambah</button>
                   </div>
                </div>


                <div className="mb-8 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet size={18} className="text-slate-600" />
                      Bulk Import Siswa
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-2">Format yang didukung (Setiap baris adalah satu pengguna):</p>
                      <p className="text-sm text-blue-800 font-mono mb-2">Nama Lengkap, Username, Password, Kelas, No.Peserta</p>
                      <p className="text-xs text-blue-700 opacity-80">* Kolom Password, Kelas, dan No.Peserta opsional. Default password: password123</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Data CSV (Paste di sini)</label>
                      <textarea
                        className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Ahmad Fauzi, ahmad.fauzi, pass123, XII-IPA-1, 001&#10;Budi Santoso, budi.santoso, pass123, XII-IPA-1, 002"
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setCsvText('')}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        Tutup
                      </button>
                      <button
                        onClick={handleBulkImportSubmit}
                        className="px-4 py-2 bg-blue-400/90 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        Mulai Import
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama atau username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-sm text-slate-500">
                        <th className="py-3 px-4 font-medium">Siswa</th>
                        <th className="py-3 px-4 font-medium">Username</th>
                        <th className="py-3 px-4 font-medium">Rata-rata</th>
                        <th className="py-3 px-4 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const studentResult = results.find(r => r.user_id === student.id);
                        return (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{student.nama}</td>
                          <td className="py-3 px-4 text-slate-600">{student.username}</td>
                          <td className="py-3 px-4 text-slate-800 font-semibold">{studentResult ? studentResult.average_score : '-'}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => handleDeleteStudent(student.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ) })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Dynamic Subjects Settings</h2>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 max-w-2xl">
                 <h3 className="text-lg font-semibold mb-4">Kelola Mata Pelajaran</h3>
                 <div className="flex gap-4 mb-6">
                    <input type="text" placeholder="Nama Mata Pelajaran" value={newSubject} onChange={e=>setNewSubject(e.target.value)} className="flex-1 p-2 border rounded-xl" />
                    <button onClick={handleAddSubject} className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2">Tambah</button>
                 </div>
                 <ul className="space-y-2">
                   {subjects.map(subj => (
                     <li key={subj.id} className="flex items-center justify-between p-3 bg-slate-50 border rounded-xl">
                       <span>{subj.nama}</span>
                       <button onClick={() => handleDeleteSubject(subj.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg"><Trash2 size={16}/></button>
                     </li>
                   ))}
                 </ul>
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
