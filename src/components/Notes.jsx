import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X, Trash2, FolderPen, UploadCloud, ChevronRight, File, Search } from 'lucide-react';
import { db, storage } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';

const Notes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchQuery = new URLSearchParams(search).get('query')?.toLowerCase() || '';
  const [noteGroups, setNoteGroups] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Subject, 2: Files/Descriptions
  const [targetGroupId, setTargetGroupId] = useState(null); // if set, we're adding to existing group
  const [currentSubject, setCurrentSubject] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewingGroupId, setViewingGroupId] = useState(null); // for "Show all files" popup
  const [isUploading, setIsUploading] = useState(false);

  // Load from Firestore
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'data', 'notes');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setNoteGroups(snap.data().groups || []);
      else setNoteGroups([]);
    });
    return unsub;
  }, [user]);

  const saveGroups = async (updated) => {
    setNoteGroups(updated);
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'data', 'notes'), { groups: updated });
  };

  const getInitialColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-emerald-500'
    ];
    let hash = 0;
    if (!name) return colors[0];
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Open modal for a NEW subject group (step 1: ask subject name)
  const openNewModal = () => {
    setTargetGroupId(null);
    setCurrentSubject('');
    setSelectedFiles([]);
    setModalStep(1);
    setIsModalOpen(true);
  };

  // Open modal to ADD files to an EXISTING group (skip step 1, go straight to upload)
  const openAddModal = (groupId) => {
    const group = noteGroups.find(g => g.id === groupId);
    setTargetGroupId(groupId);
    setCurrentSubject(group.subject);
    setSelectedFiles([]);
    setModalStep(2);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
        name: file.name,
        description: '',
        size: (file.size / 1024).toFixed(1) + ' KB',
        id: Math.random().toString(36).substr(2, 9),
        file: file, // keep actual file
        type: file.type
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const updateFileDescription = (id, desc) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, description: desc } : f));
  };

  const removeSelectedFile = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const saveNotes = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    console.log("Notes: Preparing to save...");
    try {
      const uploadedFiles = await Promise.all(selectedFiles.map(async (item) => {
        if (!item.file) return item; 
        const storageRef = ref(storage, `users/${user.uid}/notes/${Date.now()}_${item.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, item.file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          size: item.size,
          type: item.type,
          data: downloadURL // URL
        };
      }));

      let updatedGroups;
      if (targetGroupId) {
        // Append to existing group
        updatedGroups = noteGroups.map(g =>
          g.id === targetGroupId ? { ...g, files: [...g.files, ...uploadedFiles] } : g
        );
      } else {
        // Create new group
        if (!currentSubject.trim()) {
           setIsUploading(false);
           return;
        }
        updatedGroups = [{
          id: Date.now(),
          subject: currentSubject.trim(),
          files: uploadedFiles,
          date: new Date().toLocaleDateString()
        }, ...noteGroups];
      }
      
      await saveGroups(updatedGroups);
      
      // Cleanup
      setCurrentSubject('');
      setSelectedFiles([]);
      setTargetGroupId(null);
      setIsUploading(false);
      setIsModalOpen(false);
    } catch (err) {
      setIsUploading(false);
      console.error("Error saving notes:", err);
      alert("Failed to save notes. Please check your connection.");
    }
  };

  const deleteGroup = (id) => {
    const updated = noteGroups.filter(g => g.id !== id);
    saveGroups(updated);
  };

  const deleteFile = (groupId, fileId) => {
    const updated = noteGroups.map(g =>
      g.id === groupId ? { ...g, files: g.files.filter(f => f.id !== fileId) } : g
    ).filter(g => g.files.length > 0);
    saveGroups(updated);
  };

  const viewingGroup = noteGroups.find(g => g.id === viewingGroupId);

  const openFile = (file) => {
    if (!file.data) return;
    if (file.data.startsWith('http')) {
       window.open(file.data, '_blank');
       return;
    }
    const win = window.open();
    if (win) {
      win.document.write(
        `<html><body style="margin:0;background:#000"><iframe src="${file.data}" style="width:100%;height:100vh;border:none;"></iframe></body></html>`
      );
      win.document.title = file.name;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Note Vault</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Organize and access your study materials</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
        >
          <UploadCloud className="w-5 h-5 mr-2" />
          Upload Notes
        </button>
      </div>

      {searchQuery && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between shadow-sm">
           <span className="text-sm font-medium flex items-center gap-2">
             <Search className="w-4 h-4" />
             Showing results for <span className="font-bold">"{searchQuery}"</span>
           </span>
           <button onClick={() => navigate('/notes', { replace: true })} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-colors">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      {/* Empty State / Content */}
      {(() => {
        const displayedGroups = searchQuery ? noteGroups.filter(g => g.subject.toLowerCase().includes(searchQuery)) : noteGroups;

        if (displayedGroups.length === 0) {
          return (
            <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 p-16 text-center">
              <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <UploadCloud className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{searchQuery ? `No notes found for "${searchQuery}"` : 'Ready to upload notes?'}</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                {searchQuery ? 'Try redefining your search term or upload a new file.' : 'Start by clicking the upload button above to organize your files by subject.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={openNewModal}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                >
                  Get Started
                </button>
              )}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedGroups.map(group => {
              const hasMultiple = group.files.length > 1;

              return (
                <div key={group.id} className="bg-white dark:bg-darkCard rounded-[2.5rem] border-2 border-gray-100 dark:border-slate-700/50 shadow-sm p-6 flex flex-row items-start gap-6 transition-all">
                {/* Left: Avatar */}
                <div className={`shrink-0 w-28 h-28 rounded-[2rem] ${getInitialColor(group.subject)} flex items-center justify-center text-6xl font-light text-white shadow-inner shadow-black/10`}>
                  {group.subject.charAt(0).toUpperCase()}
                </div>

                {/* Right: Content */}
                <div className="flex-1 min-w-0 flex flex-col pt-1">
                  {/* Title + Delete */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-2xl font-medium text-gray-800 dark:text-gray-100 truncate">{group.subject}</h3>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Subject Module • {group.files.length} {group.files.length === 1 ? 'File' : 'Files'}</p>
                    </div>
                    <button onClick={() => deleteGroup(group.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Files Section */}
                  {hasMultiple ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <button
                            onClick={() => openFile(group.files[0])}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate text-left"
                          >
                            {group.files[0].name}
                          </button>
                        </div>
                        {group.files[0].description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 ml-5 leading-tight">{group.files[0].description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setViewingGroupId(group.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors mt-1"
                      >
                        <File className="w-3.5 h-3.5" />
                        Show all {group.files.length} files
                      </button>
                    </div>
                  ) : (
                      // Show single file directly
                    <div className="space-y-2">
                      {group.files.map(file => (
                        <div key={file.id} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700/50 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <button
                              onClick={() => openFile(file)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate text-left"
                            >
                              {file.name}
                            </button>
                          </div>
                          {file.description && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 ml-5 leading-tight">{file.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Notes button */}
                  <button
                    onClick={() => openAddModal(group.id)}
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Notes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* All Files Popup Modal */}
      {viewingGroupId && viewingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            {/* Popup Header */}
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700/50 shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${getInitialColor(viewingGroup.subject)} flex items-center justify-center text-white font-bold text-lg`}>
                  {viewingGroup.subject.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">{viewingGroup.subject}</h2>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{viewingGroup.files.length} Files</p>
                </div>
              </div>
              <button onClick={() => setViewingGroupId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Files List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {viewingGroup.files.map(file => (
                <div key={file.id} className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <File className="w-4 h-4 text-blue-500 shrink-0" />
                      <button
                        onClick={() => openFile(file)}
                        className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline break-all text-left"
                      >
                        {file.name}
                      </button>
                    </div>
                    <button
                      onClick={() => deleteFile(viewingGroupId, file.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {file.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6 leading-relaxed">{file.description}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t dark:border-slate-700/50 shrink-0">
              <button
                onClick={() => { setViewingGroupId(null); openAddModal(viewingGroupId); }}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add More Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-darkCard rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-3xl">
              <h2 className="text-xl font-bold dark:text-white">
                {targetGroupId ? `Add Notes — ${currentSubject}` : 'Upload Subject Notes'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              {/* Step 1: Subject Name (only for new groups) */}
              {modalStep === 1 && !targetGroupId ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 rounded-3xl flex items-center justify-center mx-auto mb-2 text-blue-500">
                    <FolderPen className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold dark:text-white">Enter Subject Name</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">What subject do these notes belong to?</p>
                  </div>
                  <input
                    type="text"
                    value={currentSubject}
                    onChange={(e) => setCurrentSubject(e.target.value)}
                    placeholder="e.g. Biochemistry"
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all dark:text-white"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && currentSubject.trim() && setModalStep(2)}
                  />
                  <button
                    disabled={!currentSubject.trim()}
                    onClick={() => setModalStep(2)}
                    className="w-full bg-blue-500 disabled:opacity-50 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
                  >
                    Next Step <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              ) : (
                /* Step 2: Upload Files */
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-3xl p-8 hover:border-blue-500 transition-colors group cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center text-center">
                      <UploadCloud className="w-12 h-12 text-gray-300 group-hover:text-blue-500 transition-colors mb-3" />
                      <p className="text-sm font-bold dark:text-gray-200">Click or drag to add files</p>
                      <p className="text-xs text-gray-400 mt-1">Images, PDFs, Docs allowed</p>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Files to Upload ({selectedFiles.length})</h4>
                      {selectedFiles.map(file => (
                        <div key={file.id} className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 min-w-0">
                              <File className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs font-bold text-blue-500 truncate">{file.name}</span>
                            </div>
                            <button onClick={() => removeSelectedFile(file.id)} className="text-gray-400 hover:text-red-500 shrink-0 ml-2">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            value={file.description}
                            onChange={(e) => updateFileDescription(file.id, e.target.value)}
                            placeholder="Add a short description for this file..."
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white resize-none"
                            rows="2"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-4">
                    {!targetGroupId && (
                      <button
                        onClick={() => setModalStep(1)}
                        className="flex-1 py-4 px-6 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                      >
                        Back
                      </button>
                    )}
                    <button
                      disabled={selectedFiles.length === 0 || isUploading}
                      onClick={saveNotes}
                      className="flex-[2] bg-blue-500 disabled:opacity-50 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                         <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Uploading...</>
                      ) : (
                         targetGroupId ? 'Add to Collection' : 'Complete Upload'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;
