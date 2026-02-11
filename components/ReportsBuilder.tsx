
import React, { useState, useMemo } from 'react';
import { Project, Milestone, Language, Lookup } from '../types';

interface Field {
    id: string;
    label: string;
    category: 'Project' | 'Milestone';
    accessor: (proj: Project, mile?: Milestone) => string | number | null;
}

interface ReportsBuilderProps {
    projects: Project[];
    milestones: Milestone[];
    teams: Lookup[];
    language: Language;
}

const ReportsBuilder: React.FC<ReportsBuilderProps> = ({ projects, milestones, teams, language }) => {
    const [selectedFields, setSelectedFields] = useState<Field[]>([]);
    const [draggedField, setDraggedField] = useState<Field | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowFilters, setRowFilters] = useState<Record<string, string>>({});
    const [isFieldsCollapsed, setIsFieldsCollapsed] = useState(false);

    const translations = {
        ar: {
            title: "بناء التقارير المخصصة",
            subtitle: "قم بسحب الحقول أو النقر عليها لتشكيل تقريرك.",
            availableFields: "الحقول المتاحة",
            dropZone: "منطقة تشكيل التقرير",
            dropHint: "اسحب الحقول هنا أو انقر على الحقول في القائمة لإضافتها كأعمدة.",
            preview: "معاينة التقرير",
            export: "تصدير للتقرير",
            searchPlaceholder: "بحث عن حقل...",
            clear: "مسح الكل",
            noFields: "لم يتم اختيار حقول بعد.",
            filterPlaceholder: "بحث...",
            noResults: "لا توجد سجلات مطابقة.",
            toggleFields: "إظهار/إخفاء القائمة",
            rowsCount: "سجل",
        },
        en: {
            title: "Report Builder",
            subtitle: "Drag or click fields to design your report layout.",
            availableFields: "Available Fields",
            dropZone: "Report Columns",
            dropHint: "Drag fields here or click items in the list to add them.",
            preview: "Preview",
            export: "Export CSV",
            searchPlaceholder: "Search fields...",
            clear: "Clear All",
            noFields: "No fields selected yet.",
            filterPlaceholder: "Filter...",
            noResults: "No matching records found.",
            toggleFields: "Show/Hide List",
            rowsCount: "Rows",
        }
    };
    const t = translations[language];

    const AVAILABLE_FIELDS: Field[] = useMemo(() => [
        { id: 'proj_name', label: 'Project Name / اسم المشروع', category: 'Project', accessor: (p) => p.name },
        { id: 'proj_code', label: 'Project Code / كود المشروع', category: 'Project', accessor: (p) => p.projectCode },
        { id: 'proj_pm', label: 'Project Manager / مدير المشروع', category: 'Project', accessor: (p) => p.projectManager?.name || '--' },
        { id: 'proj_customer', label: 'Customer / العميل', category: 'Project', accessor: (p) => p.customer?.name || '--' },
        { id: 'proj_status', label: 'Project Status / حالة المشروع', category: 'Project', accessor: (p) => p.status?.name || '--' },
        { id: 'proj_progress', label: 'Progress / التقدم', category: 'Project', accessor: (p) => `${p.progress}%` },
        { id: 'mile_title', label: 'Milestone Title / اسم الدفعة', category: 'Milestone', accessor: (_, m) => m?.title || '--' },
        { id: 'mile_status', label: 'Milestone Status / حالة المعلم', category: 'Milestone', accessor: (_, m) => m?.status || '--' },
        { id: 'mile_amount', label: 'Milestone Value / قيمة الدفعة', category: 'Milestone', accessor: (_, m) => m?.hasPayment ? m.paymentAmount : '--' },
        { 
            id: 'mile_month_year', 
            label: 'Month-Year / شهر وسنة المعلم', 
            category: 'Milestone', 
            accessor: (_, m) => {
                if (!m?.dueDate) return '--';
                const date = new Date(m.dueDate);
                return date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
            }
        },
        { 
            id: 'team_name', 
            label: 'Team / الفريق المسؤول', 
            category: 'Milestone', 
            accessor: (p, m) => {
                const teamId = m?.teamId || p.teamId;
                return teams.find(t => t.id === teamId)?.name || '--';
            }
        },
        { id: 'mile_pay_status', label: 'Payment Status / حالة الدفعة', category: 'Milestone', accessor: (_, m) => m?.paymentStatus || '--' },
        { id: 'mile_due', label: 'Due Date / تاريخ الاستحقاق', category: 'Milestone', accessor: (_, m) => m?.dueDate ? new Date(m.dueDate).toLocaleDateString() : '--' },
        { id: 'proj_country', label: 'Country / البلد', category: 'Project', accessor: (p) => p.country?.name || '--' },
    ], [teams, language]);

    const filteredAvailableFields = AVAILABLE_FIELDS.filter(f => 
        !selectedFields.find(sf => sf.id === f.id) && 
        f.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddField = (field: Field) => {
        if (!selectedFields.find(f => f.id === field.id)) {
            setSelectedFields([...selectedFields, field]);
        }
    };

    const handleDragStart = (field: Field) => setDraggedField(field);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedField) {
            handleAddField(draggedField);
            setDraggedField(null);
        }
    };

    const removeField = (fieldId: string) => {
        setSelectedFields(selectedFields.filter(f => f.id !== fieldId));
        setRowFilters(prev => {
            const next = { ...prev };
            delete next[fieldId];
            return next;
        });
    };

    const reportData = useMemo(() => {
        const rows: any[] = [];
        projects.forEach(p => {
            const pMilestones = milestones.filter(m => m.projectId === p.id);
            if (pMilestones.length > 0) {
                pMilestones.forEach(m => {
                    const row: any = {};
                    selectedFields.forEach(f => {
                        row[f.id] = f.accessor(p, m);
                    });
                    rows.push(row);
                });
            } else {
                const row: any = {};
                selectedFields.forEach(f => {
                    row[f.id] = f.accessor(p);
                });
                rows.push(row);
            }
        });

        return rows.filter(row => {
            return Object.entries(rowFilters).every(([fieldId, filterValue]) => {
                if (!filterValue) return true;
                const cellValue = String(row[fieldId] || '').toLowerCase();
                return cellValue.includes(String(filterValue).toLowerCase());
            });
        });
    }, [projects, milestones, selectedFields, rowFilters]);

    const handleFilterChange = (fieldId: string, value: string) => {
        setRowFilters(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleExport = () => {
        if (selectedFields.length === 0) return;
        const headers = selectedFields.map(f => f.label).join(',');
        const rows = reportData.map(row => 
            selectedFields.map(f => `"${String(row[f.id] || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const csvContent = "\uFEFF" + headers + '\n' + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `PioTech_Custom_Report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getLocalizedLabel = (label: string) => label.split('/')[language === 'ar' ? 1 : 0];

    return (
        <div className="space-y-6 lg:space-y-8 max-w-[1600px] mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="w-full sm:w-auto">
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h1>
                    <p className="text-slate-400 font-bold text-[9px] lg:text-[10px] mt-1 uppercase tracking-widest">{t.subtitle}</p>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <button onClick={() => { setSelectedFields([]); setRowFilters({}); }} className="flex-1 sm:flex-none px-4 lg:px-6 py-2.5 text-[9px] lg:text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 uppercase tracking-widest">{t.clear}</button>
                    <button onClick={handleExport} disabled={selectedFields.length === 0} className="flex-1 sm:flex-none px-6 lg:px-8 py-2.5 text-[9px] lg:text-[10px] font-black text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all uppercase tracking-widest shadow-xl shadow-violet-500/20 disabled:opacity-50">{t.export}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Available Fields - Sidebar/Collapsible */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2.5rem] shadow-sm flex flex-col h-auto lg:h-[600px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.availableFields}</h2>
                            <button onClick={() => setIsFieldsCollapsed(!isFieldsCollapsed)} className="lg:hidden p-2 text-violet-500 font-bold text-[10px] uppercase">
                                {t.toggleFields}
                            </button>
                        </div>
                        
                        <div className={`${isFieldsCollapsed ? 'hidden' : 'block'} lg:block space-y-4`}>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t.searchPlaceholder} 
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-violet-500" 
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-none custom-scrollbar space-y-2 pe-2">
                                {filteredAvailableFields.map(field => (
                                    <div
                                        key={field.id}
                                        draggable
                                        onDragStart={() => handleDragStart(field)}
                                        onClick={() => handleAddField(field)}
                                        className="p-3 lg:p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-violet-300 dark:hover:border-violet-700 group transition-all active:scale-95"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm group-hover:text-violet-600">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] lg:text-[10px] font-black text-slate-800 dark:text-white truncate">{getLocalizedLabel(field.label)}</p>
                                                <p className="text-[7px] lg:text-[8px] font-bold text-slate-400 uppercase tracking-widest">{field.category}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drop Zone & Preview Container */}
                <div className="lg:col-span-9 space-y-6 lg:space-y-8">
                    {/* Selected Columns (Drop Zone) */}
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className="bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 lg:p-8 rounded-[1.5rem] lg:rounded-[3rem] min-h-[120px] lg:min-h-[160px] flex flex-wrap gap-2 lg:gap-3 items-center justify-center transition-colors"
                    >
                        {selectedFields.length === 0 ? (
                            <div className="text-center opacity-30 px-4">
                                <svg className="w-8 h-8 lg:w-12 lg:h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest">{t.dropZone}</p>
                                <p className="text-[8px] lg:text-[10px] mt-1">{t.dropHint}</p>
                            </div>
                        ) : (
                            selectedFields.map(field => (
                                <div key={field.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 lg:px-5 py-2 lg:py-3 rounded-xl lg:rounded-2xl shadow-sm flex items-center gap-3 lg:gap-4 animate-in zoom-in-95">
                                    <span className="text-[10px] lg:text-[11px] font-black text-slate-700 dark:text-slate-200">{getLocalizedLabel(field.label)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Preview Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] lg:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col min-h-[400px] lg:h-[500px]">
                        <div className="p-4 lg:p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.preview}</h2>
                            <span className="text-[9px] lg:text-[10px] font-black text-violet-500 uppercase tracking-widest">{reportData.length} {t.rowsCount}</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-start border-collapse table-auto">
                                <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md z-10">
                                    <tr>
                                        {selectedFields.map(f => (
                                            <th key={f.id} className="px-4 lg:px-6 pt-4 pb-2 text-[8px] lg:text-[9px] font-black text-slate-400 uppercase tracking-widest text-start whitespace-nowrap border-b-0">
                                                {getLocalizedLabel(f.label)}
                                            </th>
                                        ))}
                                    </tr>
                                    {selectedFields.length > 0 && (
                                        <tr>
                                            {selectedFields.map(f => (
                                                <th key={`filter-${f.id}`} className="px-3 lg:px-5 pb-4 text-start border-b border-slate-100 dark:border-slate-800">
                                                    <div className="relative group">
                                                        <input 
                                                            type="text"
                                                            value={rowFilters[f.id] || ''}
                                                            onChange={(e) => handleFilterChange(f.id, e.target.value)}
                                                            placeholder={t.filterPlaceholder}
                                                            className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 py-1 text-[9px] lg:text-[10px] font-bold outline-none focus:border-violet-500 transition-colors placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    )}
                                    {selectedFields.length === 0 && (
                                        <tr>
                                            <th className="px-6 py-20 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">{t.noFields}</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {reportData.length > 0 ? (
                                        reportData.slice(0, 50).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                {selectedFields.map(f => (
                                                    <td key={f.id} className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] lg:text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                        {row[f.id]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : selectedFields.length > 0 ? (
                                        <tr>
                                            <td colSpan={selectedFields.length} className="px-6 py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                                                {t.noResults}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsBuilder;
