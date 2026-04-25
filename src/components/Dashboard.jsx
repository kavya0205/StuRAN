import { FileText, Calendar, CheckCircle, Clock, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import Profile from './Profile';

const lineData = [
  { name: 'Jan', value: 30 },
  { name: 'Feb', value: 20 },
  { name: 'March', value: 50 },
  { name: 'April', value: 35 },
  { name: 'May', value: 80 },
  { name: 'June', value: 45 },
  { name: 'July', value: 65 },
];

const assignments = [
  { subject: 'Mathematics', startDate: '21.01.2020', endDate: '1.06.2020', status: 'Pending' },
  { subject: 'Fundamentals of C++', startDate: '21.02.2020', endDate: '1.06.2020', status: 'Submitted' },
  { subject: 'Java', startDate: '21.02.2020', endDate: '1.06.2020', status: 'Submitted' },
  { subject: 'Html & Css', startDate: '21.02.2020', endDate: '1.06.2020', status: 'Pending' },
  { subject: 'Computer Applications', startDate: '21.02.2020', endDate: '1.06.2020', status: 'Pending' },
];

const COLORS = ['#ef4444', '#f3f4f6']; // Red and light gray
const COLORS2 = ['#3b82f6', '#f3f4f6'];

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Assignments');
  const [dbAssignments, setDbAssignments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [exams, setExams] = useState([]);
  const [todos, setTodos] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [studyGoal, setStudyGoal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({});

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    if (!user) return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid, 'data', 'profile'), (snap) => {
      if (snap.exists()) setProfileData(snap.data());
      else setProfileData({});
    });
    return () => unsubProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    // Assignments
    const qAssign = query(collection(db, 'users', user.uid, 'assignments'), orderBy('createdAt', 'desc'));
    const unsubAssign = onSnapshot(qAssign, (snap) => {
      setDbAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Attendance
    const docRef = doc(db, 'users', user.uid, 'data', 'attendance_records');
    const unsubAttend = onSnapshot(docRef, (snap) => {
      if (snap.exists()) setAttendanceRecords(snap.data().records || {});
      else setAttendanceRecords({});
    });

    // Exams
    const qExams = collection(db, 'users', user.uid, 'exams');
    const unsubExams = onSnapshot(qExams, (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Todos
    const qTodos = collection(db, 'users', user.uid, 'todos');
    const unsubTodos = onSnapshot(qTodos, (snap) => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Timetables (for subject-wise attendance)
    const tbRef = doc(db, 'users', user.uid, 'data', 'attendance_timetables');
    const unsubTb = onSnapshot(tbRef, (snap) => {
      if (snap.exists()) setTimetables(snap.data().list || []);
      else setTimetables([]);
    });

    // Study Goal
    const goalRef = doc(db, 'users', user.uid, 'data', 'study_goal');
    const unsubGoal = onSnapshot(goalRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (isToday(data.date)) {
          setStudyGoal(data.targetHours || 0);
        } else {
          setStudyGoal(0);
        }
      } else {
        setStudyGoal(0);
      }
    });

    return () => {
      unsubAssign();
      unsubAttend();
      unsubExams();
      unsubTodos();
      unsubTb();
      unsubGoal();
    };
  }, [user]);

  const getTodayStr = () => {
    return new Date().toLocaleDateString('en-CA');
  };
  const todayStr = getTodayStr();

  // Metrics Calculations
  let presentCount = 0, absentCount = 0;
  Object.values(attendanceRecords).forEach(dayRecord => {
    Object.values(dayRecord).forEach(status => {
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
    });
  });
  const totalAttendance = presentCount + absentCount;
  const attendancePercentage = totalAttendance === 0 ? 0 : Math.round((presentCount / totalAttendance) * 100);

  const pendingAssignmentsList = dbAssignments.filter(a => !a.completed && a.lastSubmissionDate >= todayStr);
  const pendingAssignmentsCount = pendingAssignmentsList.length;

  const upcomingExamsList = exams.filter(e => e.date >= todayStr);
  const upcomingExamsCount = upcomingExamsList.length;

  const todaysStudyTasks = todos.filter(t => t.completed && isToday(t.completedAt || t.createdAt));
  const studyHours = todaysStudyTasks.reduce((acc, curr) => acc + Number(curr.duration || 0), 0);

  // Calculate percentages for charts
  const totalAssignmentsCount = dbAssignments.length;
  const completedAssignmentsCount = dbAssignments.filter(a => a.completed).length;
  const assignmentPercentage = totalAssignmentsCount === 0 ? 0 : Math.round((completedAssignmentsCount / totalAssignmentsCount) * 100);

  const studyPercentage = studyGoal === 0 ? 0 : Math.round((studyHours / studyGoal) * 100);
  const cappedStudyPercentage = studyPercentage > 100 ? 100 : studyPercentage;

  // Subject-wise calculations
  const getSubjectStatsArray = () => {
    const subjectStatsList = {}; 
    timetables.forEach(tb => {
      Object.keys(tb.gridData || {}).forEach(cellKey => {
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

  // Helper to format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB'); // dd.mm.yyyy format
    } catch {
      return dateStr;
    }
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosing(false);
    }, 300); // 300ms to match the tailwind duration
  };

  // Calendar data
  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
  const monthName = todayDate.toLocaleString('default', { month: 'long' });

  const renderCalendar = () => {
    const daysArray = [];
    const todayStr = getTodayStr();

    for (let i = 0; i < firstDayOfMonth; i++) {
      daysArray.push(<div key={`empty-${i}`} className="py-1"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isTodayDate = day === todayDate.getDate();
      
      const hasExam = exams.some(e => e.date === dateStr && dateStr >= todayStr);
      
      const dayPendingAssignments = dbAssignments.filter(a => !a.completed && a.lastSubmissionDate === dateStr);
      const isOverdue = dayPendingAssignments.some(a => dateStr < todayStr);
      const isUpcoming = dayPendingAssignments.some(a => dateStr >= todayStr);
      
      const hasAnything = hasExam || dayPendingAssignments.length > 0;

      let bgClass = `text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 ${hasAnything ? 'cursor-pointer' : 'cursor-default'}`;
      let textClass = "";
      
      if (isOverdue) {
        bgClass = "bg-red-500 shadow-sm shadow-red-500/30 cursor-pointer hover:bg-red-600";
        textClass = "text-white font-bold";
      } else if (isUpcoming) {
        bgClass = "bg-green-500 shadow-sm shadow-green-500/30 cursor-pointer hover:bg-green-600";
        textClass = "text-white font-bold";
      } else if (isTodayDate) {
        bgClass = "bg-blue-500 shadow-sm shadow-blue-500/30 cursor-pointer hover:bg-blue-600";
        textClass = "text-white font-bold";
      }
      
      daysArray.push(
        <div
          key={`day-${day}`}
          onClick={() => setSelectedDate(dateStr)}
          className={`relative rounded-full w-8 h-8 mx-auto flex items-center justify-center transition-colors select-none ${bgClass} ${textClass}`}
        >
          {day}
          {hasExam && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-400 rounded-full border border-white dark:border-darkCard z-10 shadow-sm"></span>}
        </div>
      );
    }
    return daysArray;
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setActiveModal('attendance')} className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl p-6 text-white flex flex-col items-center justify-center shadow-md shadow-teal-500/20 cursor-pointer transform transition-transform hover:scale-105 active:scale-95 duration-200">
          <CheckCircle className="w-8 h-8 mb-2 opacity-90" />
          <h3 className="font-semibold text-lg text-teal-50">Attendance</h3>
          <p className="text-3xl font-bold mt-1">{attendancePercentage}%</p>
        </div>
        <div onClick={() => setActiveModal('assignments')} className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-6 text-white flex flex-col items-center justify-center shadow-md shadow-blue-500/20 cursor-pointer transform transition-transform hover:scale-105 active:scale-95 duration-200">
          <FileText className="w-8 h-8 mb-2 opacity-90" />
          <h3 className="font-semibold text-lg text-blue-50">Assignments</h3>
          <p className="text-3xl font-bold mt-1">{pendingAssignmentsCount}</p>
        </div>
        <div onClick={() => setActiveModal('exams')} className="bg-gradient-to-br from-pink-500 to-red-400 rounded-xl p-6 text-white flex flex-col items-center justify-center shadow-md shadow-pink-500/20 cursor-pointer transform transition-transform hover:scale-105 active:scale-95 duration-200">
          <Calendar className="w-8 h-8 mb-2 opacity-90" />
          <h3 className="font-semibold text-lg text-pink-50">Upcoming Exams</h3>
          <p className="text-3xl font-bold mt-1">{upcomingExamsCount}</p>
        </div>
        <div onClick={() => setActiveModal('study')} className="bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl p-6 text-white flex flex-col items-center justify-center shadow-md shadow-purple-500/20 cursor-pointer transform transition-transform hover:scale-105 active:scale-95 duration-200">
          <Clock className="w-8 h-8 mb-2 opacity-90" />
          <h3 className="font-semibold text-lg text-purple-50">Study</h3>
          <p className="text-3xl font-bold mt-1">{studyHours} hrs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Calendar Widget */}
            <div className="bg-white dark:bg-darkCard rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700/50 pb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Calendar</h3>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md">{monthName} {currentYear}</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-sm">
                {renderCalendar()}
              </div>
              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/50 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Overdue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam</span>
                </div>
              </div>
            </div>

            {/* Donut Charts */}
            <div className="bg-white dark:bg-darkCard rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col justify-center">
              <div className="flex justify-around items-center h-full">
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{value: assignmentPercentage}, {value: 100 - assignmentPercentage}]} innerRadius={35} outerRadius={45} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                          <Cell fill={COLORS[0]} />
                          <Cell fill={COLORS[1]} className="dark:opacity-10" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{assignmentPercentage}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Assignments</p>
                </div>
                
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{value: cappedStudyPercentage}, {value: 100 - cappedStudyPercentage}]} innerRadius={35} outerRadius={45} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                          <Cell fill={COLORS2[0]} />
                          <Cell fill={COLORS2[1]} className="dark:opacity-10" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{studyPercentage}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Study Goal</p>
                </div>
              </div>
              <div className="flex justify-around mt-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Progress</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 pl-4">Today</p>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-white dark:bg-darkCard rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50">
            <div className="flex items-center space-x-4 mb-6 border-b border-gray-100 dark:border-slate-700/50 pb-2">
              <button 
                onClick={() => setActiveTab('Assignments')}
                className={`pb-2 px-4 text-sm font-medium ${activeTab === 'Assignments' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                Assignments
              </button>
              <button 
                onClick={() => setActiveTab('Exams')}
                className={`pb-2 px-4 text-sm font-medium ${activeTab === 'Exams' ? 'text-secondary border-b-2 border-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                Exams Schedule
              </button>
            </div>

            <div className="overflow-x-auto min-h-[250px]">
              {activeTab === 'Assignments' && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-400 dark:text-gray-500 font-medium border-b border-gray-50 dark:border-slate-700/50">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Allotted Date</th>
                      <th className="pb-3 font-medium">Deadline</th>
                      <th className="pb-3 font-medium text-right">Status / Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const completedAssignments = dbAssignments.filter(a => a.completed);
                      const overdueAssignments = dbAssignments.filter(a => !a.completed && a.lastSubmissionDate < todayStr);
                      const hasAny = completedAssignments.length > 0 || overdueAssignments.length > 0;

                      if (!hasAny) {
                        return (
                          <tr>
                            <td colSpan="4" className="py-12 text-center text-gray-400 italic">No assignments found</td>
                          </tr>
                        );
                      }

                      return (
                        <>
                          {overdueAssignments.length > 0 && (
                            <>
                              <tr>
                                <td colSpan="4" className="pt-4 pb-2 pl-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                    Overdue — Not Submitted
                                  </span>
                                </td>
                              </tr>
                              {overdueAssignments.slice(0, 5).map((item) => (
                                <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0 hover:bg-red-50/30 dark:hover:bg-red-500/5 transition-colors">
                                  <td className="py-3 font-bold text-gray-800 dark:text-gray-200 pl-2">{item.subject}</td>
                                  <td className="py-3 font-medium text-gray-500 dark:text-gray-400">{formatDate(item.allotedDate)}</td>
                                  <td className="py-3 font-bold text-red-500">{formatDate(item.lastSubmissionDate)}</td>
                                  <td className="py-3 text-right pr-2">
                                    <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 shadow-sm shadow-red-500/20">
                                      Overdue
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}

                          {completedAssignments.length > 0 && (
                            <>
                              <tr>
                                <td colSpan="4" className="pt-5 pb-2 pl-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-green-600 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                                    Completed
                                  </span>
                                </td>
                              </tr>
                              {completedAssignments.slice(0, 5).map((item) => (
                                <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0 hover:bg-green-50/30 dark:hover:bg-green-500/5 transition-colors">
                                  <td className="py-3 font-bold text-gray-800 dark:text-gray-200 pl-2">{item.subject}</td>
                                  <td className="py-3 font-medium text-gray-500 dark:text-gray-400">{formatDate(item.allotedDate)}</td>
                                  <td className="py-3 font-medium text-gray-500 dark:text-gray-400">{formatDate(item.lastSubmissionDate)}</td>
                                  <td className="py-3 text-right pr-2">
                                    <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-green-500 shadow-sm shadow-green-500/20">
                                      {formatDate(item.completionDate)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              )}

              {activeTab === 'Exams' && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-400 dark:text-gray-500 font-medium border-b border-gray-50 dark:border-slate-700/50">
                      <th className="pb-3 font-medium">Subject</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium text-right">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExamsList.length > 0 ? (
                      upcomingExamsList.slice(0, 5).map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 font-bold text-gray-800 dark:text-gray-200 pl-2">{item.subject}</td>
                          <td className="py-4 font-medium text-gray-600 dark:text-gray-400">{formatDate(item.date)}</td>
                          <td className="py-4 font-medium text-gray-600 dark:text-gray-400">{item.time}</td>
                          <td className="py-4 text-right font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider text-xs pr-2">
                            {item.day}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-12 text-center text-gray-400 italic">No upcoming exams scheduled</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Sidebar (1 col) */}
        <div className="space-y-6">
          
          {/* Profile Widget — hidden on mobile, shown in sidebar instead */}
          <div className="hidden lg:block bg-white dark:bg-darkCard rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-slate-700/50">
            <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-800"></div>
            <div className="px-5 pb-5 relative">
              <div className="flex justify-center -mt-10 mb-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black border-4 border-white dark:border-darkCard shadow-lg select-none">
                  {(user?.displayName || '?').split(' ').filter(Boolean).length >= 2
                    ? (user.displayName.split(' ')[0][0] + user.displayName.split(' ').at(-1)[0]).toUpperCase()
                    : (user?.displayName?.[0] || '?').toUpperCase()
                  }
                </div>
              </div>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-gray-800 dark:text-white">{user?.displayName || 'Student'}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Roll No.</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{profileData.rollNo || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Course</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{profileData.course || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Session</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{profileData.session || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Semester</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{profileData.semester || '—'}</span>
                </div>
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="w-full bg-secondary hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                View Profile
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Enlarged Detailed Modals */}
      <Profile isOpen={showProfile} onClose={() => setShowProfile(false)} />

      {(activeModal || isClosing) && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 duration-300 ${isClosing ? 'animate-out fade-out' : 'animate-in fade-in'}`}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={handleCloseModal}></div>
          <div className={`relative bg-white dark:bg-darkCard w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700/50 origin-center duration-300 ${isClosing ? 'animate-out zoom-out-50' : 'animate-in zoom-in-50'}`}>
            
            {(activeModal === 'attendance' || (isClosing && activeModal === 'attendance')) && (
              <>
                <div className="bg-gradient-to-r from-teal-400 to-teal-500 p-8 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-bold">Attendance Details</h2>
                      <p className="text-teal-50 font-medium">Subject-wise percentage breakdown</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-gray-50 dark:bg-slate-900/50">
                  {subjectStatsArray.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-10">No attendance data available.</p>
                  ) : (
                    subjectStatsArray.map(stat => (
                      <div key={stat.subject} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
                        <div className="flex justify-between font-bold mb-2 text-gray-800 dark:text-gray-100">
                          <span className="truncate pr-4">{stat.subject}</span>
                          <span className={stat.percentage >= 75 ? 'text-green-500' : stat.percentage >= 50 ? 'text-orange-500' : 'text-red-500'}>{stat.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-2 overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-1000 ${stat.percentage >= 75 ? 'bg-green-500' : stat.percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          <span className="text-green-600 dark:text-green-400">{stat.present} Present</span>
                          <span className="text-red-600 dark:text-red-400">{stat.absent} Absent</span>
                          <span>{stat.total} Total Classes</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {(activeModal === 'assignments' || (isClosing && activeModal === 'assignments')) && (
              <>
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-8 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-4">
                    <FileText className="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-bold">Pending Assignments</h2>
                      <p className="text-blue-50 font-medium">Due today or in the future</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 flex-1">
                  {pendingAssignmentsList.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-10">No pending assignments! You're all caught up.</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingAssignmentsList.map(a => (
                        <div key={a.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-l-4 border-l-blue-500 border border-gray-100 dark:border-slate-700/50 flex justify-between items-center group hover:shadow-md transition-shadow">
                          <div className="flex flex-col">
                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">{a.subject}</h4>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Deadline</span>
                            <span className="text-red-500 font-bold bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg mt-1">{formatDate(a.lastSubmissionDate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {(activeModal === 'exams' || (isClosing && activeModal === 'exams')) && (
              <>
                <div className="bg-gradient-to-r from-pink-500 to-red-400 p-8 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-4">
                    <Calendar className="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-bold">Upcoming Exams</h2>
                      <p className="text-pink-50 font-medium">Your schedule ahead</p>
                    </div>
                  </div>
                  <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 flex-1">
                  {upcomingExamsList.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-10">No upcoming exams scheduled.</p>
                  ) : (
                    <div className="space-y-4">
                      {upcomingExamsList.map(e => (
                        <div key={e.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex sm:items-center justify-between flex-col sm:flex-row gap-4 hover:border-pink-300 transition-colors">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center font-bold text-xl uppercase">
                                {e.subject.charAt(0)}
                             </div>
                             <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">{e.subject}</h4>
                          </div>
                          <div className="flex items-center sm:text-right gap-4 bg-gray-50 dark:bg-slate-900/50 px-4 py-2 rounded-xl">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-400 uppercase">Date</span>
                              <span className="text-gray-700 dark:text-gray-200 font-semibold">{formatDate(e.date)}</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-400 uppercase">Time</span>
                              <span className="text-gray-700 dark:text-gray-200 font-semibold">{e.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {(activeModal === 'study' || (isClosing && activeModal === 'study')) && (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-purple-400 p-8 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-4">
                    <Clock className="w-10 h-10" />
                    <div>
                      <h2 className="text-2xl font-bold">Study Tasks Completed Today</h2>
                      <p className="text-purple-50 font-medium">To-Do list completions</p>
                    </div>
                  </div>
                  <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 flex-1">
                  {todaysStudyTasks.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-10">No tasks completed today. Time to get to work!</p>
                  ) : (
                    <div className="space-y-4">
                      {todaysStudyTasks.map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200 line-through decoration-gray-300 dark:decoration-slate-600">{t.text}</h4>
                          </div>
                          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-500/20 shrink-0">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span className="font-bold text-purple-600 dark:text-purple-400">{t.duration || 0} hrs</span>
                          </div>
                        </div>
                      ))}
                      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Total Study Time</span>
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{studyHours} Hours</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Date Detail Modal */}
      {selectedDate && (() => {
        const todayStr = getTodayStr();
        const dayAssignments = dbAssignments.filter(a => !a.completed && a.lastSubmissionDate === selectedDate);
        const completedOnDay = dbAssignments.filter(a => a.completed && a.completionDate === selectedDate);
        const dayExams = exams.filter(e => e.date === selectedDate);
        const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const isEmpty = dayAssignments.length === 0 && completedOnDay.length === 0 && dayExams.length === 0;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedDate(null)}>
            <div
              className="bg-white dark:bg-darkCard rounded-[2rem] w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Schedule for</p>
                    <h2 className="text-white font-bold text-base leading-tight">{dateLabel}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {isEmpty ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nothing scheduled for this day.</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Free day! 🎉</p>
                  </div>
                ) : (
                  <>
                    {/* Pending Assignments */}
                    {dayAssignments.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedDate < todayStr ? 'bg-red-500' : 'bg-green-500'}`}></span>
                          {selectedDate < todayStr ? 'Overdue Assignments' : 'Assignments Due'}
                        </h3>
                        <div className="space-y-2">
                          {dayAssignments.map(a => (
                            <div key={a.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${selectedDate < todayStr ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' : 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20'}`}>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedDate < todayStr ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 'bg-green-100 dark:bg-green-500/20 text-green-500'}`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{a.subject}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Allotted: {formatDate(a.allotedDate)}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${selectedDate < todayStr ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                {selectedDate < todayStr ? 'Overdue' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Assignments on this day */}
                    {completedOnDay.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          Submitted
                        </h3>
                        <div className="space-y-2">
                          {completedOnDay.map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-3.5 rounded-2xl border bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-teal-100 dark:bg-teal-500/20 text-teal-500">
                                <CheckCircle className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{a.subject}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Deadline: {formatDate(a.lastSubmissionDate)}</p>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-500 text-white">Done</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Exams */}
                    {dayExams.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                          Exams
                        </h3>
                        <div className="space-y-2">
                          {dayExams.map(e => (
                            <div key={e.id} className="flex items-center gap-3 p-3.5 rounded-2xl border bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-500/20 text-orange-500">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{e.subject}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{e.day} · {e.time}</p>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-400 text-white">Exam</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default Dashboard;
