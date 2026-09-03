
import React, { useMemo, useState } from 'react';
import { Issue, Project, User, Language, IssueStatus, IssuePriority, IssueType } from '../types';

const severityColors: Record<string, string> = {
    [IssuePriority.Critical]: 'bg-red-600 text-white',
    [IssuePriority.High]: 'bg-red-500 text-white',
    [IssuePriority.Medium]: 'bg-amber-500 text-white',
    [IssuePriority.Low]: 'bg-blue-400 text-white',
};

interface MyTasksProps {
    allIssues: Issue[];
    allProjects: Project[];
    currentUser?: User;
    language: Language;
    onUpdateIssue: (id: string, data: Partial<Issue>) => Promise<void>;
    onAddComment: (issueId: string, userId: string, content: string) => Promise<void>;
    onUploadAttachment?: (issueId: string, userId: string, file: File) => Promise<void>;
    onDeleteAttachment?: (attachmentId: string, filePath: string) => Promise<void>;
    onGetAttachmentUrl?: (filePath: string) => Promise<string>;
    onViewHistory?: (issue: Issue) => void;
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
        attachments: "المرفقات", addAttachment: "+ إضافة مرفق", uploading: "جارٍ الرفع...", noAttachments: "لا توجد مرفقات بعد.",
        customerDueDate: "تاريخ التسليم (إلزامي - مهمة من عميل)", setDueDate: "حدد تاريخ التسليم", dueDateRequired: "لازم تحدد تاريخ تسليم قبل ما تكمّل على هاي المهمة.", saveDueDate: "حفظ", dueDateLockedNote: "تاريخ التسليم محدّد - بس Admin يقدر يعدّله.",
        customer: "العميل", project: "المشروع", creator: "أنشأها", createdDate: "تاريخ الإنشاء", openFor: "مفتوحة من", dayOpen: "يوم", daysOpen: "أيام", today: "اليوم", noCustomer: "بدون عميل",
        markDone: "تحديد كمنجزة", reopenedCount: "أعيد فتحها", saving: "جارٍ الحفظ...",
        severity: "الخطورة", severityLow: "منخفضة", severityMedium: "متوسطة", severityHigh: "عالية", severityCritical: "حرجة",
        history: "سجل التاريخ",
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
        attachments: "Attachments", addAttachment: "+ Add Attachment", uploading: "Uploading...", noAttachments: "No attachments yet.",
        customerDueDate: "Due Date (Required - Customer Task)", setDueDate: "Set Due Date", dueDateRequired: "You must set a due date before working further on this task.", saveDueDate: "Save", dueDateLockedNote: "Due date is locked - only an Admin can change it.",
        customer: "Customer", project: "Project", creator: "Created By", createdDate: "Created Date", openFor: "Open For", dayOpen: "day", daysOpen: "days", today: "Today", noCustomer: "No customer",
        markDone: "Mark as Done", reopenedCount: "Reopened", saving: "Saving...",
        severity: "Severity", severityLow: "Low", severityMedium: "Medium", severityHigh: "High", severityCritical: "Critical",
        history: "History",
    }
};

