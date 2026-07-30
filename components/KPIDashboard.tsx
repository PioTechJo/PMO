
import React, { useMemo, useState, useEffect } from 'react';
import { Project, Milestone, Language, User, PaymentStatus, MilestoneStatus, Issue, TaskViewMode } from '../types';
import SearchableSelect from './SearchableSelect';

interface KPIDashboardProps {
    projects: Project[];
    milestones: Milestone[];
    issues: Issue[];
    allUsers: User[];
    projectManagers: User[];
    language: Language;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ projects, milestones, issues, allUsers, projectManagers, language }) => {
    const t = translations[language];
    
    // States for Filters
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedManager, setSelectedManager] = useState('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState<string[]>(['all']);

    // States for UI Expansion
    const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>({});
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
    const [isRoadmapCollapsed, setIsRoadmapCollapsed] = useState(true);

    // 1. توليد خيارات الشهر/السنة مرتبة تصاعدياً (السنة الحالية وطالع بس، دايماً)
    const minYear = new Date().getFullYear();
    const monthYearOptions = useMemo(() => {
        const uniqueMonthYears = new Set<string>();
        milestones.forEach(m => {
            if (m.dueDate) {
                const date = new Date(m.dueDate);
                if (date.getFullYear() < minYear) return;
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                uniqueMonthYears.add(key);
            }
        });

        const sortedKeys = Array.from(uniqueMonthYears).sort((a, b) => a.localeCompare(b));
        
        return [
            { value: 'all', label: t.allTime },
            ...sortedKeys.map(key => {
                const [year, month] = key.split('-').map(Number);
                const label = new Date(year, month - 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
                return { value: key, label };
            })
        ];
    }, [milestones, language, t.allTime]);

    const handlePeriodChange = (val: string[]) => {
        if (val.length === 0) {
            setSelectedMonthYear(['all']);
            return;
        }
        const lastSelected = val[val.length - 1];
        if (lastSelected === 'all') {
            setSelectedMonthYear(['all']);
        } else {
            const filtered = val.filter(v => v !== 'all');
            setSelectedMonthYear(filtered.length > 0 ? filtered : ['all']);
        }
    };

    const isAllTime = selectedMonthYear.includes('all');

    const filteredMilestones = useMemo(() => {
        return milestones.filter(m => {
            if (isAllTime) return true;
            if (!m.dueDate) return false;
            const date = new Date(m.dueDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return selectedMonthYear.includes(key);
        });
    }, [milestones, selectedMonthYear, isAllTime]);

    const filteredIssues = useMemo(() => {
        return issues.filter(i => {
            if (isAllTime) return true;
            const date = new Date(i.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return selectedMonthYear.includes(key);
        });
    }, [issues, selectedMonthYear, isAllTime]);


    const groupedHierarchy = useMemo(() => {
        const hierarchy: Record<string, { manager: User | undefined, projects: Record<string, { project: Project, milestones: Milestone[] }> }> = {};

        const eligibleProjects = projects.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                             p.projectCode.toLowerCase().includes(projectSearch.toLowerCase());
            const managerMatch = selectedManager === 'all' || p.projectManagerId === selectedManager;
            return nameMatch && managerMatch;
        });

        const eligibleProjectIds = new Set(eligibleProjects.map(p => p.id));

        filteredMilestones.forEach(m => {
            if (!eligibleProjectIds.has(m.projectId)) return;

            const project = projects.find(p => p.id === m.projectId);
            if (!project) return;

            const managerId = project.projectManagerId || 'unassigned';
            const manager = projectManagers.find(u => u.id === managerId);

            if (!hierarchy[managerId]) {
                hierarchy[managerId] = { manager, projects: {} };
            }

            if (!hierarchy[managerId].projects[project.id]) {
                hierarchy[managerId].projects[project.id] = { project, milestones: [] };
            }

            hierarchy[managerId].projects[project.id].milestones.push(m);
        });

        return hierarchy;
    }, [projects, filteredMilestones, projectManagers, projectSearch, selectedManager]);

    const kpis = useMemo(() => {
        // Fix: Explicitly type managerEntries as any[] to solve "Property 'projects' does not exist on type 'unknown'"
        // which occurs during inference when using Object.values with flatMap on complex nested objects.
        const managerEntries = Object.values(groupedHierarchy) as any[];
        
        // Fix: Explicitly typed flatMap parameter (m: any) to resolve "Property 'projects' does not exist on type 'unknown'" error.
        const projectIdsInHierarchy = new Set(managerEntries.flatMap((m: any) => Object.keys(m.projects || {})));
        // Fix: Explicitly typed flatMap parameter (m: any) to resolve "Property 'projects' does not exist on type 'unknown'" error.
        const milestonesInHierarchy = managerEntries.flatMap((m: any) => 
            Object.values(m.projects || {}).flatMap((p: any) => p.milestones || [])
        ) as Milestone[];

        const totalValue = milestonesInHierarchy.reduce((sum, m) => sum + (m.paymentAmount || 0), 0);
        const collected = milestonesInHierarchy
            .filter(m => m.paymentStatus === PaymentStatus.Paid)
            .reduce((sum, m) => sum + (m.paymentAmount || 0), 0);
        
        const avgProgress = projectIdsInHierarchy.size > 0 
            ? Math.round(projects.filter(p => projectIdsInHierarchy.has(p.id)).reduce((sum, p) => sum + (p.progress || 0), 0) / projectIdsInHierarchy.size)
            : 0;

        return {
            totalValue,
            collected,
            pending: totalValue - collected,
            avgProgress,
            count: projectIdsInHierarchy.size,
            totalIssues: filteredIssues.length
        };
    }, [groupedHierarchy, projects, filteredIssues]);

    const toggleManagerExpansion = (managerId: string) => {
        setExpandedManagers(prev => ({ ...prev, [managerId]: !prev[managerId] }));
    };

    const toggleProjectExpansion = (projectId: string) => {
        setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    };

    const expandAll = () => {
        const allMgrs: Record<string, boolean> = {};
        const allPrjs: Record<string, boolean> = {};
        Object.entries(groupedHierarchy).forEach(([mId, mGroup]) => {
            allMgrs[mId] = true;
            const group = mGroup as { manager: User | undefined, projects: Record<string, any> };
            Object.keys(group.projects).forEach(pId => { allPrjs[pId] = true; });
        });
        setExpandedManagers(allMgrs);
        setExpandedProjects(allPrjs);
    };

    const collapseAll = () => {
        setExpandedManagers({});
        setExpandedProjects({});
    };

    const formatCurrency = (val: number) =>
        val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const statusColors = {
        [MilestoneStatus.Completed]: 'text-emerald-500 bg-emerald-500/10',
        [MilestoneStatus.InProgress]: 'text-indigo-500 bg-indigo-500/10',
        [MilestoneStatus.Pending]: 'text-orange-500 bg-orange-500/10',
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Filters Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 p-4 md:p-6 rounded-3xl md:rounded-4xl shadow-sm flex flex-col md:flex-row items-center gap-4 relative z-[30]">
                <div className="w-full md:flex-1 relative">
                    <span className="absolute inset-y-0 left-4 rtl:left-auto rtl:right-4 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder={t.searchByProject}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 rtl:pr-12 rtl:pl-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    />
                </div>
                <div className="w-full md:w-60">
                    <SearchableSelect options={[{ value: 'all', label: t.allManagers }, ...projectManagers.map(m => ({ value: m.id, label: m.name }))]} value={selectedManager} onChange={setSelectedManager} placeholder={t.projectManager} language={language} />
                </div>
                <div className="w-full md:w-80">
                    <SearchableSelect
                        isMulti={true}
                        options={monthYearOptions}
                        value={selectedMonthYear}
                        onChange={handlePeriodChange}
                        placeholder={t.period}
                        language={language}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 md:p-8 rounded-3xl md:rounded-4xl shadow-xl text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{t.totalAmount}</p>
                    <p className="text-2xl md:text-3xl font-black">{formatCurrency(kpis.totalValue)}</p>
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold">
                        <span>{kpis.count} {t.projects}</span>
                        <span className="bg-white/20 px-2 py-1 rounded-lg uppercase">{isAllTime ? 'All Time' : 'Period View'}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.collected}</p>
                    <p className="text-2xl md:text-3xl font-black text-emerald-500">{formatCurrency(kpis.collected)}</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-6 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(kpis.collected/kpis.totalValue)*100 || 0}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.pending}</p>
                    <p className="text-2xl md:text-3xl font-black text-orange-500">{formatCurrency(kpis.pending)}</p>
                    <div className="flex items-center gap-1.5 mt-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Balance</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.activeIssues}</p>
                    <p className="text-2xl md:text-3xl font-black text-red-500">{kpis.totalIssues}</p>
                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">Needs Attention</span>
                    </div>
                </div>
            </div>

            {/* Tree View Roadmap Section */}
            <div className={`bg-white dark:bg-slate-900 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-500`}>
                <div 
                    onClick={() => setIsRoadmapCollapsed(!isRoadmapCollapsed)}
                    className="p-6 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isRoadmapCollapsed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-violet-600 text-white'}`}>
                            <svg className={`w-4 h-4 transition-transform duration-300 ${isRoadmapCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.timelineRoadmap}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{t.roadmapSubtitle}</p>
                        </div>
                    </div>
                    {!isRoadmapCollapsed && (
                        <div className="flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button onClick={expandAll} className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-violet-600 transition-colors">{t.expandAll}</button>
                                <div className="w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                <button onClick={collapseAll} className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-violet-600 transition-colors">{t.collapseAll}</button>
                            </div>
                        </div>
                    )}
                </div>

                {!isRoadmapCollapsed && (
                    <div className="px-6 md:px-10 pb-6 md:pb-10 space-y-4 overflow-x-auto custom-scrollbar animate-in slide-in-from-top-4 duration-500">
                        {Object.keys(groupedHierarchy).length > 0 ? (Object.entries(groupedHierarchy) as Array<[string, { manager: User | undefined, projects: Record<string, { project: Project, milestones: Milestone[] }> }]>).map(([managerId, mGroup]) => {
                        const isMgrExpanded = !!expandedManagers[managerId];
                        const projectList = Object.values(mGroup.projects);
                        
                        return (
                            <div key={managerId} className="relative group/manager min-w-[280px]">
                                {isMgrExpanded && <div className="absolute left-6 rtl:left-auto rtl:right-6 top-14 bottom-0 w-[1.5px] bg-indigo-100 dark:bg-indigo-900/50"></div>}
                                
                                <div 
                                    onClick={() => toggleManagerExpansion(managerId)} 
                                    className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${isMgrExpanded ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-100 dark:hover:border-slate-800'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isMgrExpanded ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400'}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path d={isMgrExpanded ? "M19 13H5v-2h14v2z" : "M12 4v16m8-8H4"} />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img src={mGroup.manager?.avatarUrl || `https://ui-avatars.com/api/?name=${mGroup.manager?.name || '?'}&background=6366f1&color=fff`} className="w-9 h-9 md:w-10 md:h-10 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm" alt={mGroup.manager?.name} />
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight truncate max-w-[120px]">{mGroup.manager?.name || t.unassigned}</h4>
                                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{projectList.length} {t.projects}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <svg className={`w-4 h-4 text-indigo-300 transition-transform duration-300 ${isMgrExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                </div>

                                {isMgrExpanded && (
                                    <div className="ps-8 md:ps-12 py-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                        {projectList.map(({ project, milestones: pMilestones }: any) => {
                                            const isPrjExpanded = !!expandedProjects[project.id];
                                            return (
                                                <div key={project.id} className="relative group/project">
                                                    <div className="absolute -left-6 rtl:-left-auto rtl:-right-6 top-6 w-6 h-[1.5px] bg-indigo-100 dark:bg-indigo-900/50"></div>
                                                    {isPrjExpanded && <div className="absolute left-6 rtl:left-auto rtl:right-6 top-14 bottom-0 w-[1.5px] bg-violet-100 dark:bg-violet-900/50"></div>}

                                                    <div 
                                                        onClick={() => toggleProjectExpansion(project.id)} 
                                                        className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all border ${isPrjExpanded ? 'bg-violet-50/50 border-violet-200 dark:bg-violet-900/10 dark:border-violet-800' : 'bg-white dark:bg-slate-900 border-transparent hover:border-slate-50 dark:hover:border-slate-800'}`}
                                                    >
                                                        <div className="flex items-center gap-4 min-w-0">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isPrjExpanded ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                     <path d={isPrjExpanded ? "M19 13H5v-2h14v2z" : "M12 4v16m8-8H4"} />
                                                                </svg>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4 className="font-black text-slate-800 dark:text-white truncate text-[11px] leading-tight max-w-[150px]">{project.name}</h4>
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{project.projectCode}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 md:gap-6">
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase">{t.progress}</p>
                                                                <p className="text-[10px] font-black text-violet-600">{project.progress}%</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isPrjExpanded && (
                                                        <div className="ps-8 md:ps-10 py-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                            {pMilestones.map((m: any) => (
                                                                <div key={m.id} className="relative group/milestone flex items-center justify-between p-3 bg-white dark:bg-slate-900/40 rounded-xl hover:shadow-md transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                                                    <div className="absolute -left-4 rtl:-left-auto rtl:-right-4 top-1/2 -translate-y-1/2 w-4 h-[1.5px] bg-violet-100 dark:bg-violet-900/50"></div>
                                                                    
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0"></div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px] md:max-w-[200px]">{m.title}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${statusColors[m.status as MilestoneStatus]}`}>{t[m.status as MilestoneStatus]}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {m.hasPayment && (
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] font-black text-emerald-600">{formatCurrency(m.paymentAmount)}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">{t.noData}</div>
                    )}
                </div>
                )}
            </div>

        </div>
    );
};

const translations = {
    ar: {
        totalAmount: "إجمالي القيمة المالية", collected: "المبالغ المحصلة", pending: "المبالغ المعلقة", avgProgress: "متوسط الإنجاز", 
        projects: "مشاريع", allManagers: "كل المدراء", projectManager: "مدير المشروع", searchByProject: "اسم المشروع أو الكود...",
        financialTrend: "الاتجاه المالي للتدفقات", monthlyBreakdown: "توزيع المبالغ حسب الأشهر والسنوات (تصاعدي)", noData: "لا توجد بيانات",
        topProjects: "أعلى المشاريع قيمة", period: "الفترة الزمنية", allTime: "كل الأوقات", timelineRoadmap: "خارطة طريق المشاريع",
        roadmapSubtitle: "هيكل شجري للمدراء والمشاريع والمعالم الزمنية", items: "معالم", progress: "الإنجاز", unassigned: "غير معين",
        Pending: "معلق", "In Progress": "قيد التنفيذ", Completed: "مكتمل", Sent: "مرسلة", Paid: "مدفوعة",
        activeIssues: "المهام النشطة", issuesByProject: "المهام حسب المشروع", issuesByUser: "المهام حسب الموظف",
        criticalAreas: "المناطق التي تتطلب اهتماماً", teamLoad: "توزيع المهام على الفريق", issuesCount: "مهام",
        unknownProject: "مشروع غير معروف", noIssuesFound: "لا توجد مهام حالياً", expandAll: "توسيع الكل", collapseAll: "طي الكل",
        searchAssignee: "بحث عن موظف...", lost: "المبالغ المفقودة", maintenanceTitle: "تحليل عقود الصيانة",
        taskAnalysis: "تحليل المهام والعيوب", teamLoadAndHealth: "حمل الفريق وصحة التنفيذ",
        byProject: "حسب المشروع", byAssignee: "حسب المسؤول", activeTasks: "المهام النشطة",
        projectsCount: "مشاريع", tasks: "مهام", resources: "الموارد البشرية",
        maintenanceSubtitle: "نظرة شاملة على التحصيل والمبالغ المفقودة", contractsCount: "عدد العقود",
        detailedBreakdown: "تفاصيل العقود حسب الكود والمرجع", searchByCodeOrCustomer: "بحث بالكود أو العميل...",
        allCustomers: "كل العملاء", customer: "العميل",
        cardView: "بطاقات", listView: "قائمة", code: "الكود",
        showingRange: "عرض {start}-{end} من {total}", prev: "السابق", next: "التالي",
        startDate: "تاريخ البداية", endDate: "تاريخ الانتهاء"
    },
    en: {
        totalAmount: "Total Financial Value", collected: "Total Collected", pending: "Pending Payments", avgProgress: "Average Progress", 
        projects: "Projects", allManagers: "All Managers", projectManager: "Project Manager", searchByProject: "Search project name or code...",
        financialTrend: "Financial Cashflow Trend", monthlyBreakdown: "Payment breakdown by month/year (Asc)", noData: "No financial data",
        topProjects: "Top Projects by Value", period: "Time Period", allTime: "All Time", timelineRoadmap: "Project Roadmap Tree",
        roadmapSubtitle: "Hierarchical tracking of Managers, Projects and Milestones", items: "Items", progress: "Progress", unassigned: "Unassigned",
        Pending: "Pending", "In Progress": "In Progress", Completed: "Completed", Sent: "Sent", Paid: "Paid",
        activeIssues: "Active Tasks", issuesByProject: "Tasks by Project", issuesByUser: "Tasks by Assignee",
        criticalAreas: "Areas requiring attention", teamLoad: "Team workload distribution", issuesCount: "Tasks",
        unknownProject: "Unknown Project", noIssuesFound: "No tasks reported", expandAll: "Expand All", collapseAll: "Collapse All",
        searchAssignee: "Search assignee...", lost: "Lost Amount", maintenanceTitle: "Maintenance Contracts Analysis",
        taskAnalysis: "Tasks & Defects Management", teamLoadAndHealth: "Team load and execution health",
        byProject: "By Project", byAssignee: "By Assignee", activeTasks: "Active Tasks",
        projectsCount: "Projects", tasks: "Tasks", resources: "Resources",
        maintenanceSubtitle: "Comprehensive overview of collection and loss", contractsCount: "Contracts Count",
        detailedBreakdown: "Detailed Breakdown by Code", searchByCodeOrCustomer: "Search code or customer...",
        allCustomers: "All Customers", customer: "Customer",
        cardView: "Cards", listView: "List", code: "Code",
        showingRange: "Showing {start}-{end} of {total}", prev: "Prev", next: "Next",
        startDate: "Start Date", endDate: "End Date"
    }
};

export default KPIDashboard;
