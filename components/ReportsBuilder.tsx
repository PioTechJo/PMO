
import React, { useState, useMemo } from 'react';
import { Project, Milestone, Language, Lookup, Issue, User } from '../types';

interface Field {
    id: string;
    label: string;
    category: 'Project' | 'Milestone' | 'Issue' | 'User';
    accessor: (proj?: Project, mile?: Milestone, issue?: Issue, user?: User) => string | number | null;
}

interface ReportsBuilderProps {
    projects: Project[];
    milestones: Milestone[];
    issues: Issue[];
    users: User[];
    teams: Lookup[];
    language: Language;
}

type AggMeasure = 'count' | 'sum' | 'avg';

const ReportsBuilder: React.FC<ReportsBuilderProps> = ({ projects, milestones, issues, users, teams, language }) => {
    const [selectedFields, setSelectedFields] = useState<Field[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowFilters, setRowFilters] = useState<Record<string, string>>({});
    const [isAggregationMode, setIsAggregationMode] = useState(false);
    const [groupByFieldId, setGroupByFieldId] = useState<string>('proj_customer');
    const [aggMeasure, setAggMeasure] = useState<AggMeasure>('count');

    const t = translations[language];

    const AVAILABLE_FIELDS: Field[] = useMemo(() => [
        { id: 'proj_name', label: language === 'ar' ? 'اسم المشروع' : 'Project Name', category: 'Project', accessor: (p) => p?.name || '--' },
        { id: 'proj_code', label: language === 'ar' ? 'كود المشروع' : 'Project Code', category: 'Project', accessor: (p) => p?.projectCode || '--' },
        { id: 'proj_pm', label: language === 'ar' ? 'مدير المشروع' : 'Project Manager', category: 'Project', accessor: (p) => p?.projectManager?.name || '--' },
        { id: 'proj_customer', label: language === 'ar' ? 'العميل' : 'Customer', category: 'Project', accessor: (p) => p?.customer?.name || '--' },
        { id: 'proj_status', label: language === 'ar' ? 'حالة المشروع' : 'Project Status', category: 'Project', accessor: (p) => p?.status?.name || '--' },
        { id: 'proj_progress', label: language === 'ar' ? 'نسبة التقدم' : 'Progress', category: 'Project', accessor: (p) => p ? `${p.progress}%` : '--' },
        
        { id: 'mile_title', label: language === 'ar' ? 'عنوان المعلم' : 'Milestone Title', category: 'Milestone', accessor: (_p, m) => m?.title || '--' },
        { id: 'mile_status', label: language === 'ar' ? 'حالة المعلم' : 'Milestone Status', category: 'Milestone', accessor: (_p, m) => m?.status || '--' },
        { id: 'mile_amount', label: language === 'ar' ? 'قيمة الدفعة' : 'Milestone Value', category: 'Milestone', accessor: (_p, m) => m?.hasPayment ? m.paymentAmount : 0 },
        
        { id: 'issue_title', label: language === 'ar' ? 'عنوان المشكلة' : 'Issue Title', category: 'Issue', accessor: (_p, _m, i) => i?.title || '--' },
        { id: 'issue_status', label: language === 'ar' ? 'حالة المشكلة' : 'Issue Status', category: 'Issue', accessor: (_p, _m, i) => i?.status || '--' },
        { id: 'issue_priority', label: language === 'ar' ? 'الأولوية' : 'Priority', category: 'Issue', accessor: (_p, _m, i) => i?.priority || '--' },
        { id: 'issue_assignee', label: language === 'ar' ? 'المسؤول عن الحل' : 'Assigned Agent', category: 'Issue', accessor: (_p, _m, i) => i?.assignee?.name || '--' },

        { id: 'user_name', label: language === 'ar' ? 'اسم الموظف' : 'User Name', category: 'User', accessor: (_p, _m, _i, u) => u?.name || '--' },
        { id: 'user_role', label: language === 'ar' ? 'الدور الوظيفي' : 'Role', category: 'User', accessor: (_p, _m, _i, u) => u?.type || '--' },

        { 
            id: 'team_name', 
            label: language === 'ar' ? 'الفريق' : 'Team', 
            category: 'Milestone', 
            accessor: (p, m) => {
                const teamId = m?.teamId || p?.teamId;
                return teams.find(t => t.id === teamId)?.name || '--';
            }
        },
        { id: 'proj_country', label: language === 'ar' ? 'الدولة' : 'Country', category: 'Project', accessor: (p) => p?.country?.name || '--' },
    ], [teams, language]);

    const handleAddField = (field: Field) => {
        if (!selectedFields.find(f => f.id === field.id)) {
            setSelectedFields([...selectedFields, field]);
        }
    };

    const removeField = (fieldId: string) => {
        setSelectedFields(selectedFields.filter(f => f.id !== fieldId));
    };

    // المحرك الموحد للبيانات
    const processedReport = useMemo(() => {
        if (selectedFields.length === 0) return { detailedRows: [], aggRows: [] };

        const categories = new Set(selectedFields.map(f => f.category));
        let baseRows: any[] = [];

        // 1. توليد الصفوف التفصيلية بناءً على المصدر الأكثر تخصيصاً
        if (categories.has('Issue')) {
            issues.forEach(i => {
                const row: any = {};
                const proj = projects.find(p => p.id === i.projectId);
                const user = users.find(u => u.id === i.assigneeId);
                const mile = milestones.find(m => m.id === i.milestoneId);
                AVAILABLE_FIELDS.forEach(f => { row[f.id] = f.accessor(proj, mile, i, user); });
                baseRows.push(row);
            });
        } else if (categories.has('Milestone')) {
            milestones.forEach(m => {
                const row: any = {};
                const proj = projects.find(p => p.id === m.projectId);
                AVAILABLE_FIELDS.forEach(f => { row[f.id] = f.accessor(proj, m, undefined, undefined); });
                baseRows.push(row);
            });
        } else if (categories.has('Project')) {
            projects.forEach(p => {
                const row: any = {};
                const user = users.find(u => u.id === p.projectManagerId);
                AVAILABLE_FIELDS.forEach(f => { row[f.id] = f.accessor(p, undefined, undefined, user); });
                baseRows.push(row);
            });
        } else if (categories.has('User')) {
            users.forEach(u => {
                const row: any = {};
                AVAILABLE_FIELDS.forEach(f => { row[f.id] = f.accessor(undefined, undefined, undefined, u); });
                baseRows.push(row);
            });
        }

        // 2. تطبيق فلاتر الأعمدة (Row Filters)
        const filteredDetailedRows = baseRows.filter(row => {
            return Object.entries(rowFilters).every(([fieldId, filterValue]) => {
                if (!filterValue) return true;
                // Fixed: Ensure filterValue is treated as a string to avoid 'property toLowerCase does not exist on type unknown' error.
                return String(row[fieldId] || '').toLowerCase().includes(String(filterValue).toLowerCase());
            });
        });

        // 3. التجميع (Aggregation) بناءً على النتائج المصفاة فقط
        const aggMap = new Map<string, { label: string, count: number, sum: number }>();
        
        filteredDetailedRows.forEach(row => {
            const groupValue = String(row[groupByFieldId] || t.unassigned);
            if (!aggMap.has(groupValue)) {
                aggMap.set(groupValue, { label: groupValue, count: 0, sum: 0 });
            }
            const entry = aggMap.get(groupValue)!;
            entry.count += 1;
            
            // محاولة العثور على قيمة مالية للجمع (مثل mile_amount)
            const numericValue = Number(row['mile_amount']) || 0;
            entry.sum += numericValue;
        });

        const aggRows = Array.from(aggMap.values()).map(item => {
            const avg = item.count > 0 ? item.sum / item.count : 0;
            return {
                [groupByFieldId]: item.label,
                'agg_count': item.count,
                'agg_sum': item.sum,
                'agg_avg': avg,
                'agg_sum_fmt': item.sum.toLocaleString(undefined, { minimumFractionDigits: 0 }),
                'agg_avg_fmt': avg.toLocaleString(undefined, { maximumFractionDigits: 2 })
            };
        }).sort((a, b) => {
            const key = `agg_${aggMeasure}`;
            return (b[key as keyof typeof b] as number) - (a[key as keyof typeof a] as number);
        });

        return { detailedRows: filteredDetailedRows, aggRows };
    }, [selectedFields, projects, milestones, issues, users, rowFilters, groupByFieldId, aggMeasure, AVAILABLE_FIELDS, t.unassigned]);

    const displayData = isAggregationMode ? processedReport.aggRows : processedReport.detailedRows;

    const displayColumns = useMemo(() => {
        if (!isAggregationMode) return selectedFields;
        const gField = AVAILABLE_FIELDS.find(f => f.id === groupByFieldId) || { id: groupByFieldId, label: t.groupBy };
        return [
            gField, 
            { id: 'agg_count', label: t.metric_count }, 
            { id: 'agg_sum_fmt', label: t.totalValue }, 
            { id: 'agg_avg_fmt', label: t.avgValue }
        ] as any[];
    }, [isAggregationMode, selectedFields, groupByFieldId, AVAILABLE_FIELDS, t]);

    const graphMax = useMemo(() => {
        if (!isAggregationMode || processedReport.aggRows.length === 0) return 1;
        const key = `agg_${aggMeasure}`;
        return Math.max(...processedReport.aggRows.map(d => Number(d[key as keyof typeof d])), 1);
    }, [isAggregationMode, processedReport.aggRows, aggMeasure]);

    const formatGraphValue = (val: number) => {
        if (aggMeasure === 'count') return val.toString();
        return '$' + val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1">
                        <button onClick={() => setIsAggregationMode(false)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${!isAggregationMode ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-400'}`}>{t.detailedMode}</button>
                        <button onClick={() => setIsAggregationMode(true)} className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${isAggregationMode ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-400'}`}>{t.aggMode}</button>
                    </div>
                    <button onClick={() => {}} className="px-6 py-2.5 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 shadow-lg shadow-violet-500/20">{t.export}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[650px]">
                        <div className="p-5 border-b border-slate-50 dark:border-slate-800">
                             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.availableFields}</h2>
                             <div className="relative">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-violet-500" />
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                             </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                             {['Project', 'Milestone', 'Issue', 'User'].map(cat => (
                                <div key={cat} className="pb-4">
                                    <h3 className={`text-[8px] font-black uppercase tracking-widest mb-3 ps-1 ${cat === 'Project' ? 'text-violet-500' : cat === 'Milestone' ? 'text-blue-500' : cat === 'Issue' ? 'text-red-500' : 'text-emerald-500'}`}>{cat} Source</h3>
                                    <div className="space-y-1.5">
                                        {AVAILABLE_FIELDS.filter(f => f.category === cat && f.label.toLowerCase().includes(searchTerm.toLowerCase())).map(field => (
                                            <button key={field.id} onClick={() => handleAddField(field)} className="w-full text-start p-3 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-violet-300 dark:hover:border-violet-700 transition-all flex items-center justify-between group">
                                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{field.label}</span>
                                                <span className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg></span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9 space-y-6">
                    {isAggregationMode && processedReport.aggRows.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                                <div className="flex flex-col">
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.chartTitle}</h2>
                                    <p className="text-[9px] font-bold text-violet-500 uppercase">Aggregating {processedReport.detailedRows.length} filtered records</p>
                                </div>
                                <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                                    <button onClick={() => setAggMeasure('count')} className={`px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${aggMeasure === 'count' ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-400'}`}>{t.metric_count}</button>
                                    <button onClick={() => setAggMeasure('sum')} className={`px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${aggMeasure === 'sum' ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-400'}`}>{t.metric_sum}</button>
                                    <button onClick={() => setAggMeasure('avg')} className={`px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all ${aggMeasure === 'avg' ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-400'}`}>{t.metric_avg}</button>
                                </div>
                            </div>
                            
                            <div className="h-56 flex items-end gap-3 px-2">
                                {processedReport.aggRows.slice(0, 15).map((row, idx) => {
                                    const valKey = `agg_${aggMeasure}`;
                                    const val = Number(row[valKey as keyof typeof row]);
                                    const pct = (val / graphMax) * 100;
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                            <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                                                {row[groupByFieldId]}: {formatGraphValue(val)}
                                            </div>
                                            <div 
                                                style={{ height: `${Math.max(pct, 2)}%` }} 
                                                className="w-full max-w-[40px] bg-gradient-to-t from-violet-600 to-indigo-400 rounded-t-xl hover:from-violet-500 hover:to-indigo-300 transition-all duration-500 shadow-lg shadow-violet-500/10"
                                            ></div>
                                            <span className="mt-3 text-[7px] font-black text-slate-400 uppercase truncate w-full text-center">{row[groupByFieldId]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!isAggregationMode && (
                        <div className="bg-slate-100/50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] min-h-[120px]">
                             <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t.dropZone}</h2>
                             <div className="flex flex-wrap gap-2">
                                {selectedFields.length === 0 ? (
                                    <div className="w-full text-center py-4 opacity-20 italic text-xs font-black uppercase tracking-widest">{t.dropHint}</div>
                                ) : selectedFields.map(field => (
                                    <div key={field.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-2 rounded-xl shadow-sm flex items-center gap-3 animate-in zoom-in-95">
                                        <span className={`w-1.5 h-1.5 rounded-full ${field.category === 'Project' ? 'bg-violet-500' : field.category === 'Milestone' ? 'bg-blue-500' : field.category === 'Issue' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{field.label}</span>
                                        <button onClick={() => removeField(field.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isAggregationMode ? t.aggMode : t.preview}</h2>
                            <div className="flex items-center gap-4">
                                {isAggregationMode && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">{t.groupBy}</span>
                                        <select value={groupByFieldId} onChange={e => setGroupByFieldId(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-violet-500 transition-all">
                                            {selectedFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                                        </select>
                                    </div>
                                )}
                                <span className="text-[10px] font-black text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-3 py-1 rounded-full uppercase">{displayData.length} {t.rowsCount}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-start border-collapse">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        {displayColumns.map(f => (
                                            <th key={f.id} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-start whitespace-nowrap border-b border-slate-100 dark:border-slate-800">
                                                {f.label}
                                                {!isAggregationMode && (
                                                    <input type="text" value={rowFilters[f.id] || ''} onChange={e => setRowFilters(v => ({...v, [f.id]: (e.target as HTMLInputElement).value}))} placeholder={t.filterPlaceholder} className="block mt-2 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md p-1.5 text-[8px] font-bold outline-none" />
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {displayData.length > 0 ? displayData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            {displayColumns.map(f => (
                                                <td key={f.id} className={`px-5 py-3.5 text-[10px] font-bold whitespace-nowrap ${f.id.startsWith('agg_') ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {f.id === 'agg_sum_fmt' || f.id === 'agg_avg_fmt' ? `$${row[f.id as keyof typeof row]}` : row[f.id as keyof typeof row]}
                                                </td>
                                            ))}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={displayColumns.length} className="px-6 py-20 text-center text-[10px] font-black text-slate-200 uppercase tracking-[0.4em]">{t.noResults}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        title: "بناء التقارير المخصصة", subtitle: "صمم تقاريرك الخاصة بسحب وإفلات الحقول المطلوبة.", availableFields: "قائمة الحقول", dropZone: "أعمدة التقرير المختارة", dropHint: "انقر على الحقول لإضافتها كأعمدة للتقرير", preview: "المعاينة المباشرة", export: "تصدير CSV", searchPlaceholder: "ابحث عن حقل...", clear: "تفريغ", noFields: "لم يتم اختيار أعمدة بعد.", filterPlaceholder: "تصفية...", noResults: "لا توجد بيانات مطابقة.", rowsCount: "سجل", detailedMode: "عرض تفصيلي", aggMode: "وضع الإحصائيات", groupBy: "تجميع حسب:", measureBy: "عرض المقياس:", metric_count: "العدد (Count)", metric_sum: "المجموع (Sum)", metric_avg: "المتوسط (Avg)", chartTitle: "التمثيل البياني للإحصائيات", totalValue: "إجمالي القيمة", avgValue: "متوسط القيمة", unassigned: "غير معين"
    },
    en: {
        title: "Custom Report Builder", subtitle: "Design your custom reports by selecting fields.", availableFields: "Field Library", dropZone: "Selected Columns", dropHint: "Click fields from the library to add them to your report", preview: "Live Preview", export: "Export CSV", searchPlaceholder: "Search fields...", clear: "Clear", noFields: "No columns selected.", filterPlaceholder: "Filter...", noResults: "No results found.", rowsCount: "Rows", detailedMode: "Detailed View", aggMode: "Analytics Mode", groupBy: "Group By:", measureBy: "Measure:", metric_count: "Count", metric_sum: "Sum", metric_avg: "Average", chartTitle: "Analytics Visualization", totalValue: "Total Value", avgValue: "Avg Value", unassigned: "Unassigned"
    }
};

export default ReportsBuilder;
