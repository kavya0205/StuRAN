import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  Trash2, 
  UploadCloud,
  ExternalLink,
  Search,
  CheckCircle
} from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';

const Exams = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchQuery = new URLSearchParams(search).get('query')?.toLowerCase() || '';
  const [exams, setExams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [viewingSyllabus, setViewingSyllabus] = useState(null);
  
  // Form State
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load exams from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'users', user.uid, 'exams');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually by createdAt desc
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setExams(data);
    });
    return unsub;
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSyllabusFile(file);
  };

  const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const saveExam = async () => {
    if (!subject.trim() || !examDate || !examTime) {
      alert("Please fill subject, date and time.");
      return;
    }

    setIsUploading(true);

    try {
      let syllabusData = null;

      if (syllabusFile) {
        const storageRef = ref(storage, `users/${user.uid}/exams/${Date.now()}_${syllabusFile.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, syllabusFile);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        syllabusData = {
          name: syllabusFile.name || 'Untitled',
          data: downloadURL,
          type: syllabusFile.type || 'application/pdf'
        };
      }

      const examData = {
        subject: subject.trim(),
        date: examDate,
        day: getDayName(examDate),
        time: examTime,
        syllabus: syllabusData,
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, 'users', user.uid, 'exams'), examData);
      
      // Reset form
      setSubject('');
      setExamDate('');
      setExamTime('');
      setSyllabusFile(null);
      setIsUploading(false);
      setIsModalOpen(false);

    } catch (err) {
      setIsUploading(false);
      console.error("Exams Error:", err);
      alert("Failed to save exam details: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDoc(doc(db, 'users', user.uid, 'exams', deleteId));
      setDeleteId(null);
    }
  };

  const getInitialColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < (name?.length || 0); i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Exam Schedule</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your exam dates and syllabus materials</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Exam Details
        </button>
      </div>

      {searchQuery && (
        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 px-4 py-3 rounded-xl border border-orange-200 dark:border-orange-800/50 flex items-center justify-between shadow-sm">
           <span className="text-sm font-medium flex items-center gap-2">
             <Search className="w-4 h-4" />
             Showing results for <span className="font-bold">"{searchQuery}"</span>
           </span>
           <button onClick={() => navigate('/exams', { replace: true })} className="p-1 hover:bg-orange-100 dark:hover:bg-orange-800/50 rounded-lg transition-colors">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* Content */}
      {(() => {
        const displayedExams = searchQuery ? exams.filter(e => e.subject.toLowerCase().includes(searchQuery)) : exams;
        
        if (displayedExams.length === 0) {
          return (
            <div className="bg-white dark:bg-darkCard rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{searchQuery ? `No matches found for "${searchQuery}"` : 'No Exams Scheduled'}</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                {searchQuery ? 'Try redefining your search term.' : 'Keep track of your upcoming exams and syllabuses in one place.'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-md transition-all"
                >
                  Enter your exam details
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedExams.map((exam) => (
              <div key={exam.id} className="bg-white dark:bg-darkCard rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${getInitialColor(exam.subject)} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                      {exam.subject.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg">{exam.subject}</h3>
                      <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider">{exam.day}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDeleteId(exam.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{new Date(exam.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{exam.time}</span>
                  </div>
                </div>

                {(() => {
                   if (!exam.date || !exam.time) return null;
                   const examDateTime = new Date(`${exam.date}T${exam.time}`);
                   if (examDateTime < new Date()) {
                     return (
                       <div className="mb-6 flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-3 px-4 rounded-xl font-bold shadow-sm">
                         <CheckCircle className="w-5 h-5 mr-2" />
                         Exam is Done
                       </div>
                     );
                   }
                   return null;
                })()}

                {exam.syllabus && (
                  <button 
                    onClick={() => setViewingSyllabus(exam.syllabus)}
                    className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-slate-800/50 hover:bg-blue-100 dark:hover:bg-slate-800 rounded-2xl transition-colors group/btn"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div className="text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Exam Syllabus</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{exam.syllabus.name}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        );
      })()}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-3xl">
              <h2 className="text-xl font-bold dark:text-white">Enter your exam details</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-1">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-1">Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-1">Exam Time</label>
                  <input
                    type="time"
                    value={examTime}
                    onChange={(e) => setExamTime(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-1">Upload Syllabus File (Optional)</label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="syllabus-upload"
                  />
                  <label
                    htmlFor="syllabus-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl cursor-pointer group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-all bg-gray-50/50 dark:bg-slate-800/30 overflow-hidden"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2 text-blue-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        <span className="text-xs font-bold">Uploading...</span>
                      </div>
                    ) : syllabusFile ? (
                      <div className="flex items-center gap-3 p-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[200px]">{syllabusFile.name}</p>
                          <p className="text-xs text-gray-500">Click to change file</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">PDF, Image or Document</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30">
              <button
                onClick={saveExam}
                disabled={isUploading}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                Save Exam Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-md shadow-2xl p-8 text-center animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Delete Exam?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
              Are you sure you want to remove this exam record? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-3 px-6 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="py-3 px-6 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus Viewer Modal */}
      {viewingSyllabus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-5xl h-full max-h-[95vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700/50 grow-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Exam Syllabus</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{viewingSyllabus.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingSyllabus(null)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-slate-900 overflow-hidden relative">
              <iframe 
                src={viewingSyllabus.data} 
                className="w-full h-full border-none"
                title="Syllabus Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
