
import React, { useMemo, useState } from 'react';
import { Project, Milestone, Lookup, Language, User } from '../types';
import SearchableSelect from './SearchableSelect';

interface KPIDashboardProps {
    projects: Project[];
    milestones: Milestone[];
    teams: Lookup[];
    projectManagers: User[];
    customers: Lookup[];
    countries: Lookup[];
    language: Language;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ projects, teams, projectManagers, countries, language }) => {
    const t = translations[language];
    const [selectedManager, setSelectedManager] = useState('all');
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [metricType, setMetricType] = useState<'count' | 'amount'>('count');
    const [region, setRegion] = useState('ALL');

    const regions = ['ALL', 'Levant', 'GCC', 'N. Africa', 'E. Africa'];

    const countryOptions = useMemo(() => [
        { value: 'all', label: t.selectCountry },
        ...countries.map(c => ({ value: c.id, label: c.name }))
    ], [countries, t.selectCountry]);

    const managerOptions = useMemo(() => [
        { value: 'all', label: t.selectProjectManager },
        ...projectManagers.map(m => ({ value: m.id, label: m.name }))
    ], [projectManagers, t.selectProjectManager]);

    // Mock Data for Viz
    const donutDataInitiation = [
        { label: '2025', value: 516, color: 'text-blue-500', pct: 34.6 },
        { label: '2024', value: 838, color: 'text-indigo-600', pct: 56.2 },
        { label: 'Before', value: 137, color: 'text-indigo-400', pct: 9.2 },
    ];

    const industryData = [
        { label: 'Banking', value: 99, pct: 99.9 },
        { label: 'Financial Services', value: 99, pct: 99.9 },
        { label: 'Payments Hubs', value: 99, pct: 99.9 },
        { label: 'Telcom Services', value: 99, pct: 99.9 },
        { label: 'Other Industries', value: 99, pct: 99.9 },
    ];

    const teamData = {
        implementers: [
            { name: 'QRI Team', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'JDL Team', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'BKR Team', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'KNY Team', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
        ],
        supporters: [
            { name: 'DBA Unit', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'BI Unit', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'RPA Unit', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
            { name: 'DS Unit', count1: 99, count2: 99, count3: 99, val: '9,999', pct: '99.9%' },
        ]
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className="text-center text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">{title}</h3>
    );

    const DonutChart = ({ data, total }: { data: any[], total: number }) => (
        <div className="relative flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-[14px] border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="50%" cy="50%" r="43%" fill="transparent" stroke="currentColor" strokeWidth="14" className="text-indigo-600" strokeDasharray="100 100" strokeDashoffset="0" />
                    <circle cx="50%" cy="50%" r="43%" fill="transparent" stroke="currentColor" strokeWidth="14" className="text-blue-500" strokeDasharray="34 100" strokeDashoffset="0" />
                    <circle cx="50%" cy="50%" r="43%" fill="transparent" stroke="currentColor" strokeWidth="14" className="text-indigo-400" strokeDasharray="10 100" strokeDashoffset="-90" />
                </svg>
                <div className="text-center z-10 bg-white dark:bg-slate-900 rounded-full w-20 h-20 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{t.total}</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white leading-none">{total.toLocaleString()}</span>
                </div>
            </div>
            <div className="mt-4 w-full space-y-1">
                {data.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] font-medium">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-current ${item.color}`}></span>
                            <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                        </div>
                        <span className="text-slate-800 dark:text-white font-bold">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6" dir="ltr">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {regions.map(r => (
                        <button 
                            key={r} 
                            onClick={() => setRegion(r)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${region === r ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {r}
                        </button>
                    ))}
                    <div className="w-48 ml-2">
                        <SearchableSelect options={countryOptions} value={selectedCountry} onChange={setSelectedCountry} placeholder={t.selectCountry} language={language} />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setMetricType('count')} className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${metricType === 'count' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>{t.count}</button>
                        <button onClick={() => setMetricType('amount')} className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${metricType === 'amount' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>{t.amount} ($ 000)</button>
                    </div>
                    <div className="w-56">
                        <SearchableSelect options={managerOptions} value={selectedManager} onChange={setSelectedManager} placeholder={t.selectProjectManager} language={language} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 grid grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <SectionHeader title="Projects By Initiation Year" />
                        <DonutChart data={donutDataInitiation} total={1491} />
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <SectionHeader title="Projects By Client Class" />
                        <DonutChart data={[{label:'ST01', value: 292, color:'text-indigo-800', pct: 22.2}, {label:'ST02', value: 682, color:'text-indigo-600', pct: 52.0}, {label:'NR01', value: 213, color:'text-indigo-400', pct: 16.3}, {label:'NR02', value: 124, color:'text-indigo-200', pct: 9.5}]} total={1491} />
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <SectionHeader title="Projects By Product Type" />
                        <div className="space-y-3">
                            {['DWH', 'BI Prod', 'BPM Prod', 'Debt Mng', 'Compliance', 'Financial'].map((prod, i) => (
                                <div key={prod} className="flex items-center gap-3">
                                    <span className="w-20 text-[10px] text-slate-500 text-right">{prod}</span>
                                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${[9, 22, 17, 6, 16, 8][i] * 4}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{[9, 22, 17, 6, 16, 8][i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <SectionHeader title="Projects By Service Type" />
                        <div className="space-y-3">
                            {['Data Migrate', 'BI Services', 'AI Services', 'RPA Services', 'Licenses', 'Others'].map((serv, i) => (
                                <div key={serv} className="flex items-center gap-3">
                                    <span className="w-20 text-[10px] text-slate-500 text-right">{serv}</span>
                                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${[9, 22, 17, 6, 16, 8][i] * 4}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{[9, 22, 17, 6, 16, 8][i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 h-full flex flex-col">
                        <SectionHeader title="Projects Performance Insights" />
                        <div className="flex-1 flex flex-col gap-8 justify-around">
                            <div>
                                <p className="text-[9px] text-slate-400 font-bold mb-2 uppercase text-center">Projects Status</p>
                                <div className="flex items-end justify-between gap-1 h-24">
                                    {[28, 3, 7, 16, 5].map((v, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-bold text-indigo-600">{v}</span>
                                            <div className={`w-full rounded-t-sm ${['bg-indigo-800', 'bg-indigo-300', 'bg-orange-400', 'bg-green-500', 'bg-red-400'][i]}`} style={{ height: `${v * 3}px` }}></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-400 mt-1">
                                    <span>Run</span><span>Pau</span><span>Hold</span><span>Clos</span><span>Can</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-400 font-bold mb-2 uppercase text-center">Progress % (Running)</p>
                                <div className="flex items-end justify-between gap-2 h-24">
                                    {[[23,2], [44,8], [38,5], [26,11]].map((pair, i) => (
                                        <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                                            <div className="flex-1 bg-indigo-900 rounded-t-sm" style={{ height: `${pair[0]}%` }}></div>
                                            <div className="flex-1 bg-red-500 rounded-t-sm" style={{ height: `${pair[1]}%` }}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 h-full">
                        <SectionHeader title="Projects By Industry" />
                        <div className="space-y-6 flex flex-col items-center">
                            {industryData.map((ind, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="w-14 h-14 rounded-full border-4 border-indigo-600 flex items-center justify-center relative mb-1">
                                        <span className="text-[10px] font-bold text-slate-800 dark:text-white">{ind.pct}%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold text-center">{ind.label}</p>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ind.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <SectionHeader title="Allocated Teams Workload Insights" />
                    <div className="flex items-center gap-8 justify-between">
                        <div className="flex-1 relative border-r border-slate-100 dark:border-slate-800 pr-8">
                             <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 -ml-12 text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase">Implementers</div>
                             <div className="space-y-3">
                                {teamData.implementers.map((team, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors">
                                        <span className="w-16 font-bold text-slate-700 dark:text-slate-300">{team.name}</span>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <span className="flex items-center gap-1">👤 {team.count1}</span>
                                            <span className="flex items-center gap-1">📄 {team.count2}</span>
                                            <span className="flex items-center gap-1">🏢 {team.count3}</span>
                                            <span className="flex items-center gap-1 text-indigo-500">💎 {team.val}</span>
                                            <span className="text-indigo-600 font-bold ml-2">🕒 {team.pct}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="flex flex-col items-center justify-center text-indigo-400">
                             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                             <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                        </div>

                        <div className="flex-1 relative border-l border-slate-100 dark:border-slate-800 pl-8">
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 -mr-12 text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase">Supporters</div>
                             <div className="space-y-3">
                                {teamData.supporters.map((team, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1.5 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <span className="flex items-center gap-1">👤 {team.count1}</span>
                                            <span className="flex items-center gap-1">📄 {team.count2}</span>
                                            <span className="flex items-center gap-1">🏢 {team.count3}</span>
                                            <span className="flex items-center gap-1 text-indigo-500">💎 {team.val}</span>
                                            <span className="text-indigo-600 font-bold mr-2">🕒 {team.pct}</span>
                                        </div>
                                        <span className="w-16 font-bold text-slate-700 dark:text-slate-300 text-right">{team.name}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <SectionHeader title="Running Projects By Implementation Time-Frame" />
                    <div className="flex items-end justify-between gap-4 h-40 pt-4">
                        {[23, 36, 17, 14, 6].map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600">{v}</span>
                                <div className="w-full max-w-[40px] bg-indigo-900 rounded-t-md transition-all hover:bg-indigo-700" style={{ height: `${v * 2.5}px` }}></div>
                                <span className="text-[9px] text-slate-400 whitespace-nowrap">{['1-3 Months', '4-6 Months', '7-9 Months', '10-12 Months', '13+ Months'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        total: "الإجمالي",
        selectCountry: "اختر الدولة",
        selectProjectManager: "اختر مدير المشروع",
        count: "العدد",
        amount: "المبلغ",
    },
    en: {
        total: "TOTAL",
        selectCountry: "Select Country",
        selectProjectManager: "Select Project Manager",
        count: "Count",
        amount: "Amount",
    }
};

export default KPIDashboard;
