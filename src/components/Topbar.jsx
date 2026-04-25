import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Bell, LogOut, Sun, Moon, Menu, X, BookOpen, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import ImportExport from './ImportExport';

const Topbar = ({ toggleTheme, darkMode, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  
  const [assignments, setAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  const [timetables, setTimetables] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchNav = (path) => {
    navigate(`${path}?query=${encodeURIComponent(searchQuery)}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!user) return;
    const unsubAssignments = onSnapshot(collection(db, 'users', user.uid, 'assignments'), snap => {
       setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubExams = onSnapshot(collection(db, 'users', user.uid, 'exams'), snap => {
       setExams(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    const unsubTimetables = onSnapshot(doc(db, 'users', user.uid, 'data', 'timetables'), snap => {
       if (snap.exists()) setTimetables(snap.data().list || []);
       else setTimetables([]);
    });
    
    return () => { unsubAssignments(); unsubExams(); unsubTimetables(); };
  }, [user]);

  useEffect(() => {
     if (!user) return;

     const generateNotifications = () => {
        const clearedKey = `cleared_notifications_${user.uid}`;
        const clearedList = JSON.parse(localStorage.getItem(clearedKey) || '[]');
        const newNotifs = [];

        const now = new Date();
        const getLocalDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayStr = getLocalDateStr(now);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = getLocalDateStr(tomorrow);
        
        // 1. Assignments
        assignments.forEach(assign => {
            if (assign.completed) return;
            if (assign.lastSubmissionDate === todayStr || assign.lastSubmissionDate === tomorrowStr) {
                const id = `assign_${assign.id}_${assign.lastSubmissionDate}`;
                if (!clearedList.includes(id)) {
                    newNotifs.push({
                        id,
                        type: 'assignment',
                        title: 'Assignment Due',
                        message: `${assign.subject} is due ${assign.lastSubmissionDate === todayStr ? 'today' : 'tomorrow'}`,
                        link: '/assignment',
                        icon: <BookOpen className="w-5 h-5 text-blue-500" />,
                        timestamp: now.getTime()
                    });
                }
            }
        });

        // 2. Exams
        const sevenDaysLater = new Date(now);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const sevenDaysStr = getLocalDateStr(sevenDaysLater);
        
        exams.forEach(exam => {
            if (exam.date >= todayStr && exam.date <= sevenDaysStr) {
                const id = `exam_${exam.id}_${exam.date}`;
                if (!clearedList.includes(id)) {
                    const diffDays = Math.ceil((new Date(exam.date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
                    newNotifs.push({
                        id,
                        type: 'exam',
                        title: 'Upcoming Exam',
                        message: `${exam.subject} exam is ${diffDays === 0 ? 'today' : `in ${diffDays} days`}`,
                        link: '/exams',
                        icon: <Calendar className="w-5 h-5 text-orange-500" />,
                        timestamp: new Date(exam.date).getTime()
                    });
                }
            }
        });

        // 3. Classes
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[now.getDay()];
        
        timetables.forEach(tb => {
            if (tb.isCollapsed === undefined) return;
            tb.timeSlots?.forEach(slot => {
                const cellKey = `${slot.id}-${todayName}`;
                const data = tb.gridData?.[cellKey];
                if (data) {
                    const [hours, minutes] = slot.start.split(':').map(Number);
                    const classDate = new Date();
                    classDate.setHours(hours, minutes, 0, 0);
                    
                    const diffMs = classDate - now;
                    const diffMins = Math.floor(diffMs / 60000);
                    
                    if (diffMins >= 0 && diffMins <= 60) {
                        const id = `class_${tb.id}_${slot.id}_${todayStr}`;
                        if (!clearedList.includes(id)) {
                            newNotifs.push({
                                id,
                                type: 'class',
                                title: 'Class Starting Soon',
                                message: `${data.subject} starts in ${diffMins} minutes`,
                                link: '/timetable',
                                icon: <Clock className="w-5 h-5 text-green-500" />,
                                timestamp: classDate.getTime()
                            });
                        }
                    }
                }
            });
        });

        setNotifications(newNotifs);
     };

     generateNotifications();
     const interval = setInterval(generateNotifications, 60000); 
     return () => clearInterval(interval);

  }, [assignments, exams, timetables, user]);

// Clear notification logic was removed by request

  return (
    <header className="relative z-50 h-16 md:h-20 bg-white/80 dark:bg-darkCard/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 shadow-sm transition-colors duration-200 gap-2 md:gap-0 lg:w-64 lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:py-6 lg:px-6 lg:shrink-0">
      
      <div className="flex items-center flex-1 max-w-2xl lg:flex-none lg:w-full lg:max-w-none lg:mb-8 lg:flex-col lg:items-stretch">
        <button 
          onClick={toggleSidebar} 
          className="lg:hidden p-2 -ml-2 mr-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div ref={searchRef} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for a subject..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
            }}
            onFocus={() => { if(searchQuery) setIsSearchOpen(true); }}
            className="w-full pl-10 pr-4 py-2 lg:py-3 border border-gray-200 dark:border-slate-700 rounded-full lg:rounded-xl bg-gray-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-colors text-gray-800 dark:text-gray-100"
          />
          {isSearchOpen && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-darkCard rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700/50 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 divide-y divide-gray-100 dark:divide-slate-700/50">
               <div className="p-3 bg-gray-50/50 dark:bg-slate-800/30">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search Results for "{searchQuery}"</span>
               </div>
               <button onClick={() => handleSearchNav('/assignment')} className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                  <BookOpen className="w-4 h-4 text-blue-500 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">View "{searchQuery}" <span className="font-bold text-blue-500">Assignments</span></span>
               </button>
               <button onClick={() => handleSearchNav('/exams')} className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                  <Calendar className="w-4 h-4 text-orange-500 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">View "{searchQuery}" <span className="font-bold text-orange-500">Exams</span></span>
               </button>
               <button onClick={() => handleSearchNav('/notes')} className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                  <BookOpen className="w-4 h-4 text-emerald-500 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">View "{searchQuery}" <span className="font-bold text-emerald-500">Notes</span></span>
               </button>
               <button onClick={() => handleSearchNav('/attendance')} className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">View "{searchQuery}" <span className="font-bold text-green-500">Attendance</span></span>
               </button>
               <button onClick={() => handleSearchNav('/timetable')} className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left group">
                  <Clock className="w-4 h-4 text-purple-500 mr-3 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">View "{searchQuery}" <span className="font-bold text-purple-500">Timetable</span></span>
               </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-6 ml-4 lg:flex-col lg:items-start lg:space-x-0 lg:space-y-4 lg:ml-0 lg:mt-auto lg:w-full">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 lg:p-3 lg:w-full lg:rounded-xl lg:bg-gray-50 lg:dark:bg-slate-800 lg:justify-start lg:font-medium lg:text-sm rounded-full flex items-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-300"
        >
          {darkMode ? <Sun className="w-5 h-5 lg:mr-3" /> : <Moon className="w-5 h-5 lg:mr-3" />}
          <span className="hidden lg:inline text-gray-700 dark:text-gray-200">{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
        </button>

        <div ref={notifRef} className="relative w-full lg:w-auto">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 lg:p-3 lg:w-full lg:rounded-xl lg:bg-gray-50 lg:dark:bg-slate-800 lg:justify-start lg:font-medium lg:text-sm rounded-full flex items-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-300 relative group"
          >
            <div className="relative">
               <Bell className="w-5 h-5 lg:mr-3" />
               {notifications.length > 0 && (
                 <>
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-darkCard z-10 font-bold">
                     {notifications.length}
                   </span>
                   <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full animate-ping opacity-75"></span>
                 </>
               )}
            </div>
            <span className="hidden lg:inline text-gray-700 dark:text-gray-200">Notifications</span>
          </button>
          
          {isNotifOpen && createPortal(
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setIsNotifOpen(false)}
            >
              <div 
                className="bg-white dark:bg-darkCard w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Bell className="w-6 h-6 text-secondary" />
                    Notifications
                  </h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsNotifOpen(false)}
                      className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto p-4 md:p-6 space-y-3">
                  {notifications.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 w-full h-full">
                       <CheckCircle className="w-16 h-16 text-green-400 opacity-50 mb-4" />
                       <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">All caught up!</p>
                       <p className="text-sm">You have no pending notifications.</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => { navigate(notif.link); setIsNotifOpen(false); }}
                          className="py-4 px-5 bg-gray-50/50 hover:bg-blue-50 dark:bg-slate-800/30 dark:hover:bg-slate-800 border border-gray-100 hover:border-blue-100 dark:border-slate-700/50 dark:hover:border-slate-600 rounded-2xl transition-all cursor-pointer group relative flex gap-4 md:gap-5 items-center"
                        >
                           <div className="shrink-0 p-3 bg-white dark:bg-darkCard rounded-xl shadow-sm border border-gray-100 dark:border-slate-700/50 group-hover:scale-105 transition-transform">
                             {notif.icon}
                           </div>
                           <div className="flex-1 min-w-0 pr-8">
                             <p className="text-base font-bold text-gray-800 dark:text-white truncate">{notif.title}</p>
                             <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug mt-1">{notif.message}</p>
                           </div>
                        </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
        
        {/* User Info */}
        <div className="hidden lg:block px-1 py-3 border-t border-gray-100 dark:border-slate-700/50 mt-2">
          <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{user?.displayName || 'Student'}</p>
          <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
        </div>

        {/* Contact Me - Desktop */}
        <div className="hidden lg:block px-1 py-4 border-t border-gray-100 dark:border-slate-700/50 mt-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-1">Contact Me</p>
          <div className="flex gap-3">
            <a href="https://www.instagram.com/02._.kavya?igsh=bDNkNHVpOWx2d25q" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://github.com/kavya0205" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-gray-800 dark:bg-gray-700 text-white shadow-md hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/kavya0205" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-blue-600 text-white shadow-md hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>

        {/* Desktop import/export */}
        <div className="hidden lg:block">
          <ImportExport />
        </div>

        <button 
          onClick={logout}
          className="flex items-center justify-center lg:justify-start lg:w-full bg-secondary hover:bg-blue-600 transition-colors text-white text-sm font-medium py-2 lg:py-3 px-3 md:px-4 rounded-lg lg:rounded-xl shadow-sm shadow-blue-500/20 mt-0 lg:mt-2">
          <LogOut className="w-4 h-4 md:mr-2 lg:mr-3" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