// Same relabeling used across the Customer Tasks screens - New -> In
// Progress -> Done -> Closed, backed by the existing IssueStatus enum.
const customerStatusLabel = (status: IssueStatus, language: Language) => {
    const map: Record<IssueStatus, { ar: string; en: string }> = {
        [IssueStatus.Open]: { ar: 'جديدة', en: 'New' },
        [IssueStatus.InProgress]: { ar: 'قيد التنفيذ', en: 'In Progress' },
        [IssueStatus.Resolved]: { ar: 'منجزة', en: 'Done' },
        [IssueStatus.Closed]: { ar: 'مغلقة', en: 'Closed' },
    };
    return map[status]?.[language] || status;
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

const MyTasks: React.FC<MyTasksProps> = ({ allIssues, allProjects, currentUser, language, onUpdateIssue, onAddComment, onUploadAttachment, onDeleteAttachment, onGetAttachmentUrl, onViewHistory }) => {
    const t = translations[language];
    const [showDone, setShowDone] = useState(false);
    const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [dueDateInput, setDueDateInput] = useState('');
    const [isSavingDueDate, setIsSavingDueDate] = useState(false);
    const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);

    const handleStatusUpdate = async (issueId: string, status: IssueStatus) => {
        setUpdatingIssueId(issueId);
        try {
            await onUpdateIssue(issueId, { status });
        } finally {
            setUpdatingIssueId(null);
        }
    };

    const isExternal = (issue: Issue) => !!issue.type && issue.type !== IssueType.Task;

    const myIssues = useMemo(() => allIssues.filter(i => i.assigneeId === currentUser?.id), [allIssues, currentUser]);

    const withDueDates = useMemo(() => myIssues.map(issue => {
        const dueDate = getDueDate(issue.createdAt, issue.expectedDuration);
        // Customer tasks stay visible to the assignee through "Done" - the
        // bank might still come back with something, so only the creator
        // actually Closing it should drop it out of the default view.
        // Internal tasks keep the old rule (Resolved already counts as done).
        const isDone = isExternal(issue) ? issue.status === IssueStatus.Closed : (issue.status === IssueStatus.Resolved || issue.status === IssueStatus.Closed);
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

    const canEditDueDate = (issue: Issue) => !issue.dueDate || currentUser?.type === 'Manager';

    const handleOpenIssue = (issueId: string) => {
        const issue = allIssues.find(i => i.id === issueId);
        setDueDateInput(issue?.dueDate || '');
        setActiveIssueId(issueId);
    };

    const handleSaveDueDate = async () => {
        if (!activeIssueId || !dueDateInput || isSavingDueDate) return;
        setIsSavingDueDate(true);
        try {
            await onUpdateIssue(activeIssueId, { dueDate: dueDateInput });
        } finally {
            setIsSavingDueDate(false);
        }
    };

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

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !onUploadAttachment || !currentUser || !activeIssueId || isUploading) return;
        setIsUploading(true);
        try {
            await onUploadAttachment(activeIssueId, currentUser.id, file);
        } catch (err) {
            console.error("Failed to upload attachment", err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (attachmentId: string, filePath: string, fileName: string) => {
        if (!onGetAttachmentUrl || downloadingId) return;
        setDownloadingId(attachmentId);
        try {
            const url = await onGetAttachmentUrl(filePath);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error("Failed to get attachment URL", err);
        } finally {
            setDownloadingId(null);
        }
    };

    const getDaysOpen = (createdAt: string) => {
        const created = new Date(createdAt);
        const days = Math.floor((Date.now() - created.getTime()) / 86400000);
        return Math.max(0, days);
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpenIssue(issue.id)}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${priorityColors[issue.priority]}`}>{issue.priority}</span>
                                            {overdue && <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-red-500 text-white">{t.overdue}</span>}
                                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{issue.title}</span>
                                            {isExternal(issue) && !issue.dueDate && (
                                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500 text-white animate-pulse">{t.setDueDate}</span>
                                            )}
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
                                    {updatingIssueId === issue.id ? (
                                        <div className="px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-400">
                                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t.saving}
                                        </div>
                                    ) : isExternal(issue) ? (
                                        issue.status === IssueStatus.InProgress ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(issue.id, IssueStatus.Resolved); }}
                                                disabled={!issue.dueDate}
                                                title={!issue.dueDate ? t.dueDateRequired : undefined}
                                                className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-blue-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                {t.markDone}
                                            </button>
                                        ) : (
                                            <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center ${statusColors[issue.status]}`}>
                                                {customerStatusLabel(issue.status, language)}
                                            </div>
                                        )
                                    ) : (
                                        <select
                                            value={issue.status}
                                            onChange={(e) => handleStatusUpdate(issue.id, e.target.value as IssueStatus)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase outline-none border-none ${statusColors[issue.status]}`}
                                        >
                                            {Object.values(IssueStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    )}
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
                            <div className="flex items-center gap-1 shrink-0">
                                {isExternal(activeIssue) && onViewHistory && (
                                    <button onClick={() => onViewHistory(activeIssue)} title={t.history} className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                )}
                                <button onClick={() => setActiveIssueId(null)} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {(() => {
                                const project = allProjects.find(p => p.id === activeIssue.projectId);
                                const daysOpen = getDaysOpen(activeIssue.createdAt);
                                return (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.customer}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{project?.customer?.name || t.noCustomer}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.project}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{project?.name || t.unknownProject}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.creator}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 truncate">{activeIssue.reporter?.name || '—'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.createdDate}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{new Date(activeIssue.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' })}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl col-span-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.openFor}</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                                                {daysOpen === 0 ? t.today : `${daysOpen} ${daysOpen === 1 ? t.dayOpen : t.daysOpen}`}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {isExternal(activeIssue) && (
                                <div className={`p-4 rounded-xl border ${activeIssue.dueDate ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'}`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.customerDueDate}</p>
                                    {canEditDueDate(activeIssue) ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={dueDateInput}
                                                onChange={(e) => setDueDateInput(e.target.value)}
                                                className="flex-1 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={handleSaveDueDate}
                                                disabled={!dueDateInput || isSavingDueDate}
                                                className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
                                            >
                                                {t.saveDueDate}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {new Date(activeIssue.dueDate!).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}
                                        </p>
                                    )}
                                    {!activeIssue.dueDate && <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-2">{t.dueDateRequired}</p>}
                                    {activeIssue.dueDate && currentUser?.type !== 'Manager' && <p className="text-[10px] font-bold text-slate-400 mt-2">{t.dueDateLockedNote}</p>}
                                </div>
                            )}

                            {isExternal(activeIssue) && (
                                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.severity}</p>
                                    <div className="flex gap-2">
                                        {([IssuePriority.Low, IssuePriority.Medium, IssuePriority.High, IssuePriority.Critical] as IssuePriority[]).map(sev => (
                                            <button
                                                key={sev}
                                                onClick={() => onUpdateIssue(activeIssue.id, { severity: sev })}
                                                className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors ${activeIssue.severity === sev ? severityColors[sev] : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-700'}`}
                                            >
                                                {sev === IssuePriority.Low ? t.severityLow : sev === IssuePriority.Medium ? t.severityMedium : sev === IssuePriority.High ? t.severityHigh : t.severityCritical}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.attachments} ({(activeIssue.attachments || []).length})</h3>
                                {onUploadAttachment && (
                                    <label className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20'}`}>
                                        {isUploading ? t.uploading : t.addAttachment}
                                        <input type="file" className="hidden" onChange={handleFileSelected} disabled={isUploading} />
                                    </label>
                                )}
                            </div>
                            {(activeIssue.attachments || []).length > 0 ? (
                                <div className="space-y-2">
                                    {activeIssue.attachments!.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl group">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(a.id, a.filePath, a.fileName)}
                                                disabled={!onGetAttachmentUrl || downloadingId === a.id}
                                                className="flex-1 min-w-0 text-left rtl:text-right disabled:opacity-50"
                                            >
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{a.fileName}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(a.fileSize)}</p>
                                            </button>
                                            {onDeleteAttachment && currentUser?.id === a.uploadedBy && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteAttachment(a.id, a.filePath)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">{t.noAttachments}</p>
                            )}

                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">{t.comments}</h3>
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
