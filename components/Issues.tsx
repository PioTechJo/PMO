
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Plus, X, Layout, User as UserIcon, Type, AlignLeft, 
    Flag, Calendar, Layers, ShieldCheck, AlertCircle, Settings, Check
} from 'lucide-react';
import { Issue, Project, Milestone, User, Language, IssueStatus, IssuePriority, IssueComment } from '../types';
import SearchableSelect from './SearchableSelect';
import StatCard from './StatCard';

interface IssuesProps {
    allIssues: Issue[];
    allProjects: Project[];
    allMilestones: Milestone[];
    allUsers: User[];
    language: Language;
    onAddIssue: (data: Omit<Issue, 'id' | 'createdAt'>) => Promise<void>;
    onUpdateIssue: (id: string, data: Partial<Issue>) => Promise<void>;
    onAddComment?: (issueId: string, userId: string, content: string) => Promise<void>;
    currentUser: User | undefined;
}

const Issues: React.FC<IssuesProps> = ({ allIssues, allProjects, allMilestones, allUsers, language, onAddIssue, onUpdateIssue, onAddComment, currentUser }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
    const [selectedPriority, setSelectedPriority] = useState('all');
    const [onlyMyIssues, setOnlyMyIssues] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [groupBy, setGroupBy] = useState<'none' | 'project' | 'assignee'>('none');
    
    const t = translations[language];

    const [visibleColumns, setVisibleColumns] = useState<string[]>(['selection', 'task', 'priority', 'status', 'project', 'dueDate', 'assignee', 'updated', 'commentsCount']);
    const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

    const ALL_COLUMNS = [
        { key: 'selection', label: language === 'ar' ? 'اختيار' : 'SELECTION' },
        { key: 'task', label: language === 'ar' ? 'المهمة' : 'TASK' },
        { key: 'priority', label: language === 'ar' ? 'الأولوية' : 'PRIORITY' },
        { key: 'status', label: language === 'ar' ? 'الحالة' : 'STATUS' },
        { key: 'project', label: language === 'ar' ? 'المشروع' : 'PROJECT' },
        { key: 'dueDate', label: language === 'ar' ? 'موعد التسليم' : 'DUE DATE' },
        { key: 'assignee', label: language === 'ar' ? 'المسؤول' : 'ASSIGNEE' },
        { key: 'updated', label: language === 'ar' ? 'تحديث' : 'UPDATED' },
        { key: 'commentsCount', label: language === 'ar' ? 'التعليقات' : 'CMTS' },
    ];

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => 
            prev.includes(key) 
                ? prev.filter(k => k !== key) 
                : [...prev, key]
        );
    };

    const handleExportToExcel = () => {
        const exportData = filteredIssues.map(issue => {
            const project = allProjects.find(p => p.id === issue.projectId);
            const assignee = allUsers.find(u => u.id === issue.assigneeId);
            const reporter = allUsers.find(u => u.id === issue.reporterId);
            const milestone = allMilestones.find(m => m.id === issue.milestoneId);
            
            return {
                [t.issueTitle]: issue.title,
                [t.description]: issue.description,
                [t.project]: project?.name || t.unknownProject,
                [t.milestone]: milestone?.title || '',
                [t.status]: issue.status,
                [t.priority]: issue.priority,
                [t.assignedTo]: assignee?.name || t.unassigned,
                [language === 'ar' ? 'منشئ المهمة' : 'Reported By']: reporter?.name || '',
                [t.reportedAt]: new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Issues");
        XLSX.writeFile(workbook, `Tasks_Defects_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const activeViewingIssue = useMemo(() => 
        allIssues.find(i => i.id === selectedIssueId), 
    [allIssues, selectedIssueId]);

    const psUsers = useMemo(() => allUsers.filter(u => u.type === 'PS'), [allUsers]);

    const filteredIssues = useMemo(() => {
        return allIssues.filter(i => {
            const projectMatch = selectedProjectId === 'all' || i.projectId === selectedProjectId;
            const statusMatch = selectedStatus === 'all' || i.status === selectedStatus;
            const assigneeMatch = selectedAssigneeId === 'all' || i.assigneeId === selectedAssigneeId;
            const priorityMatch = selectedPriority === 'all' || i.priority === selectedPriority;
            const userMatch = !onlyMyIssues || (currentUser && i.assigneeId === currentUser.id);
            return projectMatch && statusMatch && assigneeMatch && userMatch && priorityMatch;
        });
    }, [allIssues, selectedProjectId, selectedStatus, selectedAssigneeId, selectedPriority, onlyMyIssues, currentUser]);

    // KPI Stats
    const stats = useMemo(() => {
        const open = allIssues.filter(i => i.status === IssueStatus.Open).length;
        const resolved = allIssues.filter(i => i.status === IssueStatus.Resolved).length;
        const inProgress = allIssues.filter(i => i.status === IssueStatus.InProgress).length;
        const high = allIssues.filter(i => i.priority === IssuePriority.High || i.priority === IssuePriority.Critical).length;
        return { open, resolved, inProgress, high };
    }, [allIssues]);

    const priorityColors = {
        [IssuePriority.Critical]: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
        [IssuePriority.High]: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
        [IssuePriority.Medium]: 'bg-amber-500 text-white shadow-lg shadow-amber-500/10',
        [IssuePriority.Low]: 'bg-blue-400 text-white shadow-lg shadow-blue-400/10',
    };

    const statusColors = {
        [IssueStatus.Open]: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        [IssueStatus.InProgress]: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        [IssueStatus.Resolved]: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        [IssueStatus.Closed]: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    };

    return (
        <div className="space-y-6 pb-10 text-slate-800 dark:text-slate-200">
            {/* Header Content Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.title}</h1>
                        <p className="text-[10px] font-bold text-slate-400">{t.subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 h-10 ${onlyMyIssues ? 'bg-white dark:bg-slate-900 border-[#3b82f6] text-[#3b82f6]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                    >
                        {onlyMyIssues ? t.allIssues : t.myIssues}
                    </button>
                    <button 
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all h-10"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t.exportExcel}
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-[#3b82f6] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all active:scale-95 h-10"
                    >
                        <svg className="w-4 h-4 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                        {t.newIssue}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title={language === 'ar' ? 'المهام النشطة' : 'Active Tasks'} 
                    value={stats.open} 
                    trend={{ val: '3', label: 'from last week', type: 'up' }} 
                    color="blue"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard 
                    title={language === 'ar' ? 'المهام المنجزة' : 'Resolved'} 
                    value={stats.resolved} 
                    trend={{ val: '12%', label: 'this month', type: 'up' }} 
                    color="emerald"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                />
                <StatCard 
                    title="In Progress" 
                    value={stats.inProgress} 
                    trend={{ val: '2', label: 'from yesterday', type: 'down' }} 
                    color="orange"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                />
                <StatCard 
                    title="Critical Issues" 
                    value={stats.high} 
                    trend={{ label: 'Requires immediate attention', type: 'warning' }} 
                    color="red"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                />
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#111927] p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[140px]">
                        <option value="all">{t.allProjects}</option>
                        {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={selectedAssigneeId} onChange={e => setSelectedAssigneeId(e.target.value)} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[140px]">
                        <option value="all">{t.allAssignees}</option>
                        {allUsers.filter(u => u.type === 'PS').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[140px]">
                        <option value="all">{t.allStatuses}</option>
                        {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[140px]">
                        <option value="all">{language === 'ar' ? 'جميع الأولويات' : 'All Priorities'}</option>
                        {Object.values(IssuePriority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 transition-all outline-none focus:ring-2 focus:ring-blue-500 h-10 min-w-[140px]">
                        <option value="none">{language === 'ar' ? 'بدون تجميع' : 'No Grouping'}</option>
                        <option value="project">{language === 'ar' ? 'تجميع حسب المشروع' : 'Group by Project'}</option>
                        <option value="assignee">{language === 'ar' ? 'تجميع حسب المسؤول' : 'Group by Assignee'}</option>
                    </select>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredIssues.length} of {allIssues.length} tasks</p>
                    <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-[#3b82f6] shadow-sm' : 'text-slate-400'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-[#3b82f6] shadow-sm' : 'text-slate-400'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 0 012 2v2a2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 0 01-2 2H2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 0 01-2 2H2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>

                    {viewMode === 'list' && (
                        <div className="relative">
                            <button 
                                onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                                className={`p-2 rounded-xl border-2 transition-all h-10 w-10 flex items-center justify-center ${isColumnPickerOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            
                            <AnimatePresence>
                                {isColumnPickerOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsColumnPickerOpen(false)} />
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{language === 'ar' ? 'تخصيص الأعمدة' : 'CUSTOMIZE COLUMNS'}</span>
                                                <button onClick={() => setIsColumnPickerOpen(false)}><X className="w-4 h-4 text-slate-300" /></button>
                                            </div>
                                            <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {ALL_COLUMNS.map(col => (
                                                    <button 
                                                        key={col.key}
                                                        onClick={() => toggleColumn(col.key)}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                                                    >
                                                        <span className={`text-[11px] font-bold ${visibleColumns.includes(col.key) ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{col.label}</span>
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${visibleColumns.includes(col.key) ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'border-2 border-slate-100 dark:border-slate-800'}`}>
                                                            {visibleColumns.includes(col.key) && <Check className="w-3 h-3 stroke-[3]" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                                                <button 
                                                    onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                                    className="w-full py-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                                                >
                                                    {language === 'ar' ? 'إعادة تعيين' : 'RESET TO DEFAULT'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* List / Table View */}
            {viewMode === 'list' ? (
                <div className="bg-white dark:bg-[#111927] rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
                                    {visibleColumns.includes('selection') && <th className="px-6 py-4"><input type="checkbox" className="rounded bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" /></th>}
                                    {visibleColumns.includes('task') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المهمة' : 'TASK'}</th>}
                                    {visibleColumns.includes('priority') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الأولوية' : 'PRIORITY'}</th>}
                                    {visibleColumns.includes('status') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الحالة' : 'STATUS'}</th>}
                                    {visibleColumns.includes('project') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المشروع' : 'PROJECT'}</th>}
                                    {visibleColumns.includes('dueDate') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'موعد التسليم' : 'DUE DATE'}</th>}
                                    {visibleColumns.includes('assignee') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المسؤول' : 'ASSIGNEE'}</th>}
                                    {visibleColumns.includes('updated') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تحديث' : 'UPDATED'}</th>}
                                    {visibleColumns.includes('commentsCount') && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CMTS</th>}
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-sans">
                                {groupBy === 'none' ? (
                                    filteredIssues.map(issue => <IssueRowComponent key={issue.id} issue={issue} allProjects={allProjects} t={t} statusColors={statusColors} onClick={() => setSelectedIssueId(issue.id)} language={language} visibleColumns={visibleColumns} />)
                                ) : (
                                    (Object.entries(
                                        filteredIssues.reduce((acc, issue) => {
                                            const key = groupBy === 'project' 
                                                ? (allProjects.find(p => p.id === issue.projectId)?.name || t.unknownProject)
                                                : (allUsers.find(u => u.id === issue.assigneeId)?.name || t.unassigned);
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(issue);
                                            return acc;
                                        }, {} as Record<string, Issue[]>)
                                    ) as [string, Issue[]][]).sort((a, b) => a[0].localeCompare(b[0])).map(([groupName, groupIssues]) => (
                                        <React.Fragment key={groupName}>
                                            <tr className="bg-slate-50 dark:bg-slate-900/50">
                                                <td colSpan={visibleColumns.length + 1} className="px-6 py-2 text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.25em]">{groupName} <span className="opacity-40">({groupIssues.length})</span></td>
                                            </tr>
                                            {groupIssues.map(issue => <IssueRowComponent key={issue.id} issue={issue} allProjects={allProjects} t={t} statusColors={statusColors} onClick={() => setSelectedIssueId(issue.id)} language={language} visibleColumns={visibleColumns} />)}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredIssues.map(issue => (
                        <IssueCard key={issue.id} issue={issue} onClick={() => setSelectedIssueId(issue.id)} currentUser={currentUser} t={t} priorityColors={priorityColors} statusColors={statusColors} language={language} />
                    ))}
                </div>
            )}

            {filteredIssues.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-800 mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-[11px] font-black uppercase text-slate-300 tracking-[0.5em]">{t.noIssues}</p>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <AddIssueModal
                        onClose={() => setIsAddModalOpen(false)}
                        projects={allProjects}
                        milestones={allMilestones}
                        users={psUsers}
                        allIssues={allIssues}
                        language={language}
                        onSave={async (d) => { 
                            await onAddIssue({...d, reporterId: currentUser?.id || ''}); 
                            setIsAddModalOpen(false); 
                        }}
                    />
                )}

                {activeViewingIssue && (
                    <IssueDetailModal
                        issue={activeViewingIssue}
                        onClose={() => setSelectedIssueId(null)}
                        language={language}
                        currentUser={currentUser}
                        psUsers={psUsers}
                        onUpdateStatus={async (s) => onUpdateIssue(activeViewingIssue.id, { status: s })}
                        onReassign={async (assigneeId) => onUpdateIssue(activeViewingIssue.id, { assigneeId })}
                        onAddComment={async (c) => {
                            if (onAddComment && currentUser) {
                                await onAddComment(activeViewingIssue.id, currentUser.id, c);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date() > dueDate;
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

// Sub-components
const IssueRowComponent: React.FC<{ issue: Issue, allProjects: Project[], t: any, statusColors: any, onClick: () => void, language: Language, visibleColumns: string[] }> = ({ issue, allProjects, t, statusColors, onClick, language, visibleColumns }) => {
    const dueDate = getDueDate(issue.createdAt, issue.expectedDuration);
    const overdue = isOverdue(dueDate) && issue.status !== IssueStatus.Closed && issue.status !== IssueStatus.Resolved;

    return (
        <tr className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors group cursor-pointer" onClick={onClick}>
            {visibleColumns.includes('selection') && <td className="px-6 py-5" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded bg-transparent border-slate-200 dark:border-slate-700" /></td>}
            {visibleColumns.includes('task') && (
                <td className="px-6 py-5 min-w-[250px]">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{issue.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">#TSK-{issue.id.substring(0,4)}</span>
                            {overdue && <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">{t.overdue}</span>}
                        </div>
                    </div>
                </td>
            )}
            {visibleColumns.includes('priority') && (
                <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${issue.priority === IssuePriority.Critical || issue.priority === IssuePriority.High ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`} />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{issue.priority}</span>
                    </div>
                </td>
            )}
            {visibleColumns.includes('status') && (
                <td className="px-6 py-5">
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase text-center inline-block ${statusColors[issue.status]}`}>
                        {issue.status === IssueStatus.Open ? (language === 'ar' ? 'نشط' : 'ACTIVE') : issue.status}
                    </div>
                </td>
            )}
            {visibleColumns.includes('project') && (
                <td className="px-6 py-5">
                    <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 inline-block uppercase tracking-tight">
                        {allProjects.find(p => p.id === issue.projectId)?.projectCode || 'PIO-PRJ'}
                    </div>
                </td>
            )}
            {visibleColumns.includes('dueDate') && (
                <td className="px-6 py-5 whitespace-nowrap">
                    {dueDate ? (
                        <div className={`flex flex-col ${overdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{t.dueDate}</span>
                            <span className="text-xs font-bold">{dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold text-slate-300">---</span>
                    )}
                </td>
            )}
            {visibleColumns.includes('assignee') && (
                <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 overflow-hidden flex items-center justify-center text-[10px] font-black text-slate-500">
                            {issue.assignee?.avatarUrl ? <img src={issue.assignee.avatarUrl} className="w-full h-full object-cover" /> : issue.assignee?.name?.substring(0, 2).toUpperCase() || 'AT'}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{issue.assignee?.name || t.unassigned}</span>
                    </div>
                </td>
            )}
            {visibleColumns.includes('updated') && (
                <td className="px-6 py-5">
                    <span className="text-[11px] font-bold text-slate-400">{new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</span>
                </td>
            )}
            {visibleColumns.includes('commentsCount') && (
                <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span className="text-[11px] font-black">{(issue.comments || []).length}</span>
                    </div>
                </td>
            )}
            <td className="px-6 py-5 text-right">
                <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg></button>
                </div>
            </td>
        </tr>
    );
};

const IssueCard: React.FC<{ issue: Issue, onClick: () => void, currentUser?: User, t: any, priorityColors: any, statusColors: any, language: Language }> = ({ issue, onClick, currentUser, t, priorityColors, statusColors, language }) => {
    const dueDate = getDueDate(issue.createdAt, issue.expectedDuration);
    const overdue = isOverdue(dueDate) && issue.status !== IssueStatus.Closed && issue.status !== IssueStatus.Resolved;

    return (
        <div 
            onClick={onClick}
            className={`bg-white dark:bg-[#111927] border-2 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full cursor-pointer hover:-translate-y-1 ${issue.assigneeId === currentUser?.id ? 'border-blue-200 dark:border-blue-900/30' : 'border-slate-50 dark:border-slate-800'} ${overdue ? 'ring-2 ring-red-500/20' : ''}`}>
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${priorityColors[issue.priority]}`}>{issue.priority === IssuePriority.Critical ? (language === 'ar' ? 'حرجة' : 'CRITICAL') : issue.priority}</span>
                        {overdue && <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-red-500 text-white animate-pulse">{t.overdue}</span>}
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${statusColors[issue.status]}`}>
                        {issue.status === IssueStatus.Open ? (language === 'ar' ? 'نشط' : 'ACTIVE') : issue.status}
                    </div>
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors uppercase tracking-tight">{issue.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">{issue.description}</p>
                
                {dueDate && (
                    <div className={`text-[10px] font-bold mb-4 flex items-center gap-1.5 ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                        <Calendar className="w-3 h-3" />
                        {t.dueDate}: {dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src={issue.assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${issue.assignee?.name || '?'}&background=3b82f6&color=fff`} className="w-8 h-8 rounded-xl shadow-sm" />
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{issue.assignee?.name || t.unassigned}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-[10px] font-black">{(issue.comments || []).length}</span>
                </div>
            </div>
        </div>
    );
};

const IssueDetailModal: React.FC<{ issue: Issue, onClose: () => void, language: Language, currentUser?: User, psUsers: User[], onUpdateStatus: (s: IssueStatus) => Promise<void>, onReassign: (assigneeId: string) => Promise<void>, onAddComment: (c: string) => Promise<void> }> = ({ issue, onClose, language, currentUser, psUsers, onUpdateStatus, onReassign, onAddComment }) => {
    const t = translations[language];
    const [comment, setComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddComment = async () => {
        if (!comment.trim() || isSaving) return;
        setIsSaving(true);
        try {
            await onAddComment(comment);
            setComment('');
        } catch (e) {
            console.error("Failed to add comment");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 font-sans" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col md:flex-row overflow-hidden relative" 
                dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
                {/* Main Content Area */}
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                    {issue.project?.name || t.unknownProject}
                                </span>
                                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">#TSK-{issue.id.substring(0, 8)}</span>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">{issue.title}</h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-10">
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[2rem] relative group">
                            <div className="absolute top-6 left-6 rtl:left-auto rtl:right-6 text-slate-200 dark:text-slate-800">
                                <AlignLeft className="w-10 h-10" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Type className="w-3 h-3" /> {t.description}
                                </p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                    {issue.description}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <ShieldCheck className="w-3.5 h-3.5" /> {t.status}
                                </div>
                                <select 
                                    value={issue.status} 
                                    onChange={(e) => onUpdateStatus(e.target.value as IssueStatus)} 
                                    className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-xs font-black outline-none border border-transparent focus:border-blue-500 transition-all"
                                >
                                    {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <UserIcon className="w-3.5 h-3.5" /> {t.assignedTo}
                                </div>
                                {(currentUser?.type === 'Manager' || currentUser?.type === 'TasksAdmin') ? (
                                    <select
                                        value={issue.assigneeId || ''}
                                        onChange={(e) => onReassign(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-xs font-black outline-none border border-transparent focus:border-blue-500 transition-all"
                                    >
                                        <option value="">{t.unassigned}</option>
                                        {psUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white uppercase shadow-lg shadow-blue-500/20">
                                            {issue.assignee?.name?.substring(0,2)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{issue.assignee?.name || t.unassigned}</p>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Active Member</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <Calendar className="w-3.5 h-3.5" /> {t.reportedAt}
                                </div>
                                <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                                    {new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}
                                </div>
                            </div>
                        </div>

                        {issue.expectedDuration && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-6 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                        <Calendar className="w-3.5 h-3.5" /> {t.expectedDuration}
                                    </div>
                                    <div className="text-xl font-black text-blue-800 dark:text-blue-200 uppercase tracking-tighter">
                                        {issue.expectedDuration} <span className="text-xs">{t.days}</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                        <Flag className="w-3.5 h-3.5" /> {t.dueDate}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-xs font-black text-indigo-800 dark:text-indigo-200">
                                            {getDueDate(issue.createdAt, issue.expectedDuration)?.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'full' })}
                                        </div>
                                        {isOverdue(getDueDate(issue.createdAt, issue.expectedDuration)) && issue.status !== IssueStatus.Closed && issue.status !== IssueStatus.Resolved && (
                                            <span className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-lg uppercase animate-pulse">{t.overdue}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments Sidebar */}
                <div className="w-full md:w-[400px] bg-slate-50/80 dark:bg-[#0d1321] flex flex-col border-s border-slate-100 dark:border-slate-800/80">
                    <div className="p-8 border-b border-white dark:border-slate-800 shadow-sm flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">{t.comments} ({(issue.comments || []).length})</h3>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-8 overflow-y-auto space-y-8 custom-scrollbar">
                        {issue.comments && issue.comments.length > 0 ? issue.comments.map(c => (
                            <div key={c.id} className="flex gap-4 group">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0 uppercase shadow-sm group-hover:border-blue-500/50 transition-colors">
                                    {c.user?.name?.substring(0,2)}
                                </div>
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 leading-none">{c.user?.name}</p>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Just now</span>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl rounded-tl-none shadow-sm text-xs text-slate-600 dark:text-slate-400 leading-relaxed group-hover:shadow-md transition-all">
                                        {c.content}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <p className="text-[10px] font-black uppercase tracking-widest text-center">{t.noComments}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-white dark:bg-[#0a0f1c] border-t border-slate-100 dark:border-slate-800 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] shrink-0">
                        <textarea 
                            value={comment} 
                            onChange={e => setComment(e.target.value)} 
                            placeholder={t.addCommentPlaceholder} 
                            className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl rounded-bl-none text-xs font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[90px] custom-scrollbar" 
                        />
                        <button 
                            onClick={handleAddComment} 
                            disabled={!comment.trim() || isSaving} 
                            className="w-full mt-4 py-4 bg-blue-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.25em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isSaving ? <span className="animate-spin text-lg">◌</span> : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
                            {language === 'ar' ? 'إضافة الملاحظة' : 'Post Comment'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const AddIssueModal: React.FC<{ onClose: () => void, projects: Project[], milestones: Milestone[], users: User[], allIssues: Issue[], language: Language, onSave: (d: any) => Promise<void> }> = ({ onClose, projects, milestones, users, allIssues, language, onSave }) => {
    const t = translations[language];
    const [formData, setFormData] = useState({ title: '', description: '', projectId: '', milestoneId: '', assigneeId: '', priority: IssuePriority.Medium, status: IssueStatus.Open, expectedDuration: 3 });
    const [isSaving, setIsSaving] = useState(false);

    const calculatedEndDate = useMemo(() => {
        if (!formData.expectedDuration) return null;
        const date = new Date();
        date.setDate(date.getDate() + formData.expectedDuration);
        return skipWeekend(date);
    }, [formData.expectedDuration]);
    
    const projectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name })), [projects]);
    const userOptions = useMemo(() => users.map(u => {
        const activeTaskCount = allIssues.filter(i => i.assigneeId === u.id && i.status !== IssueStatus.Closed && i.status !== IssueStatus.Resolved).length;
        return { value: u.id, label: u.name, count: activeTaskCount };
    }), [users, allIssues]);
    const milestoneOptions = useMemo(() => [
        { value: '', label: t.selectMilestone },
        ...milestones.filter(m => m.projectId === formData.projectId).map(m => ({ value: m.id, label: m.title }))
    ], [milestones, formData.projectId, t.selectMilestone]);

    const handleSave = async () => {
        if (!formData.title || !formData.projectId) return;
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    const priorityStyles: Record<string, { active: string; dot: string }> = {
        [IssuePriority.Critical]: { active: 'bg-red-500 text-white shadow-md shadow-red-500/25', dot: 'bg-red-500' },
        [IssuePriority.High]: { active: 'bg-orange-500 text-white shadow-md shadow-orange-500/25', dot: 'bg-orange-500' },
        [IssuePriority.Medium]: { active: 'bg-violet-600 text-white shadow-md shadow-violet-600/25', dot: 'bg-violet-600' },
        [IssuePriority.Low]: { active: 'bg-slate-500 text-white shadow-md shadow-slate-500/20', dot: 'bg-slate-400' },
    };

    const fieldLabelClasses = "text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5";
    const sectionCardClasses = "bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4";

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[250] p-4 font-sans" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 12 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
                {/* Header */}
                <div className="px-7 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-violet-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-violet-600/20">
                            <Plus className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 dark:text-white leading-none">{t.newIssue}</h2>
                            <p className="text-[11px] font-medium text-slate-400 mt-1.5">{language === 'ar' ? 'إنشاء تذكرة عمل جديدة' : 'Create a new work ticket'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-7 py-6 overflow-y-auto custom-scrollbar space-y-5">
                    {/* Title + Description */}
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            placeholder={t.issueTitle}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            placeholder={t.description}
                            rows={2}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none placeholder:text-slate-400"
                        />
                    </div>

                    {/* Where + Who */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className={fieldLabelClasses}><Layout className="w-3.5 h-3.5" /> {t.project}</label>
                            <SearchableSelect
                                options={projectOptions}
                                value={formData.projectId}
                                onChange={val => setFormData({...formData, projectId: val})}
                                placeholder={t.selectProject}
                                language={language}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={fieldLabelClasses}><UserIcon className="w-3.5 h-3.5" /> {t.assignedTo}</label>
                            <SearchableSelect
                                options={userOptions}
                                value={formData.assigneeId}
                                onChange={val => setFormData({...formData, assigneeId: val})}
                                placeholder={t.selectAssignee}
                                language={language}
                            />
                        </div>
                    </div>

                    {/* Timing */}
                    <div className={sectionCardClasses}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="space-y-2 shrink-0">
                                <label className={fieldLabelClasses}><Calendar className="w-3.5 h-3.5" /> {t.expectedDuration}</label>
                                <div className="relative w-full sm:w-36">
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.expectedDuration}
                                        onChange={e => setFormData({...formData, expectedDuration: parseInt(e.target.value) || 0})}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                                    />
                                    <span className="absolute right-3.5 rtl:left-3.5 rtl:right-auto top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase pointer-events-none">
                                        {t.days}
                                    </span>
                                </div>
                            </div>

                            {calculatedEndDate && (
                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">{t.dueDate}</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{calculatedEndDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Milestone + Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className={fieldLabelClasses}><Layers className="w-3.5 h-3.5" /> {t.milestone}</label>
                            <SearchableSelect
                                options={milestoneOptions}
                                value={formData.milestoneId}
                                onChange={val => setFormData({...formData, milestoneId: val})}
                                placeholder={t.selectMilestone}
                                language={language}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={fieldLabelClasses}><Flag className="w-3.5 h-3.5" /> {t.priority}</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[IssuePriority.Low, IssuePriority.Medium, IssuePriority.High, IssuePriority.Critical].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({...formData, priority: p})}
                                        className={`py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all border ${
                                            formData.priority === p
                                                ? `${priorityStyles[p].active} border-transparent`
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 text-slate-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-medium">{language === 'ar' ? 'تأكد من اختيار المشروع والمسؤول قبل الحفظ' : 'Select a project & assignee before saving'}</span>
                    </div>
                    <div className="flex gap-2.5 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            {t.cancel}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!formData.title || !formData.projectId || isSaving}
                            className="flex-1 sm:flex-none px-8 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold shadow-md shadow-violet-600/20 hover:bg-violet-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {isSaving ? <span className="animate-spin text-sm leading-none">◌</span> : <ShieldCheck className="w-4 h-4" />}
                            {t.saveIssue}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const translations = {
    ar: {
        title: "إدارة المهام والعيوب", subtitle: "تتبع المهام التقنية والعيوب وإسندها للمستخدمين.", newIssue: "إضافة مهمة", allProjects: "كل المشاريع", allStatuses: "كل الحالات", allAssignees: "كل الموظفين", project: "المشروع", milestone: "المعلم", assignedTo: "المسؤول عن التنفيذ", reportedAt: "تاريخ الإنشاء", unassigned: "غير مسند", cancel: "إلغاء", saveIssue: "حفظ المهمة", issueTitle: "عنوان المهمة", description: "وصف التفاصيل", selectProject: "اختر المشروع", selectMilestone: "اختر المعلم (اختياري)", selectAssignee: "اختر الشخص المسؤول", priority: "الأولوية", myIssues: "مهامي فقط", allIssues: "عرض كل المهام", you: "أنت (المسؤول)", noIssues: "لا توجد مهام مطابقة", status: "الحالة الحالية", comments: "ملاحظات وتحديثات التنفيذ", noComments: "لا توجد ملاحظات بعد.", addCommentPlaceholder: "أضف ملاحظة أو تحديث حول التنفيذ...", assigneeOnlyNote: "فقط الشخص المسؤول عن تنفيذ هذه المهمة يمكنه إضافة ملاحظات وتحديثات.", close: "إغلاق", gridView: "عرض البطاقات", groupedView: "عرض حسب المشروع", byAssignee: "حسب المسؤول", unknownProject: "مشروع غير معروف", issuesCount: "مهمة", exportExcel: "تصدير للاكسيل",
        expectedDuration: "المدة المتوقعة (بأيام العمل)", days: "أيام", dueDate: "تاريخ الاستحقاق", overdue: "متأخر"
    },
    en: {
        title: "Tasks & Defects Management", subtitle: "Track technical tasks, defects and assign them to users.", newIssue: "Add Task", allProjects: "All Projects", allStatuses: "All Statuses", allAssignees: "All Assignees", project: "Project", milestone: "Milestone", assignedTo: "Assigned To", reportedAt: "Created At", unassigned: "Unassigned", cancel: "Cancel", saveIssue: "Save Task", issueTitle: "Task Title", description: "Details Description", selectProject: "Select Project", selectMilestone: "Select Milestone (Optional)", selectAssignee: "Select User", priority: "Priority", myIssues: "My Assigned Tasks", allIssues: "Show All Tasks", you: "You (Assigned)", noIssues: "No tasks found", status: "Current Status", comments: "Progress Notes & Updates", noComments: "No notes yet.", addCommentPlaceholder: "Add a note or progress update...", assigneeOnlyNote: "Only the user assigned to this task can add progress notes and updates.", close: "Close", gridView: "Grid Cards", groupedView: "Group by Project", byAssignee: "By Assignee", unknownProject: "Unknown Project", issuesCount: "Tasks", exportExcel: "Export Excel",
        expectedDuration: "Expected Duration (Work Days)", days: "Days", dueDate: "Due Date", overdue: "Overdue"
    }
};

export default Issues;
