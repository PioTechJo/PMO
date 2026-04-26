import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MaintenanceContract, Lookup, Language } from '../types';
import SearchableSelect from './SearchableSelect';
import * as XLSX from 'xlsx';
import StatCard from './StatCard';

// --- Editable Row Sub-Component ---
interface EditableRowProps {
    data: Partial<Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>>;
    onChange: (field: keyof Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>, value: any) => void;
    onSave: () => void;
    onCancel?: () => void;
    customers: Lookup[];
    language: Language;
    isNew?: boolean;
    columns: any[]; // Receive columns config
}

const EditableRow: React.FC<EditableRowProps> = ({ data, onChange, onSave, onCancel, customers, language, isNew = false, columns }) => {
    const t = translations[language];
    const inputClasses = "w-full p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm";
    const contractTypes = ['A', 'B', 'S', 'S1'];

    const handleNumericChange = (field: keyof Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>, value: string) => {
        onChange(field, parseFloat(value) || 0);
    };

    const handleDateChange = (field: keyof Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>, value: string) => {
        onChange(field, value || null);
    };

    const renderCellContent = (key: string) => {
        switch (key) {
            case 'type': return <select value={data.type || ''} onChange={e => onChange('type', e.target.value)} className={inputClasses}><option value="">--</option>{contractTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>;
            case 'customer': return <SearchableSelect options={customers.map(c => ({ value: c.id, label: c.name }))} value={data.customerId || ''} onChange={v => onChange('customerId', v)} placeholder={t.addModal.selectHere} language={language} />;
            case 'projectCode': return <input type="text" value={data.projectCode || ''} onChange={e => onChange('projectCode', e.target.value)} className={inputClasses} />;
            case 'month': return <select value={data.month ?? ''} onChange={e => onChange('month', e.target.value ? Number(e.target.value) : null)} className={inputClasses}><option value="">{t.notApplicable}</option>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select>;
            case 'year': return <input type="number" value={data.year || new Date().getFullYear()} onChange={e => onChange('year', Number(e.target.value))} className={inputClasses} />;
            case 'totalAmount': return <input type="number" value={data.totalAmount || ''} onChange={e => handleNumericChange('totalAmount', e.target.value)} className={inputClasses} />;
            case 'collectedAmount': return <input type="number" value={data.collectedAmount || ''} onChange={e => handleNumericChange('collectedAmount', e.target.value)} className={inputClasses} />;
            case 'lostAmount': return <input type="number" value={data.lostAmount || ''} onChange={e => handleNumericChange('lostAmount', e.target.value)} className={inputClasses} />;
            case 'remainingAmount': return null;
            case 'startDate': return <input type="date" value={data.startDate || ''} onChange={e => handleDateChange('startDate', e.target.value)} className={inputClasses} />;
            case 'endDate': return <input type="date" value={data.endDate || ''} onChange={e => handleDateChange('endDate', e.target.value)} className={inputClasses} />;
            case 'notes': return <input type="text" value={data.notes || ''} onChange={e => onChange('notes', e.target.value)} className={inputClasses} />;
            case 'actions': return (
                <div className="flex items-center gap-2">
                    <button onClick={onSave} className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors" title={isNew ? t.inline.add : t.inline.save}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    {onCancel && <button onClick={onCancel} className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors" title={t.inline.cancel}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.697a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>}
                </div>
            );
            default: return null;
        }
    };

    return (
        <tr className={isNew ? "bg-violet-50 dark:bg-violet-900/20" : "bg-slate-50 dark:bg-slate-800/50"}>
            {columns.map(col => <td key={col.key} className="px-2 py-2 align-top">{renderCellContent(col.key)}</td>)}
        </tr>
    );
};

// --- Main Component ---
interface MaintenanceContractsProps {
    contracts: MaintenanceContract[];
    customers: Lookup[];
    language: Language;
    onAddContract: (data: Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>) => Promise<void>;
    onUpdateContract: (id: string, data: Partial<Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>>) => Promise<void>;
}

