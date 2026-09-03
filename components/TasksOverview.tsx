
import React, { useMemo, useState } from 'react';
import { Project, Issue, User, Language, TaskViewMode, IssueStatus, IssuePriority, IssueType } from '../types';
import SearchableSelect from './SearchableSelect';

const customerStatusLabel = (status: IssueStatus, language: Language) => {
    const map: Record<string, { ar: string; en: string }> = {
        [IssueStatus.Open]: { ar: 'جديدة', en: 'New' },
        [IssueStatus.InProgress]: { ar: 'قيد التنفيذ', en: 'In Progress' },
        [IssueStatus.Resolved]: { ar: 'منجزة', en: 'Done' },
        [IssueStatus.Closed]: { ar: 'مغلقة', en: 'Closed' },
    };
    return map[status]?.[language] || status;
};

const skipWeekend = (date: Date) => {
    const day = date.getDay(); // Friday = 5, Saturday = 6
    if (day === 5) date.setDate(date.getDate() + 2);
    else if (day === 6) date.setDate(date.getDate() + 1);
    return date;
};

const getDueDate = (createdAt: string, duration?: number | null) => {
    if (!duration) return null;
    const date = new Date(createdAt);
    date.setDate(date.getDate() + duration);
    return skipWeekend(date);
};

interface TasksOverviewProps {
    issues: Issue[];
    projects: Project[];
    allUsers: User[];
    language: Language;
    currentUser?: User;
    onUpdateIssue?: (id: string, data: Partial<Issue>) => Promise<void>;
    onAddComment?: (issueId: string, userId: string, content: string) => Promise<void>;
}

const translations = {
    ar: {
        taskAnalysis: "تحليل المهام والعيوب", teamLoadAndHealth: "حمل الفريق وصحة التنفيذ",
        byProject: "حسب المشروع", byAssignee: "حسب المسؤول",
        projectsCount: "مشاريع", tasks: "مهام", resources: "الموارد البشرية",
        unassigned: "غير معين", unknownProject: "مشروع غير معروف", noIssuesFound: "لا توجد مهام حالياً",
        activeIssues: "المهام النشطة", issuesByProject: "المهام حسب المشروع",
        allAssignees: "كل المسؤولين", searchProject: "ابحث عن مشروع...", selectAssignee: "اختر المسؤول...",
        taskStatus: "حالة المهام", totalTasks: "إجمالي المهام", totalProjects: "عدد المشاريع", openTasks: "مهام مفتوحة", inProgressTasks: "قيد التنفيذ", completedTasks: "مكتملة", customerTasksKpi: "مهام العملاء",
        scheduleKpis: "مؤشرات الجدول الزمني", dueToday: "مستحقة اليوم", dueThisWeek: "مستحقة هذا الأسبوع", overdueTasks: "متأخرة",
        productivityKpis: "مؤشرات الإنتاجية", completionRate: "نسبة الإنجاز", avgPerResource: "متوسط المهام المنجزة لكل موظف",
        riskKpis: "مؤشرات المخاطر", criticalTasks: "مهام حرجة", highPriorityTasks: "أولوية عالية", tasksWithoutOwner: "بدون مسؤول",
        avgResolutionTime: "متوسط وقت الحل",
        overdueTasksList: "المهام المتأخرة", dayOverdue: "يوم متأخر", daysOverdue: "أيام متأخرة",
        doubleClickHint: "دبل كليك لفتح التفاصيل", comments: "التعليقات", addComment: "أضف تعليق...", noComments: "لا توجد تعليقات بعد.", post: "إرسال", close: "إغلاق", status: "الحالة",
    },
    en: {
        taskAnalysis: "Tasks & Defects Management", teamLoadAndHealth: "Team load and execution health",
        byProject: "By Project", byAssignee: "By Assignee",
        projectsCount: "Projects", tasks: "Tasks", resources: "Resources",
        unassigned: "Unassigned", unknownProject: "Unknown Project", noIssuesFound: "No tasks reported",
        activeIssues: "Active Tasks", issuesByProject: "Tasks by Project",
        allAssignees: "All Assignees", searchProject: "Search project...", selectAssignee: "Select Assignee...",
        taskStatus: "Task Status", totalTasks: "Total Tasks", totalProjects: "Projects Count", openTasks: "Open Tasks", inProgressTasks: "In Progress", completedTasks: "Completed", customerTasksKpi: "Customer Tasks",
        scheduleKpis: "Schedule KPIs", dueToday: "Due Today", dueThisWeek: "Due This Week", overdueTasks: "Overdue Tasks",
        productivityKpis: "Productivity KPIs", completionRate: "Completion Rate", avgPerResource: "Avg Tasks Completed / Resource",
        riskKpis: "Risk KPIs", criticalTasks: "Critical Tasks", highPriorityTasks: "High Priority Tasks", tasksWithoutOwner: "Tasks Without Owner",
        avgResolutionTime: "Avg Resolution Time",
        overdueTasksList: "Overdue Tasks", dayOverdue: "day overdue", daysOverdue: "days overdue",
        doubleClickHint: "Double-click to open details", comments: "Comments", addComment: "Add a comment...", noComments: "No comments yet.", post: "Post", close: "Close", status: "Status",
    }
};

