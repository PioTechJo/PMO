import React, { useState, useEffect } from 'react';
import { MilestoneChangeRequest, Language, User } from '../types';
import { fetchMilestoneChangeRequests, approveMilestoneChange, rejectMilestoneChange } from '../services/api';

interface MilestonePendingChangesProps {
    language: Language;
    currentUser: User;
    onUpdate: () => void;
}

const MilestonePendingChanges: React.FC<MilestonePendingChangesProps> = ({ language, currentUser, onUpdate }) => {
    const [requests, setRequests] = useState<MilestoneChangeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
    const [showRejectionInput, setShowRejectionInput] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchMilestoneChangeRequests();
            setRequests(data.filter(r => r.status === 'pending'));
        } catch (err: any) {
            setError(err.message || "Failed to load requests");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async (id: string) => {
        setActionError(null);
        try {
            await approveMilestoneChange(id);
            loadRequests();
            onUpdate();
        } catch (err: any) {
            setActionError(err.message || "Failed to approve request");
        }
    };

    const handleReject = async (id: string) => {
        const reason = rejectionReason[id];
        if (!reason?.trim()) return;
        setActionError(null);
        try {
            await rejectMilestoneChange(id, reason);
            setShowRejectionInput(null);
            loadRequests();
            onUpdate();
        } catch (err: any) {
            setActionError(err.message || "Failed to reject request");
        }
    };

    const translations = {
        ar: {
            title: "طلبات تغيير المواعيد المعلقة",
            requester: "مقدم الطلب",
            milestone: "المعلم",
            oldDate: "التاريخ القديم",
            newDate: "التاريخ الجديد",
            reason: "السبب",
            approve: "موافقة",
            reject: "رفض",
            noRequests: "لا توجد طلبات معلقة",
            rejectionReasonPlaceholder: "سبب الرفض...",
            submitReject: "تأكيد الرفض",
            actionErrorPrefix: "تعذر تنفيذ الإجراء: "
        },
        en: {
            title: "Pending Date Change Requests",
            requester: "Requester",
            milestone: "Milestone",
            oldDate: "Old Date",
            newDate: "New Date",
            reason: "Reason",
            approve: "Approve",
            reject: "Reject",
            noRequests: "No pending requests",
            rejectionReasonPlaceholder: "Reason for rejection...",
            submitReject: "Confirm Reject",
            actionErrorPrefix: "Action failed: "
        }
    };
    const t = translations[language === 'ar' ? 'ar' : 'en'];

    if (requests.length === 0 && !isLoading && !error && !actionError) return null;

    return (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {t.title}
            </h2>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-2xl text-xs font-bold mb-4">
                    {error}
                </div>
            )}

            {actionError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-2xl text-xs font-bold mb-4">
                    {t.actionErrorPrefix}{actionError}
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div></div>
                ) : requests.map(req => (
                    <div key={req.id} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.milestone}</p>
                                <p className="text-xs font-black text-slate-800 dark:text-white truncate">{req.milestoneTitle}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{t.requester}: <span className="font-bold">{req.requesterName}</span></p>
                            </div>
                            <div className="md:col-span-1 flex gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.oldDate}</p>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 line-through">{req.oldDueDate ? new Date(req.oldDueDate).toLocaleDateString() : '--'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.newDate}</p>
                                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{req.newDueDate ? new Date(req.newDueDate).toLocaleDateString() : '--'}</p>
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.reason}</p>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 italic">"{req.reason}"</p>
                            </div>
                            <div className="md:col-span-1 flex flex-col items-end justify-center gap-2">
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleApprove(req.id)}
                                        className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-xl hover:bg-emerald-700 transition-colors uppercase"
                                    >
                                        {t.approve}
                                    </button>
                                    <button 
                                        onClick={() => setShowRejectionInput(showRejectionInput === req.id ? null : req.id)}
                                        className="px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition-colors uppercase"
                                    >
                                        {t.reject}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showRejectionInput === req.id && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 animate-in slide-in-from-top-2">
                                <input 
                                    type="text" 
                                    value={rejectionReason[req.id] || ''} 
                                    onChange={e => setRejectionReason(prev => ({ ...prev, [req.id]: e.target.value }))}
                                    placeholder={t.rejectionReasonPlaceholder}
                                    className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
                                />
                                <button 
                                    onClick={() => handleReject(req.id)}
                                    className="px-4 bg-slate-800 text-white text-[10px] font-black rounded-xl hover:bg-slate-700 uppercase"
                                >
                                    {t.submitReject}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MilestonePendingChanges;
