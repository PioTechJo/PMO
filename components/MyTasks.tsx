
import React, { useMemo, useState } from 'react';
import { Issue, Project, User, Language, IssueStatus, IssuePriority } from '../types';

interface MyTasksProps {
    allIssues: Issue[];
    allProjects: Project[];
    currentUser?: User;
    language: Language;
    onUpdateIssue: (id: string, data: Partial<Issue>) => Promise<void>;
    onAddComment: (issueId: string, userId: string, content: string) => Promise<void>;
}

const translations = {
    ar: {
        title: "مهامي",
        subtitle: "شغلك اليوم، بدون ما تدوري بقائمة كل المشاريع.",
        open: "مفتوحة", inProgress: "قيد التنفيذ", overdue: "متأخرة", done: "منجزة",
        showDone: "إظهار المنجزة", hideDone: "إخفاء المنجزة",
        noTasks: "ما عندك مهام حالياً. 🎉",
        dueDate: "الاستحقاق", noDueDate: "بدون موعد",
        priority: "الأولوية", status: "الحالة",
        comments: "تعليقات", addComment: "إضافة تعليق...", noComments: "لا توجد تعليقات بعد.",
        close: "إغلاق", post: "إرسال",
        unknownProject: "مشروع غير معروف",
    },
    en: {
        title: "My Tasks",
        subtitle: "What's on your plate today, without digging through every project.",
        open: "Open", inProgress: "In Progress", overdue: "Overdue", done: "Done",
        showDone: "Show Done", hideDone: "Hide Done",
        noTasks: "You're all caught up. 🎉",
        dueDate: "Due", noDueDate: "No due date",
        priority: "Priority", status: "Status",
        comments: "Comments", addComment: "Add a comment...", noComments: "No comments yet.",
        close: "Close", post: "Post",
        unknownProject: "Unknown Project",
    }
};

const skipWeekend = (date: Date) => {
    const day = date.getDay();
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

const priorityColors: Record<string, string> = {
    [IssuePriority.Critical]: 'bg-red-500 text-white',
    [IssuePriority.High]: 'bg-red-500 text-white',
    [IssuePriority.Medium]: 'bg-amber-500 text-white',
    [IssuePriority.Low]: 'bg-blue-400 text-white',
};

const statusColors: Record<string, string> = {
    [IssueStatus.Open]: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    [IssueStatus.InProgress]: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    [IssueStatus.Resolved]: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    [IssueStatus.Closed]: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const MyTasks: React.FC<MyTasksProps> = ({ allIssues, allProjects, currentUser, language, onUpdateIssue, onAddComment }) => {
    const t = translations[language];
    const [showDone, setShowDone] = useState(false);
    const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);

    const myIssues = useMemo(() => allIssues.filter(i => i.assigneeId === currentUser?.id), [allIssues, currentUser]);

    const withDueDates = useMemo(() => myIssues.map(issue => {
        const dueDate = getDueDate(issue.createdAt, issue.expectedDuration);
        const isDone = issue.status === IssueStatus.Resolved || issue.status === IssueStatus.Closed;
        const overdue = !isDone && dueDate ? new Date() > dueDate : false;
        return { issue, dueDate, isDone, overdue };
    }), [myIssues]);

    const stats = useMemo(() => ({
        open: withDueDates.filter(x => x.issue.status === IssueStatus.Open).length,
        inProgress: withDueDates.filter(x => x.issue.status === IssueStatus.InProgress).length,
        overdue: withDueDates.filter(x => x.overdue).length,
    }), [withDueDates]);

    const visibleIssues = useMemo(() => {
        const filtered = showDone ? withDueDates : withDueDates.filter(x => !x.isDone);
        return filtered.sort((a, b) => {
            if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.getTime() - b.dueDate.getTime();
        });
    }, [withDueDates, showDone]);

    const activeIssue = allIssues.find(i => i.id === activeIssueId);

    const handleAddComment = async () => {
        if (!commentText.trim() || !currentUser || !activeIssueId || isSavingComment) return;
        setIsSavingComment(true);
        try {
            await onAddComment(activeIssueId, currentUser.id, commentText);
            setCommentText('');
        } finally {
            setIsSavingComment(false);
        }
    };

    return (
        <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <button
                    onClick={() => setShowDone(!showDone)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-300 transition-colors"
                >
                    {showDone ? t.hideDone : t.showDone}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.open}</p>
                    <p className="text-2xl font-black text-blue-500">{stats.open}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.inProgress}</p>
                    <p className="text-2xl font-black text-amber-500">{stats.inProgress}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.overdue}</p>
                    <p className="text-2xl font-black text-red-500">{stats.overdue}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {visibleIssues.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold">{t.noTasks}</div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {visibleIssues.map(({ issue, dueDate, overdue }) => {
                            const project = allProjects.find(p => p.id === issue.projectId);
                            return (
                                <div key={issue.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${overdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveIssueId(issue.id)}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${priorityColors[issue.priority]}`}>{issue.priority}</span>
                                            {overdue && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500 text-white">{t.overdue}</span>}
                                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{issue.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                            <span>{project?.name || t.unknownProject}</span>
                                            <span>•</span>
                                            <span className={overdue ? 'text-red-500 font-bold' : ''}>
                                                {dueDate ? `${t.dueDate}: ${dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}` : t.noDueDate}
                                            </span>
                                            {(issue.comments || []).length > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{(issue.comments || []).length} {t.comments}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <select
                                        value={issue.status}
                                        onChange={(e) => onUpdateIssue(issue.id, { status: e.target.value as IssueStatus })}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase outline-none border-none ${statusColors[issue.status]}`}
                                    >
                                        {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {activeIssue && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveIssueId(null); }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white">{activeIssue.title}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeIssue.description}</p>
                            </div>
                            <button onClick={() => setActiveIssueId(null)} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.comments}</h3>
                            {(activeIssue.comments || []).length > 0 ? activeIssue.comments!.map(c => (
                                <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-300">{c.user?.name}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.content}</p>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 italic">{t.noComments}</p>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                placeholder={t.addComment}
                                className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || isSavingComment}
                                className="px-5 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
                            >
                                {t.post}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTasks;
