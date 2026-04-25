import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Edit, Trash2, ChevronUp, ChevronDown, CheckCircle, XCircle, MinusCircle, Calendar as CalendarIcon, Clock, BookOpen, BarChart3, AlertCircle, Search, Download } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchQuery = new URLSearchParams(search).get('query')?.toLowerCase() || '';
  const [timetables, setTimetables] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lastReportCsv, setLastReportCsv] = useState(null);
  const [lastReportFileName, setLastReportFileName] = useState('');

  const generateCsvReport = (tbs, records) => {
    let csv = "Subject,Present,Absent,Total,Percentage\n";
    const subjectStatsList = {}; 
    tbs.forEach(tb => {
      Object.keys(tb.gridData || {}).forEach(cellKey => {
          const subject = tb.gridData[cellKey].subject;
          const uniqueKey = `${tb.id}_${cellKey}`;
          if (!subjectStatsList[subject]) {
              subjectStatsList[subject] = { present: 0, absent: 0, total: 0 };
          }
          Object.values(records).forEach(dayRecord => {
              const status = dayRecord[uniqueKey];
              if (status === 'present') {
                  subjectStatsList[subject].present++;
                  subjectStatsList[subject].total++;
              } else if (status === 'absent') {
                  subjectStatsList[subject].absent++;
                  subjectStatsList[subject].total++;
              }
          });
      });
    });

    let overallP = 0, overallA = 0, overallT = 0;
    
    Object.keys(subjectStatsList).forEach(subj => {
        const { present, absent, total } = subjectStatsList[subj];
        const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
        csv += `${subj},${present},${absent},${total},${percentage}%\n`;
        overallP += present;
        overallA += absent;
        overallT += total;
    });

    const overallPct = overallT === 0 ? 0 : Math.round((overallP / overallT) * 100);
    csv += `Overall,${overallP},${overallA},${overallT},${overallPct}%\n`;
    
    return csv;
  };

  const downloadReport = () => {
      if (!lastReportCsv) return;
      const blob = new Blob([lastReportCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', lastReportFileName || 'Last_Timetable_Attendance_Report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  useEffect(() => {
    // Check every minute if the day has changed to auto-refresh
    const timer = setInterval(() => {
       const now = new Date();
       if (now.getDate() !== currentDate.getDate()) {
          setCurrentDate(now);
       }
    }, 60000); 
    return () => clearInterval(timer);
  }, [currentDate]);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;
    
    // Listen to attendance timetables
    const tbRef = doc(db, 'users', user.uid, 'data', 'attendance_timetables');
    const unsubTb = onSnapshot(tbRef, async (snap) => {
      if (snap.exists()) {
        const list = snap.data().list || [];
        // Filter out expired ones based on endDate
        const nowLocal = new Date();
        const localTodayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
        const activeList = list.filter(tb => !tb.endDate || tb.endDate >= localTodayStr);
        const expiredList = list.filter(tb => tb.endDate && tb.endDate < localTodayStr);
        
        if (expiredList.length > 0 && activeList.length === 0) {
           const recSnap = await getDoc(doc(db, 'users', user.uid, 'data', 'attendance_records'));
           const currentRecs = recSnap.exists() ? recSnap.data().records || {} : {};
           
           if (Object.keys(currentRecs).length > 0) {
               const fileName = expiredList[0]?.name ? `${expiredList[0].name.replace(/\s+/g, '_')}_Attendance.csv` : 'Last_Timetable_Attendance.csv';
               const reportCsv = generateCsvReport(expiredList, currentRecs);
               await setDoc(doc(db, 'users', user.uid, 'data', 'last_attendance_report'), { csvData: reportCsv, fileName: fileName, date: new Date().toISOString() });
               await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_records'), { records: {} });
           }
           await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_timetables'), { list: activeList });
        } else if (expiredList.length > 0) {
           await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_timetables'), { list: activeList });
        }
        
        setTimetables(activeList);
      } else {
        setTimetables([]);
      }
    });

    // Listen to attendance records
    const recRef = doc(db, 'users', user.uid, 'data', 'attendance_records');
    const unsubRec = onSnapshot(recRef, (snap) => {
      if (snap.exists()) setAttendanceRecords(snap.data().records || {});
      else setAttendanceRecords({});
    });

    // Listen to last report
    const repRef = doc(db, 'users', user.uid, 'data', 'last_attendance_report');
    const unsubRep = onSnapshot(repRef, (snap) => {
       if (snap.exists()) {
           setLastReportCsv(snap.data().csvData);
           setLastReportFileName(snap.data().fileName || 'Last_Timetable_Attendance_Report.csv');
       } else {
           setLastReportCsv(null);
           setLastReportFileName('');
       }
    });

    return () => {
      unsubTb();
      unsubRec();
      unsubRep();
    };
  }, [user]);

  const updateTimetables = async (newList) => {
    setTimetables(newList);
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_timetables'), { list: newList });
    } catch (err) {
      console.error(err);
    }
  };

  const updateAttendanceRecords = async (newRecords) => {
    setAttendanceRecords(newRecords);
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_records'), { records: newRecords });
    } catch (err) {
      console.error(err);
    }
  };

  // Timetable Modals State
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newTimetableName, setNewTimetableName] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [isEditExpiryModalOpen, setIsEditExpiryModalOpen] = useState(false);
  const [activeTimetableId, setActiveTimetableId] = useState(null);
  const [editingTimeSlotId, setEditingTimeSlotId] = useState(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [activeCell, setActiveCell] = useState(null);
  const [newSubject, setNewSubject] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const colorPalettes = [
    { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400 dark:border-blue-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-400 dark:border-orange-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400 dark:border-green-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-400 dark:border-red-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
    { bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400 dark:border-purple-600', text: 'text-gray-900 dark:text-white', desc: 'text-gray-500 dark:text-gray-400' },
  ];

  /* ------------------- Timetable Actions ------------------- */
  const handleCreateTimetable = () => {
    if (newTimetableName.trim() !== '' && newEndDate) {
      const newTb = {
        id: `att_tb_${Date.now()}`,
        name: newTimetableName.trim(),
        endDate: newEndDate,
        isCollapsed: true, // Collapsed by default
        timeSlots: [
          { id: 't1', start: '09:00', end: '10:00' },
          { id: 't2', start: '10:00', end: '11:00' }
        ],
        gridData: {}
      };
      updateTimetables([...timetables, newTb]);
      setIsNameModalOpen(false);
      setNewTimetableName('');
      setNewEndDate('');
    }
  };

  const handleDeleteTimetable = async (timetableId) => {
    const tbToDelete = timetables.find(tb => tb.id === timetableId);
    const updatedList = timetables.filter(tb => tb.id !== timetableId);
    
    if (updatedList.length === 0 && Object.keys(attendanceRecords).length > 0) {
       const fileName = tbToDelete?.name ? `${tbToDelete.name.replace(/\s+/g, '_')}_Attendance.csv` : 'Last_Timetable_Attendance.csv';
       const reportCsv = generateCsvReport([tbToDelete], attendanceRecords);
       await setDoc(doc(db, 'users', user.uid, 'data', 'last_attendance_report'), { csvData: reportCsv, fileName: fileName, date: new Date().toISOString() });
       await setDoc(doc(db, 'users', user.uid, 'data', 'attendance_records'), { records: {} });
    }
    
    updateTimetables(updatedList);
  };

  const toggleCollapse = (timetableId) => {
    updateTimetables(timetables.map(tb => {
      if (tb.id === timetableId) return { ...tb, isCollapsed: !tb.isCollapsed };
      return tb;
    }));
  };

  const handleUpdateExpiry = () => {
    if (newEndDate && activeTimetableId) {
      updateTimetables(timetables.map(tb => tb.id === activeTimetableId ? { ...tb, endDate: newEndDate } : tb));
      setIsEditExpiryModalOpen(false);
    }
  };

  const openEditExpiryModal = (timetableId) => {
    setActiveTimetableId(timetableId);
    const tb = timetables.find(t => t.id === timetableId);
    if (tb) setNewEndDate(tb.endDate || '');
    setIsEditExpiryModalOpen(true);
  };

  // Time Slots
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
            updatedSlots = [...tb.timeSlots, { id: `t_${Date.now()}`, start: newStartTime, end: newEndTime }];
          }
          updatedSlots.sort((a, b) => a.start.localeCompare(b.start));
          return { ...tb, timeSlots: updatedSlots };
        }
        return tb;
      }));
      setIsTimeSlotModalOpen(false);
    }
  };

  // Subjects
  const openSubjectModal = (timetableId, timeId, day) => {
    setActiveCell({ timetableId, timeId, day });
    const tb = timetables.find(t => t.id === timetableId);
    if (tb && tb.gridData[`${timeId}-${day}`]) {
      setNewSubject(tb.gridData[`${timeId}-${day}`].subject);
    } else {
      setNewSubject('');
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = () => {
    if (newSubject.trim() && activeCell) {
      updateTimetables(timetables.map(tb => {
        if (tb.id === activeCell.timetableId) {
          const key = `${activeCell.timeId}-${activeCell.day}`;
          let colorClass = tb.gridData[key]?.colorClass;
          if (!colorClass) {
            const colorCount = Object.keys(tb.gridData).length;
            colorClass = colorPalettes[colorCount % colorPalettes.length];
          }
          return { ...tb, gridData: { ...tb.gridData, [key]: { subject: newSubject.trim(), colorClass } } };
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

  /* ------------------- Attendance Logic ------------------- */
  const todayName = allDays[currentDate.getDay()]; // e.g., 'Monday'
  const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  
  const todaysClasses = [];
  timetables.forEach(tb => {
    tb.timeSlots.forEach(slot => {
      const cellKey = `${slot.id}-${todayName}`;
      const data = tb.gridData[cellKey];
      if (data) {
        todaysClasses.push({
          timetableId: tb.id,
          timetableName: tb.name,
          slotId: slot.id,
          subject: data.subject,
          start: slot.start,
          end: slot.end,
          cellKey: cellKey,
          uniqueKey: `${tb.id}_${cellKey}`
        });
      }
    });
  });
  todaysClasses.sort((a,b) => a.start.localeCompare(b.start));

  const markAttendance = (uniqueKey, status) => {
    const updated = { ...attendanceRecords };
    if (!updated[todayStr]) updated[todayStr] = {};
    updated[todayStr] = { ...updated[todayStr], [uniqueKey]: status };
    updateAttendanceRecords(updated);
  };

  const getDayAttendance = (uniqueKey) => {
    return attendanceRecords[todayStr]?.[uniqueKey] || null;
  };

  const getOverallStats = () => {
    let present = 0, absent = 0;
    Object.values(attendanceRecords).forEach(dayRecord => {
       Object.values(dayRecord).forEach(status => {
          if (status === 'present') present++;
          else if (status === 'absent') absent++;
       });
    });
    const total = present + absent;
    const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
    return { present, absent, percentage };
  };
  const stats = getOverallStats();

  const getSubjectStatsArray = () => {
    const subjectStatsList = {}; 
    timetables.forEach(tb => {
      Object.keys(tb.gridData).forEach(cellKey => {
          const subject = tb.gridData[cellKey].subject;
          const uniqueKey = `${tb.id}_${cellKey}`;
          if (!subjectStatsList[subject]) {
              subjectStatsList[subject] = { present: 0, absent: 0, total: 0 };
          }
          Object.values(attendanceRecords).forEach(dayRecord => {
              const status = dayRecord[uniqueKey];
              if (status === 'present') {
                  subjectStatsList[subject].present++;
                  subjectStatsList[subject].total++;
              } else if (status === 'absent') {
                  subjectStatsList[subject].absent++;
                  subjectStatsList[subject].total++;
              }
          });
      });
    });

    return Object.keys(subjectStatsList).map(subj => {
        const { present, absent, total } = subjectStatsList[subj];
        const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
        return { subject: subj, present, absent, total, percentage };
    }).sort((a,b) => b.percentage - a.percentage);
  };
  const subjectStatsArray = getSubjectStatsArray();

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-darkCard p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Tracking</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Today: {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class Held</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.present + stats.absent}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Present</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Absent</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
          </div>
          <div className="h-12 w-px bg-gray-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-3">
             <div className="relative w-14 h-14 flex items-center justify-center">
               <svg className="w-14 h-14 transform -rotate-90">
                 <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 dark:text-slate-700" />
                 <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" 
                         strokeDasharray={24 * 2 * Math.PI} 
                         strokeDashoffset={24 * 2 * Math.PI - (stats.percentage / 100) * 24 * 2 * Math.PI} 
                         className={`${stats.percentage >= 75 ? 'text-green-500' : stats.percentage >= 50 ? 'text-orange-500' : 'text-red-500'} transition-all duration-1000`} />
               </svg>
               <span className="absolute text-sm font-bold text-gray-800 dark:text-gray-200">{stats.percentage}%</span>
             </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {timetables.length === 0 && (
        <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-12 text-center w-full">
          <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarIcon className="w-10 h-10 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Active Timetable</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Create an attendance timetable to stay on top of your daily classes. Classes past their "last date" automatically disappear.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setIsNameModalOpen(true)}
              className="bg-secondary hover:bg-blue-600 text-white font-medium py-3 px-8 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Timetable
            </button>
            {lastReportCsv && (
              <button 
                onClick={downloadReport}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-medium py-3 px-8 rounded-xl transition-all inline-flex items-center shadow-sm"
              >
                <Download className="w-5 h-5 mr-2" />
                Last TT Attendance Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timetables */}
      {timetables.length > 0 && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                Your Timetables
             </h2>
             <div className="flex gap-3">
               {lastReportCsv && (
                 <button 
                   onClick={downloadReport}
                   className="flex items-center text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 py-2 px-4 rounded-lg transition-colors"
                 >
                   <Download className="w-4 h-4 mr-1.5 hidden sm:block" />
                   <span className="hidden sm:inline">Last TT Report</span>
                   <Download className="w-4 h-4 sm:hidden" />
                 </button>
               )}
               <button 
                 onClick={() => setIsNameModalOpen(true)}
                 className="flex items-center text-sm font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 py-2 px-4 rounded-lg transition-colors"
               >
                 <Plus className="w-4 h-4 mr-1.5" />
                 New Timetable
               </button>
             </div>
          </div>

          {timetables.map((tb) => (
            <div key={tb.id} className="bg-white dark:bg-darkCard rounded-xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{tb.name}</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Expires on {new Date(tb.endDate).toLocaleDateString()}</span>
                    <button onClick={() => openEditExpiryModal(tb.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors text-gray-400 hover:text-secondary ml-1"><Edit className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => toggleCollapse(tb.id)}
                    className="flex items-center font-medium text-gray-700 bg-gray-100 dark:bg-slate-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 py-2 px-3 md:px-4 rounded-lg transition-colors text-sm"
                  >
                    {tb.isCollapsed ? <ChevronDown className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" /> : <ChevronUp className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" />}
                    <span className="hidden md:inline">{tb.isCollapsed ? 'View' : 'Collapse'}</span>
                  </button>
                  <button 
                    onClick={() => openTimeSlotModal(tb.id)}
                    className="flex items-center text-sm font-medium bg-secondary text-white hover:bg-blue-600 py-2 px-3 md:px-4 rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
                  >
                    <Plus className="w-5 h-5 md:w-4 md:h-4 md:mr-1.5" />
                    <span className="hidden md:inline">Time Slot</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteTimetable(tb.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>

              {!tb.isCollapsed && (
                <div className="overflow-x-auto p-4 bg-gray-50/30 dark:bg-darkBase/30">
                  <div className="min-w-[900px] border-separate border-spacing-2" style={{ display: 'table' }}>
                    
                    <div style={{ display: 'table-row' }}>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 font-semibold text-gray-700 dark:text-gray-200 text-center text-sm shadow-sm w-32 border border-gray-100 dark:border-slate-700/50" style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                        Time
                      </div>
                      {days.map(day => (
                        <div key={day} className="bg-white dark:bg-slate-800 rounded-lg p-3 font-semibold text-gray-700 dark:text-gray-200 text-center text-sm shadow-sm border border-gray-100 dark:border-slate-700/50 w-40" style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                          {day}
                        </div>
                      ))}
                    </div>

                    {tb.timeSlots.map((slot) => (
                      <div key={slot.id} style={{ display: 'table-row' }}>
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 font-medium text-gray-600 dark:text-gray-400 text-sm text-center relative group" style={{ display: 'table-cell', verticalAlign: 'top' }}>
                          <span className="block mt-4">{slot.start} - {slot.end}</span>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openEditTimeSlotModal(tb.id, slot); }} className="p-1 bg-white/60 dark:bg-black/30 rounded hover:bg-white dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {days.map(day => {
                          const cellKey = `${slot.id}-${day}`;
                          const data = tb.gridData[cellKey];
                          return (
                            <div key={cellKey} className="p-2" style={{ display: 'table-cell', verticalAlign: 'top' }}>
                              {data ? (
                                <div className={`h-full min-h-[100px] border-2 rounded-xl p-4 flex flex-col items-start relative group transition-colors ${data.colorClass.bg} ${data.colorClass.border}`}>
                                   <h4 className={`text-sm font-bold mb-1 ${data.colorClass.text}`}>{data.subject}</h4>
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
              )}
            </div>
          ))}

          {/* Today's Classes */}
          <div className="pt-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-secondary" />
              Today's Classes ({todayName})
            </h2>

            {searchQuery && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-3 rounded-xl border border-green-200 dark:border-green-800/50 flex items-center justify-between mb-4 shadow-sm">
                 <span className="text-sm font-medium flex items-center gap-2">
                   <Search className="w-4 h-4" />
                   Showing classes for <span className="font-bold">"{searchQuery}"</span>
                 </span>
                 <button onClick={() => navigate('/attendance', { replace: true })} className="p-1 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-lg transition-colors">
                   <X className="w-4 h-4" />
                 </button>
              </div>
            )}

            {(() => {
              const displayedClasses = searchQuery ? todaysClasses.filter(c => c.subject.toLowerCase().includes(searchQuery)) : todaysClasses;

              if (displayedClasses.length === 0) {
                return (
                  <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 rounded-2xl p-8 text-center">
                     <p className="text-gray-500 dark:text-gray-400">{searchQuery ? `No classes scheduled today matching "${searchQuery}".` : 'No classes scheduled for today in your active timetables.'}</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedClasses.map((cls) => {
                  const status = getDayAttendance(cls.uniqueKey);
                  return (
                    <div key={cls.uniqueKey} className={`bg-white dark:bg-darkCard rounded-xl border p-5 shadow-sm transition-all ${
                      status === 'present' ? 'border-green-400 dark:border-green-500/50 ring-1 ring-green-400/20' :
                      status === 'absent' ? 'border-red-400 dark:border-red-500/50 ring-1 ring-red-400/20' :
                      status === 'not_held' ? 'border-gray-400 dark:border-gray-500/50 bg-gray-50 dark:bg-slate-800/50' :
                      'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{cls.subject}</h3>
                          <div className="inline-flex items-center mt-2 px-2.5 py-1 bg-gray-100 dark:bg-slate-800 rounded-md text-xs font-semibold text-gray-600 dark:text-gray-300">
                             <Clock className="w-3.5 h-3.5 mr-1.5" />
                             {cls.start} - {cls.end}
                          </div>
                        </div>
                        {status === 'present' && <div className="text-green-500"><CheckCircle className="w-6 h-6" /></div>}
                        {status === 'absent' && <div className="text-red-500"><XCircle className="w-6 h-6" /></div>}
                        {status === 'not_held' && <div className="text-gray-500"><MinusCircle className="w-6 h-6" /></div>}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                          onClick={() => markAttendance(cls.uniqueKey, 'present')}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors border ${
                            status === 'present' 
                              ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:bg-darkCard dark:text-gray-300 dark:border-slate-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-900/50'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance(cls.uniqueKey, 'absent')}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors border ${
                            status === 'absent' 
                              ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-darkCard dark:text-gray-300 dark:border-slate-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-900/50'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => markAttendance(cls.uniqueKey, 'not_held')}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors border ${
                            status === 'not_held' 
                              ? 'bg-gray-200 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-300 dark:bg-darkCard dark:text-gray-400 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-gray-200'
                          }`}
                        >
                          Not Held
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </div>

          {/* Subject-Wise Attendance */}
          {subjectStatsArray.length > 0 && (
            <div className="pt-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-secondary" />
                Subject-wise Attendance
              </h2>
              {(() => {
                  const displayedStats = searchQuery ? subjectStatsArray.filter(s => s.subject.toLowerCase().includes(searchQuery)) : subjectStatsArray;

                  if (displayedStats.length === 0) {
                     return <p className="text-gray-500 text-sm py-2">No subject data matches your search term.</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                       {displayedStats.map(stat => (
                          <div key={stat.subject} className="bg-white dark:bg-darkCard p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                             <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                               <svg className="w-12 h-12 transform -rotate-90">
                                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100 dark:text-slate-700" />
                                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" 
                                         strokeDasharray={20 * 2 * Math.PI} 
                                         strokeDashoffset={20 * 2 * Math.PI - (stat.percentage / 100) * 20 * 2 * Math.PI} 
                                         className={`${stat.percentage >= 75 ? 'text-green-500' : stat.percentage >= 50 ? 'text-orange-500' : 'text-red-500'} transition-all duration-1000`} />
                               </svg>
                               <span className="absolute text-xs font-bold text-gray-800 dark:text-gray-200">{stat.percentage}%</span>
                             </div>
                             
                             <div className="flex-1 min-w-0">
                               <h3 className="font-bold text-gray-800 dark:text-white truncate" title={stat.subject}>{stat.subject}</h3>
                               <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  <span className="text-green-600 dark:text-green-400 font-medium">{stat.present} Present</span>
                                  <span className="text-red-600 dark:text-red-400 font-medium">{stat.absent} Absent</span>
                               </div>
                             </div>
                          </div>
                       ))}
                    </div>
                  );
              })()}
            </div>
          )}
        </div>
      )}

      {/* --- Modals (mostly reused logic) --- */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Create Attendance Timetable</h3>
              <button onClick={() => setIsNameModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timetable Name *</label>
                <input type="text" value={newTimetableName} onChange={(e) => setNewTimetableName(e.target.value)} placeholder="e.g., Even Semester 2024" className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Date (Auto-expire) *</label>
                <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              <button onClick={handleCreateTimetable} disabled={!newTimetableName || !newEndDate} className="w-full bg-secondary disabled:opacity-50 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm mt-2">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {isTimeSlotModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editingTimeSlotId ? 'Edit Time Slot' : 'Add Time Slot'}</h3>
              <button onClick={() => setIsTimeSlotModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Start Time *</label>
                  <input type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:border-secondary [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">End Time *</label>
                  <input type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:border-secondary [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsTimeSlotModalOpen(false)} className="px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
               <button onClick={handleAddTimeSlot} className="px-6 py-2 text-sm font-medium bg-secondary text-white rounded-lg hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all">{editingTimeSlotId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Assign Subject</h3>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Subject Name *</label>
              <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g., Physics" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:border-secondary" autoFocus />
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsSubjectModalOpen(false)} className="px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
               <button onClick={handleSaveSubject} className="px-6 py-2 text-sm font-medium bg-secondary text-white rounded-lg hover:bg-blue-600 shadow-sm shadow-blue-500/20 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expiry Modal */}
      {isEditExpiryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Edit Expiry Date</h3>
              <button onClick={() => setIsEditExpiryModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Date (Auto-expire) *</label>
              <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-secondary transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
               <button onClick={() => setIsEditExpiryModalOpen(false)} className="px-5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
               <button onClick={handleUpdateExpiry} disabled={!newEndDate} className="px-6 py-2 text-sm font-medium bg-secondary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/20">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
