
import React, { useMemo, useState } from 'react';
import { Project, Milestone, Lookup, Language, User, PaymentStatus, MilestoneStatus, Issue, MaintenanceContract, TaskViewMode } from '../types';
import SearchableSelect from './SearchableSelect';

interface KPIDashboardProps {
    projects: Project[];
    milestones: Milestone[];
    issues: Issue[];
    allUsers: User[];
    teams: Lookup[];
    projectManagers: User[];
    customers: Lookup[];
    countries: Lookup[];
    language: Language;
    maintenanceContracts: MaintenanceContract[];
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ projects, milestones, issues, allUsers, projectManagers, language, maintenanceContracts, customers, teams, countries }) => {
    const t = translations[language];
    
    // States for Filters
    const [projectSearch, setProjectSearch] = useState('');
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const [taskProjectSearch, setTaskProjectSearch] = useState('');
    const [taskAssigneeSearch, setTaskAssigneeSearch] = useState('');
    const [selectedTaskAssignee, setSelectedTaskAssignee] = useState('all');
    const [selectedManager, setSelectedManager] = useState('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState<string[]>(['all']);

    // Maintenance Section Specific Filters
    const [maintenanceSearch, setMaintenanceSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('all');
    const [selectedMaintenanceMonthYear, setSelectedMaintenanceMonthYear] = useState<string[]>(['all']);
    const [selectedAssigneeTasks, setSelectedAssigneeTasks] = useState<string | null>(null);
    const [selectedProjectTasks, setSelectedProjectTasks] = useState<string | null>(null);
    
    // States for UI Expansion
    const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>({});
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
    const [isRoadmapCollapsed, setIsRoadmapCollapsed] = useState(true);
    const [isMaintenanceCollapsed, setIsMaintenanceCollapsed] = useState(true);
    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('byProject');
    const [expandedTasksAssignees, setExpandedTasksAssignees] = useState<Record<string, boolean>>({});

    // 1. توليد خيارات الشهر/السنة مرتبة تصاعدياً
    const monthYearOptions = useMemo(() => {
        const uniqueMonthYears = new Set<string>();
        milestones.forEach(m => {
            if (m.dueDate) {
                const date = new Date(m.dueDate);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                uniqueMonthYears.add(key);
            }
        });
        
        maintenanceContracts.forEach(c => {
            if (c.year && c.month) {
                const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
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

    const filteredMaintenance = useMemo(() => {
        const isMaintenanceAllTime = selectedMaintenanceMonthYear.includes('all');
        return maintenanceContracts.filter(c => {
            const matchesTime = isMaintenanceAllTime || selectedMaintenanceMonthYear.includes(`${c.year}-${String(c.month || 1).padStart(2, '0')}`);
            const matchesSearch = !maintenanceSearch.trim() || 
                                (c.projectCode?.toLowerCase().includes(maintenanceSearch.toLowerCase()) ?? false) ||
                                (c.customer?.name.toLowerCase().includes(maintenanceSearch.toLowerCase()) ?? false);
            const matchesCustomer = selectedCustomer === 'all' || c.customerId === selectedCustomer;
            
            return matchesTime && matchesSearch && matchesCustomer;
        });
    }, [maintenanceContracts, selectedMaintenanceMonthYear, maintenanceSearch, selectedCustomer]);

    const maintenanceStats = useMemo(() => {
        const stats: Record<string, { total: number, collected: number, lost: number, count: number }> = {};
        
        filteredMaintenance.forEach(c => {
            const key = `${c.year}-${String(c.month || 1).padStart(2, '0')}`;
            if (!stats[key]) stats[key] = { total: 0, collected: 0, lost: 0, count: 0 };
            stats[key].total += c.totalAmount || 0;
            stats[key].collected += c.collectedAmount || 0;
            stats[key].lost += c.lostAmount || 0;
            stats[key].count++;
        });

        return Object.entries(stats).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredMaintenance]);

    const maintenanceOverallTotals = useMemo(() => {
        return filteredMaintenance.reduce((acc, c) => ({
            total: acc.total + (c.totalAmount || 0),
            collected: acc.collected + (c.collectedAmount || 0),
            lost: acc.lost + (c.lostAmount || 0)
        }), { total: 0, collected: 0, lost: 0 });
    }, [filteredMaintenance]);

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

    const issueStats = useMemo(() => {
        const byProject: Record<string, { id: string, name: string, count: number, resourceIds: Set<string> }> = {};
        const byUser: Record<string, { id: string, name: string, count: number, avatar?: string }> = {};

        filteredIssues.forEach(issue => {
            if (issue.projectId) {
                const proj = projects.find(p => p.id === issue.projectId);
                const projName = proj?.name || t.unknownProject;
                
                if (!taskProjectSearch.trim() || projName.toLowerCase().includes(taskProjectSearch.toLowerCase())) {
                    if (!byProject[issue.projectId]) {
                        byProject[issue.projectId] = { 
                            id: issue.projectId, 
                            name: projName, 
                            count: 0,
                            resourceIds: new Set<string>()
                        };
                    }
                    byProject[issue.projectId].count++;
                    if (issue.assigneeId) {
                        byProject[issue.projectId].resourceIds.add(issue.assigneeId);
                    }
                }
            }

            if (issue.assigneeId) {
                const user = allUsers.find(u => u.id === issue.assigneeId);
                const userName = user?.name || t.unassigned;

                const matchesSearch = !taskAssigneeSearch.trim() || userName.toLowerCase().includes(taskAssigneeSearch.toLowerCase());
                const matchesDropdown = selectedTaskAssignee === 'all' || issue.assigneeId === selectedTaskAssignee;

                if (matchesSearch && matchesDropdown) {
                    if (!byUser[issue.assigneeId]) byUser[issue.assigneeId] = { id: issue.assigneeId, name: userName, count: 0, avatar: user?.avatarUrl };
                    byUser[issue.assigneeId].count++;
                }
            }
        });

        const sortedByProject = Object.values(byProject)
            .map(item => ({
                ...item,
                resourceCount: item.resourceIds.size
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            byProject: sortedByProject,
            byUser: Object.values(byUser).sort((a, b) => b.count - a.count)
        };
    }, [filteredIssues, projects, allUsers, t, taskProjectSearch, taskAssigneeSearch, selectedTaskAssignee]);

    const groupedAssigneeIssues = useMemo(() => {
        const hierarchy: Record<string, { user: User | undefined, projectMap: Record<string, { project: Project, issues: Issue[] }> }> = {};
        
        filteredIssues.forEach(issue => {
            const assigneeId = issue.assigneeId || 'unassigned';
            const user = allUsers.find(u => u.id === assigneeId);
            const userName = user?.name || t.unassigned;

            const matchesSearch = !taskAssigneeSearch.trim() || userName.toLowerCase().includes(taskAssigneeSearch.toLowerCase());
            const matchesDropdown = selectedTaskAssignee === 'all' || assigneeId === selectedTaskAssignee;

            if (!matchesSearch || !matchesDropdown) {
                return;
            }

            if (!hierarchy[assigneeId]) {
                hierarchy[assigneeId] = {
                    user,
                    projectMap: {}
                };
            }
            
            const projectId = issue.projectId || 'unknown';
            if (!hierarchy[assigneeId].projectMap[projectId]) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                    hierarchy[assigneeId].projectMap[projectId] = { project, issues: [] };
                }
            }
            
            if (hierarchy[assigneeId].projectMap[projectId]) {
                hierarchy[assigneeId].projectMap[projectId].issues.push(issue);
            }
        });
        
        return Object.entries(hierarchy).map(([id, data]) => ({
            id,
            ...data,
            projectList: Object.values(data.projectMap),
            totalCount: Object.values(data.projectMap).reduce((sum, p) => sum + p.issues.length, 0)
        })).sort((a, b) => b.totalCount - a.totalCount);
    }, [filteredIssues, allUsers, projects, taskAssigneeSearch, selectedTaskAssignee, t.unassigned]);

    // Logic to decide which users to show based on search
    const displayUsers = useMemo(() => {
        const list = issueStats.byUser;
        if (!assigneeSearch.trim()) return list.slice(0, 5); // Default top 5
        return list.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()));
    }, [issueStats.byUser, assigneeSearch]);

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

            {/* Task Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Maintenance Contracts Breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2 overflow-hidden transition-all duration-500">
                    <div 
                        onClick={() => setIsMaintenanceCollapsed(!isMaintenanceCollapsed)}
                        className="p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isMaintenanceCollapsed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-emerald-500 text-white'}`}>
                                <svg className={`w-6 h-6 transition-transform duration-300 ${isMaintenanceCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.maintenanceTitle}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{t.maintenanceSubtitle}</p>
                            </div>
                        </div>

                        {/* Local Filters for Maintenance */}
                        {!isMaintenanceCollapsed && (
                            <div className="flex flex-col xl:flex-row items-center gap-3 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                                <div className="relative w-full sm:w-48">
                                    <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </span>
                                    <input 
                                        type="text" 
                                        value={maintenanceSearch}
                                        onChange={(e) => setMaintenanceSearch(e.target.value)}
                                        placeholder={t.searchByCodeOrCustomer}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 rtl:pr-9 rtl:pl-3 text-[10px] font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <SearchableSelect 
                                        options={[{ value: 'all', label: t.allCustomers }, ...customers.map(c => ({ value: c.id, label: c.name }))]} 
                                        value={selectedCustomer} 
                                        onChange={setSelectedCustomer} 
                                        placeholder={t.customer} 
                                        language={language} 
                                    />
                                </div>
                                <div className="w-full sm:w-64">
                                    <SearchableSelect 
                                        isMulti={true}
                                        options={monthYearOptions} 
                                        value={selectedMaintenanceMonthYear} 
                                        onChange={(val) => {
                                            if (val.length === 0) {
                                                setSelectedMaintenanceMonthYear(['all']);
                                                return;
                                            }
                                            const last = val[val.length - 1];
                                            if (last === 'all') setSelectedMaintenanceMonthYear(['all']);
                                            else setSelectedMaintenanceMonthYear(val.filter(v => v !== 'all'));
                                        }} 
                                        placeholder={t.period} 
                                        language={language} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {!isMaintenanceCollapsed && (
                        <div className="px-6 md:px-10 pb-10 animate-in slide-in-from-top-4 duration-500">
                            {/* Maintenance KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                                 <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalAmount}</p>
                                     <p className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(maintenanceOverallTotals.total)}</p>
                                 </div>
                                 <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/50">
                                     <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">{t.collected}</p>
                                     <p className="text-xl font-black text-emerald-600">{formatCurrency(maintenanceOverallTotals.collected)}</p>
                                 </div>
                                 <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/50">
                                     <p className="text-[10px] font-black text-red-600/70 uppercase tracking-widest mb-1">{t.lost}</p>
                                     <p className="text-xl font-black text-red-600">{formatCurrency(maintenanceOverallTotals.lost)}</p>
                                 </div>
                            </div>
        
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left rtl:text-right border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="pb-4 px-4">{t.period}</th>
                                            <th className="pb-4 px-4">{t.contractsCount}</th>
                                            <th className="pb-4 px-4">{t.totalAmount}</th>
                                            <th className="pb-4 px-4 font-black text-emerald-500">{t.collected}</th>
                                            <th className="pb-4 px-4 font-black text-red-500">{t.lost}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {maintenanceStats.length > 0 ? maintenanceStats.map(([key, stat]) => {
                                            const [year, month] = key.split('-').map(Number);
                                            const monthLabel = new Date(year, month - 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
                                            
                                            return (
                                                <tr key={key} className="group">
                                                    <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 rounded-s-2xl font-black text-xs text-slate-700 dark:text-slate-200">{monthLabel}</td>
                                                    <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-bold text-xs text-slate-600 dark:text-slate-400">{stat.count}</td>
                                                    <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-black text-xs text-slate-800 dark:text-white">{formatCurrency(stat.total)}</td>
                                                    <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-black text-xs text-emerald-500">{formatCurrency(stat.collected)}</td>
                                                    <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 rounded-e-2xl font-black text-xs text-red-500">{formatCurrency(stat.lost)}</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">{t.noData}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
        
                            {/* Detailed Breakdown for the selected period */}
                            <div className="mt-10 border-t border-slate-50 dark:border-slate-800 pt-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t.detailedBreakdown}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredMaintenance.map(c => (
                                        <div key={c.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-2 hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{c.projectCode || 'No Code'}</span>
                                                <span className="text-[9px] font-bold text-slate-400">{c.year}-{String(c.month).padStart(2, '0')}</span>
                                            </div>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{c.customer?.name || 'Customer'}</p>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">{t.totalAmount}</p>
                                                    <p className="text-xs font-black text-slate-800 dark:text-white">{formatCurrency(c.totalAmount)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-emerald-500 uppercase">{t.collected}</p>
                                                    <p className="text-xs font-black text-emerald-500">{formatCurrency(c.collectedAmount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2 overflow-hidden">
                {/* Header / Toolbar */}
                <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{t.taskAnalysis}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-[0.2em]">{t.teamLoadAndHealth}</p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            {/* Segmented Control */}
                            <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
                                <button 
                                    onClick={() => setTaskViewMode('byProject')}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taskViewMode === 'byProject' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.byProject}
                                </button>
                                <button 
                                    onClick={() => setTaskViewMode('byAssignee')}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${taskViewMode === 'byAssignee' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.byAssignee}
                                </button>
                            </div>

                            {/* Search Unified */}
                            <div className="relative w-full md:w-80">
                                {taskViewMode === 'byProject' ? (
                                    <>
                                        <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400 z-10">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </span>
                                        <input 
                                            type="text" 
                                            value={taskProjectSearch}
                                            onChange={(e) => setTaskProjectSearch(e.target.value)}
                                            placeholder={language === 'ar' ? 'ابحث عن مشروع...' : 'Search project...'}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 rtl:pr-9 rtl:pl-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                        />
                                    </>
                                ) : (
                                    <SearchableSelect 
                                        options={[{ value: 'all', label: language === 'ar' ? 'كل المسؤولين' : 'All Assignees' }, ...allUsers.map(u => ({ value: u.id, label: u.name }))]}
                                        value={selectedTaskAssignee}
                                        onChange={setSelectedTaskAssignee}
                                        placeholder={language === 'ar' ? 'اختر المسؤول...' : 'Select Assignee...'}
                                        language={language}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    {taskViewMode === 'byProject' ? (
                        <div className="space-y-4">
                            {issueStats.byProject.length > 0 ? issueStats.byProject.map((item, idx) => (
                                <div 
                                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-500/30 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden" 
                                    key={idx}
                                    onClick={() => setSelectedProjectTasks(item.id)}
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        {/* Rank */}
                                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">#{idx + 1}</span>
                                        </div>

                                        {/* Project Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors truncate">
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="3" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">{t.tasks}: <span className="text-indigo-600 dark:text-indigo-400">{item.count}</span></span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="3" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                    <span className="text-[11px] font-bold uppercase tracking-tight">{t.resources}: <span className="text-emerald-600 dark:text-emerald-400">{item.resourceCount}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visual Indicator */}
                                        <div className="hidden sm:flex items-center gap-1">
                                            {Array.from({ length: Math.min(item.count, 5) }).map((_, i) => (
                                                <div key={i} className="w-1.5 h-6 bg-indigo-500/10 rounded-full">
                                                    <div className="w-full h-full bg-indigo-500 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" style={{ transitionDelay: `${i * 50}ms` }}></div>
                                                </div>
                                            ))}
                                            {item.count > 5 && <span className="text-[10px] font-bold text-slate-300 ml-1">+{item.count - 5}</span>}
                                        </div>

                                        {/* Arrow */}
                                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                            <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                    
                                    {/* Progress line at bottom */}
                                    <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 w-0 group-hover:w-full"></div>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.noIssuesFound}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedAssigneeIssues.length > 0 ? groupedAssigneeIssues.map((group) => (
                                <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all group hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none">
                                    <div 
                                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                        onClick={() => setExpandedTasksAssignees(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img 
                                                    src={group.user?.avatarUrl || `https://ui-avatars.com/api/?name=${group.user?.name || 'U'}&background=6366f1&color=fff`} 
                                                    className="w-12 h-12 rounded-xl border-2 border-white dark:border-slate-800 shadow-md object-cover" 
                                                />
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-lg flex items-center justify-center text-[8px] font-black text-white border-2 border-white dark:border-slate-900 shadow-sm">
                                                    {group.totalCount}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-sm font-black text-slate-800 dark:text-white block group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{group.user?.name || t.unassigned}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.projectList.length} {t.projectsCount}</span>
                                                    <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{t.tasks} {group.totalCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 self-end md:self-auto">
                                            <div className="hidden md:flex -space-x-2">
                                                {group.projectList.slice(0, 3).map((p, i) => (
                                                    <div key={p.project.id} className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-indigo-500 uppercase" title={p.project.name}>
                                                        {p.project.projectCode?.substring(0, 2) || 'P'}
                                                    </div>
                                                ))}
                                                {group.projectList.length > 3 && (
                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-400">
                                                        +{group.projectList.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expandedTasksAssignees[group.id] ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                <svg className={`w-4 h-4 transition-transform duration-300 ${expandedTasksAssignees[group.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {expandedTasksAssignees[group.id] && (
                                        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-4 duration-300 border-t border-slate-50 dark:border-slate-800 pt-5">
                                            {group.projectList.map(p => (
                                                <div 
                                                    key={p.project.id} 
                                                    className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer group/child"
                                                    onClick={() => setSelectedAssigneeTasks(group.id)}
                                                >
                                                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate mb-2 group-hover/child:text-indigo-500 transition-colors uppercase">{p.project.name}</p>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{p.issues.length} {t.tasks}</span>
                                                        </div>
                                                        <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md uppercase">{p.project.projectCode}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-4">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.noIssuesFound}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            </div>

            {/* Assignee Tasks Detail Modal */}
            {selectedAssigneeTasks && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-4xl shadow-2xl overflow-hidden flex flex-col scale-in-center">
                        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        {allUsers.find(u => u.id === selectedAssigneeTasks)?.name || t.unassigned}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.activeIssues}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedAssigneeTasks(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                            {filteredIssues
                                .filter(issue => issue.assigneeId === selectedAssigneeTasks)
                                .map((issue) => {
                                    const project = projects.find(p => p.id === issue.projectId);
                                    return (
                                        <div key={issue.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:border-indigo-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-2">{issue.title}</h4>
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shrink-0 ml-4 rtl:ml-0 rtl:mr-4 ${
                                                    issue.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                                                    issue.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {issue.priority}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                                        {project?.name || t.unknownProject}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}

            {/* Project Tasks Detail Modal */}
            {selectedProjectTasks && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-4xl shadow-2xl overflow-hidden flex flex-col scale-in-center">
                        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        {projects.find(p => p.id === selectedProjectTasks)?.name || t.unknownProject}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.issuesByProject}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedProjectTasks(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                            {filteredIssues
                                .filter(issue => issue.projectId === selectedProjectTasks)
                                .map((issue) => {
                                    const assignee = allUsers.find(u => u.id === issue.assigneeId);
                                    return (
                                        <div key={issue.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 hover:border-red-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-2">{issue.title}</h4>
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shrink-0 ml-4 rtl:ml-0 rtl:mr-4 ${
                                                    issue.priority === 'High' ? 'bg-red-500/10 text-red-500' : 
                                                    issue.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {issue.priority}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <img src={assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${assignee?.name || 'U'}&background=8b5cf6&color=fff`} className="w-4 h-4 rounded-full" />
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                                        {assignee?.name || t.unassigned}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400">
                                                    {new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
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
        allCustomers: "كل العملاء", customer: "العميل"
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
        allCustomers: "All Customers", customer: "Customer"
    }
};

export default KPIDashboard;
