import React from 'react';
import { Users, Sparkles, Clock } from 'lucide-react';

const GroupDiscussion = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center transform rotate-12 shadow-lg shadow-blue-500/20">
          <Users className="w-12 h-12 text-blue-500" />
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center transform -rotate-12 shadow-md animate-pulse">
          <Sparkles className="w-5 h-5 text-orange-500" />
        </div>
      </div>

      <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4 tracking-tight">
        Group Discussion
      </h1>
      
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 px-6 py-3 rounded-full border border-blue-100 dark:border-slate-700 shadow-sm mb-6">
        <Clock className="w-5 h-5 text-secondary" />
        <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 uppercase tracking-widest">
          Will be available soon
        </span>
      </div>

      <p className="max-w-md text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
        We're currently building an amazing collaborative space where you can connect, chat, and share ideas instantly with your peers.
      </p>
    </div>
  );
};

export default GroupDiscussion;
