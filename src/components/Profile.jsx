import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { X, User, Mail, Phone, BookOpen, Hash, Building2, Calendar, Shield, Check, AlertCircle, Eye, EyeOff, Pencil } from 'lucide-react';

const Profile = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    rollNo: '', course: '', session: '', semester: '',
    phone: '', collegeId: '', dob: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Password change (email/password users only)
  const isEmailUser = user?.providerData?.[0]?.providerId === 'password';
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [rePass, setRePass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRe, setShowRe] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Avatar initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  };

  useEffect(() => {
    if (!user || !isOpen) return;
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'data', 'profile'));
      if (snap.exists()) setProfile(p => ({ ...p, ...snap.data() }));
    };
    fetchProfile();
  }, [user, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await setDoc(doc(db, 'users', user.uid, 'data', 'profile'), profile, { merge: true });
      setSaveMsg('Profile saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch {
      setSaveMsg('Error saving. Try again.');
    }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg(''); setPassError('');
    if (newPass !== rePass) { setPassError('New passwords do not match.'); return; }
    if (newPass.length < 6) { setPassError('Password must be at least 6 characters.'); return; }
    setPassLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setPassMsg('Password changed successfully!');
      setCurrentPass(''); setNewPass(''); setRePass('');
      setTimeout(() => setPassMsg(''), 3000);
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPassError('Current password is incorrect.');
      } else {
        setPassError('Failed to change password. Try again.');
      }
    }
    setPassLoading(false);
  };

  if (!isOpen) return null;

  const inputClass = "w-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";
  const labelClass = "text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block";
  const readonlyClass = "w-full bg-gray-100 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-darkCard w-full max-w-2xl max-h-[95vh] flex flex-col rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner with avatar embedded */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 shrink-0" style={{ height: '110px' }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors text-white z-10">
            <X className="w-5 h-5" />
          </button>
          {/* Avatar — positioned to half-overflow the bottom of the banner */}
          <div className="absolute left-7 bottom-0 translate-y-1/2 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl select-none border-4 border-white dark:border-darkCard z-20">
            {getInitials(user?.displayName)}
          </div>
        </div>

        {/* Name row — top padding reserves space for the half-protruding avatar */}
        <div className="px-7 pt-14 pb-3 shrink-0">
          <h2 className="text-lg font-black text-gray-800 dark:text-white leading-tight">{user?.displayName || 'Student'}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-7 pb-7 space-y-6">

          {/* Personal Info */}
          <div>
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700/50 pb-2">
              <User className="w-4 h-4 text-blue-500" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Full Name</label>
                <div className={readonlyClass}>{user?.displayName || '—'}</div>
              </div>
              <div>
                <label className={labelClass}>Gmail (Read-only)</label>
                <div className={readonlyClass}>{user?.email}</div>
              </div>
              <div>
                <label className={labelClass}>Roll Number</label>
                <input className={inputClass} placeholder="e.g. 2024BCA001" value={profile.rollNo} onChange={e => setProfile(p => ({ ...p, rollNo: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} placeholder="e.g. +91 9876543210" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" className={inputClass} value={profile.dob} onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div>
            <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700/50 pb-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Academic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Course</label>
                <input className={inputClass} placeholder="e.g. BCA, B.Tech" value={profile.course} onChange={e => setProfile(p => ({ ...p, course: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Semester</label>
                <input className={inputClass} placeholder="e.g. IV" value={profile.semester} onChange={e => setProfile(p => ({ ...p, semester: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Session</label>
                <input className={inputClass} placeholder="e.g. 2023 - 2026" value={profile.session} onChange={e => setProfile(p => ({ ...p, session: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>College ID</label>
                <input className={inputClass} placeholder="e.g. COL-2024-001" value={profile.collegeId} onChange={e => setProfile(p => ({ ...p, collegeId: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 text-sm"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> : <Check className="w-4 h-4" />}
              Save Profile
            </button>
            {saveMsg && (
              <span className={`text-sm font-medium flex items-center gap-1.5 ${saveMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                {saveMsg.includes('Error') ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {saveMsg}
              </span>
            )}
          </div>

          {/* Change Password (only for email/password sign up users) */}
          {isEmailUser && (
            <div>
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700/50 pb-2">
                <Shield className="w-4 h-4 text-orange-500" /> Change Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className={labelClass}>Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className={inputClass + ' pr-10'}
                      placeholder="Enter your current password"
                      value={currentPass}
                      onChange={e => setCurrentPass(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      className={inputClass + ' pr-10'}
                      placeholder="Enter new password (min. 6 chars)"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Re-enter New Password</label>
                  <div className="relative">
                    <input
                      type={showRe ? 'text' : 'password'}
                      className={inputClass + ' pr-10'}
                      placeholder="Confirm your new password"
                      value={rePass}
                      onChange={e => setRePass(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowRe(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showRe ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-medium bg-red-50 dark:bg-red-500/10 px-4 py-2.5 rounded-xl border border-red-100 dark:border-red-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {passError}
                  </div>
                )}
                {passMsg && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 dark:bg-green-500/10 px-4 py-2.5 rounded-xl border border-green-100 dark:border-green-500/20">
                    <Check className="w-4 h-4 shrink-0" /> {passMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passLoading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95 text-sm"
                >
                  {passLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> : <Shield className="w-4 h-4" />}
                  Update Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
