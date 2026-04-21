
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Issue, Project, Milestone, User, Language, IssueStatus, IssuePriority, IssueComment, GroupingType } from '../types';
import SearchableSelect from './SearchableSelect';

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
    const [onlyMyIssues, setOnlyMyIssues] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
    const [groupingType, setGroupingType] = useState<GroupingType>('project');
    
    const t = translations[language];

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

    const assigneeOptions = useMemo(() => [
        { value: 'all', label: t.allAssignees },
        ...psUsers.map(u => ({ value: u.id, label: u.name }))
    ], [psUsers, t.allAssignees]);

    const filteredIssues = useMemo(() => {
        return allIssues.filter(i => {
            const projectMatch = selectedProjectId === 'all' || i.projectId === selectedProjectId;
            const statusMatch = selectedStatus === 'all' || i.status === selectedStatus;
            const assigneeMatch = selectedAssigneeId === 'all' || i.assigneeId === selectedAssigneeId;
            const userMatch = !onlyMyIssues || (currentUser && i.assigneeId === currentUser.id);
            return projectMatch && statusMatch && assigneeMatch && userMatch;
        });
    }, [allIssues, selectedProjectId, selectedStatus, selectedAssigneeId, onlyMyIssues, currentUser]);

    // Grouping logic for the 'grouped' view
    const groupedIssues = useMemo(() => {
        if (groupingType === 'project') {
            const groups: Record<string, { title: string, subtitle: string, icon: React.ReactNode, issues: Issue[] }> = {};
            
            filteredIssues.forEach(issue => {
                const projId = issue.projectId;
                if (!groups[projId]) {
                    const project = allProjects.find(p => p.id === projId);
                    groups[projId] = { 
                        title: project?.name || t.unknownProject, 
                        subtitle: project?.projectCode || '', 
                        icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
                        issues: [] 
                    };
                }
                groups[projId].issues.push(issue);
            });

            return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
        } else {
            // Group by Assignee
            const groups: Record<string, { title: string, subtitle: string, icon: React.ReactNode, issues: Issue[] }> = {};
            
            filteredIssues.forEach(issue => {
                const assigneeId = issue.assigneeId || 'unassigned';
                if (!groups[assigneeId]) {
                    const user = allUsers.find(u => u.id === assigneeId);
                    groups[assigneeId] = { 
                        title: user?.name || t.unassigned, 
                        subtitle: user?.type || '', 
                        icon: user?.avatarUrl ? <img src={user.avatarUrl} className="w-8 h-8 rounded-full" /> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                        issues: [] 
                    };
                }
                groups[assigneeId].issues.push(issue);
            });

            return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
        }
    }, [filteredIssues, allProjects, allUsers, groupingType, t.unknownProject, t.unassigned]);

    const priorityColors = {
        [IssuePriority.Critical]: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
        [IssuePriority.High]: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
        [IssuePriority.Medium]: 'bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/10',
        [IssuePriority.Low]: 'bg-blue-400 text-white shadow-lg shadow-blue-400/10',
    };

    const statusColors = {
        [IssueStatus.Open]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        [IssueStatus.InProgress]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
        [IssueStatus.Resolved]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        [IssueStatus.Closed]: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Main Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h1>
                    <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Switcher */}
                    <div className="flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl shadow-sm">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30' : 'text-slate-400 hover:text-slate-600'}`}
                            title={t.gridView}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button 
                            onClick={() => setViewMode('grouped')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grouped' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30' : 'text-slate-400 hover:text-slate-600'}`}
                            title={t.groupedView}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border-2 border-slate-50 dark:border-slate-800 shadow-sm transition-all hover:border-violet-200">
                        <input 
                            id="groupByAssignee"
                            type="checkbox" 
                            checked={groupingType === 'assignee'}
                            onChange={(e) => {
                                setGroupingType(e.target.checked ? 'assignee' : 'project');
                                setViewMode('grouped');
                            }}
                            className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
                        />
                        <label htmlFor="groupByAssignee" className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                            {t.byAssignee}
                        </label>
                    </div>

                    <button 
                        onClick={handleExportToExcel}
                        className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-emerald-500 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all flex items-center gap-2 group"
                        title={t.exportExcel}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block group-hover:text-emerald-600">{t.exportExcel}</span>
                    </button>

                    <button 
                        onClick={() => setOnlyMyIssues(!onlyMyIssues)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${onlyMyIssues ? 'bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-500/20' : 'bg-white border-slate-100 text-slate-500 dark:bg-slate-900 dark:border-slate-800'}`}
                    >
                        {onlyMyIssues ? t.allIssues : t.myIssues}
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="px-8 py-3 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-violet-700 shadow-2xl shadow-violet-500/30 flex items-center gap-2 transition-transform active:scale-95">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                        {t.newIssue}
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <SearchableSelect 
                        options={[{value:'all', label:t.allProjects}, ...allProjects.map(p => ({value:p.id, label:p.name}))]} 
                        value={selectedProjectId} 
                        onChange={setSelectedProjectId} 
                        placeholder={t.allProjects} 
                        language={language} 
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <SearchableSelect 
                        options={assigneeOptions} 
                        value={selectedAssigneeId} 
                        onChange={setSelectedAssigneeId} 
                        placeholder={t.allAssignees} 
                        language={language} 
                    />
                </div>
                <div className="w-[200px]">
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500 transition-all h-[40px]">
                        <option value="all">{t.allStatuses}</option>
                        {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* Content Area */}
            {filteredIssues.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredIssues.map(issue => (
                            <IssueCard key={issue.id} issue={issue} onClick={() => setSelectedIssueId(issue.id)} currentUser={currentUser} t={t} priorityColors={priorityColors} statusColors={statusColors} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {groupedIssues.map((group, gIdx) => (
                            <div key={gIdx} className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-violet-500/20 px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20 overflow-hidden">
                                            {group.icon}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{group.title}</h2>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.subtitle}</p>
                                        </div>
                                    </div>
                                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                                        {group.issues.length} {t.issuesCount}
                                    </span>
                                </div>
                                <div className="space-y-3 ps-2">
                                    {group.issues.map(issue => (
                                        <IssueRow key={issue.id} issue={issue} onClick={() => setSelectedIssueId(issue.id)} currentUser={currentUser} t={t} priorityColors={priorityColors} statusColors={statusColors} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="py-20 text-center text-[11px] font-black uppercase text-slate-300 tracking-[0.5em]">{t.noIssues}</div>
            )}

            {/* Modals */}
            {isAddModalOpen && (
                <AddIssueModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    projects={allProjects} 
                    milestones={allMilestones} 
                    users={psUsers} 
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
                    onUpdateStatus={async (s) => onUpdateIssue(activeViewingIssue.id, { status: s })}
                    onAddComment={async (c) => { 
                        if (onAddComment && currentUser) {
                            await onAddComment(activeViewingIssue.id, currentUser.id, c);
                        }
                    }}
                />
            )}
        </div>
    );
};

// Sub-components for cleaner code
const IssueCard: React.FC<{ issue: Issue, onClick: () => void, currentUser?: User, t: any, priorityColors: any, statusColors: any }> = ({ issue, onClick, currentUser, t, priorityColors, statusColors }) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 border-2 p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full cursor-pointer hover:-translate-y-1 ${issue.assigneeId === currentUser?.id ? 'border-violet-200 dark:border-violet-900/30' : 'border-white dark:border-slate-800'}`}>
        <div>
            <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${priorityColors[issue.priority]}`}>{issue.priority}</span>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${statusColors[issue.status]}`}>
                    {issue.status}
                </div>
            </div>
            <h3 className="text-base font-black text-slate-800 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-violet-600 transition-colors">{issue.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 leading-relaxed">{issue.description}</p>
            
            <div className="space-y-2 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400 uppercase font-black">{t.project}:</span>
                    <span className="text-violet-600 dark:text-violet-400 font-black truncate">{issue.project?.name}</span>
                </div>
            </div>
        </div>

        <div className="pt-5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img src={issue.assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${issue.assignee?.name || '?'}&background=8b5cf6&color=fff`} className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${issue.status === IssueStatus.Closed ? 'bg-slate-300' : 'bg-green-500 animate-pulse'}`}></span>
                </div>
                <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{t.assignedTo}</p>
                    <p className={`text-[10px] font-black truncate max-w-[100px] ${issue.assigneeId === currentUser?.id ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>{issue.assigneeId === currentUser?.id ? t.you : (issue.assignee?.name || t.unassigned)}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{(issue.comments || []).length}</span>
            </div>
        </div>
    </div>
);

const IssueRow: React.FC<{ issue: Issue, onClick: () => void, currentUser?: User, t: any, priorityColors: any, statusColors: any }> = ({ issue, onClick, currentUser, t, priorityColors, statusColors }) => (
    <div 
        onClick={onClick}
        className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 border-2 rounded-[1.5rem] hover:border-violet-300 hover:shadow-lg transition-all cursor-pointer group ${issue.assigneeId === currentUser?.id ? 'border-violet-100 dark:border-violet-900/20 shadow-sm' : 'border-slate-50 dark:border-slate-800'}`}>
        <div className="flex-1 flex gap-4 items-center min-w-0">
             <div className={`w-2 h-10 rounded-full shrink-0 ${priorityColors[issue.priority].split(' ')[0]}`}></div>
             <div className="min-w-0">
                <h4 className="text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-violet-600 transition-colors">{issue.title}</h4>
                <p className="text-[10px] text-slate-400 font-bold truncate">{issue.description.substring(0, 100)}...</p>
             </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${statusColors[issue.status]}`}>
                {issue.status}
            </div>
            
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                <img src={issue.assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${issue.assignee?.name || '?'}&background=8b5cf6&color=fff`} className="w-7 h-7 rounded-full shadow-sm" />
                <div className="hidden sm:block">
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{t.assignedTo}</p>
                    <p className={`text-[10px] font-black truncate max-w-[80px] ${issue.assigneeId === currentUser?.id ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>{issue.assigneeId === currentUser?.id ? t.you : (issue.assignee?.name || t.unassigned)}</p>
                </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-[10px] font-black">{(issue.comments || []).length}</span>
            </div>
        </div>
    </div>
);

const IssueDetailModal: React.FC<{ issue: Issue, onClose: () => void, language: Language, currentUser?: User, onUpdateStatus: (s: IssueStatus) => Promise<void>, onAddComment: (c: string) => Promise<void> }> = ({ issue, onClose, language, currentUser, onUpdateStatus, onAddComment }) => {
    const t = translations[language];
    const [comment, setComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isAssignee = currentUser?.id === issue.assigneeId;

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

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
        <div 
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl w-full max-w-6xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row h-[85vh] relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                
                {/* Information Side */}
                <div className="flex-1 flex flex-col h-full border-e border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-[10px] font-black rounded-lg uppercase tracking-widest">{issue.project?.name}</span>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight mt-3">{issue.title}</h2>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 rounded-full transition-all group shadow-sm flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest group-hover:block hidden">{t.close}</span>
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-2">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-8">
                             <p className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">{t.description}</p>
                             <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{issue.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 ps-1">{t.status}</p>
                                <select 
                                    value={issue.status} 
                                    disabled={!isAssignee}
                                    onChange={(e) => onUpdateStatus(e.target.value as IssueStatus)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-violet-500 transition-all outline-none disabled:opacity-50"
                                >
                                    {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 ps-1">{t.assignedTo}</p>
                                <div className="flex items-center gap-4 p-1">
                                    <img src={issue.assignee?.avatarUrl || `https://ui-avatars.com/api/?name=${issue.assignee?.name || '?'}&background=8b5cf6&color=fff`} className="w-10 h-10 rounded-full border-2 border-violet-100" />
                                    <div>
                                        <span className="text-xs font-black text-slate-800 dark:text-white block">{issue.assignee?.name}</span>
                                        <span className="text-[9px] font-black text-violet-500 uppercase">{issue.assignee?.type || 'Staff'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t.reportedAt}</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(issue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'full' })}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{t.priority}</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{issue.priority}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
                        <button onClick={onClose} className="px-10 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
                            {t.close}
                        </button>
                    </div>
                </div>

                {/* Conversation Side */}
                <div className="w-full md:w-[450px] bg-slate-50 dark:bg-slate-900/50 flex flex-col h-full border-s border-slate-100 dark:border-slate-800">
                    <div className="p-6 border-b border-white dark:border-slate-800 flex justify-between items-center bg-white/30 dark:bg-slate-900/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl text-violet-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                            </div>
                            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.comments}</h3>
                        </div>
                        <span className="text-[10px] font-black text-white bg-violet-600 px-2.5 py-1 rounded-full shadow-lg shadow-violet-500/30">{(issue.comments || []).length}</span>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-slate-950/20">
                        {(issue.comments || []).length > 0 ? issue.comments?.map((c, idx) => {
                            const isMe = c.userId === currentUser?.id;
                            return (
                                <div key={c.id} className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${idx * 50}ms` }}>
                                    <img src={c.user?.avatarUrl || `https://ui-avatars.com/api/?name=${c.user?.name || '?'}&background=a78bfa&color=fff`} className="w-10 h-10 rounded-2xl shadow-sm mt-1 shrink-0 border-2 border-white dark:border-slate-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[11px] font-black ${isMe ? 'text-violet-600' : 'text-slate-700 dark:text-slate-200'}`}>{isMe ? t.you : c.user?.name}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(c.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={`p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${isMe ? 'bg-violet-600 text-white rounded-tr-none rtl:rounded-tl-none rtl:rounded-tr-[1.5rem]' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none rtl:rounded-tr-none rtl:rounded-tl-[1.5rem] border border-slate-100 dark:border-slate-700'}`}>
                                            {c.content}
                                        </div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase px-1 tracking-tighter">
                                            {new Date(c.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                <p className="text-[11px] font-black uppercase tracking-[0.3em]">{t.noComments}</p>
                            </div>
                        )}
                    </div>

                    {/* Add Comment Input */}
                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
                        {isAssignee ? (
                            <div className="space-y-4">
                                <div className="relative group">
                                    <textarea 
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder={t.addCommentPlaceholder}
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-violet-500/10 transition-all resize-none h-28 border-2 border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-slate-900"
                                        disabled={isSaving}
                                    />
                                    <button 
                                        onClick={handleAddComment}
                                        disabled={isSaving || !comment.trim()}
                                        className="absolute bottom-4 right-4 rtl:right-auto rtl:left-4 p-4 bg-violet-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-violet-500/30 flex items-center gap-2 group"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest">{language === 'ar' ? 'أنت المسؤول عن تنفيذ هذه المهمة' : 'You are the assignee for this task'}</p>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {t.assigneeOnlyNote}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddIssueModal: React.FC<{ onClose: () => void, projects: Project[], milestones: Milestone[], users: User[], language: Language, onSave: (d: any) => Promise<void> }> = ({ onClose, projects, milestones, users, language, onSave }) => {
    const t = translations[language];
    const [formData, setFormData] = useState({ title: '', description: '', projectId: '', milestoneId: '', assigneeId: '', priority: IssuePriority.Medium, status: IssueStatus.Open });
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const filteredMilestones = useMemo(() => milestones.filter(m => m.projectId === formData.projectId), [milestones, formData.projectId]);

    const projectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name })), [projects]);
    const userOptions = useMemo(() => users.map(u => ({ value: u.id, label: u.name })), [users]);
    const milestoneOptions = useMemo(() => [
        { value: '', label: t.selectMilestone },
        ...filteredMilestones.map(m => ({ value: m.id, label: m.title }))
    ], [filteredMilestones, t.selectMilestone]);

    const inputClasses = "w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-violet-500 dark:focus:border-violet-500 rounded-2xl text-sm font-bold outline-none transition-all";

    const handleSave = async () => {
        if (!formData.title || !formData.projectId) {
            setErrorMsg(language === 'ar' ? "يرجى ملء الحقول الإلزامية (العنوان والمشروع)" : "Title and Project are required");
            return;
        }
        setIsSaving(true);
        setErrorMsg(null);
        try {
            await onSave(formData);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to save task.");
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-10">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.newIssue}</h2>
                            <div className="h-1 w-12 bg-violet-600 rounded-full mt-2"></div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-800 rounded-full transition-all">&times;</button>
                    </div>

                    {errorMsg && (
                        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800 rounded-2xl">
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.issueTitle} *</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClasses} placeholder={t.issueTitle} disabled={isSaving} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.description}</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClasses + " h-28 resize-none"} disabled={isSaving} />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.project} *</label>
                                <SearchableSelect 
                                    options={projectOptions} 
                                    value={formData.projectId} 
                                    onChange={val => setFormData({...formData, projectId: val, milestoneId: ''})} 
                                    placeholder={t.selectProject} 
                                    searchPlaceholder={t.allProjects}
                                    language={language}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.milestone}</label>
                                <SearchableSelect 
                                    options={milestoneOptions} 
                                    value={formData.milestoneId} 
                                    onChange={val => setFormData({...formData, milestoneId: val})} 
                                    placeholder={t.selectMilestone} 
                                    language={language}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.assignedTo}</label>
                                <SearchableSelect 
                                    options={userOptions} 
                                    value={formData.assigneeId} 
                                    onChange={val => setFormData({...formData, assigneeId: val})} 
                                    placeholder={t.selectAssignee} 
                                    searchPlaceholder={language === 'ar' ? 'ابحث عن موظف...' : 'Search for user...'}
                                    language={language}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ps-2 tracking-widest">{t.priority}</label>
                                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as IssuePriority})} className={inputClasses} disabled={isSaving}>
                                    {Object.values(IssuePriority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
                        <button onClick={onClose} className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors" disabled={isSaving}>{t.cancel}</button>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="px-12 py-4 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all shadow-2xl shadow-violet-500/30 flex items-center gap-3 active:scale-95 disabled:grayscale"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            )}
                            {isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t.saveIssue}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const translations = {
    ar: {
        title: "إدارة المهام والعيوب", subtitle: "تتبع المهام التقنية والعيوب وإسندها للمستخدمين.", newIssue: "إضافة مهمة", allProjects: "كل المشاريع", allStatuses: "كل الحالات", allAssignees: "كل الموظفين", project: "المشروع", milestone: "المعلم", assignedTo: "المسؤول عن التنفيذ", reportedAt: "تاريخ الإنشاء", unassigned: "غير مسند", cancel: "إلغاء", saveIssue: "حفظ المهمة", issueTitle: "عنوان المهمة", description: "وصف التفاصيل", selectProject: "اختر المشروع", selectMilestone: "اختر المعلم (اختياري)", selectAssignee: "اختر الشخص المسؤول", priority: "الأولوية", myIssues: "مهامي فقط", allIssues: "عرض كل المهام", you: "أنت (المسؤول)", noIssues: "لا توجد مهام مطابقة", status: "الحالة الحالية", comments: "ملاحظات وتحديثات التنفيذ", noComments: "لا توجد ملاحظات بعد.", addCommentPlaceholder: "أضف ملاحظة أو تحديث حول التنفيذ...", assigneeOnlyNote: "فقط الشخص المسؤول عن تنفيذ هذه المهمة يمكنه إضافة ملاحظات وتحديثات.", close: "إغلاق", gridView: "عرض البطاقات", groupedView: "عرض حسب المشروع", byAssignee: "حسب المسؤول", unknownProject: "مشروع غير معروف", issuesCount: "مهمة",
    },
    en: {
        title: "Tasks & Defects Management", subtitle: "Track technical tasks, defects and assign them to users.", newIssue: "Add Task", allProjects: "All Projects", allStatuses: "All Statuses", allAssignees: "All Assignees", project: "Project", milestone: "Milestone", assignedTo: "Assigned To", reportedAt: "Created At", unassigned: "Unassigned", cancel: "Cancel", saveIssue: "Save Task", issueTitle: "Task Title", description: "Details Description", selectProject: "Select Project", selectMilestone: "Select Milestone (Optional)", selectAssignee: "Select User", priority: "Priority", myIssues: "My Assigned Tasks", allIssues: "Show All Tasks", you: "You (Assigned)", noIssues: "No tasks found", status: "Current Status", comments: "Progress Notes & Updates", noComments: "No notes yet.", addCommentPlaceholder: "Add a note or progress update...", assigneeOnlyNote: "Only the user assigned to this task can add progress notes and updates.", close: "Close", gridView: "Grid Cards", groupedView: "Group by Project", byAssignee: "By Assignee", unknownProject: "Unknown Project", issuesCount: "Tasks",
    }
};

export default Issues;
