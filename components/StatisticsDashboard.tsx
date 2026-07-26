import React, { useMemo, useState } from 'react';
import { Project, Milestone, Lookups, Language, PaymentStatus } from '../types';

interface StatisticsDashboardProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    lookups: Lookups;
    language: Language;
}

const monthNamesShort = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const formatMoney = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
};

// Payment statuses shown as separate slicer buttons; "Issued Not Sent" and "Not Issued" both
// map to PaymentStatus.Pending since the underlying data only distinguishes 3 states.
const PAYMENT_STATUS_BUTTONS: { key: string; status: PaymentStatus; labelEn: string; labelAr: string }[] = [
    { key: 'issuedSent', status: PaymentStatus.Sent, labelEn: 'Issued & Sent', labelAr: 'تم إصداره وإرساله' },
    { key: 'issuedNotSent', status: PaymentStatus.Pending, labelEn: 'Issued Not Sent', labelAr: 'تم إصداره ولم يرسل' },
    { key: 'notIssued', status: PaymentStatus.Pending, labelEn: 'Not Issued', labelAr: 'غير مصدر' },
    { key: 'settled', status: PaymentStatus.Paid, labelEn: 'Settled', labelAr: 'مسدد' },
];

interface Row { milestone: Milestone; project: Project; }

