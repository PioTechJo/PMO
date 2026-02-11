
import React, { useState, useMemo } from 'react';
import { Milestone, Project, Language, PaymentStatus } from '../types';
import SearchableSelect from './SearchableSelect';

const WidgetWrapper: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-sm dark:shadow-none h-full flex flex-col">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>
        <div className="flex-grow">{children}</div>
    </div>
);

interface PaymentStatusWidgetProps {
    milestones: Milestone[];
    projects: Project[];
    language: Language;
}

const translations = {
    ar: {
        title: "تحليل حالة الدفعات",
        allProjects: "كل المشاريع",
        searchProjects: "ابحث عن مشروع...",
        allYears: "كل السنوات",
        allMonths: "كل الشهور",
        total: "الإجمالي",
        Paid: "مدفوعة",
        Sent: "مرسلة",
        Pending: "معلقة",
        noData: "لا توجد بيانات دفع لعرضها."
    },
    en: {
        title: "Payment Status Breakdown",
        allProjects: "All Projects",
        searchProjects: "Search projects...",
        allYears: "All Years",
        allMonths: "All Months",
        total: "Total",
        Paid: "Paid",
        Sent: "Sent",
        Pending: "Pending",
        noData: "No payment data to display."
    }
};

const PaymentStatusWidget: React.FC<PaymentStatusWidgetProps> = ({ milestones, projects, language }) => {
    const t = translations[language];
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');

    const projectOptions = useMemo(() => [
        { value: 'all', label: t.allProjects },
        ...projects.map(p => ({ value: p.id, label: p.name }))
    ], [projects, t.allProjects]);

    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        if (milestones) {
            milestones.forEach(milestone => {
                if (milestone.dueDate) {
                    years.add(new Date(milestone.dueDate).getFullYear());
                }
            });
        }
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        return [
            { value: 'all', label: t.allYears },
            ...sortedYears.map(year => ({ value: year.toString(), label: year.toString() }))
        ];
    }, [milestones, t.allYears]);

    const monthOptions = useMemo(() => {
        return [
            { value: 'all', label: t.allMonths },
            ...Array.from({ length: 12 }, (_, i) => {
                const date = new Date(2000, i, 15);
                const monthName = date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
                return { value: (i + 1).toString(), label: monthName };
            })
        ];
    }, [language, t.allMonths]);

    const filteredMilestones = useMemo(() => {
        if (!milestones) return [];
        return milestones.filter(milestone => {
            if (!milestone.hasPayment) return false;
            
            const projectMatch = selectedProjectId === 'all' || milestone.projectId === selectedProjectId;
            
            const date = milestone.dueDate ? new Date(milestone.dueDate) : null;
            const yearMatch = selectedYear === 'all' || (date && date.getFullYear().toString() === selectedYear);
            const monthMatch = selectedMonth === 'all' || (date && (date.getMonth() + 1).toString() === selectedMonth);

            return projectMatch && yearMatch && monthMatch;
        });
    }, [milestones, selectedProjectId, selectedYear, selectedMonth]);

    const paymentStats = useMemo(() => {
        const stats: { [key in PaymentStatus]: number } = {
            [PaymentStatus.Paid]: 0,
            [PaymentStatus.Sent]: 0,
            [PaymentStatus.Pending]: 0,
        };
        filteredMilestones.forEach(milestone => {
            const status = milestone.paymentStatus || PaymentStatus.Pending;
            stats[status] += milestone.paymentAmount;
        });
        return stats;
    }, [filteredMilestones]);

    const totalAmount = paymentStats.Paid + paymentStats.Sent + paymentStats.Pending;

    const statusData = [
        { status: PaymentStatus.Paid, amount: paymentStats.Paid, color: 'bg-green-500' },
        { status: PaymentStatus.Sent, amount: paymentStats.Sent, color: 'bg-blue-500' },
        { status: PaymentStatus.Pending, amount: paymentStats.Pending, color: 'bg-yellow-500' },
    ];

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' });
    };

    const selectClasses = "w-full p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";

    return (
        <WidgetWrapper title={t.title}>
            <div className="flex flex-col h-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <SearchableSelect
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        options={projectOptions}
                        placeholder={t.allProjects}
                        searchPlaceholder={t.searchProjects}
                        language={language}
                    />
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={selectClasses} aria-label={t.allYears}>
                        {yearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={selectClasses} aria-label={t.allMonths}>
                        {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                {totalAmount > 0 ? (
                    <div className="flex-grow flex flex-col justify-between">
                        <div className="space-y-3 pt-2">
                            {statusData.map(({ status, amount, color }) => (
                                <div key={status} className="flex items-center gap-4">
                                    <span className="w-1/4 text-sm text-gray-600 dark:text-gray-300 truncate">{t[status]}</span>
                                    <div className="w-3/4 flex items-center gap-2">
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                            <div
                                                className={`${color} h-4 rounded-full transition-all duration-500`}
                                                style={{ width: `${totalAmount > 0 ? (amount / totalAmount) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white text-sm w-24 text-right rtl:text-left">{formatCurrency(amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="flex justify-end items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{t.total}: {formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noData}</p>
                    </div>
                )}
            </div>
        </WidgetWrapper>
    );
};

export default PaymentStatusWidget;
