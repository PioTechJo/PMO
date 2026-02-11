
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
}

const Header: React.FC<HeaderProps> = ({ user, language, setLanguage, onSearch, onLogout, theme, setTheme, isDbConnected }) => {
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
    ? "اسأل مساعد الذكاء الاصطناعي..."
    : "Ask the AI assistant...";
    
  const translations = {
      ar: { 
        فاتح: 'فاتح', 
        داكن: 'داكن', 
        النظام: 'النظام', 
        dbConnected: 'متصل بالبيانات الحية', 
        dbMock: 'وضع تجريبي', 
        welcome: 'مرحباً',
        fullScreen: 'ملء الشاشة',
        exitFullScreen: 'خروج من ملء الشاشة'
      },
      en: { 
        فاتح: 'Light', 
        داكن: 'Dark', 
        النظام: 'System', 
        dbConnected: 'Live Database Connected', 
        dbMock: 'Demo Mode', 
        welcome: 'Welcome',
        fullScreen: 'Full Screen',
        exitFullScreen: 'Exit Full Screen'
      },
  };
  const t = translations[language];

  const themeOptions: { key: Theme; label: string; icon: string }[] = [
    { key: 'light', label: t.فاتح, icon: '☀️' },
    { key: 'dark', label: t.داكن, icon: '🌙' },
    { key: 'system', label: t.النظام, icon: '💻' },
  ];

  return (
    <header className="flex-shrink-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {user && (
            <div className="flex items-center gap-3">
                <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=8b5cf6&color=f5f3ff`} alt={user.name} className="w-10 h-10 rounded-full" />
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{t.welcome},</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{user.name}</p>
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 flex justify-center px-8">
         <div className="relative w-full max-w-xl">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 rtl:pl-0 rtl:pr-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.065a4.23 4.23 0 010 6.87V15a1.5 1.5 0 01-3 0v-3.065a4.23 4.23 0 010-6.87V5A1.5 1.5 0 0110 3.5zM8.5 7v6.065a2.73 2.73 0 000-4.13V7h3v1.935a2.73 2.73 0 000 4.13V13h-3V7z" />
                    <path d="M5 5.5A1.5 1.5 0 016.5 4h.065a4.23 4.23 0 016.87 0H13.5A1.5 1.5 0 0115 5.5v.065a4.23 4.23 0 010 6.87V12.5A1.5 1.5 0 0113.5 14h-.065a4.23 4.23 0 01-6.87 0H6.5A1.5 1.5 0 015 12.5v-.065a4.23 4.23 0 010-6.87V5.5zm6.065 1.5h-4.13a2.73 2.73 0 000 4.13h4.13a2.73 2.73 0 000-4.13z" />
                </svg>
            </span>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                className="w-full bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-full py-2.5 pl-11 pr-4 rtl:pr-11 rtl:pl-4 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all"
            />
        </div>
      </div>


      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        
        <div title={isDbConnected ? t.dbConnected : t.dbMock} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
            <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isDbConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div className={`absolute top-0 left-0 w-3 h-3 rounded-full ${isDbConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-ping`}></div>
            </div>
        </div>

        <button 
          onClick={toggleFullscreen}
          title={isFullscreen ? t.exitFullScreen : t.fullScreen}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-slate-600 dark:text-slate-300"
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 9L4 4m0 0v5m0-5h5m7 5l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0v-5m0 5h5m7-5l5 5m0 0h-5m5 0v-5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        <LanguageSwitcher language={language} setLanguage={setLanguage} />
        
        <div className="relative" ref={themeMenuRef}>
            <button onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                 <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </button>
            {isThemeMenuOpen && (
                <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
                    {themeOptions.map(option => (
                        <button key={option.key} onClick={() => { setTheme(option.key); setIsThemeMenuOpen(false); }}
                            className={`w-full text-start px-4 py-2 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${theme === option.key ? 'text-violet-500 dark:text-violet-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        <button onClick={onLogout} className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full text-sm transition-colors">
            {language === 'ar' ? 'الخروج' : 'Logout'}
        </button>
      </div>
    </header>
  );
};

export default Header;
