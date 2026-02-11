
import React, { useState, useEffect, useMemo } from 'react';
import { Project, Milestone, Language, PaymentStatus, User, MilestoneStatus } from '../types';
import StatCard from './StatCard';
import CustomizeDashboardModal from './CustomizeDashboardModal';
import SearchableSelect from './SearchableSelect';

const getCurrentMonthYearLabel = (lang: Language) => {
    const now = new Date();
    const month = now.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
    return `${month} ${now.getFullYear()}`;
};

const WidgetWrapper: React.FC<{ title: string, children: React.ReactNode, maxHeight?: string }> = ({ title, children, maxHeight = 'none' }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden h-full shadow-sm">
        <div className="flex justify-between items-center py-4 px-6 border-b border-slate-50 dark:border-slate-800/50">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{title}</h2>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 py-5" style={{ maxHeight }}>{children}</div>
    </div>
);

const StatsOverviewWidget: React.FC<{ filteredProjects: Project[], filteredMilestones: Milestone[], language: Language }> = ({ filteredProjects = [], filteredMilestones = [], language }) => {
    const t = translations[language];
    const stats = useMemo(() => {
        let pendingVal = 0; let sentVal = 0; let paidVal = 0;
        filteredMilestones.forEach(m => {
            if (!m || !m.hasPayment) return;
            const amount = m.paymentAmount || 0;
            const status = m.paymentStatus || PaymentStatus.Pending;
            if (status === PaymentStatus.Pending) pendingVal += amount;
            else if (status === PaymentStatus.Sent) sentVal += amount;
            else if (status === PaymentStatus.Paid) paidVal += amount;
        });
        return { projectsCount: filteredProjects.length, pendingVal, sentVal, paidVal };
    }, [filteredProjects, filteredMilestones]);
    const formatVal = (val: number) => val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title={t.totalProjects} value={stats.projectsCount.toString()} icon="projects" />
            <StatCard title={t.filteredPending} value={formatVal(stats.pendingVal)} icon="inProgress" trendColor="text-orange-500" />
            <StatCard title={t.filteredSent} value={formatVal(stats.sentVal)} icon="completed" trendColor="text-blue-500" />
            <StatCard title={t.filteredPaid} value={formatVal(stats.paidVal)} icon="hours" trendColor="text-emerald-500" />
        </div>
    );
};

const ExecutionPerformanceChartWidget: React.FC<{ filteredMilestones: Milestone[], language: Language }> = ({ filteredMilestones = [], language }) => {
    const t = translations[language];
    const graphData = useMemo(() => {
        const groups = new Map<string, { totalAmount: number; sortKey: number }>();
        filteredMilestones.forEach(m => {
            if (!m || !m.dueDate || !m.hasPayment) return;
            const date = new Date(m.dueDate);
            if (isNaN(date.getTime())) return;
            const monthName = date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
            const year = date.getFullYear();
            const labelKey = `${monthName} ${year}`;
            const sortKey = year * 100 + date.getMonth();
            if (!groups.has(labelKey)) groups.set(labelKey, { totalAmount: 0, sortKey });
            groups.get(labelKey)!.totalAmount += (m.paymentAmount || 0);
        });
        return Array.from(groups.entries()).map(([monthYear, data]) => ({ monthYear, ...data })).sort((a, b) => a.sortKey - b.sortKey);
    }, [filteredMilestones, language]);
    const maxAmount = Math.max(...graphData.map(d => d.totalAmount), 1);
    return (
        <WidgetWrapper title={t.executionChartTitle}>
            <div className="h-40 flex items-end gap-2 pt-6 min-w-0">
                {graphData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div style={{ height: `${(d.totalAmount / maxAmount) * 100}%` }} className="w-full max-w-[20px] bg-slate-100 dark:bg-slate-800 rounded-t group-hover:bg-violet-500 transition-all duration-300" />
                        <span className="text-[7px] font-bold text-slate-400 mt-2 truncate w-full text-center">{d.monthYear.split(' ')[0]}</span>
                    </div>
                ))}
                {graphData.length === 0 && <div className="w-full text-center text-slate-300 text-[10px] py-10 uppercase font-black">{t.noData}</div>}
            </div>
        </WidgetWrapper>
    );
};

