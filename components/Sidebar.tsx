
import React from 'react';
import { View, Language } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  language: Language;
  allowedViews: View[];
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const NavIcon: React.FC<{ view: View }> = ({ view }) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: "2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    const icons: Record<View, React.ReactNode> = {
        dashboard: <svg {...iconProps}><path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
        filter: <svg {...iconProps}><path d="M3 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" /></svg>,
        projects: <svg {...iconProps}><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        milestones: <svg {...iconProps}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        team: <svg {...iconProps}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        payments: <svg {...iconProps}><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        maintenanceContracts: <svg {...iconProps}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
        issues: <svg {...iconProps}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
        system: <svg {...iconProps}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066" /></svg>,
        reports: <svg {...iconProps}><path d="M9 17v-2m3 2v-4m3 4v-6" /></svg>,
    };
    return icons[view] || icons.dashboard;
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, language, allowedViews, onLogout, isOpen, onClose }) => {
  const translations = {
    ar: { dashboard: 'لوحة التحكم', reports: 'التقارير', projects: 'المشاريع', milestones: 'المعالم', payments: 'المدفوعات', tasks: 'المهام', users: 'المدراء', settings: 'الإعدادات', logout: 'تسجيل الخروج', filter: 'الفلاتر المتقدمة', maintenance: 'عقود الصيانة' },
    en: { dashboard: 'Dashboard', reports: 'Reports', projects: 'Projects', milestones: 'Milestones', payments: 'Payments', tasks: 'Tasks', users: 'Managers', settings: 'Settings', logout: 'Logout', filter: 'Advanced Filter', maintenance: 'Maintenance' },
  };
  const t = translations[language];

  const menuItems = [
    { view: 'dashboard', label: t.dashboard },
    { view: 'projects', label: t.projects },
    { view: 'milestones', label: t.milestones },
    { view: 'payments', label: t.payments },
    { view: 'maintenanceContracts', label: t.maintenance },
    { view: 'issues', label: t.tasks },
    { view: 'team', label: t.users },
    { view: 'reports', label: t.reports },
    { view: 'filter', label: t.filter },
    { view: 'system', label: t.settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[50] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed lg:relative inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-72 lg:translate-x-0 transition-transform duration-300 ease-in-out z-[60] flex flex-col h-full bg-white dark:bg-[#0f172a] border-r border-slate-100 dark:border-slate-800 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="h-24 flex items-center px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm5 2a1 1 0 011-1h10a1 1 0 110 2H8a1 1 0 01-1-1zM2 5a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm5 2a1 1 0 011-1h10a1 1 0 110 2H8a1 1 0 01-1-1z"/></svg>
            </div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Pio-Tech</h1>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="lg:hidden ms-auto p-2 text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.filter(item => allowedViews.includes(item.view as any)).map(item => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view as any)}
              className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group ${
                currentView === item.view
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`${currentView === item.view ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                  <NavIcon view={item.view as any} />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
