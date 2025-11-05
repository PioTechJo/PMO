import React from 'react';
import { View, Language } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  language: Language;
}

const NavIcon: React.FC<{ view: View }> = ({ view }) => {
    const iconProps = {
        className: "w-6 h-6",
        strokeWidth: "1.5",
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
    };

    const icons: Record<View, React.ReactNode> = {
        dashboard: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
        projects: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
        activities: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
        team: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" /></svg>,
        payments: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
        system: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" /></svg>,
    };
    return icons[view];
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, language }) => {
  
  const translations = {
    ar: {
      dashboard: 'لوحة التحكم',
      projects: 'المشاريع',
      activities: 'الأنشطة',
      team: 'الفريق',
      payments: 'المدفوعات',
      system: 'إدارة النظام',
    },
    en: {
      dashboard: 'Dashboard',
      projects: 'Projects',
      activities: 'Activities',
      team: 'Team',
      payments: 'Payments',
      system: 'System Mgt',
    },
  };
  const t = translations[language];

  const navItems: { view: View; label: string }[] = [
    { view: 'dashboard', label: t.dashboard },
    { view: 'projects', label: t.projects },
    { view: 'activities', label: t.activities },
    { view: 'team', label: t.team },
    { view: 'payments', label: t.payments },
    { view: 'system', label: t.system },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-800/20 backdrop-blur-sm border-r border-slate-200 dark:border-slate-800/50 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="h-20 flex items-center justify-center px-8 border-b border-slate-200 dark:border-slate-800/50">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-cyan-400">Pio-Tech</h1>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`w-full flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-xl text-md font-bold transition-all duration-300 ${
              currentView === item.view
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
            }`}
          >
            <NavIcon view={item.view} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800/50">
        <p className="text-xs text-center text-slate-400 dark:text-slate-500">© 2024 Pio-Tech</p>
      </div>
    </aside>
  );
};

export default Sidebar;