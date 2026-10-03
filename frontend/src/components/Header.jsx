import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BriefcaseBusiness, User, LogOut, Mail, LockKeyhole, Check, X } from 'lucide-react';
import api from '../api/axios.config.js';
import { toast } from 'sonner';

const Header = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [profileDialog, setProfileDialog] = useState(null);
  const [profileForm, setProfileForm] = useState({ email: '', phoneNumber: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/', '/auth', '/login', '/register', '/welcome'].includes(pathname) || pathname.startsWith('/login/');
  const accountType = account?.role === 'HR' || account?.role === 'Admin'
    ? 'Recruiter'
    : account?.role === 'Employee'
      ? 'Employee'
      : 'Candidate';
  const isCompanyAdmin = ['HR', 'Admin'].includes(account?.role);
  const pageTitle = pathname === '/login/recruiter'
    ? 'Recruiter login'
    : pathname === '/login/candidate'
      ? 'Candidate login'
      : 'Choose account';

  useEffect(() => {
    const syncAccount = () => {
      try {
        setAccount(JSON.parse(localStorage.getItem('user') || 'null'));
      } catch {
        setAccount(null);
      }
    };

    try {
      setAccount(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      setAccount(null);
    }

    window.addEventListener('app:account-updated', syncAccount);
    return () => window.removeEventListener('app:account-updated', syncAccount);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAccount(null);
    setProfileOpen(false);
    navigate('/');
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  const toggleNotifications = () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);
    setProfileOpen(false);
    if (nextOpen) loadNotifications();
  };

  const markNotificationRead = async (notification) => {
    if (notification.readAt) return;
    try {
      const response = await api.patch(`/notifications/${notification.id}/read`);
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: response.data.readAt } : item));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update notification.');
    }
  };

  const openContactSettings = async () => {
    setProfileOpen(false);
    try {
      const response = await api.get('/auth/profile');
      setProfileForm({ email: response.data.email || '', phoneNumber: response.data.phoneNumber || '' });
      setProfileDialog('contact');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load contact information.');
    }
  };

  const saveContactSettings = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      const response = await api.put('/auth/profile', profileForm);
      const updatedAccount = { ...account, email: response.data.email };
      localStorage.setItem('user', JSON.stringify(updatedAccount));
      setAccount(updatedAccount);
      toast.success('Contact information updated.');
      setProfileDialog(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update contact information.');
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    setProfileSaving(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully.');
      setProfileDialog(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not change password.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (isAuthPage) return null;

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm sm:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-dark-green text-white">
          <BriefcaseBusiness size={21} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="max-w-[55vw] truncate text-base font-bold text-slate-900 sm:max-w-[28rem] sm:text-lg">
            {account?.name || pageTitle}
          </h1>
          <p className="text-xs text-slate-500">{account ? accountType : 'AI Recruitment workspace'}</p>
        </div>
      </div>

      {!isAuthPage && <div className="relative flex items-center gap-3">
        <div className="relative">
          <button aria-label="Notifications" aria-expanded={notificationOpen} onClick={toggleNotifications} className="relative rounded-md p-2 text-slate-500 transition hover:bg-brand-green hover:text-brand-dark-green">
            <Bell size={20} />
            {notifications.some((notification) => !notification.readAt) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}
          </button>
          {notificationOpen && (
            <div className="absolute right-0 top-12 z-40 w-[min(22rem,90vw)] rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
                <button type="button" aria-label="Close notifications" onClick={() => setNotificationOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? <p className="p-4 text-sm text-slate-500">Loading notifications...</p> : notifications.length === 0 ? <p className="p-4 text-sm text-slate-500">You’re all caught up.</p> : notifications.map((notification) => (
                  <button key={notification.id} type="button" onClick={() => markNotificationRead(notification)} className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${notification.readAt ? '' : 'bg-emerald-50/60'}`}>
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-slate-300' : 'bg-emerald-600'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                      <span className="mt-1 block text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</span>
                    </span>
                    {!notification.readAt && <Check size={15} className="mt-1 shrink-0 text-emerald-700" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => { setProfileOpen(!profileOpen); setNotificationOpen(false); }}
          aria-label="Open profile menu"
          className="rounded-md border border-slate-200 bg-white p-2 text-brand-dark-green transition hover:bg-brand-green"
        >
          <User size={24} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 z-40 flex w-64 flex-col gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            <div className="border-b p-2">
              <p className="text-sm font-semibold text-gray-800">{account?.name || 'My Profile'}</p>
              {account && <p className="mt-1 text-xs text-gray-500">{accountType}</p>}
            </div>
            {isCompanyAdmin && <>
              <button onClick={openContactSettings} className="flex items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 hover:bg-brand-green"><Mail size={15} /> Update contact info</button>
              <button onClick={() => { setProfileOpen(false); setProfileDialog('password'); }} className="flex items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 hover:bg-brand-green"><LockKeyhole size={15} /> Change password</button>
            </>}
            <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm text-gray-700 hover:bg-brand-green">
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>}

      {profileDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={profileDialog === 'contact' ? 'Update contact information' : 'Change password'}>
          <form onSubmit={profileDialog === 'contact' ? saveContactSettings : savePassword} className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-800">{profileDialog === 'contact' ? 'Update contact information' : 'Change password'}</h2>
              <button type="button" aria-label="Close dialog" onClick={() => setProfileDialog(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={17} /></button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {profileDialog === 'contact' ? <>
                <label className="auth-field">Email address<input required type="email" autoComplete="email" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
                <label className="auth-field">Phone number<input type="tel" autoComplete="tel" value={profileForm.phoneNumber} onChange={(event) => setProfileForm({ ...profileForm, phoneNumber: event.target.value })} /></label>
              </> : <>
                <label className="auth-field">Current password<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label>
                <label className="auth-field">New password<input required minLength={8} type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label>
                <label className="auth-field">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>
              </>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setProfileDialog(null)} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={profileSaving} className="rounded bg-brand-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60">{profileSaving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};

export default Header;