const AggregatedSummaryWidget: React.FC<{ projectsWithMilestones: any[], projectManagers: User[], language: Language }> = ({ projectsWithMilestones = [], projectManagers = [], language }) => {
    const t = translations[language];
    const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const aggregatedByDate = useMemo(() => {
        const dateGroups = new Map<string, { monthYear: string; sortKey: number; projects: any[] }>();
        projectsWithMilestones.forEach(p => {
            if (!p) return;
            
            const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesManager = selectedManagerId === 'all' || p.projectManagerId === selectedManagerId;
            
            if (!matchesSearch || !matchesManager) return;

            (p.milestones || []).forEach((m: any) => {
                if (!m || !m.dueDate) return;
                const date = new Date(m.dueDate);
                if (isNaN(date.getTime())) return;
                const label = `${date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })} ${date.getFullYear()}`;
                const sortKey = date.getFullYear() * 100 + date.getMonth();
                if (!dateGroups.has(label)) dateGroups.set(label, { monthYear: label, sortKey, projects: [] });
                const group = dateGroups.get(label)!;
                let projInGroup = group.projects.find(pj => pj.id === p.id);
                if (!projInGroup) {
                    projInGroup = { ...p, milestonesInGroup: [], groupTotal: 0, statusCounts: { Paid: 0, Sent: 0, Pending: 0 } };
                    group.projects.push(projInGroup);
                }
                projInGroup.milestonesInGroup.push(m);
                if (m.hasPayment) {
                    projInGroup.groupTotal += (m.paymentAmount || 0);
                    projInGroup.statusCounts[m.paymentStatus || 'Pending']++;
                }
            });
        });
        return Array.from(dateGroups.values()).sort((a, b) => a.sortKey - b.sortKey);
    }, [projectsWithMilestones, language, searchTerm, selectedManagerId]);

    const formatCurrency = (val: number) => val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const managerOptions = useMemo(() => [
        { value: 'all', label: t.allManagers },
        ...projectManagers.map(m => ({ value: m.id, label: m.name }))
    ], [projectManagers, t.allManagers]);

    const getPaymentStatusBadge = (status: PaymentStatus | null) => {
        const colors = {
            [PaymentStatus.Paid]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            [PaymentStatus.Sent]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            [PaymentStatus.Pending]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        };
        const s = status || PaymentStatus.Pending;
        return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${colors[s]}`}>{t[s]}</span>;
    };

    return (
        <WidgetWrapper title={t.executionAggregation} maxHeight="900px">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                <div className="flex-1 w-full relative">
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder={t.quickSearch} 
                        className="w-full pl-9 pr-4 py-2 text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-xl outline-none focus:ring-1 focus:ring-violet-500" 
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <div className="flex-1 w-full">
                    <SearchableSelect 
                        options={managerOptions} 
                        value={selectedManagerId} 
                        onChange={setSelectedManagerId} 
                        placeholder={t.allManagers} 
                        language={language} 
                    />
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
                {aggregatedByDate.length > 0 ? aggregatedByDate.map((period, pIdx) => {
                    const isOpen = !!expandedPeriods[period.monthYear];
                    const totalPeriodValue = period.projects.reduce((s, p) => s + p.groupTotal, 0);
                    return (
                        <div key={pIdx} className="rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950/20">
                            <button onClick={() => setExpandedPeriods(prev => ({ ...prev, [period.monthYear]: !isOpen }))} className={`w-full flex items-center justify-between p-5 transition-all ${isOpen ? 'bg-slate-100/50 dark:bg-slate-800' : 'hover:bg-slate-50/50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center transition-transform ${isOpen ? 'rotate-180' : ''}`}><svg className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg></div>
                                    <div>
                                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 text-start">{period.monthYear}</h3>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {period.projects.length} {t.totalProjects}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-end">
                                    <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(totalPeriodValue)}</p>
                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{t.totalPayments}</p>
                                </div>
                            </button>
                            {isOpen && (
                                <div className="p-5 bg-slate-50/30 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {period.projects.map((proj, prIdx) => (
                                                <div key={prIdx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden group hover:border-violet-300 transition-all">
                                                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/50 flex justify-between items-center">
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-[11px] font-black text-slate-800 dark:text-white truncate group-hover:text-violet-600 transition-colors">{proj.name}</h4>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{proj.projectManager?.name || t.allManagers}</p>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block">{formatCurrency(proj.groupTotal)}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">{t.milestoneUnit} ({proj.milestonesInGroup.length})</span>
                                                        </div>
                                                    </div>
                                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                                        {proj.milestonesInGroup.map((m: any, mIdx: number) => (
                                                            <div key={mIdx} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <div className="min-w-0 flex-1 pe-4">
                                                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{m.title}</p>
                                                                    <p className="text-[8px] text-slate-400 uppercase mt-0.5">{new Date(m.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                                                </div>
                                                                <div className="flex items-center gap-4 shrink-0">
                                                                    <span className="text-[10px] font-black text-slate-900 dark:text-white font-mono">{m.hasPayment ? formatCurrency(m.paymentAmount) : '--'}</span>
                                                                    {m.hasPayment ? getPaymentStatusBadge(m.paymentStatus) : <span className="text-[8px] font-bold text-slate-300 uppercase">NO PAY</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                                            <table className="w-full text-left rtl:text-right border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.projectName}</th>
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.projectManager}</th>
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.milestoneTitle}</th>
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.amount}</th>
                                                        <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.status}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {period.projects.flatMap((proj: any) => 
                                                        proj.milestonesInGroup.map((m: any, mIdx: number) => (
                                                            <tr key={`${proj.id}-${mIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-4 py-3 text-[10px] font-black text-slate-800 dark:text-slate-200">{proj.name}</td>
                                                                <td className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase">{proj.projectManager?.name || t.allManagers}</td>
                                                                <td className="px-4 py-3 text-[10px] font-medium text-slate-600 dark:text-slate-400">{m.title}</td>
                                                                <td className="px-4 py-3 text-[10px] font-black text-slate-900 dark:text-white font-mono">{m.hasPayment ? formatCurrency(m.paymentAmount) : '--'}</td>
                                                                <td className="px-4 py-3">{m.hasPayment ? getPaymentStatusBadge(m.paymentStatus) : '-'}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                }) : <div className="py-20 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.3em] flex flex-col items-center gap-3">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    {t.noData}
                </div>}
            </div>
        </WidgetWrapper>
    );
};

const translations = {
    ar: { dashboard: "لوحة التحكم", overview: "نظرة عامة على التدفقات المالية.", totalProjects: "المشاريع", filteredPending: "معلقة", filteredSent: "مرسلة", filteredPaid: "مدفوعة", executionChartTitle: "النمو الشهري", executionAggregation: "تجميع التدفقات", noData: "لا توجد بيانات.", quickSearch: "بحث بالمشروع...", customize: "تخصيص", allProjects: "كل المشاريع", allMonths: "كل الشهور", allManagers: "كل المدراء", clearFilters: "مسح", milestoneUnit: "معالم", totalPayments: "إجمالي الدفعات", Paid: "مدفوعة", Sent: "مرسلة", Pending: "معلقة", projectName: "المشروع", projectManager: "مدير المشروع", milestoneTitle: "عنوان المعلم", amount: "المبلغ", status: "الحالة" },
    en: { dashboard: "Dashboard", overview: "Financial cashflow overview.", totalProjects: "Projects", filteredPending: "Pending", filteredSent: "Invoiced", filteredPaid: "Collected", executionChartTitle: "Monthly Growth", executionAggregation: "Flow Aggregation", noData: "No data found.", quickSearch: "Search Project...", customize: "Customize", allProjects: "All Projects", allMonths: "All Months", allManagers: "All Managers", clearFilters: "Clear", milestoneUnit: "Milestones", totalPayments: "Total Payments", Paid: "Paid", Sent: "Sent", Pending: "Pending", projectName: "Project", projectManager: "Project Manager", milestoneTitle: "Milestone", amount: "Amount", status: "Status" }
};

export const WIDGETS_CONFIG = [
    { id: 'stats', name: 'KPIs', component: StatsOverviewWidget, default: true, colSpan: 4 },
    { id: 'aggregated_execution', name: 'Aggregation', component: AggregatedSummaryWidget, default: true, colSpan: 4 },
    { id: 'execution_chart', name: 'Growth', component: ExecutionPerformanceChartWidget, default: true, colSpan: 4 },
];

const AnalyticsDashboard: React.FC<any> = ({ projects = [], milestones = [], projectManagers = [], language }) => {
    const t = translations[language];
    const [globalProjectId, setGlobalProjectId] = useState('all');
    const [globalManagerId, setGlobalManagerId] = useState('all');
    const [globalMonthYear, setGlobalMonthYear] = useState<string[]>([]);
    const [layout, setLayout] = useState<string[]>(() => {
        const saved = localStorage.getItem('dashboardLayout');
        return saved ? JSON.parse(saved) : WIDGETS_CONFIG.filter(w => w.default).map(w => w.id);
    });
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

    useEffect(() => {
        setGlobalMonthYear([getCurrentMonthYearLabel(language)]);
    }, [language]);

    const monthYearOptions = useMemo(() => {
        const unique = new Set<string>();
        milestones.forEach(m => { if (m && m.dueDate) { const d = new Date(m.dueDate); if(!isNaN(d.getTime())) unique.add(`${d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })} ${d.getFullYear()}`); } });
        unique.add(getCurrentMonthYearLabel(language));
        return Array.from(unique).map(v => ({ value: v, label: v }));
    }, [milestones, language]);

    const { filteredProjects, filteredMilestones } = useMemo(() => {
        const fps = projects.filter((p: any) => p && (globalProjectId === 'all' || p.id === globalProjectId) && (globalManagerId === 'all' || p.projectManagerId === globalManagerId));
        const pIds = new Set(fps.map((p: any) => p.id));
        const fms = milestones.filter((m: any) => {
            if (!m || !pIds.has(m.projectId)) return false;
            if (globalMonthYear.length > 0) {
                if (!m.dueDate) return false;
                const d = new Date(m.dueDate);
                if (isNaN(d.getTime())) return false;
                const l = `${d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' })} ${d.getFullYear()}`;
                if (!globalMonthYear.includes(l)) return false;
            }
            return true;
        });
        return { filteredProjects: fps, filteredMilestones: fms };
    }, [projects, milestones, globalProjectId, globalManagerId, globalMonthYear, language]);

    const projectsWithMilestones = useMemo(() => {
        return filteredProjects.map((p: any) => ({ ...p, milestones: filteredMilestones.filter((m: any) => m.projectId === p.id) })).filter((p: any) => p.milestones.length > 0);
    }, [filteredProjects, filteredMilestones]);

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
            {isCustomizeModalOpen && <CustomizeDashboardModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} currentLayout={layout} onSaveLayout={(l) => { setLayout(l); localStorage.setItem('dashboardLayout', JSON.stringify(l)); setIsCustomizeModalOpen(false); }} language={language} />}
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase">{t.dashboard}</h1><p className="text-slate-400 font-bold text-[10px] mt-1 uppercase tracking-widest">{t.overview}</p></div>
                <button onClick={() => setIsCustomizeModalOpen(true)} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 dark:border-slate-800 shadow-sm">{t.customize}</button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[180px]"><SearchableSelect options={[{value:'all', label:t.allProjects}, ...projects.map((p: any) => ({value:p.id, label:p.name}))]} value={globalProjectId} onChange={setGlobalProjectId} placeholder={t.allProjects} language={language} /></div>
                <div className="flex-1 min-w-[180px]"><SearchableSelect options={[{value:'all', label:t.allManagers}, ...projectManagers.map((m: any) => ({value:m.id, label:m.name}))]} value={globalManagerId} onChange={setGlobalManagerId} placeholder={t.allManagers} language={language} /></div>
                <div className="flex-1 min-w-[180px]"><SearchableSelect isMulti options={monthYearOptions} value={globalMonthYear} onChange={setGlobalMonthYear} placeholder={t.allMonths} language={language} /></div>
                <button onClick={() => { setGlobalProjectId('all'); setGlobalManagerId('all'); setGlobalMonthYear([getCurrentMonthYearLabel(language)]); }} className="px-5 py-2 bg-slate-800 text-white text-[10px] font-black rounded-xl hover:bg-black transition-all uppercase tracking-widest">{t.clearFilters}</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {layout.map(id => { const c = WIDGETS_CONFIG.find(w => w.id === id); if(!c) return null; const Comp = c.component as any; return <div key={id} className={`lg:col-span-${c.colSpan}`}><Comp filteredProjects={filteredProjects} filteredMilestones={filteredMilestones} projectsWithMilestones={projectsWithMilestones} projectManagers={projectManagers} language={language} /></div>; })}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
