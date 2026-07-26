import React, { useState, useMemo, useEffect } from 'react';
import { Project, Milestone, User, Language, PaymentStatus } from '../types';

interface PaymentsTargetsDashboardProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    allProjectManagers: User[];
    language: Language;
}

const monthNamesShort = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const formatCurrency = (n: number, language: Language) =>
    n.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const formatCompact = (n: number) => {
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
};

interface Row {
    milestone: Milestone;
    project: Project;
}

const PaymentsTargetsDashboard: React.FC<PaymentsTargetsDashboardProps> = ({ allProjects, allMilestones, allProjectManagers, language }) => {
    const t = translations[language];
    const projectById = useMemo(() => new Map(allProjects.map(p => [p.id, p])), [allProjects]);

    // Always show the current year and onward — never earlier years, regardless of what year it is.
    const MIN_YEAR = new Date().getFullYear();

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        allMilestones.forEach(m => { if (m.dueDate) years.add(new Date(m.dueDate).getFullYear()); });
        const now = new Date().getFullYear();
        years.add(now);
        return Array.from(years).filter(y => y >= MIN_YEAR).sort((a, b) => a - b);
    }, [allMilestones]);

    const [selectedYear, setSelectedYear] = useState<number>(() => Math.max(new Date().getFullYear(), MIN_YEAR));
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedNotIssued, setCollapsedNotIssued] = useState(false);
    const [collapsedIssuedSettled, setCollapsedIssuedSettled] = useState(false);
    const [expandedPMs, setExpandedPMs] = useState<Record<string, boolean>>({});
    const [selectedDetailProjectCode, setSelectedDetailProjectCode] = useState<string | null>(null);
    const detailedMilestonesRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => { setSelectedDetailProjectCode(null); }, [selectedYear, selectedMonth, selectedManagerId, searchTerm]);

    const paidMilestones: Row[] = useMemo(() => {
        return allMilestones
            .filter(m => m.hasPayment)
            .map(m => ({ milestone: m, project: projectById.get(m.projectId)! }))
            .filter(r => r.project);
    }, [allMilestones, projectById]);

    const searchFiltered = useMemo(() => {
        if (!searchTerm.trim()) return paidMilestones;
        const q = searchTerm.trim().toLowerCase();
        return paidMilestones.filter(r => r.project.name.toLowerCase().includes(q) || r.project.projectCode?.toLowerCase().includes(q));
    }, [paidMilestones, searchTerm]);

    const pmFiltered = useMemo(() => {
        if (selectedManagerId === 'all') return searchFiltered;
        return searchFiltered.filter(r => r.project.projectManagerId === selectedManagerId);
    }, [searchFiltered, selectedManagerId]);

    const isInSelectedMonth = (m: Milestone) => {
        if (!m.dueDate) return false;
        const d = new Date(m.dueDate);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    };

    const monthRows = useMemo(() => pmFiltered.filter(r => isInSelectedMonth(r.milestone)), [pmFiltered, selectedYear, selectedMonth]);

    const notIssuedMonthRows = useMemo(() => monthRows.filter(r => r.milestone.paymentStatus === PaymentStatus.Pending), [monthRows]);
    const issuedSentMonthRows = useMemo(() => monthRows.filter(r => r.milestone.paymentStatus === PaymentStatus.Sent), [monthRows]);
    const settledMonthRows = useMemo(() => monthRows.filter(r => r.milestone.paymentStatus === PaymentStatus.Paid), [monthRows]);

    const sum = (rows: Row[]) => rows.reduce((s, r) => s + (r.milestone.paymentAmount || 0), 0);

    const amountNotIssued = sum(notIssuedMonthRows);
    const notIssuedRunning = sum(notIssuedMonthRows.filter(r => r.project.status?.name === 'Running'));
    const notIssuedOnHoldAllTime = useMemo(() => sum(pmFiltered.filter(r => r.milestone.paymentStatus === PaymentStatus.Pending && r.project.status?.name === 'on-hold')), [pmFiltered]);
    const runningNaDatesAllTime = useMemo(() => sum(pmFiltered.filter(r => r.milestone.paymentStatus === PaymentStatus.Pending && !r.milestone.dueDate && r.project.status?.name === 'Running')), [pmFiltered]);
    const issuedSentAmount = sum(issuedSentMonthRows);
    const settledAmount = sum(settledMonthRows);
    const grandTotal = amountNotIssued + issuedSentAmount + settledAmount;

    const kpiCards = [
        { label: t.amountNotIssued, value: amountNotIssued, color: 'bg-blue-600' },
        { label: t.notIssuedRunning, value: notIssuedRunning, color: 'bg-blue-600' },
        { label: t.notIssuedOnHold, value: notIssuedOnHoldAllTime, color: 'bg-orange-500' },
        { label: t.runningNaDates, value: runningNaDatesAllTime, color: 'bg-orange-500' },
        { label: t.issuedAndSent, value: issuedSentAmount, color: 'bg-emerald-500' },
        { label: t.amountSettled, value: settledAmount, color: 'bg-emerald-700' },
    ];

    const monthLabel = `${selectedMonth + 1}/${selectedYear}`;

    const groupByPM = (rows: Row[]) => {
        const groups = new Map<string, Row[]>();
        for (const r of rows) {
            const pmName = r.project.projectManager?.name || t.unassigned;
            if (!groups.has(pmName)) groups.set(pmName, []);
            groups.get(pmName)!.push(r);
        }
        return Array.from(groups.entries()).map(([pmName, rows]) => ({
            pmName,
            total: sum(rows),
            projects: Array.from(new Map(rows.map(r => [r.project.id, r])).values()).map(r => ({
                code: r.project.projectCode || r.project.name,
                total: sum(rows.filter(rr => rr.project.id === r.project.id)),
            })),
        })).sort((a, b) => b.total - a.total);
    };

    const notIssuedGroups = useMemo(() => groupByPM(notIssuedMonthRows), [notIssuedMonthRows]);
    const issuedSettledGroups = useMemo(() => groupByPM([...issuedSentMonthRows, ...settledMonthRows]), [issuedSentMonthRows, settledMonthRows]);

    const allDetailedRows = useMemo(() => [...notIssuedMonthRows, ...issuedSentMonthRows, ...settledMonthRows]
        .sort((a, b) => (a.milestone.dueDate || '').localeCompare(b.milestone.dueDate || '')), [notIssuedMonthRows, issuedSentMonthRows, settledMonthRows]);

    const detailedRows = useMemo(() => {
        if (!selectedDetailProjectCode) return allDetailedRows;
        return allDetailedRows.filter(r => (r.project.projectCode || r.project.name) === selectedDetailProjectCode);
    }, [allDetailedRows, selectedDetailProjectCode]);

    const handleProjectClick = (code: string) => {
        setSelectedDetailProjectCode(code);
        detailedMilestonesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const paymentStatusLabel = (status: PaymentStatus | null) => {
        if (status === PaymentStatus.Pending) return t.notIssued;
        if (status === PaymentStatus.Sent) return t.issuedSent;
        if (status === PaymentStatus.Paid) return t.settled;
        return '-';
    };

    const togglePM = (key: string) => setExpandedPMs(prev => ({ ...prev, [key]: !prev[key] }));

    const TreeTable: React.FC<{ title: string; groups: ReturnType<typeof groupByPM>; collapsed: boolean; onToggleCollapse: () => void; keyPrefix: string; onProjectClick?: (code: string) => void }> = ({ title, groups, collapsed, onToggleCollapse, keyPrefix, onProjectClick }) => {
        const total = groups.reduce((s, g) => s + g.total, 0);
        return (
            <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden">
                <button onClick={onToggleCollapse} className="w-full flex items-center justify-between px-5 py-3 bg-slate-800 dark:bg-slate-800 text-white font-bold text-sm">
                    <span>{title}</span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {!collapsed && (
                    <div className="max-h-80 overflow-y-auto">
                        <table className="w-full text-sm text-left rtl:text-right">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">{t.projectManager}</th>
                                    <th className="px-4 py-2 text-end">{monthLabel}</th>
                                    <th className="px-4 py-2 text-end">{t.total}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(g => {
                                    const key = `${keyPrefix}-${g.pmName}`;
                                    const isOpen = !!expandedPMs[key];
                                    return (
                                        <React.Fragment key={key}>
                                            <tr className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => togglePM(key)}>
                                                <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                    <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M9 5l7 7-7 7" /></svg>
                                                    {g.pmName}
                                                </td>
                                                <td className="px-4 py-2 text-end font-bold text-slate-700 dark:text-slate-200">{formatCurrency(g.total, language)}</td>
                                                <td className="px-4 py-2 text-end font-bold text-slate-700 dark:text-slate-200">{formatCurrency(g.total, language)}</td>
                                            </tr>
                                            {isOpen && g.projects.map(p => (
                                                <tr
                                                    key={p.code}
                                                    onClick={onProjectClick ? (e) => { e.stopPropagation(); onProjectClick(p.code); } : undefined}
                                                    className={`border-t border-slate-50 dark:border-slate-800/50 ${onProjectClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''} ${selectedDetailProjectCode === p.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                >
                                                    <td className="px-4 py-2 ps-10 text-slate-500 dark:text-slate-400">{p.code}</td>
                                                    <td className="px-4 py-2 text-end text-slate-500 dark:text-slate-400">{formatCurrency(p.total, language)}</td>
                                                    <td className="px-4 py-2 text-end text-slate-500 dark:text-slate-400">{formatCurrency(p.total, language)}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-800 text-white font-bold">
                                    <td className="px-4 py-2">{t.total}</td>
                                    <td className="px-4 py-2 text-end">{formatCurrency(total, language)}</td>
                                    <td className="px-4 py-2 text-end">{formatCurrency(total, language)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Year / Month filters */}
            <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl space-y-4">
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.year}</p>
                    <div className="flex gap-2 flex-wrap">
                        {availableYears.map(y => (
                            <button key={y} onClick={() => setSelectedYear(y)} className={`px-4 py-2 rounded-lg text-sm font-bold border ${selectedYear === y ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{y}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{t.month}</p>
                    <div className="flex gap-2 flex-wrap">
                        {monthNamesShort[language].map((m, idx) => (
                            <button key={m} onClick={() => setSelectedMonth(idx)} className={`px-3 py-2 rounded-lg text-sm font-bold border min-w-[56px] ${selectedMonth === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{m}</button>
                        ))}
                    </div>
                </div>
                <p className="text-sm text-slate-400">{t.summaryAsOf} <span className="font-bold text-slate-700 dark:text-slate-200">{monthLabel}</span></p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {kpiCards.map((c, idx) => (
                    <div key={idx} className={`${c.color} text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-lg`}>
                        <span className="text-xl font-black">{formatCompact(c.value)}</span>
                        <span className="text-[11px] font-medium opacity-90 mt-1">{c.label}</span>
                    </div>
                ))}
            </div>

            {/* PM + search filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">{t.projectManager}</label>
                    <select value={selectedManagerId} onChange={e => setSelectedManagerId(e.target.value)} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                        <option value="all">{t.all}</option>
                        {allProjectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                    </select>
                </div>
                <div className="w-full md:flex-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">{t.searchByProject}</label>
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.searchByProject} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200" />
                </div>
            </div>

            {/* Bar charts (single-month bar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">{t.monthlyTargetsNotIssued}</p>
                    <div className="h-40 flex items-end justify-center">
                        <div className="w-24 bg-red-400 rounded-t-md flex items-start justify-center pt-1" style={{ height: `${amountNotIssued > 0 ? 100 : 4}%` }}>
                            <span className="text-xs font-bold text-white">{formatCompact(amountNotIssued)}</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">{monthLabel}</p>
                </div>
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">{t.monthlyTargetsIssuedSettled}</p>
                    <div className="h-40 flex items-end justify-center">
                        <div className="w-24 bg-emerald-500 rounded-t-md flex items-start justify-center pt-1" style={{ height: `${(issuedSentAmount + settledAmount) > 0 ? 100 : 4}%` }}>
                            <span className="text-xs font-bold text-white">{formatCompact(issuedSentAmount + settledAmount)}</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2">{monthLabel}</p>
                </div>
            </div>

            {/* Tree tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TreeTable title={t.notIssuedOnly} groups={notIssuedGroups} collapsed={collapsedNotIssued} onToggleCollapse={() => setCollapsedNotIssued(v => !v)} keyPrefix="ni" onProjectClick={handleProjectClick} />
                <TreeTable title={t.issuedSentSettled} groups={issuedSettledGroups} collapsed={collapsedIssuedSettled} onToggleCollapse={() => setCollapsedIssuedSettled(v => !v)} keyPrefix="is" />
            </div>

            {/* Detailed Milestones */}
            <div ref={detailedMilestonesRef} className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden scroll-mt-6">
                <div className="px-5 py-3 bg-slate-800 text-white font-bold text-sm flex items-center justify-between gap-3">
                    <span>{t.detailedMilestones}{selectedDetailProjectCode ? ` — ${selectedDetailProjectCode}` : ''}</span>
                    {selectedDetailProjectCode && (
                        <button onClick={() => setSelectedDetailProjectCode(null)} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md">
                            {t.clearFilter}
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">{t.projectCode}</th>
                                <th className="px-4 py-2 text-end">{t.paymentAmount}</th>
                                <th className="px-4 py-2">{t.milestoneName}</th>
                                <th className="px-4 py-2">{t.projectManager}</th>
                                <th className="px-4 py-2">{t.milestoneDate}</th>
                                <th className="px-4 py-2">{t.paymentStatus}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detailedRows.map(r => (
                                <tr key={r.milestone.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{r.project.projectCode || r.project.name}</td>
                                    <td className="px-4 py-2 text-end text-slate-600 dark:text-slate-300">{formatCurrency(r.milestone.paymentAmount, language)}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.milestone.title}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.project.projectManager?.name || '-'}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.milestone.dueDate ? `${monthNamesShort[language][new Date(r.milestone.dueDate).getMonth()]}/${new Date(r.milestone.dueDate).getFullYear()}` : '-'}</td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{paymentStatusLabel(r.milestone.paymentStatus)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-800 text-white font-bold">
                                <td className="px-4 py-2">{t.total}</td>
                                <td className="px-4 py-2 text-end">{formatCurrency(grandTotal, language)}</td>
                                <td className="px-4 py-2" colSpan={4}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        title: "لوحة المتابعة",
        subtitle: "متابعة المستهدفات الشهرية وحالة الدفعات (على غرار تقرير Power BI).",
        year: "السنة",
        month: "الشهر",
        summaryAsOf: "ملخص التقارير حتى",
        amountNotIssued: "مبلغ غير مصدر",
        notIssuedRunning: "غير مصدر - قيد التنفيذ",
        notIssuedOnHold: "غير مصدر - متوقف",
        runningNaDates: "قيد التنفيذ بلا تاريخ - غير مصدر",
        issuedAndSent: "تم إصداره وإرساله",
        amountSettled: "مبلغ مسدد",
        projectManager: "مدير المشروع",
        all: "الكل",
        searchByProject: "ابحث عن مشروع...",
        monthlyTargetsNotIssued: "المستهدفات الشهرية - غير مصدرة",
        monthlyTargetsIssuedSettled: "المستهدفات الشهرية - تم إصدارها وإرسالها وتسويتها",
        notIssuedOnly: "غير مصدرة فقط",
        issuedSentSettled: "تم إصدارها وإرسالها وتسويتها",
        total: "الإجمالي",
        detailedMilestones: "تفاصيل المعالم",
        projectCode: "كود المشروع",
        paymentAmount: "مبلغ الدفعة",
        milestoneName: "اسم المعلم",
        milestoneDate: "تاريخ المعلم",
        paymentStatus: "حالة الدفع",
        notIssued: "غير مصدر",
        issuedSent: "تم إصداره وإرساله",
        settled: "مسدد",
        unassigned: "غير معين",
        clearFilter: "إلغاء الفلتر",
    },
    en: {
        title: "Dashboard",
        subtitle: "Monthly payment targets & status tracking (mirrors the Power BI report).",
        year: "Year",
        month: "Month",
        summaryAsOf: "Summary reports as of",
        amountNotIssued: "Amount Not Issued",
        notIssuedRunning: "Not issued - Running",
        notIssuedOnHold: "Not Issued - On Hold",
        runningNaDates: "Running NA Dates - Not issued",
        issuedAndSent: "Issued and sent",
        amountSettled: "Amount Settled",
        projectManager: "Project Manager",
        all: "All",
        searchByProject: "Search by project",
        monthlyTargetsNotIssued: "Monthly Targets - Not issued",
        monthlyTargetsIssuedSettled: "Monthly Targets - Issued & Sent and Settled",
        notIssuedOnly: "Not issued only",
        issuedSentSettled: "Issued and sent & Settled",
        total: "Total",
        detailedMilestones: "Detailed Milestones",
        projectCode: "Project Code",
        paymentAmount: "Payment Amount",
        milestoneName: "Milestone Name",
        milestoneDate: "Milestone Date",
        paymentStatus: "Payment Status",
        notIssued: "Not Issued",
        issuedSent: "Issued & Sent",
        settled: "Settled",
        unassigned: "Unassigned",
        clearFilter: "Clear filter",
    }
};

export default PaymentsTargetsDashboard;
