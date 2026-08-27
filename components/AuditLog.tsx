
import React, { useEffect, useMemo, useState } from 'react';
import { AuditLogEntry, AuditAction, User, Language } from '../types';
import { fetchAuditLog, purgeAuditLog, AuditLogFilters } from '../services/api';
import SearchableSelect from './SearchableSelect';

interface AuditLogProps {
    allUsers: User[];
    language: Language;
}

const PAGE_SIZE = 25;

const actionColors: Record<AuditAction, string> = {
    INSERT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    UPDATE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
    LOGIN: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

const translations = {
    ar: {
        title: "سجل التدقيق", subtitle: "من عمل شو ومتى، عبر كل النظام.",
        user: "المستخدم", allUsers: "كل المستخدمين", table: "الجدول", allTables: "كل الجداول",
        action: "الإجراء", allActions: "كل الإجراءات",
        from: "من تاريخ", to: "إلى تاريخ", clearFilters: "مسح الفلاتر",
        colTime: "الوقت", colUser: "المستخدم", colAction: "الإجراء", colTable: "الجدول", colDetails: "التفاصيل",
        noEntries: "لا توجد سجلات مطابقة.", prev: "السابق", next: "التالي",
        showingRange: "عرض {from}-{to} من {total}",
        viewDetails: "عرض", hideDetails: "إخفاء",
        cleanTitle: "تنظيف السجل", cleanSubtitle: "احذف السجلات بين تاريخين. هذا الإجراء لا يمكن التراجع عنه.",
        cleanBtn: "حذف السجلات", autoDeleteNote: "السجلات الأقدم من 3 شهور تُحذف تلقائياً كل يوم.",
        confirmTitle: "تأكيد الحذف", confirmMessage: "هل أنت متأكد أنك تريد حذف كل السجلات بين",
        and: "و", confirmWarning: "لا يمكن التراجع عن هذا الإجراء.", cancel: "إلغاء", delete: "حذف",
        INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف", LOGIN: "تسجيل دخول",
        systemLogin: "دخول للنظام", noChanges: "--", field: "الحقل", oldValue: "القيمة القديمة", newValue: "القيمة الجديدة",
    },
    en: {
        title: "Audit Log", subtitle: "Who did what and when, across the whole system.",
        user: "User", allUsers: "All Users", table: "Table", allTables: "All Tables",
        action: "Action", allActions: "All Actions",
        from: "From Date", to: "To Date", clearFilters: "Clear Filters",
        colTime: "Time", colUser: "User", colAction: "Action", colTable: "Table", colDetails: "Details",
        noEntries: "No matching entries.", prev: "Prev", next: "Next",
        showingRange: "Showing {from}-{to} of {total}",
        viewDetails: "View", hideDetails: "Hide",
        cleanTitle: "Clean Log", cleanSubtitle: "Delete entries between two dates. This action cannot be undone.",
        cleanBtn: "Delete Entries", autoDeleteNote: "Entries older than 3 months are deleted automatically every day.",
        confirmTitle: "Confirm Deletion", confirmMessage: "Are you sure you want to delete all entries between",
        and: "and", confirmWarning: "This action cannot be undone.", cancel: "Cancel", delete: "Delete",
        INSERT: "Insert", UPDATE: "Update", DELETE: "Delete", LOGIN: "Login",
        systemLogin: "Logged into the system", noChanges: "--", field: "Field", oldValue: "Old Value", newValue: "New Value",
    }
};

const DetailsDiff: React.FC<{ entry: AuditLogEntry; t: typeof translations['en'] }> = ({ entry, t }) => {
    if (entry.action === 'LOGIN') return <p className="text-xs text-slate-500 italic">{t.systemLogin}</p>;

    const oldData = entry.oldData || {};
    const newData = entry.newData || {};
    const keys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]))
        .filter(k => JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]));

    if (keys.length === 0) return <p className="text-xs text-slate-400 italic">{t.noChanges}</p>;

    return (
        <table className="w-full text-xs text-left rtl:text-right mt-2">
            <thead>
                <tr className="text-slate-400">
                    <th className="pr-3 rtl:pl-3 font-bold py-1">{t.field}</th>
                    <th className="pr-3 rtl:pl-3 font-bold py-1">{t.oldValue}</th>
                    <th className="font-bold py-1">{t.newValue}</th>
                </tr>
            </thead>
            <tbody>
                {keys.map(key => (
                    <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="pr-3 rtl:pl-3 py-1 font-mono text-slate-500">{key}</td>
                        <td className="pr-3 rtl:pl-3 py-1 text-red-500 truncate max-w-[160px]">{String(oldData[key] ?? '--')}</td>
                        <td className="py-1 text-emerald-600 dark:text-emerald-400 truncate max-w-[160px]">{String(newData[key] ?? '--')}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const AuditLog: React.FC<AuditLogProps> = ({ allUsers, language }) => {
    const t = translations[language];

    const [entries, setEntries] = useState<AuditLogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [userId, setUserId] = useState('all');
    const [tableName, setTableName] = useState('all');
    const [action, setAction] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [cleanFrom, setCleanFrom] = useState('');
    const [cleanTo, setCleanTo] = useState('');
    const [showConfirmPurge, setShowConfirmPurge] = useState(false);
    const [isPurging, setIsPurging] = useState(false);

    const userOptions = useMemo(() => [{ value: 'all', label: t.allUsers }, ...allUsers.map(u => ({ value: u.id, label: u.name }))], [allUsers, t.allUsers]);
    const tableOptions = useMemo(() => [
        { value: 'all', label: t.allTables },
        { value: 'projects', label: 'projects' },
        { value: 'activities', label: 'milestones' },
        { value: 'users', label: 'users' },
        { value: 'customers', label: 'customers' },
        { value: 'customer_contacts', label: 'customer_contacts' },
        { value: 'maintenance_contracts', label: 'maintenance_contracts' },
        { value: 'issues', label: 'issues' },
        { value: 'issue_comments', label: 'issue_comments' },
        { value: 'auth', label: 'auth (logins)' },
    ], [t.allTables]);
    const actionOptions = useMemo(() => [
        { value: 'all', label: t.allActions },
        { value: 'INSERT', label: t.INSERT },
        { value: 'UPDATE', label: t.UPDATE },
        { value: 'DELETE', label: t.DELETE },
        { value: 'LOGIN', label: t.LOGIN },
    ], [t]);

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const filters: AuditLogFilters = {};
            if (userId !== 'all') filters.userId = userId;
            if (tableName !== 'all') filters.tableName = tableName;
            if (action !== 'all') filters.action = action as AuditAction;
            if (fromDate) filters.from = new Date(fromDate).toISOString();
            if (toDate) filters.to = new Date(new Date(toDate).getTime() + 86399999).toISOString();
            const result = await fetchAuditLog(filters, page, PAGE_SIZE);
            setEntries(result.entries);
            setTotal(result.total);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadEntries(); }, [userId, tableName, action, fromDate, toDate, page]);
    useEffect(() => { setPage(0); }, [userId, tableName, action, fromDate, toDate]);

    const handleClearFilters = () => {
        setUserId('all'); setTableName('all'); setAction('all'); setFromDate(''); setToDate('');
    };

    const handlePurge = async () => {
        if (!cleanFrom || !cleanTo) return;
        setIsPurging(true);
        try {
            await purgeAuditLog(new Date(cleanFrom).toISOString(), new Date(new Date(cleanTo).getTime() + 86399999).toISOString());
            setShowConfirmPurge(false);
            setCleanFrom(''); setCleanTo('');
            setPage(0);
            await loadEntries();
        } finally {
            setIsPurging(false);
        }
    };

    const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-1">{t.title}</h2>
                <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <SearchableSelect options={userOptions} value={userId} onChange={setUserId} placeholder={t.allUsers} language={language} />
                <SearchableSelect options={tableOptions} value={tableName} onChange={setTableName} placeholder={t.allTables} language={language} />
                <SearchableSelect options={actionOptions} value={action} onChange={setAction} placeholder={t.allActions} language={language} />
                <div>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <button onClick={handleClearFilters} className="px-4 py-2 text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-xl border border-slate-300 dark:border-slate-600">
                    {t.clearFilters}
                </button>
            </div>

            {/* Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm italic">...</div>
                ) : entries.length > 0 ? (
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.colTime}</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.colUser}</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.colAction}</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.colTable}</th>
                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.colDetails}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {entries.map(entry => (
                                <React.Fragment key={entry.id}>
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                                        <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{entry.user?.name || '--'}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${actionColors[entry.action]}`}>{t[entry.action]}</span>
                                        </td>
                                        <td className="p-3 font-mono text-xs text-slate-500">{entry.tableName}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="text-[10px] font-black uppercase text-violet-500 hover:text-violet-700 tracking-widest">
                                                {expandedId === entry.id ? t.hideDetails : t.viewDetails}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === entry.id && (
                                        <tr>
                                            <td colSpan={5} className="p-3 bg-slate-50 dark:bg-slate-800/30">
                                                <DetailsDiff entry={entry} t={t} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-8 text-center text-slate-500 italic">{t.noEntries}</div>
                )}
            </div>

            {total > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t.showingRange.replace('{from}', String(page * PAGE_SIZE + 1)).replace('{to}', String(Math.min((page + 1) * PAGE_SIZE, total))).replace('{total}', String(total))}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40">{t.prev}</button>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-40">{t.next}</button>
                    </div>
                </div>
            )}

            {/* Clean log */}
            <div className="p-5 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-2xl space-y-3">
                <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-tight">{t.cleanTitle}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.cleanSubtitle}</p>
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.from}</label>
                        <input type="date" value={cleanFrom} onChange={(e) => setCleanFrom(e.target.value)} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.to}</label>
                        <input type="date" value={cleanTo} onChange={(e) => setCleanTo(e.target.value)} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-red-500" />
                    </div>
                    <button
                        onClick={() => setShowConfirmPurge(true)}
                        disabled={!cleanFrom || !cleanTo}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-40"
                    >
                        {t.cleanBtn}
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 italic">{t.autoDeleteNote}</p>
            </div>

            {showConfirmPurge && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md m-4 p-6 text-center" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20 mb-4">
                            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.confirmTitle}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {t.confirmMessage} <span className="font-bold">{cleanFrom}</span> {t.and} <span className="font-bold">{cleanTo}</span>?
                            <br />{t.confirmWarning}
                        </p>
                        <div className="flex justify-center gap-3 mt-6">
                            <button onClick={() => setShowConfirmPurge(false)} disabled={isPurging} className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">
                                {t.cancel}
                            </button>
                            <button onClick={handlePurge} disabled={isPurging} className="px-6 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                                {isPurging ? '...' : t.delete}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLog;
