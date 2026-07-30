
import React, { useState } from 'react';
import { View, Language } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  language: Language;
  allowedViews: View[];
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  projectsCount: number;
  openTasksCount: number;
}

const NavIcon: React.FC<{ view: View }> = ({ view }) => {
    const iconProps = { className: "w-5 h-5 transition-transform duration-300 group-hover:scale-110", strokeWidth: "1.75", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" };
    const icons: Record<View, React.ReactNode> = {
        dashboard: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        tasksOverview: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        paymentsTargetsDashboard: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        projects: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
        milestones: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        payments: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
        maintenanceContracts: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        maintenanceOverview: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        issues: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
        team: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        reports: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        filter: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" /></svg>,
        system: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066" /></svg>,
    };
    return icons[view] || icons.dashboard;
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, language, allowedViews, onLogout, isOpen, onClose, projectsCount, openTasksCount }) => {
  const translations = {
    ar: { dashboard: 'نظرة عامة', paymentsTargetsDashboard: 'لوحة المتابعة', reports: 'التقارير', projects: 'المشاريع', milestones: 'المعالم', payments: 'المدفوعات', tasks: 'المهام', tasksOverviewSub: 'نظرة عامة', tasksManagementSub: 'إدارة المهام', users: 'الفريق', settings: 'الإعدادات', logout: 'تسجيل الخروج', filter: 'الفلاتر المتقدمة', maintenance: 'الصيانة', maintenanceOverviewSub: 'نظرة عامة', maintenanceContractsSub: 'إدارة العقود', main: 'الرئيسية', operations: 'العمليات' },
    en: { dashboard: 'Overview', paymentsTargetsDashboard: 'Dashboard', reports: 'Reports', projects: 'Projects', milestones: 'Milestones', payments: 'Payments', tasks: 'Tasks', tasksOverviewSub: 'Overview', tasksManagementSub: 'Tasks Management', users: 'Team', settings: 'Settings', logout: 'Logout', filter: 'Advanced Filter', maintenance: 'Maintenance', maintenanceOverviewSub: 'Overview', maintenanceContractsSub: 'Contracts Management', main: 'Main', operations: 'Operations' },
  };
  const t = translations[language];

  type NavItem = { view: View; label: string };
  type NavEntry = NavItem | { groupLabel: string; groupKey: string; children: NavItem[] };

  const sections: { title: string; items: NavEntry[] }[] = [
    {
      title: t.main,
      items: [
        { view: 'dashboard', label: t.dashboard },
        { view: 'paymentsTargetsDashboard', label: t.paymentsTargetsDashboard },
        { view: 'projects', label: t.projects },
        { view: 'milestones', label: t.milestones },
        { view: 'payments', label: t.payments },
      ]
    },
    {
      title: t.operations,
      items: [
        {
          groupLabel: t.tasks,
          groupKey: 'tasks',
          children: [
            { view: 'tasksOverview', label: t.tasksOverviewSub },
            { view: 'issues', label: t.tasksManagementSub },
          ]
        },
        {
          groupLabel: t.maintenance,
          groupKey: 'maintenance',
          children: [
            { view: 'maintenanceOverview', label: t.maintenanceOverviewSub },
            { view: 'maintenanceContracts', label: t.maintenanceContractsSub },
          ]
        },
        { view: 'team', label: t.users },
        { view: 'reports', label: t.reports },
      ]
    }
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ maintenance: true, tasks: true });
  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[50] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed lg:relative inset-y-0 ${language === 'ar' ? 'right-0' : 'left-0'} w-72 lg:translate-x-0 transition-transform duration-300 ease-in-out z-[60] flex flex-col h-full bg-[#0a1628] border-r border-[#1e293b]/20 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="h-28 flex items-center px-8 shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              PT
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-widest uppercase mb-0.5">PIO-TECH</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">Projects Portfolio</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="lg:hidden ms-auto p-2 text-slate-400 hover:text-slate-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div className="absolute bottom-0 left-0 right-0 border-b border-[#1e293b]/30 mx-4" />
        </div>

        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-4">
              <div className="px-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] opacity-70">{section.title}</p>
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  if ('children' in item) {
                    const visibleChildren = item.children.filter(child => allowedViews.includes(child.view));
                    if (visibleChildren.length === 0) return null;
                    const isGroupActive = visibleChildren.some(child => child.view === currentView);
                    const isExpanded = !!expandedGroups[item.groupKey];
                    return (
                      <div key={item.groupKey}>
                        <button
                          onClick={() => toggleGroup(item.groupKey)}
                          className={`w-full flex items-center justify-between px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative ${
                            isGroupActive ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                              <div className={`${isGroupActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors duration-200`}>
                                  <NavIcon view={visibleChildren[0].view} />
                              </div>
                              <span className={`${isGroupActive ? 'font-bold' : 'font-medium'} tracking-tight`}>{item.groupLabel}</span>
                          </div>
                          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isExpanded && (
                          <div className={`mt-0.5 space-y-0.5 ${language === 'ar' ? 'pr-6' : 'pl-6'}`}>
                            {visibleChildren.map(child => {
                              const isActive = currentView === child.view;
                              return (
                                <button
                                  key={child.view}
                                  onClick={() => setCurrentView(child.view)}
                                  className={`w-full flex items-center justify-between px-5 py-2 rounded-lg text-[12px] font-medium transition-all duration-200 group relative ${
                                    isActive ? 'bg-blue-600/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                  }`}
                                >
                                  {isActive && <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-2 bottom-2 w-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]`} />}
                                  <span className={`${isActive ? 'font-bold' : 'font-medium'} tracking-tight`}>{child.label}</span>
                                  {child.view === 'issues' && openTasksCount > 0 && <span className="bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg">{openTasksCount}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (!allowedViews.includes(item.view)) return null;
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => setCurrentView(item.view)}
                      className={`w-full flex items-center justify-between px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-blue-600/10 text-white'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      {isActive && <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-2.5 bottom-2.5 w-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]`} />}
                      <div className="flex items-center gap-2.5">
                          <div className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors duration-200`}>
                              <NavIcon view={item.view} />
                          </div>
                          <span className={`${isActive ? 'font-bold' : 'font-medium'} tracking-tight`}>{item.label}</span>
                      </div>
                      {item.view === 'projects' && projectsCount > 0 && <span className="bg-[#1e2d4d] text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-500/20">{projectsCount}</span>}
                      {item.view === 'issues' && openTasksCount > 0 && <span className="bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg">{openTasksCount}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-[#1e293b]/30 shrink-0">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-6 py-4 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
