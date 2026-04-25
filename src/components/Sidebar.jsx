import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  FileEdit,
  BookOpen, 
  FileText, 
  ClipboardList, 
  Users,
  CheckSquare,
  X,
  User
} from 'lucide-react';
import Profile from './Profile';
import ImportExport from './ImportExport';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Timetable', icon: Calendar, path: '/timetable' },
    { name: 'Assignment', icon: FileEdit, path: '/assignment' },
    { name: 'Notes', icon: BookOpen, path: '/notes' },
    { name: 'Exams', icon: FileText, path: '/exams' },
    { name: 'Attendance', icon: ClipboardList, path: '/attendance' },
    { name: 'To Do List', icon: CheckSquare, path: '/todo-list' },
    { name: 'Group Discussion', icon: Users, path: '/group-discussion' }
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  return (
    <>
      <aside className={`
        w-64 bg-white dark:bg-darkCard h-full flex flex-col shadow-sm transition-transform duration-300
        fixed z-[100] top-0 left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:w-full lg:h-16 lg:flex-row lg:relative lg:translate-x-0 lg:pt-0 lg:pb-0 lg:items-center lg:z-40 lg:flex-shrink-0 lg:border-b dark:lg:border-slate-700/50
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 lg:pt-0 lg:pb-0 lg:mb-0 lg:w-64 lg:shrink-0 lg:h-full">
          <div className="flex items-center w-full max-w-[240px]">
            <div className="flex items-center justify-start pointer-events-none">
              <span style={{ fontFamily: "'Trebuchet MS', 'Trebuchet', sans-serif", fontSize: '1.75rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-secondary, #3b82f6)' }} className="dark:text-blue-400 select-none">
                StuRAN
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto lg:overflow-visible w-full px-4 lg:px-8 space-y-1 lg:space-y-0 lg:flex lg:items-center lg:space-x-1 lg:h-full lg:py-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 lg:py-2 lg:px-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-secondary text-white shadow-md shadow-blue-500/30'
                    : 'text-gray-500 hover:bg-blue-50 hover:text-secondary dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 border-l-4 border-transparent'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* ── Mobile-only bottom section ── */}
        <div className="lg:hidden px-4 pb-5 space-y-4 border-t border-gray-100 dark:border-slate-700/50 mt-2 pt-4">

          {/* Import / Export */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4 mb-1">Data Backup</p>
            <ImportExport compact={true} />
          </div>

          {/* Social Links */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-4 mb-2">Contact Me</p>
            <div className="flex gap-2 px-4">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/02._.kavya?igsh=bDNkNHVpOWx2d25q"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white text-[10px] font-bold shadow-sm hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Insta
              </a>
              {/* GitHub */}
              <a
                href="https://github.com/kavya0205"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-gray-800 dark:bg-gray-700 text-white text-[10px] font-bold shadow-sm hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/kavya0205"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold shadow-sm hover:scale-105 transition-transform"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

          {/* Profile */}
          <div className="border-t border-gray-100 dark:border-slate-700/50 pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 select-none shadow-md">
                {getInitials(user?.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{user?.displayName || 'Student'}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { setIsOpen(false); setShowProfile(true); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-blue-500/20"
            >
              <User className="w-4 h-4" />
              View Profile
            </button>
          </div>

        </div>
      </aside>

      <Profile isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
};

export default Sidebar;