const BarList: React.FC<{ items: { label: string; value: number }[]; formatValue: (n: number) => string; barColor?: string }> = ({ items, formatValue, barColor = 'bg-blue-800' }) => {
    const max = Math.max(1, ...items.map(i => i.value));
    return (
        <div className="space-y-2">
            {items.map(i => (
                <div key={i.label} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 truncate text-slate-500 dark:text-slate-400" title={i.label}>{i.label}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-md h-5 relative overflow-hidden">
                        <div className={`${barColor} h-full rounded-md`} style={{ width: `${(i.value / max) * 100}%` }} />
                    </div>
                    <span className="w-16 shrink-0 text-end font-bold text-slate-700 dark:text-slate-200">{formatValue(i.value)}</span>
                </div>
            ))}
        </div>
    );
};

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ allProjects, allMilestones, lookups, language }) => {
    const t = translations[language];
    const now = new Date();
    const asOfLabel = `${now.getMonth() + 1}/${now.getFullYear()}`;

    const [activePaymentButtons, setActivePaymentButtons] = useState<Record<string, boolean>>({});
    const [activeStatuses, setActiveStatuses] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState('');

    const togglePaymentButton = (key: string) => setActivePaymentButtons(prev => ({ ...prev, [key]: !prev[key] }));
    const toggleStatus = (name: string) => setActiveStatuses(prev => ({ ...prev, [name]: !prev[name] }));
    const clearAll = () => { setActivePaymentButtons({}); setActiveStatuses({}); setSearch(''); };
    const anyFilterActive = Object.values(activePaymentButtons).some(Boolean) || Object.values(activeStatuses).some(Boolean) || !!search.trim();

    const projectById = useMemo(() => new Map(allProjects.map(p => [p.id, p])), [allProjects]);

    const baseRows: Row[] = useMemo(() => allMilestones
        .filter(m => m.hasPayment)
        .map(m => ({ milestone: m, project: projectById.get(m.projectId)! }))
        .filter(r => r.project), [allMilestones, projectById]);

    const selectedPaymentStatuses = useMemo(() => {
        const active = PAYMENT_STATUS_BUTTONS.filter(b => activePaymentButtons[b.key]);
        return new Set(active.map(b => b.status));
    }, [activePaymentButtons]);

    const selectedStatusNames = useMemo(() => new Set(Object.keys(activeStatuses).filter(k => activeStatuses[k])), [activeStatuses]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return baseRows.filter(r => {
            if (selectedPaymentStatuses.size > 0 && !selectedPaymentStatuses.has(r.milestone.paymentStatus as PaymentStatus)) return false;
            if (selectedStatusNames.size > 0 && !selectedStatusNames.has(r.project.status?.name || '')) return false;
            if (q && !(r.project.name.toLowerCase().includes(q) || r.project.projectCode?.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [baseRows, selectedPaymentStatuses, selectedStatusNames, search]);

    const projectsInFilter = useMemo(() => new Map(filteredRows.map(r => [r.project.id, r.project])), [filteredRows]);
    const count = projectsInFilter.size;
    const amount = useMemo(() => filteredRows.reduce((s, r) => s + (r.milestone.paymentAmount || 0), 0), [filteredRows]);

    const pmName = (p: Project) => {
        const match = p.description?.match(/\[PM \(unlinked\): (.+?)\]/);
        if (match) return match[1].trim();
        if (p.projectManager?.name) return p.projectManager.name.trim().split(' ')[0];
        return t.unassigned;
    };

    const pmTable = useMemo(() => {
        const groups = new Map<string, { count: number; amount: number; projectIds: Set<string> }>();
        for (const r of filteredRows) {
            const name = pmName(r.project);
            if (!groups.has(name)) groups.set(name, { count: 0, amount: 0, projectIds: new Set() });
            const g = groups.get(name)!;
            g.projectIds.add(r.project.id);
            g.amount += r.milestone.paymentAmount || 0;
        }
        return Array.from(groups.entries()).map(([name, g]) => ({ name, count: g.projectIds.size, amount: g.amount })).sort((a, b) => b.amount - a.amount);
    }, [filteredRows]);

    const projectDetailsTable = useMemo(() => {
        const groups = new Map<string, { project: Project; amount: number }>();
        for (const r of filteredRows) {
            if (!groups.has(r.project.id)) groups.set(r.project.id, { project: r.project, amount: 0 });
            groups.get(r.project.id)!.amount += r.milestone.paymentAmount || 0;
        }
        return Array.from(groups.values()).sort((a, b) => b.amount - a.amount);
    }, [filteredRows]);

    const countPerCountry = useMemo(() => {
        const groups = new Map<string, Set<string>>();
        for (const r of filteredRows) {
            const name = r.project.country?.name?.trim() || t.unassigned;
            if (!groups.has(name)) groups.set(name, new Set());
            groups.get(name)!.add(r.project.id);
        }
        return Array.from(groups.entries()).map(([label, ids]) => ({ label, value: ids.size })).sort((a, b) => b.value - a.value);
    }, [filteredRows]);

    const countPerProduct = useMemo(() => {
        const groups = new Map<string, Set<string>>();
        for (const r of filteredRows) {
            const name = r.project.product?.name?.trim() || t.unassigned;
            if (!groups.has(name)) groups.set(name, new Set());
            groups.get(name)!.add(r.project.id);
        }
        return Array.from(groups.entries()).map(([label, ids]) => ({ label, value: ids.size })).sort((a, b) => b.value - a.value);
    }, [filteredRows]);

    const countPerCategory = useMemo(() => {
        const groups = new Map<string, Set<string>>();
        for (const r of filteredRows) {
            const name = r.project.category?.name?.trim() || t.unassigned;
            if (!groups.has(name)) groups.set(name, new Set());
            groups.get(name)!.add(r.project.id);
        }
        return Array.from(groups.entries()).map(([label, ids]) => ({ label, value: ids.size })).sort((a, b) => b.value - a.value);
    }, [filteredRows]);

    const countPerTeam = useMemo(() => {
        const groups = new Map<string, Set<string>>();
        for (const r of filteredRows) {
            const name = r.project.team?.name?.trim() || t.unassigned;
            if (!groups.has(name)) groups.set(name, new Set());
            groups.get(name)!.add(r.project.id);
        }
        return Array.from(groups.entries()).map(([label, ids]) => ({ label, value: ids.size })).sort((a, b) => b.value - a.value);
    }, [filteredRows]);

    const notIssuedByCountry = useMemo(() => {
        const groups = new Map<string, number>();
        for (const r of filteredRows) {
            if (r.milestone.paymentStatus !== PaymentStatus.Pending) continue;
            const name = r.project.country?.name?.trim() || t.unassigned;
            groups.set(name, (groups.get(name) || 0) + (r.milestone.paymentAmount || 0));
        }
        return Array.from(groups.entries()).map(([label, value]) => ({ label, value })).filter(x => x.value > 0).sort((a, b) => b.value - a.value);
    }, [filteredRows]);

    const monthlyTargets = useMemo(() => {
        const minYear = new Date().getFullYear(); // always current year and onward, never older
        const groups = new Map<string, number>();
        for (const r of filteredRows) {
            if (!r.milestone.dueDate) continue;
            const d = new Date(r.milestone.dueDate);
            if (d.getFullYear() < minYear) continue;
            const key = `${monthNamesShort[language][d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
            const sortKey = d.getFullYear() * 100 + d.getMonth();
            groups.set(`${sortKey}|${key}`, (groups.get(`${sortKey}|${key}`) || 0) + 1);
        }
        return Array.from(groups.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, value]) => ({ label: k.split('|')[1], value }));
    }, [filteredRows, language]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">{t.reportAsOf}</p>
                    <p className="text-lg font-black text-blue-600">{asOfLabel}</p>
                </div>
                {anyFilterActive && (
                    <button onClick={clearAll} className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                        {t.clearFilters}
                    </button>
                )}
            </div>

            {/* Payment status slicer */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.paymentStatus}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PAYMENT_STATUS_BUTTONS.map(b => (
                        <button
                            key={b.key}
                            onClick={() => togglePaymentButton(b.key)}
                            className={`px-4 py-3 rounded-lg text-sm font-bold border-2 ${activePaymentButtons[b.key] ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-900/30 text-blue-800 dark:text-blue-300 border-blue-700/40'}`}
                        >
                            {language === 'ar' ? b.labelAr : b.labelEn}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current status slicer */}
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">{t.currentStatus}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {lookups.projectStatuses.map(s => (
                        <button
                            key={s.id}
                            onClick={() => toggleStatus(s.name)}
                            className={`px-4 py-3 rounded-lg text-sm font-bold border-2 capitalize ${activeStatuses[s.name] ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-900/30 text-blue-800 dark:text-blue-300 border-blue-700/40'}`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI cards + search */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                <div className="flex gap-4">
                    <div className="bg-emerald-600 text-white rounded-2xl px-8 py-5 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-3xl font-black">{count}</span>
                        <span className="text-xs font-medium opacity-90 mt-1">{t.count}</span>
                    </div>
                    <div className="bg-emerald-600 text-white rounded-2xl px-8 py-5 flex flex-col items-center justify-center shadow-lg">
                        <span className="text-3xl font-black">{formatCompact(amount)}</span>
                        <span className="text-xs font-medium opacity-90 mt-1">{t.amount}</span>
                    </div>
                </div>
                <div className="flex-1">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchByProjectDetails} className="w-full h-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200" />
                </div>
            </div>

            {/* PM + Project details tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm text-left rtl:text-right">
                            <thead className="text-xs text-white uppercase bg-blue-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">{t.pm}</th>
                                    <th className="px-4 py-2 text-end">{t.countOfProjects}</th>
                                    <th className="px-4 py-2 text-end">{t.amount}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pmTable.map(row => (
                                    <tr key={row.name} className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{row.name}</td>
                                        <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{row.count}</td>
                                        <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatMoney(row.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-800 text-white font-bold">
                                    <td className="px-4 py-2">{t.total}</td>
                                    <td className="px-4 py-2 text-end">{count}</td>
                                    <td className="px-4 py-2 text-end">{formatMoney(amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm text-left rtl:text-right">
                            <thead className="text-xs text-white uppercase bg-blue-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">{t.project}</th>
                                    <th className="px-4 py-2 text-end">{t.amount}</th>
                                    <th className="px-4 py-2">{t.country}</th>
                                    <th className="px-4 py-2">{t.product}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectDetailsTable.map(row => (
                                    <tr key={row.project.id} className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{row.project.projectCode || row.project.name}</td>
                                        <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatMoney(row.amount)}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{row.project.country?.name || '-'}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{row.project.product?.name || '-'}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-800 text-white font-bold">
                                    <td className="px-4 py-2">{t.total}</td>
                                    <td className="px-4 py-2 text-end">{formatMoney(amount)}</td>
                                    <td className="px-4 py-2" colSpan={2}></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.projectCountPerCountry}</p>
                    <BarList items={countPerCountry} formatValue={n => String(n)} />
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.projectsByProduct}</p>
                    <BarList items={countPerProduct} formatValue={n => String(n)} />
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.byMonthlyTargets}</p>
                    <BarList items={monthlyTargets} formatValue={n => String(n)} />
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.notIssuedByCountry}</p>
                    <BarList items={notIssuedByCountry} formatValue={formatCompact} barColor="bg-red-500" />
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.byCategory}</p>
                    <BarList items={countPerCategory} formatValue={n => String(n)} />
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-3">{t.byTeam}</p>
                    <BarList items={countPerTeam} formatValue={n => String(n)} />
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        reportAsOf: "تقرير الإحصائيات حتى",
        paymentStatus: "حالة الدفع",
        currentStatus: "الحالة الحالية",
        count: "العدد",
        amount: "المبلغ",
        searchByProjectDetails: "ابحث عن تفاصيل المشروع...",
        pm: "مدير المشروع",
        countOfProjects: "عدد المشاريع",
        total: "الإجمالي",
        project: "المشروع",
        country: "الدولة",
        product: "المنتج",
        projectCountPerCountry: "عدد المشاريع حسب الدولة",
        projectsByProduct: "المشاريع حسب المنتج",
        byMonthlyTargets: "حسب المستهدفات الشهرية",
        notIssuedByCountry: "غير مصدر حسب الدولة",
        byCategory: "حسب الفئة",
        byTeam: "حسب الفريق",
        unassigned: "غير معين",
        clearFilters: "إلغاء كل الفلاتر",
    },
    en: {
        reportAsOf: "Statistics report as of",
        paymentStatus: "Payment Status",
        currentStatus: "Current Status",
        count: "Count",
        amount: "Amount",
        searchByProjectDetails: "Search by project details",
        pm: "PM",
        countOfProjects: "Count of projects",
        total: "Total",
        project: "Project",
        country: "Country",
        product: "Product",
        projectCountPerCountry: "Project count per country",
        projectsByProduct: "Projects by Product",
        byMonthlyTargets: "by Monthly Targets",
        notIssuedByCountry: "Not Issued by Country",
        byCategory: "by Category",
        byTeam: "by Team",
        unassigned: "Unassigned",
        clearFilters: "Clear filters",
    }
};

export default StatisticsDashboard;
