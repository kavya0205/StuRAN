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
            : <Download className="w-5 h-5" />}
          Export Data
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={status === 'exporting' || status === 'importing'}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:bg-green-50 hover:text-green-600 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-green-400 border-l-4 border-transparent disabled:opacity-50"
        >
          {status === 'importing'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Upload className="w-5 h-5" />}
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
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-secondary rounded-xl transition-colors text-sm font-bold border border-blue-100 dark:border-blue-500/20"
      >
        <Database className="w-4 h-4" />
        <span className="hidden xl:inline">Backup</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-darkCard w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Data Backup</h2>
                  <p className="text-blue-100 text-xs">Export or import all your StuRAN data</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Export */}
              <div className="border border-gray-100 dark:border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm">Export All Data</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Download all your assignments, exams, notes, todos, timetables and attendance as a CSV backup file.</p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={status === 'exporting' || status === 'importing'}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-blue-500/20 text-sm"
                >
                  {status === 'exporting'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
                    : <><Download className="w-4 h-4" /> Download Backup</>}
                </button>
              </div>

              {/* Import */}
              <div className="border border-gray-100 dark:border-slate-700/50 rounded-2xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm">Import Data</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Restore data from a previously exported StuRAN CSV file. Existing records with the same ID will be overwritten.</p>
                  </div>
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={status === 'exporting' || status === 'importing'}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-green-500/20 text-sm"
                >
                  {status === 'importing'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                    : <><Upload className="w-4 h-4" /> Choose CSV File</>}
                </button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
              </div>

              {/* Status Messages */}
              {status === 'success' && (
                <div className="flex items-start gap-3 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-2xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">{message}</p>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{message}</p>
                </div>
              )}

              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                ⚠️ Note: File attachments in Notes are not included in the backup.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImportExport;
