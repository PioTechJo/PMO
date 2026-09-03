
import React, { useEffect, useState } from 'react';
import { AuditLogEntry, Issue, Language } from '../types';
import { fetchIssueHistory } from '../services/api';

interface TaskHistoryProps {
    issue: Issue;
    language: Language;
    onClose: () => void;
}

const translations = {
    ar: {
        title: "سجل تاريخ المهمة", subtitle: "كل تغيير بحالة المهمة، متى صار ومين عمله.",
        back: "رجوع", loading: "جارٍ التحميل...", noHistory: "ما في تاريخ مسجّل بعد لهاي المهمة.",
        created: "تم إنشاء المهمة", statusChanged: "تغيّرت الحالة", reopened: "تمت إعادة الفتح", by: "بواسطة",
        from: "من", to: "إلى", unknownUser: "مستخدم غير معروف", system: "النظام",
        New: "جديدة", "In Progress": "قيد التنفيذ", Resolved: "منجزة", Closed: "مغلقة", Open: "جديدة",
    },
    en: {
        title: "Task History", subtitle: "Every status change on this task - when it happened and who did it.",
        back: "Back", loading: "Loading...", noHistory: "No history recorded for this task yet.",
        created: "Task Created", statusChanged: "Status Changed", reopened: "Task Reopened", by: "by",
        from: "from", to: "to", unknownUser: "Unknown user", system: "System",
        New: "New", "In Progress": "In Progress", Resolved: "Done", Closed: "Closed", Open: "New",
    }
};

const statusDotColors: Record<string, string> = {
    Open: 'bg-blue-500', 'In Progress': 'bg-amber-500', Resolved: 'bg-emerald-500', Closed: 'bg-slate-500',
};

const TaskHistory: React.FC<TaskHistoryProps> = ({ issue, language, onClose }) => {
    const t = translations[language];
    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        fetchIssueHistory(issue.id)
            .then(data => { if (!cancelled) setEntries(data); })
            .catch(err => console.error('Failed to load task history:', err))
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [issue.id]);

    // Build the timeline: an INSERT row is "Created", an UPDATE row where
    // status actually changed is a status transition. Other column changes
    // (severity, due date, comments...) are ignored here - this page is
    // specifically the status history the user asked for.
    const timelineEvents = entries
        .filter(e => e.action === 'INSERT' || (e.action === 'UPDATE' && e.oldData?.status !== e.newData?.status))
        .map(e => ({
            id: e.id,
            createdAt: e.createdAt,
            userName: e.user?.name || t.unknownUser,
            isCreation: e.action === 'INSERT',
            fromStatus: e.oldData?.status as string | undefined,
            toStatus: (e.newData?.status || e.oldData?.status) as string | undefined,
            isReopen: e.action === 'UPDATE' && e.oldData?.status === 'Closed' && e.newData?.status !== 'Closed',
        }));

    const statusLabel = (s?: string) => (s ? (t as any)[s] || s : '');

    return (
        <div className="fixed inset-0 bg-white dark:bg-[#0a0f1c] z-[300] overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="max-w-3xl mx-auto px-6 py-10">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors"
                >
                    <svg className={`w-4 h-4 ${language === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    {t.back}
                </button>

                <div className="mb-10">
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                    <div className="flex items-center justify-between gap-4 mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{issue.title}</p>
                        {(issue.reopenCount || 0) > 0 && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                                {t.reopened}: {issue.reopenCount}
                            </span>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center text-slate-400 text-sm font-bold">{t.loading}</div>
                ) : timelineEvents.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm font-bold">{t.noHistory}</div>
                ) : (
                    <div className="relative">
                        <div className={`absolute top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800 ${language === 'ar' ? 'right-[15px]' : 'left-[15px]'}`} />
                        <div className="space-y-8">
                            {timelineEvents.map(ev => (
                                <div key={ev.id} className="relative flex items-start gap-5">
                                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ev.isCreation ? 'bg-violet-500' : ev.isReopen ? 'bg-red-500' : statusDotColors[ev.toStatus || ''] || 'bg-slate-400'}`}>
                                        {ev.isReopen ? (
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pb-1">
                                        <p className="text-sm font-black text-slate-800 dark:text-white">
                                            {ev.isCreation ? t.created : ev.isReopen ? (
                                                <span className="text-red-600 dark:text-red-400">{t.reopened}</span>
                                            ) : (
                                                <>
                                                    {t.statusChanged}: <span className="text-slate-400 font-bold">{statusLabel(ev.fromStatus)}</span> → <span>{statusLabel(ev.toStatus)}</span>
                                                </>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(ev.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                            {' · '}{t.by} {ev.userName}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskHistory;
