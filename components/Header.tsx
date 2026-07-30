
import React, { useState, useRef, useEffect } from 'react';
import { Language, Theme, User, Notification } from '../types';
import { markNotificationRead } from '../services/api';
import ChangePasswordModal from './ChangePasswordModal';

interface HeaderProps {
    user?: User;
    language: Language;
    setLanguage: (language: Language) => void;
    onSearch: (query: string) => void;
    onLogout: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isDbConnected: boolean;
    onToggleSidebar: () => void;
    notifications?: Notification[];
    onNotificationRead?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, language, onSearch, theme, setTheme, onToggleSidebar, notifications = [], onNotificationRead, onLogout }) => {
  const [query, setQuery] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
        await markNotificationRead(id);
        if (onNotificationRead) onNotificationRead();
    } catch (err) {
        console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
        for (const n of notifications.filter(notif => !notif.isRead)) {
            await markNotificationRead(n.id);
        }
        if (onNotificationRead) onNotificationRead();
    } catch (err) {
        console.error("Error marking all notifications as read:", err);
    }
  };

  return (
    <header className="h-20 flex items-center justify-between px-8 bg-white dark:bg-[#0a0f1c] border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-[40]">
      <div className="flex items-center gap-6 flex-1 min-w-0 font-sans">
        {/* Hamburger Menu (visible only on mobile) */}
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>

        {/* Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 text-xs font-bold whitespace-nowrap">
          <div className="flex items-center gap-2 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H2a2 2 0 01-2-2v-2z" /></svg>
            <span>Operations</span>
          </div>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 dark:text-slate-200">Tasks & Defects</span>
        </div>

        {/* Center Search Bar */}
        <div className="hidden lg:flex flex-1 justify-center max-w-2xl px-4">
          <div className="relative w-full max-w-md group group-focus-within:scale-[1.02] transition-transform">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#3b82f6] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
                  placeholder={language === 'ar' ? 'ابحث عن المهام، المشاريع...' : 'Search tasks, projects...'} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-[#3b82f6]/20 rounded-xl py-2 pl-10 pr-10 text-xs font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all shadow-sm"
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-[10px] font-medium text-slate-400 tracking-tighter">
                      ⌘K
                  </kbd>
              </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
            <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2.5 text-slate-400 hover:text-[#3b82f6] hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-xl transition-all relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0a0f1c]"></span>}
            </button>

            {isNotifOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">{language === 'ar' ? 'التنبيهات' : 'Notifications'}</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? notifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => !n.isRead && handleMarkRead(n.id)}
                                className={`p-4 border-b border-slate-50 dark:border-slate-800/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-500/5 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                        n.type.includes('requested') ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                        n.type.includes('result') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                    }`}>
                                        {n.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-[9px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className={`text-xs ${!n.isRead ? 'font-black text-slate-800 dark:text-white' : 'font-bold text-slate-500 dark:text-slate-400'}`}>
                                    {n.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                            </div>
                        )) : (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <svg className="w-8 h-8 text-slate-200 dark:text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                <p className="text-xs font-bold text-slate-400">{language === 'ar' ? 'لا يوجد تنبيهات' : 'No notifications'}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 text-slate-400 hover:text-[#3b82f6] hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-xl transition-all">
            {theme === 'dark' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
        </button>
        
        <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2"></div>

        <div className="relative" ref={profileRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center px-1 py-1 rounded-full group transition-all">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3b82f6] to-[#6366f1] p-[2px]">
                  <div className="w-full h-full bg-white dark:bg-[#0a0f1c] rounded-[10px] flex items-center justify-center text-xs font-black text-[#3b82f6] uppercase">
                    {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'HN'}
                  </div>
                </div>
            </button>

            {isProfileOpen && (
                <div className="absolute top-full mt-2 right-0 rtl:right-auto rtl:left-0 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <p className="text-xs font-black text-slate-800 dark:text-white truncate">{user?.name}</p>
                        {user?.email && <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>}
                    </div>
                    <button
                        onClick={() => { setIsChangePasswordOpen(true); setIsProfileOpen(false); }}
                        className="w-full text-left rtl:text-right px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </button>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-full text-left rtl:text-right px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-t border-slate-50 dark:border-slate-800"
                        >
                            {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      {isChangePasswordOpen && user?.email && (
          <ChangePasswordModal language={language} userEmail={user.email} onClose={() => setIsChangePasswordOpen(false)} />
      )}
    </header>
  );
};

export default Header;
