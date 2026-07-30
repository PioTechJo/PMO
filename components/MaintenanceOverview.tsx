import React, { useState, useMemo, useEffect } from 'react';
import { MaintenanceContract, Lookup, Language } from '../types';
import SearchableSelect from './SearchableSelect';

interface MaintenanceOverviewProps {
    maintenanceContracts: MaintenanceContract[];
    customers: Lookup[];
    language: Language;
}

const MAINTENANCE_PAGE_SIZE = 12;

const MaintenanceOverview: React.FC<MaintenanceOverviewProps> = ({ maintenanceContracts, customers, language }) => {
    const t = translations[language];

    const [maintenanceSearch, setMaintenanceSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('all');
    const [selectedMaintenanceMonthYear, setSelectedMaintenanceMonthYear] = useState<string[]>(['all']);
    const [maintenanceViewMode, setMaintenanceViewMode] = useState<'card' | 'list'>('card');
    const [maintenancePage, setMaintenancePage] = useState(1);

    const formatCurrency = (val: number) =>
        val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    };

    // Always the current year and onward, never older.
    const minYear = new Date().getFullYear();
    const monthYearOptions = useMemo(() => {
        const uniqueMonthYears = new Set<string>();
        maintenanceContracts.forEach(c => {
            if (c.year && c.month && c.year >= minYear) {
                const key = `${c.year}-${String(c.month).padStart(2, '0')}`;
                uniqueMonthYears.add(key);
            }
        });
        const sortedKeys = Array.from(uniqueMonthYears).sort((a, b) => a.localeCompare(b));
        return [
            { value: 'all', label: t.allTime },
            ...sortedKeys.map(key => {
                const [year, month] = key.split('-').map(Number);
                const label = new Date(year, month - 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
                return { value: key, label };
            })
        ];
    }, [maintenanceContracts, language, t.allTime, minYear]);

    const filteredMaintenance = useMemo(() => {
        const isMaintenanceAllTime = selectedMaintenanceMonthYear.includes('all');
        return maintenanceContracts.filter(c => {
            const matchesTime = isMaintenanceAllTime || selectedMaintenanceMonthYear.includes(`${c.year}-${String(c.month || 1).padStart(2, '0')}`);
            const matchesSearch = !maintenanceSearch.trim() ||
                                (c.projectCode?.toLowerCase().includes(maintenanceSearch.toLowerCase()) ?? false) ||
                                (c.customer?.name.toLowerCase().includes(maintenanceSearch.toLowerCase()) ?? false);
            const matchesCustomer = selectedCustomer === 'all' || c.customerId === selectedCustomer;

            return matchesTime && matchesSearch && matchesCustomer;
        });
    }, [maintenanceContracts, selectedMaintenanceMonthYear, maintenanceSearch, selectedCustomer]);

    useEffect(() => { setMaintenancePage(1); }, [selectedMaintenanceMonthYear, maintenanceSearch, selectedCustomer]);

    const maintenancePageCount = Math.max(1, Math.ceil(filteredMaintenance.length / MAINTENANCE_PAGE_SIZE));
    const paginatedMaintenance = useMemo(() => {
        const start = (maintenancePage - 1) * MAINTENANCE_PAGE_SIZE;
        return filteredMaintenance.slice(start, start + MAINTENANCE_PAGE_SIZE);
    }, [filteredMaintenance, maintenancePage]);

    const maintenanceStats = useMemo(() => {
        const stats: Record<string, { total: number, collected: number, lost: number, count: number }> = {};
        filteredMaintenance.forEach(c => {
            const key = `${c.year}-${String(c.month || 1).padStart(2, '0')}`;
            if (!stats[key]) stats[key] = { total: 0, collected: 0, lost: 0, count: 0 };
            stats[key].total += c.totalAmount || 0;
            stats[key].collected += c.collectedAmount || 0;
            stats[key].lost += c.lostAmount || 0;
            stats[key].count++;
        });
        return Object.entries(stats).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredMaintenance]);

    const maintenanceOverallTotals = useMemo(() => {
        return filteredMaintenance.reduce((acc, c) => ({
            total: acc.total + (c.totalAmount || 0),
            collected: acc.collected + (c.collectedAmount || 0),
            lost: acc.lost + (c.lostAmount || 0)
        }), { total: 0, collected: 0, lost: 0 });
    }, [filteredMaintenance]);

    const topCustomersByValue = useMemo(() => {
        const groups = new Map<string, { customerId: string; name: string; total: number; collected: number; count: number }>();
        for (const c of filteredMaintenance) {
            const key = c.customerId || 'unknown';
            if (!groups.has(key)) groups.set(key, { customerId: key, name: c.customer?.name || t.unassigned, total: 0, collected: 0, count: 0 });
            const g = groups.get(key)!;
            g.total += c.totalAmount || 0;
            g.collected += c.collectedAmount || 0;
            g.count++;
        }
        return Array.from(groups.values()).sort((a, b) => b.total - a.total).slice(0, 10);
    }, [filteredMaintenance]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.maintenanceTitle}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t.maintenanceSubtitle}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-4xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 md:p-10">
                    {/* Filters */}
                    <div className="flex flex-col xl:flex-row items-center gap-3 w-full mb-8">
                        <div className="relative w-full sm:w-48">
                            <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </span>
                            <input
                                type="text"
                                value={maintenanceSearch}
                                onChange={(e) => setMaintenanceSearch(e.target.value)}
                                placeholder={t.searchByCodeOrCustomer}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 rtl:pr-9 rtl:pl-3 text-[10px] font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <SearchableSelect
                                options={[{ value: 'all', label: t.allCustomers }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
                                value={selectedCustomer}
                                onChange={setSelectedCustomer}
                                placeholder={t.customer}
                                language={language}
                            />
                        </div>
                        <div className="w-full sm:w-64">
                            <SearchableSelect
                                isMulti={true}
                                options={monthYearOptions}
                                value={selectedMaintenanceMonthYear}
                                onChange={(val) => {
                                    if (val.length === 0) { setSelectedMaintenanceMonthYear(['all']); return; }
                                    const last = val[val.length - 1];
                                    if (last === 'all') setSelectedMaintenanceMonthYear(['all']);
                                    else setSelectedMaintenanceMonthYear(val.filter((v: string) => v !== 'all'));
                                }}
                                placeholder={t.period}
                                language={language}
                            />
                        </div>
                    </div>

                    {/* Maintenance KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                         <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.totalAmount}</p>
                             <p className="text-xl font-black text-slate-800 dark:text-white">{formatCurrency(maintenanceOverallTotals.total)}</p>
                         </div>
                         <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/50">
                             <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">{t.collected}</p>
                             <p className="text-xl font-black text-emerald-600">{formatCurrency(maintenanceOverallTotals.collected)}</p>
                         </div>
                         <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/50">
                             <p className="text-[10px] font-black text-red-600/70 uppercase tracking-widest mb-1">{t.lost}</p>
                             <p className="text-xl font-black text-red-600">{formatCurrency(maintenanceOverallTotals.lost)}</p>
                         </div>
                    </div>

                    {/* Top 10 Customers by Contract Value */}
                    <div className="mb-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t.topCustomers}</h4>
                        {topCustomersByValue.length === 0 ? (
                            <p className="text-center py-6 text-[10px] font-black text-slate-300 uppercase italic">{t.noData}</p>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left rtl:text-right border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="pb-2 px-4">#</th>
                                            <th className="pb-2 px-4">{t.customer}</th>
                                            <th className="pb-2 px-4">{t.contractsCount}</th>
                                            <th className="pb-2 px-4 text-end">{t.totalAmount}</th>
                                            <th className="pb-2 px-4 text-end font-black text-emerald-500">{t.collected}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topCustomersByValue.map((cust, idx) => (
                                            <tr key={cust.customerId}>
                                                <td className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 rounded-s-2xl font-black text-xs text-indigo-500">{idx + 1}</td>
                                                <td className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 font-bold text-xs text-slate-700 dark:text-slate-200">{cust.name}</td>
                                                <td className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 font-bold text-xs text-slate-600 dark:text-slate-400">{cust.count}</td>
                                                <td className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 text-end font-black text-xs text-slate-800 dark:text-white">{formatCurrency(cust.total)}</td>
                                                <td className="bg-slate-50 dark:bg-slate-800/40 py-3 px-4 rounded-e-2xl text-end font-black text-xs text-emerald-500">{formatCurrency(cust.collected)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left rtl:text-right border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="pb-4 px-4">{t.period}</th>
                                    <th className="pb-4 px-4">{t.contractsCount}</th>
                                    <th className="pb-4 px-4">{t.totalAmount}</th>
                                    <th className="pb-4 px-4 font-black text-emerald-500">{t.collected}</th>
                                    <th className="pb-4 px-4 font-black text-red-500">{t.lost}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maintenanceStats.length > 0 ? maintenanceStats.map(([key, stat]) => {
                                    const [year, month] = key.split('-').map(Number);
                                    const monthLabel = new Date(year, month - 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

                                    return (
                                        <tr key={key} className="group">
                                            <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 rounded-s-2xl font-black text-xs text-slate-700 dark:text-slate-200">{monthLabel}</td>
                                            <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-bold text-xs text-slate-600 dark:text-slate-400">{stat.count}</td>
                                            <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-black text-xs text-slate-800 dark:text-white">{formatCurrency(stat.total)}</td>
                                            <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 font-black text-xs text-emerald-500">{formatCurrency(stat.collected)}</td>
                                            <td className="bg-slate-50 dark:bg-slate-800/40 py-4 px-4 rounded-e-2xl font-black text-xs text-red-500">{formatCurrency(stat.lost)}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">{t.noData}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Detailed Breakdown for the selected period */}
                    <div className="mt-10 border-t border-slate-50 dark:border-slate-800 pt-8">
                        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.detailedBreakdown} ({filteredMaintenance.length})</h4>
                            <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    onClick={() => setMaintenanceViewMode('card')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${maintenanceViewMode === 'card' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.cardView}
                                </button>
                                <button
                                    onClick={() => setMaintenanceViewMode('list')}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${maintenanceViewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.listView}
                                </button>
                            </div>
                        </div>

                        {paginatedMaintenance.length === 0 ? (
                            <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase italic">{t.noData}</p>
                        ) : maintenanceViewMode === 'card' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedMaintenance.map(c => (
                                    <div key={c.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-2 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{c.projectCode || 'No Code'}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{c.year}{c.month ? `-${String(c.month).padStart(2, '0')}` : ''}</span>
                                        </div>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{c.customer?.name || 'Customer'}</p>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">{t.totalAmount}</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">{formatCurrency(c.totalAmount)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-emerald-500 uppercase">{t.collected}</p>
                                                <p className="text-xs font-black text-emerald-500">{formatCurrency(c.collectedAmount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase">{t.startDate}</p>
                                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{formatDate(c.startDate)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-slate-400 uppercase">{t.endDate}</p>
                                                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{formatDate(c.endDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left rtl:text-right border-separate border-spacing-y-1.5">
                                    <thead>
                                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="pb-2 px-4">{t.code}</th>
                                            <th className="pb-2 px-4">{t.customer}</th>
                                            <th className="pb-2 px-4">{t.period}</th>
                                            <th className="pb-2 px-4">{t.startDate}</th>
                                            <th className="pb-2 px-4">{t.endDate}</th>
                                            <th className="pb-2 px-4 text-end">{t.totalAmount}</th>
                                            <th className="pb-2 px-4 text-end font-black text-emerald-500">{t.collected}</th>
                                            <th className="pb-2 px-4 text-end font-black text-red-500">{t.lost}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedMaintenance.map(c => (
                                            <tr key={c.id} className="bg-slate-50 dark:bg-slate-800/40">
                                                <td className="py-2.5 px-4 rounded-s-xl font-black text-[10px] text-indigo-500 uppercase truncate max-w-[220px]">{c.projectCode || 'No Code'}</td>
                                                <td className="py-2.5 px-4 font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{c.customer?.name || 'Customer'}</td>
                                                <td className="py-2.5 px-4 text-[10px] font-bold text-slate-400">{c.year}{c.month ? `-${String(c.month).padStart(2, '0')}` : ''}</td>
                                                <td className="py-2.5 px-4 text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatDate(c.startDate)}</td>
                                                <td className="py-2.5 px-4 text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatDate(c.endDate)}</td>
                                                <td className="py-2.5 px-4 text-end font-black text-xs text-slate-800 dark:text-white">{formatCurrency(c.totalAmount)}</td>
                                                <td className="py-2.5 px-4 text-end font-black text-xs text-emerald-500">{formatCurrency(c.collectedAmount)}</td>
                                                <td className="py-2.5 px-4 rounded-e-xl text-end font-black text-xs text-red-500">{formatCurrency(c.lostAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination controls */}
                        {filteredMaintenance.length > 0 && (
                            <div className="flex items-center justify-between flex-wrap gap-3 mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t.showingRange
                                        .replace('{start}', String((maintenancePage - 1) * MAINTENANCE_PAGE_SIZE + 1))
                                        .replace('{end}', String(Math.min(maintenancePage * MAINTENANCE_PAGE_SIZE, filteredMaintenance.length)))
                                        .replace('{total}', String(filteredMaintenance.length))}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMaintenancePage(p => Math.max(1, p - 1))}
                                        disabled={maintenancePage === 1}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        {t.prev}
                                    </button>
                                    <span className="text-[10px] font-black text-slate-500 px-2">{maintenancePage} / {maintenancePageCount}</span>
                                    <button
                                        onClick={() => setMaintenancePage(p => Math.min(maintenancePageCount, p + 1))}
                                        disabled={maintenancePage === maintenancePageCount}
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        {t.next}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        maintenanceTitle: "تحليل عقود الصيانة",
        maintenanceSubtitle: "نظرة شاملة على التحصيل والمبالغ المفقودة",
        allTime: "كل الأوقات", period: "الفترة", contractsCount: "عدد العقود",
        totalAmount: "القيمة المالية الإجمالية", collected: "إجمالي المحصل", lost: "المبالغ المفقودة",
        detailedBreakdown: "تفاصيل العقود حسب الكود والمرجع", searchByCodeOrCustomer: "بحث بالكود أو العميل...",
        allCustomers: "كل العملاء", customer: "العميل",
        cardView: "بطاقات", listView: "قائمة", code: "الكود",
        showingRange: "عرض {start}-{end} من {total}", prev: "السابق", next: "التالي",
        startDate: "تاريخ البداية", endDate: "تاريخ الانتهاء", noData: "لا توجد بيانات",
        topCustomers: "أعلى 10 عملاء من ناحية القيمة", unassigned: "غير معروف",
    },
    en: {
        maintenanceTitle: "Maintenance Contracts Analysis",
        maintenanceSubtitle: "A complete overview of collections and lost amounts",
        allTime: "All Time", period: "Period", contractsCount: "Contracts",
        totalAmount: "Total Financial Value", collected: "Total Collected", lost: "Lost Amount",
        detailedBreakdown: "Detailed Breakdown by Code", searchByCodeOrCustomer: "Search code or customer...",
        allCustomers: "All Customers", customer: "Customer",
        cardView: "Cards", listView: "List", code: "Code",
        showingRange: "Showing {start}-{end} of {total}", prev: "Prev", next: "Next",
        startDate: "Start Date", endDate: "End Date", noData: "No data",
        topCustomers: "Top 10 Customers by Value", unassigned: "Unassigned",
    }
};

export default MaintenanceOverview;
