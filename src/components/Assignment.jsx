import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Edit, Trash2, CheckCircle, Clock, Search } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Assignment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchQuery = new URLSearchParams(search).get('query')?.toLowerCase() || '';
  const [assignments, setAssignments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load assignments from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'users', user.uid, 'assignments');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort manually by createdAt desc
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAssignments(data);
    });
    return unsub;
  }, [user]);
  
  const [editingId, setEditingId] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [allotedDate, setAllotedDate] = useState('');
  const [lastSubmissionDate, setLastSubmissionDate] = useState('');
  const [dateError, setDateError] = useState('');

  const normalizeDate = (dateString) => {
    if (!dateString) return new Date(0).setHours(0,0,0,0);
    const [year, month, day] = dateString.split('-');
    return new Date(year, month - 1, day).setHours(0,0,0,0);
  };

  const getTodayStr = () => {
    return new Date().toLocaleDateString('en-CA');
  }

  const getCardStyle = (assignment) => {
    const todayVal = normalizeDate(getTodayStr());
    const lastSubVal = normalizeDate(assignment.lastSubmissionDate);

    if (!assignment.completed) {
      if (lastSubVal < todayVal) {
        return 'bg-red-100 border-red-200 dark:bg-red-900/30 dark:border-red-800 text-gray-900 dark:text-white';
      } else if (lastSubVal === todayVal) {
        return 'bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 text-gray-900 dark:text-white';
      } else {
        return 'bg-green-100 border-green-200 dark:bg-green-900/30 dark:border-green-800 text-gray-900 dark:text-white';
      }
    } else {
      const compVal = normalizeDate(assignment.completionDate);
      if (compVal <= lastSubVal) {
        return 'bg-gradient-to-br from-white to-green-100 dark:from-darkCard dark:to-green-900/40 border-green-300 dark:border-green-700 text-gray-900 dark:text-white';
      } else {
        return 'bg-gradient-to-br from-white to-red-100 dark:from-darkCard dark:to-red-900/40 border-red-300 dark:border-red-700 text-gray-900 dark:text-white';
      }
    }
  };

  const toggleComplete = async (id) => {
    const a = assignments.find(x => x.id === id);
    if (!a) return;
    const ref = doc(db, 'users', user.uid, 'assignments', id);
    if (!a.completed) {
      await updateDoc(ref, { completed: true, completionDate: getTodayStr() });
    } else {
      await updateDoc(ref, { completed: false, completionDate: null });
    }
  };

  const openModal = (assign = null) => {
    if (assign) {
      setEditingId(assign.id);
      setSubject(assign.subject);
      setDescription(assign.description);
      setAllotedDate(assign.allotedDate);
      setLastSubmissionDate(assign.lastSubmissionDate);
    } else {
      setEditingId(null);
      setSubject('');
      setDescription('');
      setAllotedDate(getTodayStr());
      setLastSubmissionDate('');
    }
    setDateError('');
    setIsModalOpen(true);
  };

  const saveAssignment = async () => {
    if (!subject.trim() || !lastSubmissionDate) return;

    if (allotedDate && lastSubmissionDate < allotedDate) {
      setDateError('⚠️ Deadline cannot be before the Allotted Date. Please correct the dates.');
      return;
    }

    setDateError('');
    try {
      const colRef = collection(db, 'users', user.uid, 'assignments');

      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'assignments', editingId), {
          subject, description, allotedDate, lastSubmissionDate
        });
      } else {
        await addDoc(colRef, {
          subject,
          description,
          allotedDate,
          lastSubmissionDate,
          completed: false,
          completionDate: null,
          createdAt: Date.now()
        });
      }
      
      // Cleanup and close
      setSubject('');
      setDescription('');
      setAllotedDate('');
      setLastSubmissionDate('');
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Assignment Error:", err);
      alert("Failed to save assignment: " + err.message);
    }
  };

  const getInitialColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 
      'bg-orange-500', 'bg-emerald-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const deleteAssignment = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'assignments', id));
  };

  const clearAllAssignments = async () => {
    if (window.confirm("Are you sure you want to delete ALL assignments? This cannot be undone.")) {
      const promises = assignments.map(a => deleteDoc(doc(db, 'users', user.uid, 'assignments', a.id)));
      await Promise.all(promises);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Assignments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track and manage your required coursework</p>
        </div>
        <div className="flex items-center gap-3">
          {assignments.length > 0 && (
            <button 
              onClick={clearAllAssignments}
              className="flex items-center bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 font-bold py-2.5 px-4 rounded-xl transition-all border border-red-100 dark:border-red-800"
            >
              <Trash2 className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
          <button 
            onClick={() => openModal()}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-xl shadow-sm shadow-blue-500/20 transition-all font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Assignment
          </button>
        </div>
      </div>

      {searchQuery && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800/50 flex items-center justify-between shadow-sm">
           <span className="text-sm font-medium flex items-center gap-2">
             <Search className="w-4 h-4" />
             Showing results for <span className="font-bold">"{searchQuery}"</span>
           </span>
           <button onClick={() => navigate('/assignment', { replace: true })} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-colors">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {(() => {
        const displayedAssignments = searchQuery ? assignments.filter(a => a.subject.toLowerCase().includes(searchQuery)) : assignments;
        
        if (displayedAssignments.length === 0) {
          return (
            <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{searchQuery ? `No matches found for "${searchQuery}"` : 'No Assignments yet'}</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                {searchQuery ? 'Try redefining your search term.' : 'Click the button above to add a new assignment and track its status!'}
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedAssignments.map(assign => (
               <div key={assign.id} className={`group relative p-4 sm:p-5 rounded-[2.5rem] border-2 ${getCardStyle(assign)} shadow-sm transition-all duration-300 ease-out flex flex-row items-center gap-4 sm:gap-6`}>
                
                {/* Left Section: Subject Avatar */}
                <div className={`shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] ${getInitialColor(assign.subject)} flex items-center justify-center text-6xl sm:text-7xl font-light text-white shadow-inner shadow-black/10`}>
                  {assign.subject.charAt(0).toUpperCase()}
                </div>

                {/* Right Section: Content */}
                <div className="flex-1 min-w-0 flex flex-col h-full py-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl sm:text-2xl font-medium text-inherit truncate pr-2">{assign.subject}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => openModal(assign)} className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-inherit opacity-40 hover:opacity-100">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteAssignment(assign.id)} className="p-1.5 hover:bg-red-500/10 rounded-full transition-colors text-red-500 opacity-40 hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium opacity-60 line-clamp-2 mt-1 mb-2 leading-snug">
                    {assign.description || 'No description provided...'}
                  </p>

                  <div className="mt-auto flex items-end justify-between">
                    <div className="flex flex-col">
                      <div className="text-[10px] uppercase tracking-wider font-bold opacity-40">Timeline</div>
                      <div className="text-xs sm:text-sm font-semibold">Allotted: {assign.allotedDate}</div>
                      {assign.completed && assign.completionDate && (
                        <div className={`text-xs sm:text-sm font-semibold mt-0.5 ${normalizeDate(assign.completionDate) <= normalizeDate(assign.lastSubmissionDate) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          Submitted: {assign.completionDate}
                        </div>
                      )}
                      <div className="text-xs sm:text-sm font-semibold text-red-500 mt-0.5">Deadline: {assign.lastSubmissionDate}</div>
                    </div>

                    {/* Compact Toggle Button */}
                    <button 
                      onClick={() => toggleComplete(assign.id)}
                      className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-black transition-all shadow-md active:scale-95 ${
                        assign.completed 
                          ? 'bg-green-500 text-white shadow-green-500/30'
                          : 'bg-black dark:bg-slate-700 text-white shadow-black/20'
                      }`}
                    >
                      {assign.completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      )}
                      {assign.completed ? 'Done' : 'Pending'}
                    </button>
                  </div>
                </div>
               </div>
            ))}
          </div>
        );
      })()}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 rounded-t-3xl">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Assignment' : 'Add New Assignment'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Advanced Calculus"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details..."
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors resize-y"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allotted Date</label>
                    <input
                      type="date"
                      value={allotedDate}
                      onChange={(e) => { setAllotedDate(e.target.value); setDateError(''); }}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline Date *</label>
                    <input
                      type="date"
                      value={lastSubmissionDate}
                      onChange={(e) => { setLastSubmissionDate(e.target.value); setDateError(''); }}
                      className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 transition-colors [color-scheme:light] dark:[color-scheme:dark] ${dateError ? 'border-red-400 focus:ring-red-400/20 focus:border-red-400' : 'border-gray-200 dark:border-slate-700 focus:ring-secondary/20 focus:border-secondary'}`}
                    />
                 </div>
              </div>

              {dateError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
                  <span className="text-red-500 text-sm font-semibold leading-snug">{dateError}</span>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
               <button 
                  onClick={saveAssignment} 
                  className="px-6 py-2.5 text-sm font-medium bg-secondary text-white rounded-xl hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all font-bold"
               >
                  {editingId ? 'Save Changes' : 'Create Assignment'}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Assignment;
