import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { exportAllData, importAllData } from '../utils/dataPortability';
import { Download, Upload, X, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

const ImportExport = ({ compact = false }) => {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // null | 'exporting' | 'importing' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleExport = async () => {
    setStatus('exporting');
    setMessage('');
    try {
      const csv = await exportAllData(user.uid);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `StuRAN_Backup_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus('success');
      setMessage('All data exported successfully!');
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus('error');
      setMessage('Export failed. Please try again.');
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setStatus('importing');
    setMessage('');
    try {
      const text = await file.text();
      await importAllData(user.uid, text);
      setStatus('success');
      setMessage('Data imported! Refresh the page to see all changes.');
      setTimeout(() => { setStatus(null); setShowModal(false); }, 4000);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Import failed. Make sure you use a valid StuRAN export file.');
      setTimeout(() => setStatus(null), 5000);
    }
  };

  if (compact) {
    // Compact mode for sidebar/mobile
    return (
      <div className="space-y-2">
        <button
          onClick={handleExport}
          disabled={status === 'exporting' || status === 'importing'}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:bg-blue-50 hover:text-secondary dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 border-l-4 border-transparent disabled:opacity-50"
        >
          {status === 'exporting'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Upload className="w-5 h-5" />}
          Export Data
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={status === 'exporting' || status === 'importing'}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:bg-green-50 hover:text-green-600 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-green-400 border-l-4 border-transparent disabled:opacity-50"
        >
          {status === 'importing'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Download className="w-5 h-5" />}
          Import Data
        </button>

        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />

        {status === 'success' && (
          <div className="flex items-start gap-2 text-green-600 text-xs bg-green-50 dark:bg-green-500/10 px-3 py-2 rounded-xl">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-start gap-2 text-red-500 text-xs bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }

  // Full mode for topbar (desktop)
  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={status === 'exporting' || status === 'importing'}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-secondary rounded-xl transition-colors text-sm font-bold border border-blue-100 dark:border-blue-500/20 disabled:opacity-50"
      >
        {status === 'exporting'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Upload className="w-4 h-4" />}
        <span className="hidden xl:inline">Export</span>
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'exporting' || status === 'importing'}
        className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl transition-colors text-sm font-bold border border-green-100 dark:border-green-500/20 disabled:opacity-50"
      >
        {status === 'importing'
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Download className="w-4 h-4" />}
        <span className="hidden xl:inline">Import</span>
      </button>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />

      {(status === 'success' || status === 'error') && (
        <div className={`absolute top-full right-0 mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border shadow-lg z-50 ${status === 'success' ? 'text-green-600 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' : 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'}`}>
          {status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="whitespace-nowrap">{message}</span>
        </div>
      )}
    </div>
  );
};

export default ImportExport;
