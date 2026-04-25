import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './components/Dashboard';
import Timetable from './components/Timetable';
import Assignment from './components/Assignment';
import Notes from './components/Notes';
import Exams from './components/Exams';
import Attendance from './components/Attendance';
import AuthPage from './components/AuthPage';
import TodoList from './components/TodoList';
import GroupDiscussion from './components/GroupDiscussion';

// Inner app — only rendered when authenticated
const AppShell = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  if (!user) return <AuthPage />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-darkBase transition-colors duration-200">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] lg:hidden overflow-hidden cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <Topbar
          toggleTheme={toggleTheme}
          darkMode={darkMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 overflow-y-scroll p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/assignment" element={<Assignment />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/todo-list" element={<TodoList />} />
            <Route path="/group-discussion" element={<GroupDiscussion />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
