
import React, { useState, useEffect, useRef } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { Language, Theme, User } from '../types';

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
}

const Header: React.FC<HeaderProps> = ({ user, language, setLanguage, onSearch, onLogout, theme, setTheme, isDbConnected, onToggleSidebar }) => {
  const [query, setQuery] = useState('');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch(query);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const placeholderText = language === 'ar' 
    ? "اسأل المساعد..."
    : "Ask AI...";
    
  const translations = {
      ar: { 
        فاتح: 'فاتح', 
        داكن: 'داكن', 
        النظام: 'النظام', 
        dbConnected: 'بيانات حية', 
        dbMock: 'وضع تجريبي', 
        welcome: 'مرحباً',
        fullScreen: 'ملء الشاشة',
        exitFullScreen: 'خروج'
      },
      en: { 
        فاتح: 'Light', 
        داكن: 'Dark', 
        النظام: 'System', 
        dbConnected: 'Live Data', 
        dbMock: 'Demo', 
        welcome: 'Hi',
        fullScreen: 'Full Screen',
        exitFullScreen: 'Exit'
      },
  };
  const t = translations[language];

  const themeOptions: { key: Theme; label: string; icon: string }[] = [
    { key: 'light', label: t.فاتح, icon: '☀️' },
    { key: 'dark', label: t.داكن, icon: '🌙' },
    { key: 'system', label: t.النظام, icon: '💻' },
  ];

  return (
    <header className="flex-shrink-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="p-2 -ml-2 lg:hidden rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {user && (
            <div className="flex items-center gap-2 lg:gap-3">
                <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=8b5cf6&color=f5f3ff`} alt={user.name} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full" />
                <div className="hidden sm:block">
                    <p className="text-[10px] lg:text-sm font-bold text-slate-800 dark:text-white leading-tight">{t.welcome},</p>
                    <p className="text-[9px] lg:text-xs text-slate-600 dark:text-slate-300 truncate max-w-[80px] lg:max-w-none">{user.name}</p>
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 flex justify-center max-w-lg">
         <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 lg:pl-4 rtl:pl-0 rtl:pr-3 lg:rtl:pr-4 pointer-events-none">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </span>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full py-1.5 lg:py-2.5 pl-9 lg:pl-11 pr-4 rtl:pr-9 lg:rtl:pr-11 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs lg:text-sm text-slate-800 dark:text-white placeholder-slate-400 transition-all"
            />
        </div>
      </div>


      <div className="flex items-center gap-1 lg:gap-2">
        <button 
          onClick={toggleFullscreen}
          title={isFullscreen ? t.exitFullScreen : t.fullScreen}
          className="hidden sm:flex p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300"
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          )}
        </button>

        <div className="hidden md:block">
            <LanguageSwitcher language={language} setLanguage={setLanguage} />
        </div>
        
        <div className="relative" ref={themeMenuRef}>
            <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                 <svg className="w-5 h-5 lg:w-6 lg:h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            </button>
            {isThemeMenuOpen && (
                <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-32 lg:w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[100]">
                    {themeOptions.map(option => (
                        <button key={option.key} onClick={() => { setTheme(option.key); setIsThemeMenuOpen(false); }}
                            className={`w-full text-start px-4 py-2 text-xs lg:text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${theme === option.key ? 'text-violet-500 dark:text-violet-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-black py-1.5 lg:py-2 px-3 lg:px-4 rounded-full text-[10px] lg:text-xs transition-colors uppercase tracking-widest">
            <span className="hidden sm:inline">{language === 'ar' ? 'الخروج' : 'Logout'}</span>
            <svg className="sm:hidden w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
