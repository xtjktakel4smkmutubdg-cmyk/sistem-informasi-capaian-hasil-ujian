import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Printer, User, LogOut, Award, BookOpen, AlertCircle } from 'lucide-react';
import { differenceInSeconds } from 'date-fns';

export default function Dashboard() {
  const [results, setResults] = useState([]);
    const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isRevealed, setIsRevealed] = useState(false);
  const [releaseDate, setReleaseDate] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const initRef = useRef(false);

  const fetchResults = useCallback(async (sessionUser) => {
    try {
      if (!sessionUser) return;

      const { data: subjs, error: subjsError } = await supabase.from('mata_pelajaran').select('nama');
      if (!subjsError && subjs) {
        // setSubjects is not needed here if mapped from scores

      }

      const { data, error } = await supabase
        .from('student_results')
        .select('*')
        .eq('user_id', sessionUser.id);

      if (error) throw error;

      setResults(data || []);

      if (data && data.length > 0 && data[0].release_at) {
        setReleaseDate(new Date(data[0].release_at));
      } else {
        setIsRevealed(true);
      }

    } catch (err) {
      console.error('Fetch results error:', err);
      setError('Gagal memuat data capaian.');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const sessionStr = localStorage.getItem('student_session');
      if (!sessionStr) {
        navigate('/login');
        return;
      }

      const sessionData = JSON.parse(sessionStr);
      setStudent(sessionData);

      fetchResults(sessionData);
    } catch (err) {
      console.error('Auth error:', err);
      navigate('/login');
    }
  }, [navigate, fetchResults]);

  useEffect(() => {
    if (!initRef.current) {
        initRef.current = true;
        checkUser();
    }
  }, [checkUser]);


  useEffect(() => {
    if (!releaseDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diffInSeconds = differenceInSeconds(releaseDate, now);

      if (diffInSeconds <= 0) {
        setIsRevealed(true);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diffInSeconds / (3600 * 24));
      const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = diffInSeconds % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [releaseDate]);

  const handleLogout = async () => {
    localStorage.removeItem('student_session');
    navigate('/login');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar (Hidden on print) */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Award size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">Portal Capaian</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrint}
                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                title="Cetak Laporan"
              >
                <Printer size={20} />
                <span className="hidden sm:inline text-sm font-medium">Cetak</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline text-sm font-medium">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
           <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-2 print:hidden">
             <AlertCircle size={20} />
             {error}
           </div>
        )}

        {!isRevealed ? (
          // Countdown UI (Hidden on print)
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center print:hidden"
          >
            <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-2xl w-full">
              <Clock size={48} className="mx-auto text-blue-500 mb-6" />
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Hasil Ujian Belum Dirilis</h2>
              <p className="text-slate-500 mb-8">Data capaian akan dapat diakses dalam waktu:</p>

              <div className="flex justify-center gap-4 sm:gap-6">
                {[
                  { label: 'Hari', value: countdown.days },
                  { label: 'Jam', value: countdown.hours },
                  { label: 'Menit', value: countdown.minutes },
                  { label: 'Detik', value: countdown.seconds },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg">
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <span className="text-slate-500 text-sm mt-3 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          // Results UI (Visible and Print ready)
          <div className="space-y-8">
            <header className="text-center print:text-left print:mb-8">
              <h2 className="text-3xl font-bold text-slate-800">Laporan Capaian Siswa</h2>
              <p className="text-slate-500 mt-2">Tahun Ajaran 2023/2024</p>
            </header>

            <div className="grid gap-6">
              {results.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                   <BookOpen size={40} className="mx-auto text-slate-300 mb-4" />
                   <p className="text-slate-500">Belum ada data hasil capaian yang tersedia.</p>
                 </div>
              ) : (
                results.map((result, idx) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 print:shadow-none print:border print:border-slate-300 print:break-inside-avoid print:bg-white"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <User size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">
                            {student?.nama || 'Nama Tidak Diketahui'}
                          </h3>
                          <p className="text-slate-500 text-sm">NIS: {student?.username || '-'}</p>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-0 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold border border-emerald-100">
                        Rata-rata: {result.average_score || 0}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <Award size={16} className="text-blue-500" />
                          Nilai Mata Pelajaran
                        </h4>
                        <div className="space-y-3">
                          {Object.entries(result.scores || {}).map(([subject, score]) => (
                            <div key={subject} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                              <span className="text-slate-600 font-medium">{subject}</span>
                              <span className="font-bold text-slate-800">{score}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                          <BookOpen size={16} className="text-blue-500" />
                          Catatan Wali Kelas
                        </h4>
                        <div className="bg-slate-50 rounded-xl p-4 text-slate-600 text-sm leading-relaxed min-h-[100px] border border-slate-100 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: result.teacher_notes || 'Tidak ada catatan.' }} />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