const TasksOverview: React.FC<TasksOverviewProps> = ({ issues, projects, allUsers, language, currentUser, onUpdateIssue, onAddComment }) => {
    const t = translations[language];

    const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('byProject');
    const [taskProjectSearch, setTaskProjectSearch] = useState('');
    const [taskAssigneeSearch, setTaskAssigneeSearch] = useState('');
    const [selectedTaskAssignee, setSelectedTaskAssignee] = useState('all');
    const [expandedTasksAssignees, setExpandedTasksAssignees] = useState<Record<string, boolean>>({});
    const [selectedAssigneeTasks, setSelectedAssigneeTasks] = useState<string | null>(null);
    const [selectedProjectTasks, setSelectedProjectTasks] = useState<string | null>(null);
    const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);

    const issueStats = useMemo(() => {
        const byProject: Record<string, { id: string, name: string, count: number, resourceIds: Set<string> }> = {};

        issues.forEach(issue => {
            if (issue.projectId) {
                const proj = projects.find(p => p.id === issue.projectId);
                const projName = proj?.name || t.unknownProject;

                if (!taskProjectSearch.trim() || projName.toLowerCase().includes(taskProjectSearch.toLowerCase())) {
                    if (!byProject[issue.projectId]) {
                        byProject[issue.projectId] = { id: issue.projectId, name: projName, count: 0, resourceIds: new Set<string>() };
                    }
                    byProject[issue.projectId].count++;
                    if (issue.assigneeId) byProject[issue.projectId].resourceIds.add(issue.assigneeId);
                }
            }
        });

        const sortedByProject = Object.values(byProject)
            .map(item => ({ ...item, resourceCount: item.resourceIds.size }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return { byProject: sortedByProject };
    }, [issues, projects, taskProjectSearch, t.unknownProject]);

    const groupedAssigneeIssues = useMemo(() => {
        const hierarchy: Record<string, { user: User | undefined, projectMap: Record<string, { project: Project, issues: Issue[] }> }> = {};

        issues.forEach(issue => {
            const assigneeId = issue.assigneeId || 'unassigned';
            const user = allUsers.find(u => u.id === assigneeId);
            const userName = user?.name || t.unassigned;

            const matchesSearch = !taskAssigneeSearch.trim() || userName.toLowerCase().includes(taskAssigneeSearch.toLowerCase());
            const matchesDropdown = selectedTaskAssignee === 'all' || assigneeId === selectedTaskAssignee;
            if (!matchesSearch || !matchesDropdown) return;

            if (!hierarchy[assigneeId]) hierarchy[assigneeId] = { user, projectMap: {} };

            const projectId = issue.projectId || 'unknown';
            if (!hierarchy[assigneeId].projectMap[projectId]) {
                const project = projects.find(p => p.id === projectId);
                if (project) hierarchy[assigneeId].projectMap[projectId] = { project, issues: [] };
            }
            if (hierarchy[assigneeId].projectMap[projectId]) {
                hierarchy[assigneeId].projectMap[projectId].issues.push(issue);
            }
        });

        return Object.entries(hierarchy).map(([id, data]) => ({
            id, ...data,
            projectList: Object.values(data.projectMap),
            totalCount: Object.values(data.projectMap).reduce((sum, p) => sum + p.issues.length, 0)
        })).sort((a, b) => b.totalCount - a.totalCount);
    }, [issues, allUsers, projects, taskAssigneeSearch, selectedTaskAssignee, t.unassigned]);

    const kpis = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
        const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

        const total = issues.length;
        const projectsCount = new Set(issues.map(i => i.projectId).filter(Boolean)).size;
        const open = issues.filter(i => i.status === IssueStatus.Open).length;
        const inProgress = issues.filter(i => i.status === IssueStatus.InProgress).length;
        const completed = issues.filter(i => i.status === IssueStatus.Resolved || i.status === IssueStatus.Closed).length;
        const fromCustomers = issues.filter(i => !!i.type && i.type !== IssueType.Task).length;

        let dueToday = 0, dueThisWeek = 0, overdue = 0;
        const activeStatuses = [IssueStatus.Open, IssueStatus.InProgress];
        issues.forEach(i => {
            if (!activeStatuses.includes(i.status)) return;
            const due = i.type && i.type !== IssueType.Task
                ? (i.dueDate ? new Date(i.dueDate) : null)
                : getDueDate(i.createdAt, i.expectedDuration);
            if (!due) return;
            if (due < startOfToday) overdue++;
            else if (due >= startOfToday && due < endOfToday) dueToday++;
            else if (due >= startOfToday && due < endOfWeek) dueThisWeek++;
        });

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const resourceIds = new Set(issues.filter(i => i.assigneeId).map(i => i.assigneeId));
        const avgPerResource = resourceIds.size > 0 ? Math.round((completed / resourceIds.size) * 10) / 10 : 0;

        const critical = issues.filter(i => i.priority === IssuePriority.Critical).length;
        const highPriority = issues.filter(i => i.priority === IssuePriority.High).length;
        const withoutOwner = issues.filter(i => !i.assigneeId).length;

        const resolvedIssues = issues.filter(i => i.completedAt);
        const avgResolutionHours = resolvedIssues.length > 0
            ? resolvedIssues.reduce((sum, i) => {
                const created = new Date(i.createdAt).getTime();
                const done = new Date(i.completedAt as string).getTime();
                return sum + Math.max(0, done - created) / 36e5;
            }, 0) / resolvedIssues.length
            : null;

        return { total, projectsCount, open, inProgress, completed, fromCustomers, dueToday, dueThisWeek, overdue, completionRate, avgPerResource, critical, highPriority, withoutOwner, avgResolutionHours };
    }, [issues]);

    const overdueIssues = useMemo(() => {
        const now = new Date();
        const activeStatuses = [IssueStatus.Open, IssueStatus.InProgress];
        return issues
            .filter(i => activeStatuses.includes(i.status))
            .map(i => ({ issue: i, dueDate: i.type && i.type !== IssueType.Task ? (i.dueDate ? new Date(i.dueDate) : null) : getDueDate(i.createdAt, i.expectedDuration) }))
            .filter((x): x is { issue: Issue; dueDate: Date } => !!x.dueDate && x.dueDate < now)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [issues]);

    const activeIssue = issues.find(i => i.id === activeIssueId);

    const handleAddComment = async () => {
        if (!commentText.trim() || !currentUser || !activeIssueId || !onAddComment || isSavingComment) return;
        setIsSavingComment(true);
        try {
            await onAddComment(activeIssueId, currentUser.id, commentText);
            setCommentText('');
        } finally {
            setIsSavingComment(false);
        }
    };

    const formatResolutionTime = (hours: number | null) => {
        if (hours === null) return '—';
        if (hours < 24) return `${hours.toFixed(1)}h`;
        return `${(hours / 24).toFixed(1)}d`;
    };

    const StatCard: React.FC<{ label: string; value: string | number; colorClass?: string }> = ({ label, value, colorClass = 'text-slate-800 dark:text-white' }) => (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className={`text-xl md:text-2xl font-black ${colorClass}`}>{value}</p>
        </div>
    );

    const KpiGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{title}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
        </div>
    );

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <KpiGroup title={t.taskStatus}>
                <StatCard label={t.totalTasks} value={kpis.total} />
                <StatCard label={t.totalProjects} value={kpis.projectsCount} colorClass="text-violet-500" />
                <StatCard label={t.openTasks} value={kpis.open} colorClass="text-blue-500" />
                <StatCard label={t.inProgressTasks} value={kpis.inProgress} colorClass="text-indigo-500" />
                <StatCard label={t.completedTasks} value={kpis.completed} colorClass="text-emerald-500" />
                <StatCard label={t.customerTasksKpi} value={kpis.fromCustomers} colorClass="text-violet-500" />
            </KpiGroup>

            <KpiGroup title={t.scheduleKpis}>
                <StatCard label={t.dueToday} value={kpis.dueToday} colorClass="text-amber-500" />
                <StatCard label={t.dueThisWeek} value={kpis.dueThisWeek} colorClass="text-orange-500" />
                <StatCard label={t.overdueTasks} value={kpis.overdue} colorClass="text-red-500" />
            </KpiGroup>

            {overdueIssues.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-50 dark:border-red-900/20 bg-red-50/40 dark:bg-red-900/10 flex items-center justify-between">
                        <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.2em]">{t.overdueTasksList}</h3>
                        <span className="text-[10px] font-bold text-red-400">{overdueIssues.length}</span>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {overdueIssues.map(({ issue, dueDate }) => {
                            const project = projects.find(p => p.id === issue.projectId);
                            const daysOverdue = Math.max(1, Math.floor((Date.now() - dueDate.getTime()) / 86400000));
                            return (
                                <div
                                    key={issue.id}
                                    onDoubleClick={() => setActiveIssueId(issue.id)}
                                    title={t.doubleClickHint}
                                    className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{issue.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                            <span>{project?.name || t.unknownProject}</span>
                                            <span>•</span>
                                            <span>{issue.assignee?.name || t.unassigned}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-red-500 text-white whitespace-nowrap">
                                            {daysOverdue} {daysOverdue === 1 ? t.dayOverdue : t.daysOverdue}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <KpiGroup title={t.productivityKpis}>
                <StatCard label={t.completionRate} value={`${kpis.completionRate}%`} colorClass="text-emerald-500" />
                <StatCard label={t.avgPerResource} value={kpis.avgPerResource} colorClass="text-indigo-500" />
                <StatCard label={t.avgResolutionTime} value={formatResolutionTime(kpis.avgResolutionHours)} colorClass="text-teal-500" />
            </KpiGroup>

            <KpiGroup title={t.riskKpis}>
                <StatCard label={t.criticalTasks} value={kpis.critical} colorClass="text-red-500" />
                <StatCard label={t.highPriorityTasks} value={kpis.highPriority} colorClass="text-orange-500" />
                <StatCard label={t.tasksWithoutOwner} value={kpis.withoutOwner} colorClass="text-slate-500" />
            </KpiGroup>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2 overflow-hidden">
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
                                                placeholder={t.searchProject}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 rtl:pr-9 rtl:pl-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            />
                                        </>
                                    ) : (
                                        <SearchableSelect
                                            options={[{ value: 'all', label: t.allAssignees }, ...allUsers.filter(u => u.type === 'PS' || u.type === 'Dev').map(u => ({ value: u.id, label: u.name }))]}
                                            value={selectedTaskAssignee}
                                            onChange={setSelectedTaskAssignee}
                                            placeholder={t.selectAssignee}
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
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">#{idx + 1}</span>
                                            </div>
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
                                            <div className="hidden sm:flex items-center gap-1">
                                                {Array.from({ length: Math.min(item.count, 5) }).map((_, i) => (
                                                    <div key={i} className="w-1.5 h-6 bg-indigo-500/10 rounded-full">
                                                        <div className="w-full h-full bg-indigo-500 rounded-full scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom" style={{ transitionDelay: `${i * 50}ms` }}></div>
                                                    </div>
                                                ))}
                                                {item.count > 5 && <span className="text-[10px] font-bold text-slate-300 ml-1">+{item.count - 5}</span>}
                                            </div>
                                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </div>
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
                                                    {group.projectList.slice(0, 3).map((p) => (
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
                            {issues
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
                            {issues
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

            {activeIssue && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveIssueId(null); }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-4">
                            <div className="min-w-0">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white truncate">{activeIssue.title}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeIssue.description}</p>
                            </div>
                            <button onClick={() => setActiveIssueId(null)} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.status}</span>
                            {onUpdateIssue && (!(activeIssue.type && activeIssue.type !== IssueType.Task) || currentUser?.type === 'Manager') ? (
                                <select
                                    value={activeIssue.status}
                                    onChange={(e) => onUpdateIssue(activeIssue.id, { status: e.target.value as IssueStatus })}
                                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase outline-none border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                >
                                    {Object.values(IssueStatus).map(s => <option key={s} value={s}>{activeIssue.type && activeIssue.type !== IssueType.Task ? customerStatusLabel(s, language) : s}</option>)}
                                </select>
                            ) : (
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {activeIssue.type && activeIssue.type !== IssueType.Task ? customerStatusLabel(activeIssue.status, language) : activeIssue.status}
                                </span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.comments}</h3>
                            {(activeIssue.comments || []).length > 0 ? activeIssue.comments!.map(c => (
                                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-black text-slate-600 dark:text-slate-300">{c.user?.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 shrink-0">{new Date(c.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.content}</p>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 italic">{t.noComments}</p>
                            )}
                        </div>

                        {onAddComment && currentUser && (
                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    placeholder={t.addComment}
                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!commentText.trim() || isSavingComment}
                                    className="px-5 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                                >
                                    {t.post}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksOverview;