const MaintenanceContracts: React.FC<MaintenanceContractsProps> = ({ contracts, customers, language, onAddContract, onUpdateContract }) => {
    const t = translations[language];
    
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<Partial<MaintenanceContract> | null>(null);

    const getInitialNewContract = () => ({
        type: null, month: new Date().getMonth() + 1, year: new Date().getFullYear(), customerId: '',
        projectCode: null, totalAmount: 0, collectedAmount: 0, lostAmount: 0,
        startDate: null, endDate: null, notes: null,
    });
    const [newContractData, setNewContractData] = useState<Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>>(getInitialNewContract());

    const [filters, setFilters] = useState({
        type: '', month: 'all', year: 'all', customerId: 'all', projectSearch: '',
    });

    const columns = useMemo(() => [
        { key: 'type', label: t.type, minWidth: 60 },
        { key: 'customer', label: t.customer, minWidth: 200 },
        { key: 'projectCode', label: t.projectCode, minWidth: 150 },
        { key: 'month', label: t.month, minWidth: 80 },
        { key: 'year', label: t.year, minWidth: 80 },
        { key: 'totalAmount', label: t.totalAmount, minWidth: 120 },
        { key: 'collectedAmount', label: t.collectedAmount, minWidth: 120 },
        { key: 'lostAmount', label: t.lostAmount, minWidth: 120 },
        { key: 'remainingAmount', label: t.remainingAmount, minWidth: 120 },
        { key: 'startDate', label: t.startDate, minWidth: 120 },
        { key: 'endDate', label: t.endDate, minWidth: 120 },
        { key: 'notes', label: t.notes, minWidth: 250 },
        { key: 'actions', label: t.inline.actions, minWidth: 100 },
    ], [t]);

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        type: 60, customer: 200, projectCode: 150, month: 80, year: 80,
        totalAmount: 120, collectedAmount: 120, lostAmount: 120, remainingAmount: 120,
        startDate: 120, endDate: 120, notes: 250, actions: 100,
    });
    
    const [resizingColumn, setResizingColumn] = useState<{ key: string; startX: number; startWidth: number } | null>(null);

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => setFilters({ type: '', month: 'all', year: 'all', customerId: 'all', projectSearch: '' });

    const { yearOptions, monthOptions, customerOptions, typeOptions } = useMemo(() => {
        // Fix: Ensure only numbers are sorted, preventing errors if `c.year` is null/undefined.
        // Line 119: Added explicit type annotation to sort parameters to fix arithmetic operation errors.
        const uniqueYears = Array.from(new Set(contracts.map(c => c.year))).filter(y => typeof y === 'number' && !isNaN(y)).sort((a: number, b: number) => b - a);
        const yOpts = [{ value: 'all', label: t.allYears }, ...uniqueYears.map(y => ({ value: y.toString(), label: y.toString() }))];
        const mOpts = [{ value: 'all', label: t.allMonths }, {value: 'NA', label: t.notApplicable }, ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(2000, i, 1).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' }) }))];
        const cOpts = [{ value: 'all', label: t.allCustomers }, ...customers.map(c => ({ value: c.id, label: c.name }))];
        const tOpts = [{ value: '', label: t.allTypes }, { value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'S', label: 'S' }, { value: 'S1', label: 'S1' }];
        return { yearOptions: yOpts, monthOptions: mOpts, customerOptions: cOpts, typeOptions: tOpts };
    }, [contracts, customers, language, t]);

    const filteredContracts = useMemo(() => contracts.filter(c => 
        (filters.type === '' || c.type === filters.type) &&
        (filters.month === 'all' || (filters.month === 'NA' ? c.month === null : c.month === parseInt(filters.month, 10))) &&
        (filters.year === 'all' || c.year === parseInt(filters.year, 10)) &&
        (filters.customerId === 'all' || c.customerId === filters.customerId) &&
        (filters.projectSearch === '' || 
            c.projectCode?.toLowerCase().includes(filters.projectSearch.toLowerCase()))
    ), [contracts, filters]);
    
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, key: string) => {
        e.preventDefault();
        setResizingColumn({
            key,
            startX: e.clientX,
            startWidth: columnWidths[key],
        });
    }, [columnWidths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingColumn) return;
        const deltaX = e.clientX - resizingColumn.startX;
        const columnDef = columns.find(c => c.key === resizingColumn.key);
        const minWidth = columnDef ? columnDef.minWidth : 50;
        // FIX: Cast startWidth to number explicitly to resolve arithmetic operation type errors during column resizing.
        const newWidth = Math.max(minWidth, (Number(resizingColumn.startWidth) || 0) + deltaX);
        setColumnWidths(prev => ({ ...prev, [resizingColumn.key]: newWidth }));
    }, [resizingColumn, columns]);

    const handleMouseUp = useCallback(() => {
        setResizingColumn(null);
    }, []);

    useEffect(() => {
        if (resizingColumn) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [resizingColumn, handleMouseMove, handleMouseUp]);

    const handleEdit = (contract: MaintenanceContract) => {
        setEditingId(contract.id);
        setEditedData(contract);
    };
    
    const handleCancel = () => {
        setEditingId(null);
        setEditedData(null);
    };

    const handleSave = async () => {
        if (!editingId || !editedData) return;
        try {
            const { customer, createdAt, id, ...updatePayload } = editedData;
            await onUpdateContract(editingId, updatePayload as Omit<MaintenanceContract, 'id' | 'createdAt' | 'customer'>);
            handleCancel();
        } catch (error) {
            console.error("Failed to save:", error);
            alert(language === 'ar' ? "فشل في حفظ التعديلات" : "Failed to save changes");
        }
    };
    
    const exportToExcel = () => {
        const dataToExport = filteredContracts.map(c => ({
            [t.type]: c.type || '',
            [t.customer]: c.customer?.name || '',
            [t.projectCode]: c.projectCode || '',
            [t.month]: c.month ?? t.notApplicable,
            [t.year]: c.year,
            [t.totalAmount]: c.totalAmount || 0,
            [t.collectedAmount]: c.collectedAmount || 0,
            [t.lostAmount]: c.lostAmount || 0,
            [t.remainingAmount]: (c.totalAmount || 0) - (c.collectedAmount || 0) - (c.lostAmount || 0),
            [t.startDate]: c.startDate || '',
            [t.endDate]: c.endDate || '',
            [t.notes]: c.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Maintenance Contracts");
        XLSX.writeFile(wb, `Maintenance_Contracts_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    
    const handleAddNew = async () => {
        if (!newContractData.customerId) {
            alert(language === 'ar' ? "يرجى اختيار العميل أولاً" : "Please select a customer first");
            return;
        }
        if (!newContractData.year) return;
        try {
            await onAddContract(newContractData);
            setNewContractData(getInitialNewContract());
        } catch (error) {
            console.error("Failed to add:", error);
            alert(language === 'ar' ? "فشل في إضافة العقد" : "Failed to add contract");
        }
    };
    
    const stats = useMemo(() => {
        const total = filteredContracts.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
        const collected = filteredContracts.reduce((sum, c) => sum + (Number(c.collectedAmount) || 0), 0);
        const lost = filteredContracts.reduce((sum, c) => sum + (Number(c.lostAmount) || 0), 0);
        const activeCount = filteredContracts.filter(c => {
            if (!c.endDate) return true;
            return new Date(c.endDate) >= new Date();
        }).length;
        
        return { total, collected, lost, activeCount };
    }, [filteredContracts]);

    const formatCurrency = (amount: number | string | null | undefined) => {
        const num = Number(amount);
        if (isNaN(num)) return formatCurrency(0);
        return num.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    };

    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '--';
    const inputClasses = "w-full p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";

    const renderDisplayCell = (c: MaintenanceContract, key: string) => {
        switch (key) {
            case 'type': return <div className="font-bold text-slate-900 dark:text-white">{c.type || '--'}</div>;
            case 'customer': return <div className="font-medium text-slate-600 dark:text-slate-300">{c.customer?.name || '--'}</div>;
            case 'projectCode': return <div className="font-medium text-slate-500">{c.projectCode || '--'}</div>;
            case 'month': return c.month ?? t.notApplicable;
            case 'year': return c.year;
            case 'totalAmount': return <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(c.totalAmount)}</div>;
            case 'collectedAmount': return <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.collectedAmount)}</div>;
            case 'lostAmount': return <div className="font-bold text-red-500 dark:text-red-400">{formatCurrency(c.lostAmount)}</div>;
            case 'remainingAmount':
                const total = Number(c.totalAmount || 0);
                const collected = Number(c.collectedAmount || 0);
                const lost = Number(c.lostAmount || 0);
                return <div className="font-black text-slate-900 dark:text-white">{formatCurrency(total - collected - lost)}</div>;
            case 'startDate': return <div className="text-slate-500">{formatDate(c.startDate)}</div>;
            case 'endDate': return <div className="text-slate-500">{formatDate(c.endDate)}</div>;
            case 'notes': return <div className="whitespace-pre-wrap text-xs text-slate-500 line-clamp-2">{c.notes || '--'}</div>;
            case 'actions': return null;
            default: return null;
        }
    };
    

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.title}</h1>
                        <p className="text-[10px] font-bold text-slate-400">{t.subtitle}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 outline-none h-10">{yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        <select value={filters.month} onChange={e => handleFilterChange('month', e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 outline-none h-10">{monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                    </div>
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all bg-white dark:bg-slate-900 h-10"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {t.exportExcel}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    variant="gradient"
                    color="blue"
                    title={language === 'ar' ? 'إجمالي القيمة المالية' : 'TOTAL FINANCIAL VALUE'}
                    value={formatCurrency(stats.total)}
                    trend={{ val: '12.4%', label: 'vs last period', type: 'up' }}
                    badge={{ label: language === 'ar' ? `${stats.activeCount} مشروع نشط` : `${stats.activeCount} Active Projects`, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9l-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> }}
                />
                <StatCard 
                    color="emerald"
                    title={language === 'ar' ? 'إجمالي المحصل' : 'TOTAL COLLECTED'}
                    value={formatCurrency(stats.collected)}
                    trend={{ val: '8.1%', label: 'this month', type: 'up' }}
                    progress={(stats.collected / (stats.total || 1)) * 100}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard 
                    color="red"
                    title={language === 'ar' ? 'المبالغ المفقودة' : 'LOST AMOUNT'}
                    value={formatCurrency(stats.lost)}
                    trend={{ val: '2.3%', label: 'vs last month', type: 'up' }}
                    icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                />
            </div>
            
            {/* Filters Area */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-4">
                <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 outline-none h-10 min-w-[120px]">
                    {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex-1 min-w-[200px]">
                    <SearchableSelect options={customerOptions} value={filters.customerId} onChange={v => handleFilterChange('customerId', v)} placeholder={t.customer} language={language} searchPlaceholder={t.searchCustomers} />
                </div>
                <div className="min-w-[180px]">
                    <input type="text" value={filters.projectSearch} onChange={e => handleFilterChange('projectSearch', e.target.value)} placeholder={t.searchByProject} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-500 outline-none h-10" />
                </div>
                <button onClick={clearFilters} className="px-4 h-10 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">
                    {t.clearFilters}
                </button>
            </div>
            
            <div className="bg-white dark:bg-transparent rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left rtl:text-right border-collapse table-fixed">
                        <colgroup>
                            {columns.map(col => <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />)}
                        </colgroup>
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                {columns.map(col => (
                                    <th key={col.key} scope="col" className="px-6 py-4 relative group text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        <div className="flex items-center gap-2">
                                            {col.label}
                                        </div>
                                        <div
                                            onMouseDown={(e) => handleMouseDown(e, col.key)}
                                            className="absolute top-0 right-0 h-full w-1 cursor-col-resize group-hover:bg-blue-500 transition-colors"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-sans">
                            <EditableRow isNew data={newContractData} onChange={(field, value) => setNewContractData(prev => ({...prev, [field]:value}))} onSave={handleAddNew} customers={customers} language={language} columns={columns}/>
                            {filteredContracts.map(c => (
                                editingId === c.id && editedData ? (
                                    <EditableRow key={`edit-${c.id}`} data={editedData} onChange={(field, value) => setEditedData(prev => prev ? {...prev, [field]: value} : null)} onSave={handleSave} onCancel={handleCancel} customers={customers} language={language} columns={columns} />
                                ) : (
                                    <tr key={c.id} onDoubleClick={() => handleEdit(c)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer">
                                        {columns.map(col => (
                                            <td key={col.key} className="px-6 py-5 align-top">
                                                {renderDisplayCell(c, col.key)}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredContracts.length === 0 && (
                    <div className="text-center py-20 bg-slate-50/30 dark:bg-transparent">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">{t.noData}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const translations = {
    ar: {
        title: 'تحليل عقود الصيانة', subtitle: 'نظرة عامة على جميع عقود الصيانة والتحصيلات', type: 'النوع', month: 'الشهر', year: 'السنة', customer: 'العميل',
        projectCode: 'كود المشروع', totalAmount: 'إجمالي العقد', collectedAmount: 'المبلغ المحصل', lostAmount: 'المبلغ المفقود', remainingAmount: 'المتبقي',
        startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية', allCustomers: 'كل العملاء', allYears: 'كل السنوات',
        allMonths: 'كل الشهور', clearFilters: 'مسح الفلاتر', searchByProject: 'ابحث بالكود...', searchCustomers: 'ابحث عن عميل...', noData: 'لا توجد عقود تطابق معايير البحث.',
        allTypes: 'كل الأنواع', notes: 'ملاحظات', notApplicable: 'غير متاح',
        exportExcel: 'تصدير إلى Excel',
        inline: { add: "إضافة", save: "حفظ", cancel: "إلغاء", actions: "إجراءات" },
        addModal: { selectHere: 'اختر...' },
    },
    en: {
        title: 'Maintenance Contracts Analysis', subtitle: 'Overview of all maintenance contracts and collections', type: 'Type', month: 'Month', year: 'Year', customer: 'Customer',
        projectCode: 'Project Code', totalAmount: 'Total Amount', collectedAmount: 'Collected', lostAmount: 'Lost', remainingAmount: 'Remaining',
        startDate: 'Start Date', endDate: 'End Date', allCustomers: 'All Customers', allYears: 'All Years',
        allMonths: 'All Months', clearFilters: 'Clear Filters', searchByProject: 'Search by code...', searchCustomers: 'Search customers...', noData: 'No contracts match the search criteria.',
        allTypes: 'All Types', notes: 'Notes', notApplicable: 'N/A',
        exportExcel: 'Export to Excel',
        inline: { add: "Add", save: "Save", cancel: "Cancel", actions: "Actions" },
        addModal: { selectHere: 'Select...' },
    }
};

export default MaintenanceContracts;