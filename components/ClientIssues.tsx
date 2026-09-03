
import React, { useEffect, useMemo, useState } from 'react';
import { Issue, IssueStatus, IssuePriority, IssueType, Project, User, Language } from '../types';

const severityColors: Record<string, string> = {
    [IssuePriority.Critical]: 'bg-red-600 text-white',
    [IssuePriority.High]: 'bg-red-500 text-white',
    [IssuePriority.Medium]: 'bg-amber-500 text-white',
    [IssuePriority.Low]: 'bg-blue-400 text-white',
};
import SearchableSelect from './SearchableSelect';

interface ClientIssuesProps {
    allIssues: Issue[];
    allProjects: Project[];
    currentUser?: User;
    language: Language;
    onAddIssue: (data: Omit<Issue, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
    onAddComment: (issueId: string, userId: string, content: string) => Promise<void>;
    onUpdateIssue?: (id: string, data: Partial<Issue>) => Promise<void>;
    onUploadAttachment?: (issueId: string, userId: string, file: File) => Promise<void>;
    onDeleteAttachment?: (attachmentId: string, filePath: string) => Promise<void>;
    onGetAttachmentUrl?: (filePath: string) => Promise<string>;
    onViewHistory?: (issue: Issue) => void;
}

const translations = {
    ar: {
        title: "المهام والاستفسارات", subtitle: "بلّغ عن عطل، اطلب تعديل، أو استفسر عن أي شي بمشاريعك.",
        newIssue: "+ تسجيل جديد", noIssues: "ما في تسجيلات لسا.",
        typeBug: "عطل (Bug)", typeChangeRequest: "طلب تعديل (CR)", typeInquiry: "استفسار",
        project: "المشروع", selectProject: "اختر المشروع...",
        titleLabel: "العنوان", description: "الوصف", type: "النوع",
        cancel: "إلغاء", submit: "إرسال", submitting: "جارٍ الإرسال...",
        status: "الحالة", assignee: "المسؤول", unassigned: "غير معيّن بعد",
        comments: "التعليقات", addComment: "أضف تعليق...", noComments: "لا توجد تعليقات بعد.",
        close: "إغلاق", post: "إرسال",
        closeTask: "إغلاق المهمة", reopenTask: "إعادة فتح", reopenedCount: "أعيد فتحها",
        severity: "الخطورة", severityLow: "منخفضة", severityMedium: "متوسطة", severityHigh: "عالية", severityCritical: "حرجة",
        history: "سجل التاريخ",
        attachments: "المرفقات", addAttachment: "+ إضافة مرفق", uploading: "جارٍ الرفع...", noAttachments: "لا توجد مرفقات بعد.",
        Open: "مفتوح", "In Progress": "قيد التنفيذ", Resolved: "تم الحل", Closed: "مغلق",
    },
    en: {
        title: "Tasks & Inquiries", subtitle: "Report a bug, request a change, or ask a question about your projects.",
        newIssue: "+ New Request", noIssues: "No requests yet.",
        typeBug: "Bug", typeChangeRequest: "Change Request (CR)", typeInquiry: "Inquiry",
        project: "Project", selectProject: "Select project...",
        titleLabel: "Title", description: "Description", type: "Type",
        cancel: "Cancel", submit: "Submit", submitting: "Submitting...",
        status: "Status", assignee: "Assignee", unassigned: "Not assigned yet",
        comments: "Comments", addComment: "Add a comment...", noComments: "No comments yet.",
        close: "Close", post: "Post",
        closeTask: "Close Task", reopenTask: "Re-Open", reopenedCount: "Reopened",
        severity: "Severity", severityLow: "Low", severityMedium: "Medium", severityHigh: "High", severityCritical: "Critical",
        history: "History",
        attachments: "Attachments", addAttachment: "+ Add Attachment", uploading: "Uploading...", noAttachments: "No attachments yet.",
        Open: "Open", "In Progress": "In Progress", Resolved: "Resolved", Closed: "Closed",
    }
};

const customerStatusLabel = (status: IssueStatus, language: Language) => {
    const map: Record<string, { ar: string; en: string }> = {
        [IssueStatus.Open]: { ar: 'جديدة', en: 'New' },
        [IssueStatus.InProgress]: { ar: 'قيد التنفيذ', en: 'In Progress' },
        [IssueStatus.Resolved]: { ar: 'منجزة', en: 'Done' },
        [IssueStatus.Closed]: { ar: 'مغلقة', en: 'Closed' },
    };
    return map[status]?.[language] || status;
};

const statusColors: Record<string, string> = {
    [IssueStatus.Open]: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    [IssueStatus.InProgress]: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    [IssueStatus.Resolved]: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    [IssueStatus.Closed]: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const typeColors: Record<string, string> = {
    [IssueType.Bug]: 'bg-red-500/10 text-red-600 dark:text-red-400',
    [IssueType.ChangeRequest]: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    [IssueType.Inquiry]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    [IssueType.Task]: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

const NewIssueModal: React.FC<{
    projects: Project[];
    language: Language;
    onClose: () => void;
    onSubmit: (data: { title: string; description: string; projectId: string; type: IssueType; severity: IssuePriority }) => Promise<void>;
}> = ({ projects, language, onClose, onSubmit }) => {
    const t = translations[language];
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');
    const [type, setType] = useState<IssueType>(IssueType.Bug);
    const [severity, setSeverity] = useState<IssuePriority>(IssuePriority.Medium);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const projectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name })), [projects]);
    const typeOptions: { value: IssueType; label: string }[] = [
        { value: IssueType.Bug, label: t.typeBug },
        { value: IssueType.ChangeRequest, label: t.typeChangeRequest },
        { value: IssueType.Inquiry, label: t.typeInquiry },
    ];
    const severityOptions: { value: IssuePriority; label: string }[] = [
        { value: IssuePriority.Low, label: t.severityLow },
        { value: IssuePriority.Medium, label: t.severityMedium },
        { value: IssuePriority.High, label: t.severityHigh },
        { value: IssuePriority.Critical, label: t.severityCritical },
    ];

    // Only one project accessible? Skip the picker entirely and use it.
    useEffect(() => {
        if (projects.length === 1) setProjectId(projects[0].id);
    }, [projects]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !projectId || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onSubmit({ title: title.trim(), description: description.trim(), projectId, type, severity });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white transition-all text-sm";

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">{t.newIssue}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.project}</label>
                        {projects.length === 1 ? (
                            <p className="w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200">{projects[0].name}</p>
                        ) : (
                            <SearchableSelect options={projectOptions} value={projectId} onChange={setProjectId} placeholder={t.selectProject} language={language} />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.type}</label>
                        <div className="flex gap-2">
                            {typeOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setType(opt.value)}
                                    className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold transition-colors ${type === opt.value ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.severity}</label>
                        <div className="flex gap-2">
                            {severityOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setSeverity(opt.value)}
                                    className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold transition-colors ${severity === opt.value ? severityColors[opt.value] : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.titleLabel}</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.description}</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClasses} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-opacity">
                            {t.cancel}
                        </button>
                        <button type="submit" disabled={isSubmitting || !title.trim() || !projectId} className="flex-1 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isSubmitting ? t.submitting : t.submit}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ClientIssues: React.FC<ClientIssuesProps> = ({ allIssues, allProjects, currentUser, language, onAddIssue, onAddComment, onUpdateIssue, onUploadAttachment, onDeleteAttachment, onGetAttachmentUrl, onViewHistory }) => {
    const t = translations[language];
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSavingComment, setIsSavingComment] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const myIssues = useMemo(
        () => allIssues.filter(i => i.reporterId === currentUser?.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
        [allIssues, currentUser]
    );

    const activeIssue = allIssues.find(i => i.id === activeIssueId);

    const handleCreate = async (data: { title: string; description: string; projectId: string; type: IssueType; severity: IssuePriority }) => {
        if (!currentUser) return;
        await onAddIssue({
            title: data.title,
            description: data.description,
            status: IssueStatus.Open,
            priority: IssuePriority.Medium,
            severity: data.severity,
            type: data.type,
            projectId: data.projectId,
            milestoneId: null,
            assigneeId: null,
            reporterId: currentUser.id,
        });
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
                    onClick={() => setIsNewOpen(true)}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20"
                >
                    {t.newIssue}
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {myIssues.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold">{t.noIssues}</div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {myIssues.map(issue => {
                            const project = allProjects.find(p => p.id === issue.projectId);
                            return (
                                <div key={issue.id} onClick={() => setActiveIssueId(issue.id)} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${typeColors[issue.type] || typeColors[IssueType.Task]}`}>
                                                {issue.type === IssueType.Bug ? t.typeBug : issue.type === IssueType.ChangeRequest ? t.typeChangeRequest : issue.type === IssueType.Inquiry ? t.typeInquiry : issue.type}
                                            </span>
                                            {issue.severity && (
                                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${severityColors[issue.severity]}`}>{issue.severity}</span>
                                            )}
                                            <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{issue.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                            <span>{project?.name || '--'}</span>
                                            <span>•</span>
                                            <span>{issue.assignee?.name || t.unassigned}</span>
                                            {(issue.comments || []).length > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{(issue.comments || []).length} {t.comments}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center ${statusColors[issue.status]}`}>{customerStatusLabel(issue.status, language)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isNewOpen && (
                <NewIssueModal projects={allProjects} language={language} onClose={() => setIsNewOpen(false)} onSubmit={handleCreate} />
            )}

            {activeIssue && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveIssueId(null); }}>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${typeColors[activeIssue.type] || typeColors[IssueType.Task]}`}>
                                        {activeIssue.type === IssueType.Bug ? t.typeBug : activeIssue.type === IssueType.ChangeRequest ? t.typeChangeRequest : activeIssue.type === IssueType.Inquiry ? t.typeInquiry : activeIssue.type}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusColors[activeIssue.status]}`}>{customerStatusLabel(activeIssue.status, language)}</span>
                                    {activeIssue.severity && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${severityColors[activeIssue.severity]}`}>{activeIssue.severity}</span>
                                    )}
                                </div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white">{activeIssue.title}</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{activeIssue.description}</p>
                                <p className="text-[10px] text-slate-400 mt-2">{t.assignee}: {activeIssue.assignee?.name || t.unassigned}</p>
                                {activeIssue.status === IssueStatus.Closed && (activeIssue.reopenCount || 0) > 0 && (
                                    <p className="text-[10px] text-slate-400">{t.reopenedCount}: {activeIssue.reopenCount}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {onViewHistory && (
                                    <button onClick={() => onViewHistory(activeIssue)} title={t.history} className="p-2 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </button>
                                )}
                                <button onClick={() => setActiveIssueId(null)} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                        {onUpdateIssue && (activeIssue.status === IssueStatus.Resolved || activeIssue.status === IssueStatus.Closed) && (
                            <div className="px-6 pt-4">
                                {activeIssue.status === IssueStatus.Resolved ? (
                                    <button
                                        onClick={() => onUpdateIssue(activeIssue.id, { status: IssueStatus.Closed })}
                                        className="w-full py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                                    >
                                        {t.closeTask}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onUpdateIssue(activeIssue.id, { status: IssueStatus.InProgress })}
                                        className="w-full py-2.5 bg-violet-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                                    >
                                        {t.reopenTask}
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.attachments} ({(activeIssue.attachments || []).length})</h3>
                                {onUploadAttachment && (
                                    <label className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-500/20'}`}>
                                        {isUploading ? t.uploading : t.addAttachment}
                                        <input type="file" className="hidden" onChange={handleFileSelected} disabled={isUploading} />
                                    </label>
                                )}
                            </div>
                            {(activeIssue.attachments || []).length > 0 ? (
                                <div className="space-y-2">
                                    {activeIssue.attachments!.map(a => (
                                        <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl group">
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
                                className="flex-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || isSavingComment}
                                className="px-5 py-3 bg-violet-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50"
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

export default ClientIssues;
