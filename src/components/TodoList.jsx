import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { LayoutList, Plus, Trash2, Check, Clock, Calendar, ChevronDown, Edit2, Play, Pause, Square } from 'lucide-react';

const TodoList = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [duration, setDuration] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const [studyGoal, setStudyGoal] = useState(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(0); // in seconds

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const saveStudyGoal = async (e) => {
    e.preventDefault();
    if (!goalInput || isNaN(goalInput)) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid, 'data', 'study_goal'), {
        targetHours: Number(goalInput),
        date: Date.now()
      });
      setStudyGoal(Number(goalInput));
      setIsGoalModalOpen(false);
    } catch (err) {
      console.error("Error saving goal:", err);
    }
  };

  // Fetch or ask for today's study goal
  useEffect(() => {
    if (!user) return;
    const fetchGoal = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'study_goal');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (isToday(data.date)) {
            setStudyGoal(data.targetHours);
            return;
          }
        }
        setIsGoalModalOpen(true);
      } catch (err) {
        console.error("Error fetching study goal:", err);
      }
    };
    fetchGoal();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stopwatch Logic
  const handleStopStopwatch = async (finalTime) => {
    setSwRunning(false);
    if (finalTime === 0) return;
    
    let hours = +(finalTime / 3600).toFixed(2);
    if (hours < 0.01) hours = 0.01;

    try {
      await addDoc(collection(db, 'users', user.uid, 'todos'), {
        text: 'Study Session',
        priority: 'Medium',
        duration: hours,
        completed: true,
        completedAt: Date.now(),
        createdAt: Date.now()
      });
      setSwElapsed(0);
    } catch (err) {
      console.error("Error saving stopwatch session:", err);
    }
  };

  useEffect(() => {
    let interval = null;
    if (swRunning) {
      interval = setInterval(() => {
        setSwElapsed(prev => {
          if (prev >= 3599) {
            handleStopStopwatch(3600);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (!swRunning && swElapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [swRunning]);

  // Fetch Todos
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'users', user.uid, 'todos');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setTodos(data);
    });
    return unsub;
  }, [user]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'todos'), {
        text: newTask.trim(),
        priority,
        duration: duration || null,
        completed: false,
        completedAt: null,
        createdAt: Date.now()
      });
      setNewTask('');
      setPriority('Medium');
      setDuration('');
    } catch (err) {
      console.error("Error adding todo:", err);
    }
  };

  const toggleTodo = async (id, currentStatus) => {
    const ref = doc(db, 'users', user.uid, 'todos', id);
    if (!currentStatus) {
      // Marking as completed
      await updateDoc(ref, { completed: true, completedAt: Date.now() });
    } else {
      // Reverting to active
      await updateDoc(ref, { completed: false, completedAt: null });
    }
  };

  const deleteTodo = async (id) => {
    await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
  };

  const activeTodos = todos.filter(t => !t.completed);
  // Only show completed tasks if they were completed today
  const completedTodos = todos.filter(t => t.completed && isToday(t.completedAt || t.createdAt));

  const getPriorityColor = (level) => {
    switch (level) {
      case 'High': return 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      case 'Medium': return 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20';
      case 'Low': return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
      default: return 'text-gray-500';
    }
  };

  const priorityOptions = ['High', 'Medium', 'Low'];

  return (
    <div className="max-w-4xl mx-auto space-y-8 w-full animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-secondary/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center -rotate-6">
            <LayoutList className="w-7 h-7 text-secondary dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">To-Do List</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Keep track of your daily tasks</p>
          </div>
        </div>
        {studyGoal !== null && (
          <div className="bg-white dark:bg-darkCard px-4 py-3 rounded-2xl border border-gray-100 dark:border-slate-700/50 flex items-center gap-4 shadow-sm group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Today's Target</p>
                <p className="text-lg font-black text-gray-800 dark:text-white">{studyGoal} Hours</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setGoalInput(studyGoal.toString());
                setIsGoalModalOpen(true);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 hover:text-blue-500 transition-colors opacity-60 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Stopwatch Section */}
      <div className="bg-white dark:bg-darkCard rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col md:flex-row items-center gap-6 relative z-20">
         <div className="flex-1 w-full">
            <div className="flex justify-between text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
               <span>Study Stopwatch</span>
               <span>{Math.floor(swElapsed / 60)}:{(swElapsed % 60).toString().padStart(2, '0')} / 60:00</span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                 style={{ width: `${Math.min(100, (swElapsed / 3600) * 100)}%` }}
               ></div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            {!swRunning ? (
              <button onClick={() => setSwRunning(true)} className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
                <Play className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setSwRunning(false)} className="p-3 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
                <Pause className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => handleStopStopwatch(swElapsed)} className="p-3 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
              <Square className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Input Section */}
      <form onSubmit={handleAddTodo} className="bg-white dark:bg-darkCard rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col md:flex-row gap-4 relative z-20">
        <div className="flex-1">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-transparent focus:border-secondary focus:ring-4 focus:ring-secondary/10 dark:focus:ring-secondary/20 outline-none transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400 font-medium"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          
          {/* Custom Modern Dropdown */}
          <div className="relative min-w-[140px]" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 outline-none text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
            >
              <span>{priority} Priority</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-xl overflow-hidden py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setPriority(opt);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                      priority === opt 
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-secondary' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {opt} Priority
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration (hrs)"
            className="w-full sm:w-40 px-4 py-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl border border-transparent focus:border-secondary outline-none text-sm font-medium text-gray-600 dark:text-gray-100 placeholder-gray-400 transition-all"
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            className="bg-secondary disabled:opacity-50 hover:bg-blue-600 hover:-translate-y-0.5 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center shrink-0"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-secondary"></span>
              Active Tasks
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg">{activeTodos.length}</span>
          </div>

          {activeTodos.length === 0 ? (
            <div className="bg-gray-50/50 dark:bg-slate-800/20 border-2 border-dashed border-gray-200 dark:border-slate-700/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
               <Check className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-2" />
               <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTodos.map(todo => (
                <div key={todo.id} className="relative group bg-white dark:bg-darkCard rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-500/50 transition-colors flex items-start gap-4">
                  <button 
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 dark:border-slate-600 flex items-center justify-center group-hover:border-secondary transition-colors"
                  ></button>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-gray-800 dark:text-gray-100 font-medium leading-snug break-words">{todo.text}</p>
                    <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                      <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}>
                        {todo.priority}
                      </span>
                      {todo.duration && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {todo.duration} hrs
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Created At Badge - Always visible top right */}
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <Calendar className="w-3 h-3" />
                    {new Date(todo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>

                  {/* Delete Button - Appears on Hover */}
                  <button onClick={() => deleteTodo(todo.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white opacity-70">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Completed Today
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg opacity-70">{completedTodos.length}</span>
          </div>

          <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
            {completedTodos.length === 0 ? (
               <p className="text-sm text-gray-400 dark:text-gray-500 p-2 pl-4 border-l-2 border-gray-200 dark:border-slate-700">No tasks completed today.</p>
            ) : (
              completedTodos.map(todo => (
                <div key={todo.id} className="relative group bg-white dark:bg-darkCard rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-start gap-4">
                  <button 
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center text-white cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="text-gray-500 dark:text-gray-500 line-through font-medium leading-snug break-words">{todo.text}</p>
                  </div>
                  
                  {/* Created At / Done badge */}
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1 pointer-events-none group-hover:opacity-0 transition-opacity">
                    <Calendar className="w-3 h-3" />
                    {new Date(todo.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>

                  <button onClick={() => deleteTodo(todo.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-secondary"></div>
            
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-secondary dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 -rotate-6">
              <Clock className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Set Today's Goal</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">What are your target study hours for today?</p>
            
            <form onSubmit={saveStudyGoal} className="space-y-6">
              <div>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  autoFocus
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-xl font-bold text-gray-800 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-center"
                />
              </div>
              <button
                type="submit"
                disabled={!goalInput || isNaN(goalInput) || Number(goalInput) <= 0}
                className="w-full py-4 bg-secondary disabled:opacity-50 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Set Goal & Start Day
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TodoList;
