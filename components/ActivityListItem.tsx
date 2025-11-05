import React, { useState, useRef, useEffect } from 'react';
import { Activity, Project, Lookup, Language, ActivityStatus, PaymentStatus } from '../types';

interface ActivityListItemProps {
    activity: Activity;
    project?: Project;
    team?: Lookup;
    language: Language;
    onOpenEditModal: () => void;
    onDoubleClick: () => void;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
}

const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity, project, team, language, onOpenEditModal, onDoubleClick, onUpdateActivity }) => {
    const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
    const paymentMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (paymentMenuRef.current && !paymentMenuRef.current.contains(event.target as Node)) setPaymentMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const statusColors: { [key in ActivityStatus]: string } = {
        [ActivityStatus.Completed]: 'bg-green-500/10 text-green-600 dark:text-green-400',
        [ActivityStatus.InProgress]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        [ActivityStatus.Pending]: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    };

    const paymentStatusColors: { [key in PaymentStatus]: string } = {
        [PaymentStatus.Paid]: 'bg-green-500/10 text-green-600 dark:text-green-400',
        [PaymentStatus.Sent]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        [PaymentStatus.Pending]: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    };

    const translations = {
        ar: { edit: "تعديل", options: "خيارات النشاط", Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة", noDueDate: "لا يوجد تاريخ", unassigned: "غير معين" },
        en: { edit: "Edit", options: "Activity options", Pending: "Pending", Sent: "Sent", Paid: "Paid", noDueDate: "No date", unassigned: "Unassigned" },
    };
    const t = translations[language];
    
    const isValidDate = activity.dueDate && !isNaN(new Date(activity.dueDate).getTime());
    const dueDate = isValidDate ? new Date(activity.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && activity.status !== ActivityStatus.Completed;

    const handlePaymentStatusChange = (newStatus: PaymentStatus) => {
        onUpdateActivity(activity.id, { paymentStatus: newStatus });
        setPaymentMenuOpen(false);
    };

    return (
        <div 
            onDoubleClick={onDoubleClick}
            className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-3 rounded-lg flex items-center gap-4 hover:border-violet-400 dark:hover:border-violet-500/80 transition-all duration-300 text-sm cursor-pointer hover:shadow-md"
        >
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white truncate">{activity.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{activity.description}</p>
            </div>
            
            <div className="w-40 text-center shrink-0 flex items-center justify-center gap-2">
                {activity.hasPayment && (
                    <>
                        <span className="text-green-600 dark:text-green-400 font-mono text-xs">💰 {activity.paymentAmount.toLocaleString()}</span>
                        <div className="relative" ref={paymentMenuRef}>
                            <button onClick={(e) => { e.stopPropagation(); setPaymentMenuOpen(p => !p); }} className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full cursor-pointer ${paymentStatusColors[activity.paymentStatus || PaymentStatus.Pending]}`}>
                                {t[activity.paymentStatus || PaymentStatus.Pending]}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            {paymentMenuOpen && (
                                <div className="absolute top-full right-0 rtl:left-0 rtl:right-auto mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
                                    {Object.values(PaymentStatus).map(status => (
                                        <button key={status} onClick={(e) => {e.stopPropagation(); handlePaymentStatusChange(status)}} className="w-full text-start px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">{t[status]}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="w-32 text-center shrink-0">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[activity.status]}`}>{activity.status}</span>
            </div>

            <div className="w-40 text-center shrink-0 font-medium text-slate-600 dark:text-slate-300 truncate">
                {team?.name || t.unassigned}
            </div>

            <div className={`w-28 text-center shrink-0 font-medium ${isOverdue ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                {dueDate ? dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noDueDate}
            </div>

            <div className="shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); onOpenEditModal(); }} 
                    className="px-4 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors"
                >
                    {t.edit}
                </button>
            </div>
        </div>
    );
};

export default ActivityListItem;