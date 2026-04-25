import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Edit, Trash2, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Timetable = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchQuery = new URLSearchParams(search).get('query')?.toLowerCase() || '';
  const [timetables, setTimetables] = useState([]);

  // Load timetables from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'data', 'timetables');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setTimetables(snap.data().list || []);
      else setTimetables([]);
    });
    return unsub;
  }, [user]);

  // Handle saving to Firestore
  const updateTimetables = async (newList) => {
    setTimetables(newList);
    if (!user) return;
    console.log("Timetable: Syncing to Firestore for", user.uid);
    try {
      await setDoc(doc(db, 'users', user.uid, 'data', 'timetables'), { list: newList });
      console.log("Timetable: Sync complete.");
    } catch (err) {
      console.error("Timetable Error:", err);
    }
  };

  // Modals state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newTimetableName, setNewTimetableName] = useState('');
  
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [activeTimetableId, setActiveTimetableId] = useState(null);
  const [editingTimeSlotId, setEditingTimeSlotId] = useState(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { timetableId, timeId, day }
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const defaultTimeSlots = [
    { id: 't1', start: '09:00', end: '10:00' },
    { id: 't2', start: '10:00', end: '11:00' },
    { id: 't3', start: '11:00', end: '12:00' },
  ];

  const colorPalettes = [
    { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-400 dark:border-orange-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400 dark:border-green-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-400 dark:border-red-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400 dark:border-purple-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
  ];

  const handleCreateTimetable = () => {
    if (newTimetableName.trim() !== '') {
      const newTb = {
        id: `tb_${Date.now()}`,
        name: newTimetableName.trim(),
        isCollapsed: false,
        timeSlots: [...defaultTimeSlots],
        gridData: {}
      };
      updateTimetables([...timetables, newTb]);
      setIsNameModalOpen(false);
      setNewTimetableName('');
    }
  };

  const handleDeleteTimetable = (timetableId) => {
    updateTimetables(timetables.filter(tb => tb.id !== timetableId));
  };

  const toggleCollapse = (timetableId) => {
    updateTimetables(timetables.map(tb => {
      if (tb.id === timetableId) {
        return { ...tb, isCollapsed: !tb.isCollapsed };
      }
      return tb;
    }));
  };

  const openTimeSlotModal = (timetableId) => {
    setActiveTimetableId(timetableId);
    setEditingTimeSlotId(null);
    setNewStartTime('');
    setNewEndTime('');
    setIsTimeSlotModalOpen(true);
  };

  const openEditTimeSlotModal = (timetableId, slot) => {
    setActiveTimetableId(timetableId);
    setEditingTimeSlotId(slot.id);
    setNewStartTime(slot.start);
    setNewEndTime(slot.end);
    setIsTimeSlotModalOpen(true);
  };

  const handleAddTimeSlot = () => {
    if (newStartTime && newEndTime && activeTimetableId) {
      updateTimetables(timetables.map(tb => {
        if (tb.id === activeTimetableId) {
          let updatedSlots;
          if (editingTimeSlotId) {
            updatedSlots = tb.timeSlots.map(s => s.id === editingTimeSlotId ? { ...s, start: newStartTime, end: newEndTime } : s);
          } else {
            const newSlot = {
              id: `t_${Date.now()}`,
              start: newStartTime,
              end: newEndTime
            };
            updatedSlots = [...tb.timeSlots, newSlot];
          }
          updatedSlots.sort((a, b) => a.start.localeCompare(b.start));
          return { ...tb, timeSlots: updatedSlots };
        }
        return tb;
      }));
      
      setIsTimeSlotModalOpen(false);
    }
  };

  const openSubjectModal = (timetableId, timeId, day) => {
    setActiveCell({ timetableId, timeId, day });
    const tb = timetables.find(t => t.id === timetableId);
    if (!tb) return;

    const existing = tb.gridData[`${timeId}-${day}`];
    if (existing) {
      setNewSubject(existing.subject);
      setNewDescription(existing.description || '');
    } else {
      setNewSubject('');
      setNewDescription('');
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (newSubject.trim() && activeCell) {
      updateTimetables(timetables.map(tb => {
        if (tb.id === activeCell.timetableId) {
          const key = `${activeCell.timeId}-${activeCell.day}`;
          const existing = tb.gridData[key];
          
          let colorClass = existing ? existing.colorClass : null;
          if (!colorClass) {
            const colorCount = Object.keys(tb.gridData).length;
            colorClass = colorPalettes[colorCount % colorPalettes.length];
          }

          const newGridData = {
            ...tb.gridData,
            [key]: {
              subject: newSubject.trim(),
              description: newDescription.trim(),
              colorClass
            }
          };
          return { ...tb, gridData: newGridData };
        }
        return tb;
      }));
      setIsSubjectModalOpen(false);
    }
  };

  const handleDeleteSubject = (e, timetableId, timeId, day) => {
    e.stopPropagation();
    updateTimetables(timetables.map(tb => {
      if (tb.id === timetableId) {
        const newData = { ...tb.gridData };
        delete newData[`${timeId}-${day}`];
        return { ...tb, gridData: newData };
      }
      return tb;
    }));
  };

  return (
    <>
      {/* Empty State */}
      {timetables.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center p-6">
          <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-12 text-center max-w-md w-full">
            <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Timetables Found</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              You haven't created any timetables yet. Click the button below to get started.
            </p>
            <button 
              onClick={() => setIsNameModalOpen(true)}
              className="bg-secondary hover:bg-blue-600 text-white font-medium py-3 px-8 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
            >
              Add Timetable
            </button>
          </div>
        </div>
      )}

      {/* Timetables Rendered */}
      {timetables.length > 0 && (
        <div className="space-y-12 pb-12 pt-4">
          {searchQuery && (
            <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 px-4 py-3 rounded-xl border border-purple-200 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-2 relative z-10 w-full xl:max-w-7xl mx-auto -mb-4">
               <span className="text-sm font-medium flex items-center gap-2">
                 <Search className="w-4 h-4" />
                 Highlighting classes matching <span className="font-bold underline">"{searchQuery}"</span>
               </span>
               <button onClick={() => navigate('/timetable', { replace: true })} className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-800/50 rounded-lg transition-colors w-fit">
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}
          {timetables.map((tb) => (
            <div key={tb.id} className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{tb.name}</h1>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleCollapse(tb.id)}
                    className="flex items-center text-sm font-medium text-gray-700 bg-gray-100 dark:bg-slate-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 py-2 px-3 md:px-4 rounded-lg transition-colors"
                  >
                    {tb.isCollapsed ? <ChevronDown className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" /> : <ChevronUp className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" />}
                    <span className="hidden md:inline">{tb.isCollapsed ? 'View' : 'Collapse'}</span>
                  </button>
                  <button 
                    onClick={() => openTimeSlotModal(tb.id)}
                    className="flex items-center text-sm font-medium bg-secondary text-white hover:bg-blue-600 py-2 px-3 md:px-4 rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span className="hidden md:inline">Add Time Slot</span>
                    <span className="md:hidden">Time Slots</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteTimetable(tb.id)}
                    className="text-sm font-medium text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors px-2 py-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!tb.isCollapsed && (
              <div className="bg-white dark:bg-darkCard rounded-xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden transition-all duration-300 origin-top">
                <div className="overflow-x-auto p-4">
                  <div className="min-w-[900px] border-separate border-spacing-2" style={{ display: 'table' }}>
                    
                    {/* Header Row */}
                    <div style={{ display: 'table-row' }}>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 font-semibold text-gray-700 dark:text-gray-200 text-center uppercase text-sm tracking-wider w-32" style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                        Time
                      </div>
                      {days.map(day => (
                        <div key={day} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 font-semibold text-gray-700 dark:text-gray-200 text-center w-40" style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Time Rows */}
                    {tb.timeSlots.map((slot) => (
                      <div key={slot.id} style={{ display: 'table-row' }}>
                        {/* Time Cell */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 font-medium text-gray-600 dark:text-gray-400 text-sm text-center relative group" style={{ display: 'table-cell', verticalAlign: 'top' }}>
                          <span className="block mt-4">{slot.start} - {slot.end}</span>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openEditTimeSlotModal(tb.id, slot); }} className="p-1 bg-white/60 dark:bg-black/30 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Empty/Filled Slots */}
                        {days.map(day => {
                          const cellKey = `${slot.id}-${day}`;
                          const data = tb.gridData[cellKey];
                          const isMatched = data && searchQuery ? data.subject.toLowerCase().includes(searchQuery) : false;
                          const opacityState = (!searchQuery) ? 'opacity-100' : (isMatched ? 'opacity-100 ring-4 ring-purple-500/50 ring-offset-2 dark:ring-offset-darkCard scale-105 z-10 shadow-lg' : 'opacity-20 hover:opacity-100 blur-[1px] hover:blur-none');
                          
                          return (
                            <div key={cellKey} className="p-2 relative" style={{ display: 'table-cell', verticalAlign: 'top' }}>
                              {data ? (
                                <div className={`h-full min-h-[100px] border-2 rounded-xl p-4 flex flex-col items-start relative group transition-all duration-500 ease-out ${opacityState} ${data.colorClass.bg} ${data.colorClass.border}`}>
                                   <h4 className={`text-sm font-bold mb-1 ${data.colorClass.text}`}>{data.subject}</h4>
                                   {data.description && (
                                     <p className={`text-xs ${data.colorClass.desc} leading-tight whitespace-pre-wrap`}>{data.description}</p>
                                   )}
                                   <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); openSubjectModal(tb.id, slot.id, day); }} className="p-1.5 bg-white/40 dark:bg-black/20 rounded hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                                      <button onClick={(e) => handleDeleteSubject(e, tb.id, slot.id, day)} className="p-1.5 bg-white/40 dark:bg-black/20 rounded hover:bg-white dark:hover:bg-slate-800 text-red-600 dark:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                   </div>
                                </div>
                              ) : (
                                <div onClick={() => openSubjectModal(tb.id, slot.id, day)} className="h-full min-h-[100px] border-2 border-dashed border-gray-200 dark:border-slate-700/80 rounded-xl pt-8 pb-4 flex items-start justify-center hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 group-hover:text-secondary group-hover:dark:text-blue-400 transition-colors">
                                    Click to add
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                  </div>
                </div>
              </div>
              )}
            </div>
          ))}

          {/* Add Another Timetable Button */}
          <div className="flex justify-center pt-6 pb-12 border-t border-gray-200 dark:border-slate-700/50">
            <button 
              onClick={() => setIsNameModalOpen(true)}
              className="flex items-center text-sm font-medium bg-secondary text-white hover:bg-blue-600 py-2.5 px-6 rounded-lg shadow-sm shadow-blue-500/20 transition-all font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Timetable
            </button>
          </div>
        </div>
      )}

      {/* Name Prompt Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Create Timetable</h3>
              <button onClick={() => setIsNameModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timetable Name *</label>
                <input 
                  type="text" 
                  value={newTimetableName}
                  onChange={(e) => setNewTimetableName(e.target.value)}
                  placeholder="e.g., Spring Semester 2024"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTimetable()}
                />
              </div>
              <button 
                onClick={handleCreateTimetable}
                className="w-full bg-secondary hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Slot Modal */}
      {isTimeSlotModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editingTimeSlotId ? 'Edit Time Slot' : 'Add New Time Slot'}</h3>
              <button onClick={() => setIsTimeSlotModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Start Time *</label>
                  <input 
                    type="time" 
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">End Time *</label>
                  <input 
                    type="time" 
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsTimeSlotModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
               <button onClick={handleAddTimeSlot} className="px-6 py-2 text-sm font-medium bg-secondary text-white rounded-lg hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all">{editingTimeSlotId ? 'Update Slot' : 'Save Slot'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Add Subject to Slot</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Subject Name *</label>
                <input 
                  type="text" 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Description</label>
                <textarea 
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Topic, Room number, etc..."
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors resize-y"
                ></textarea>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsSubjectModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
               <button onClick={handleSaveSubject} className="px-6 py-2 text-sm font-medium bg-secondary text-white rounded-lg hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all">Save Subject</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Timetable;
