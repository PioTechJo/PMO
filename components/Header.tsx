
import React, { useState } from 'react';
import { Language, Theme, User, Notification } from '../types';

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

const Header: React.FC<HeaderProps> = ({ user, language, onSearch, theme, setTheme, onToggleSidebar }) => {
  const [query, setQuery] = useState('');

  return (
    <header className="h-24 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 transition-colors duration-300 sticky top-0 z-[40]">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        {/* Hamburger Menu */}
        <button 
          onClick={onToggleSidebar}
          className="lg:hidden p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>

        <div className="relative group flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
                placeholder={language === 'ar' ? 'البحث بالذكاء الاصطناعي...' : 'AI Search...'} 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6 ml-4">
        <div className="flex items-center gap-1 md:gap-2">
            <button className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all relative hidden sm:block">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0f172a]"></span>
            </button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-3 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                {theme === 'dark' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
        </div>

        <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800 hidden md:block"></div>

        <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
            <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight truncate max-w-[120px]">{user?.name || (language === 'ar' ? 'مستخدم' : 'User')}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user?.type || 'Member'}</p>
            </div>
            <div className="relative">
                <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || 'JD'}&background=8b5cf6&color=fff`} className="w-10 h-10 md:w-11 md:h-11 rounded-2xl border-2 border-white dark:border-slate-800 shadow-sm" alt={user?.name} />
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-4 border-white dark:border-[#0f172a]"></span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
