
import React, { useMemo, useState } from 'react';
import { Project, Milestone, Language, PaymentStatus } from '../types';

interface MilestoneNADatesDashboardProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    language: Language;
}

interface Row { milestone: Milestone; project: Project; }

const formatCurrency = (n: number, language: Language) =>
    n.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const formatCompact = (n: number) => {
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
};

const MilestoneNADatesDashboard: React.FC<MilestoneNADatesDashboardProps> = ({ allProjects, allMilestones, language }) => {
    const t = translations[language];
    const [searchTerm, setSearchTerm] = useState('');

    const projectById = useMemo(() => new Map(allProjects.map(p => [p.id, p])), [allProjects]);

    const rows: Row[] = useMemo(() => {
        return allMilestones
            .filter(m => m.hasPayment && m.paymentStatus === PaymentStatus.Pending && !m.dueDate)
            .map(m => ({ milestone: m, project: projectById.get(m.projectId)! }))
            .filter(r => r.project && r.project.status?.name === 'Running');
    }, [allMilestones, projectById]);

    const searchFiltered = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const q = searchTerm.trim().toLowerCase();
        return rows.filter(r => r.project.name.toLowerCase().includes(q) || r.project.projectCode?.toLowerCase().includes(q));
    }, [rows, searchTerm]);

    const count = searchFiltered.length;
    const totalAmount = useMemo(() => searchFiltered.reduce((s, r) => s + (r.milestone.paymentAmount || 0), 0), [searchFiltered]);

    const pmGroups = useMemo(() => {
        const map = new Map<string, { name: string; projectIds: Set<string>; amount: number }>();
        searchFiltered.forEach(r => {
            const name = r.project.projectManager?.name || t.unassigned;
            if (!map.has(name)) map.set(name, { name, projectIds: new Set(), amount: 0 });
            const g = map.get(name)!;
            g.projectIds.add(r.project.id);
            g.amount += r.milestone.paymentAmount || 0;
        });
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    }, [searchFiltered, t.unassigned]);

    const projectGroups = useMemo(() => {
        const map = new Map<string, { code: string; amount: number; product: string }>();
        searchFiltered.forEach(r => {
            const code = r.project.projectCode || r.project.name;
            if (!map.has(code)) map.set(code, { code, amount: 0, product: r.project.product?.name || '-' });
            map.get(code)!.amount += r.milestone.paymentAmount || 0;
        });
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    }, [searchFiltered]);

    const milestoneGroups = useMemo(() => {
        const map = new Map<string, { name: string; amount: number }>();
        searchFiltered.forEach(r => {
            if (!map.has(r.milestone.title)) map.set(r.milestone.title, { name: r.milestone.title, amount: 0 });
            map.get(r.milestone.title)!.amount += r.milestone.paymentAmount || 0;
        });
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
    }, [searchFiltered]);

    const reportDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'numeric' });

    return (
        <div className="space-y-6">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-blue-500 inline-block pb-1">{t.reportAsOf}</p>
                <p className="text-sm font-black text-blue-600 mt-1">{reportDate}</p>
            </div>

            <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">{t.title}</h2>
                <p className="text-blue-600 dark:text-blue-400 font-bold">{t.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-emerald-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[110px] shadow-lg">
                    <span className="text-2xl font-black">{count}</span>
                    <span className="text-[10px] uppercase font-bold opacity-90">{t.count}</span>
                </div>
                <div className="bg-emerald-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[150px] shadow-lg">
                    <span className="text-2xl font-black">{formatCompact(totalAmount)}</span>
                    <span className="text-[10px] uppercase font-bold opacity-90">{t.amount}</span>
                </div>
                <div className="flex-1 min-w-[220px] relative">
                    <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={t.searchPlaceholder}
                        className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-blue-900 text-white text-xs uppercase">
                            <tr>
                                <th className="px-4 py-2">{t.pm}</th>
                                <th className="px-4 py-2 text-end">{t.countOfProjects}</th>
                                <th className="px-4 py-2 text-end">{t.amount}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pmGroups.map(g => (
                                <tr key={g.name} className="border-t border-slate-100 dark:border-slate-800 even:bg-slate-50 dark:even:bg-slate-800/30">
                                    <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{g.name}</td>
                                    <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{g.projectIds.size}</td>
                                    <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatCurrency(g.amount, language)}</td>
                                </tr>
                            ))}
                            <tr className="bg-blue-900 text-white font-bold">
                                <td className="px-4 py-2">{t.total}</td>
                                <td className="px-4 py-2 text-end">{count}</td>
                                <td className="px-4 py-2 text-end">{formatCurrency(totalAmount, language)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-blue-900 text-white text-xs uppercase">
                            <tr>
                                <th className="px-4 py-2">{t.project}</th>
                                <th className="px-4 py-2 text-end">{t.amount}</th>
                                <th className="px-4 py-2">{t.product}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectGroups.map(g => (
                                <tr key={g.code} className="border-t border-slate-100 dark:border-slate-800 even:bg-slate-50 dark:even:bg-slate-800/30">
                                    <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{g.code}</td>
                                    <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatCurrency(g.amount, language)}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{g.product}</td>
                                </tr>
                            ))}
                            <tr className="bg-blue-900 text-white font-bold">
                                <td className="px-4 py-2">{t.total}</td>
                                <td className="px-4 py-2 text-end">{formatCurrency(totalAmount, language)}</td>
                                <td className="px-4 py-2"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left rtl:text-right">
                    <thead className="bg-blue-900 text-white text-xs uppercase">
                        <tr>
                            <th className="px-4 py-2">{t.milestoneName}</th>
                            <th className="px-4 py-2 text-end">{t.sumOfPaymentAmount}</th>
                            <th className="px-4 py-2">{t.paymentStatus}</th>
                            <th className="px-4 py-2">{t.expectedClosureDate}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {milestoneGroups.map(g => (
                            <tr key={g.name} className="border-t border-slate-100 dark:border-slate-800 even:bg-slate-50 dark:even:bg-slate-800/30">
                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{g.name}</td>
                                <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatCurrency(g.amount, language)}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{t.notIssued}</td>
                                <td className="px-4 py-2 text-slate-400">-</td>
                            </tr>
                        ))}
                        <tr className="bg-blue-900 text-white font-bold">
                            <td className="px-4 py-2">{t.total}</td>
                            <td className="px-4 py-2 text-end">{formatCurrency(totalAmount, language)}</td>
                            <td className="px-4 py-2" colSpan={2}></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        title: "مواعيد المعالم غير المحددة", subtitle: "غير مصدرة وقيد التنفيذ",
        reportAsOf: "تقرير الإحصائيات كما في", count: "العدد", amount: "المبلغ",
        searchPlaceholder: "بحث بتفاصيل المشروع...", pm: "مدير المشروع", countOfProjects: "عدد المشاريع",
        project: "المشروع", product: "المنتج", milestoneName: "اسم المعلم",
        sumOfPaymentAmount: "مجموع مبلغ الدفعة", paymentStatus: "حالة الدفع",
        expectedClosureDate: "تاريخ الإغلاق المتوقع للمعلم", total: "الإجمالي",
        notIssued: "غير مصدر", unassigned: "غير معين",
    },
    en: {
        title: "Milestone NA Dates", subtitle: "Not issued and running",
        reportAsOf: "Statistics report as of", count: "Count", amount: "Amount",
        searchPlaceholder: "Search by project details", pm: "PM", countOfProjects: "Count of projects",
        project: "Project", product: "Product", milestoneName: "Milestone Name",
        sumOfPaymentAmount: "Sum of Payment Amount", paymentStatus: "Payment Status",
        expectedClosureDate: "Milestone Expected Closure Date", total: "Total",
        notIssued: "Not Issued", unassigned: "Unassigned",
    },
};

export default MilestoneNADatesDashboard;
