
import React, { useState, useRef, useEffect } from 'react';
import { Activity, Lookup, Language, PaymentStatus } from '../types';

interface PaymentActivityRowProps {
    activity: Activity;
    team?: Lookup;
    language: Language;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
}

const PaymentActivityRow: React.FC<PaymentActivityRowProps> = ({ activity, team, language, onUpdateActivity }) => {
    const [paymentMenuOpen, setPaymentMenuOpen] = useState(false);
    const paymentMenuRef = useRef<HTMLDivElement>(null);
    const t = translations[language];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (paymentMenuRef.current && !paymentMenuRef.current.contains(event.target as Node)) {
                setPaymentMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const paymentStatusColors: { [key in PaymentStatus]: string } = {
        [PaymentStatus.Paid]: 'bg-green-500/10 text-green-600 dark:text-green-400',
        [PaymentStatus.Sent]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        [PaymentStatus.Pending]: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    };

    const handleStatusChange = (newStatus: PaymentStatus) => {
        onUpdateActivity(activity.id, { paymentStatus: newStatus });
        setPaymentMenuOpen(false);
    };

    const isValidDate = activity.dueDate && !isNaN(new Date(activity.dueDate).getTime());
    const dueDate = isValidDate ? new Date(activity.dueDate) : null;

    return (
        <tr className="bg-white dark:bg-slate-800/30 border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                {activity.title}
            </td>
            <td className="px-6 py-4">
                {team?.name || t.unassigned}
            </td>
            <td className="px-6 py-4 text-center font-mono font-semibold text-green-600 dark:text-green-400">
                {activity.paymentAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
            </td>
            <td className="px-6 py-4 text-center">
                {dueDate ? dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noDueDate}
            </td>
            <td className="px-6 py-4 text-center">
                <div className="relative inline-block" ref={paymentMenuRef}>
                    <button
                        onClick={() => setPaymentMenuOpen(prev => !prev)}
                        className={`flex items-center justify-center gap-1 text-xs font-bold px-3 py-1 rounded-full cursor-pointer w-24 ${paymentStatusColors[activity.paymentStatus || PaymentStatus.Pending]}`}
                    >
                        {t[activity.paymentStatus || PaymentStatus.Pending]}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {paymentMenuOpen && (
                        <div className="absolute top-full right-1/2 translate-x-1/2 mt-1 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20">
                            {Object.values(PaymentStatus).sort().map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className="w-full text-start px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    {t[status as keyof typeof t]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

const translations = {
    ar: {
        unassigned: "غير معين",
        noDueDate: "لا يوجد تاريخ",
        Pending: "معلقة",
        Sent: "مرسلة",
        Paid: "مدفوعة",
    },
    en: {
        unassigned: "Unassigned",
        noDueDate: "No date",
        Pending: "Pending",
        Sent: "Sent",
        Paid: "Paid",
    },
};

export default PaymentActivityRow;