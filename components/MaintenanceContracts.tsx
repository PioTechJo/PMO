import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MaintenanceContract, Lookup, Language } from '../types';
import SearchableSelect from './SearchableSelect';

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
        }
    };
    
    const handleAddNew = async () => {
        if (!newContractData.customerId || !newContractData.year) return;
        try {
            await onAddContract(newContractData);
            setNewContractData(getInitialNewContract());
        } catch (error) {
            console.error("Failed to add:", error);
        }
    };
    
    const formatCurrency = (amount: number | string | null | undefined) => {
        const num = Number(amount);
        if (isNaN(num)) return formatCurrency(0);
        return num.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' });
    };

    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '--';
    const inputClasses = "w-full p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";

    const renderDisplayCell = (c: MaintenanceContract, key: string) => {
        switch (key) {
            case 'type': return <div className="font-medium text-slate-900 dark:text-white">{c.type || '--'}</div>;
            case 'customer': return c.customer?.name || '--';
            case 'projectCode': return c.projectCode || '--';
            case 'month': return c.month ?? t.notApplicable;
            case 'year': return c.year;
            case 'totalAmount': return <div className="font-mono">{formatCurrency(c.totalAmount)}</div>;
            case 'collectedAmount': return <div className="font-mono text-green-600 dark:text-green-400">{formatCurrency(c.collectedAmount)}</div>;
            case 'lostAmount': return <div className="font-mono text-red-600 dark:text-red-400">{formatCurrency(c.lostAmount)}</div>;
            case 'remainingAmount':
                const total = Number(c.totalAmount || 0);
                const collected = Number(c.collectedAmount || 0);
                const lost = Number(c.lostAmount || 0);
                // In case of parsing issues, ensure robust calculation
                if (isNaN(total) || isNaN(collected) || isNaN(lost)) {
                    return <div className="font-mono font-bold text-slate-800 dark:text-white">{formatCurrency(0)}</div>;
                }
                return <div className="font-mono font-bold text-slate-800 dark:text-white">{formatCurrency(total - collected - lost)}</div>;
            case 'startDate': return formatDate(c.startDate);
            case 'endDate': return formatDate(c.endDate);
            case 'notes': return <div className="whitespace-pre-wrap">{c.notes || '--'}</div>;
            case 'actions': return null;
            default: return null;
        }
    };
    

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className={inputClasses + " lg:col-span-1"}>
                    {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="lg:col-span-2">
                    <SearchableSelect options={customerOptions} value={filters.customerId} onChange={v => handleFilterChange('customerId', v)} placeholder={t.customer} language={language} searchPlaceholder={t.searchCustomers} />
                </div>
                <div className="lg:col-span-1">
                    <input type="text" value={filters.projectSearch} onChange={e => handleFilterChange('projectSearch', e.target.value)} placeholder={t.searchByProject} className={inputClasses} />
                </div>
                <select value={filters.month} onChange={e => handleFilterChange('month', e.target.value)} className={inputClasses}>{monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} className={inputClasses}>{yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                <button onClick={clearFilters} className="lg:col-span-6 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                    <span>{t.clearFilters}</span>
                </button>
            </div>
            
            <div className="overflow-x-auto bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl">
                <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400 table-fixed">
                    <colgroup>
                        {columns.map(col => <col key={col.key} style={{ width: `${columnWidths[col.key]}px` }} />)}
                    </colgroup>
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} scope="col" className="px-6 py-3 relative group">
                                    {col.label}
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, col.key)}
                                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize group-hover:bg-violet-300 dark:group-hover:bg-violet-700 transition-colors"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <EditableRow isNew data={newContractData} onChange={(field, value) => setNewContractData(prev => ({...prev, [field]:value}))} onSave={handleAddNew} customers={customers} language={language} columns={columns}/>
                        {filteredContracts.map(c => (
                            editingId === c.id && editedData ? (
                                <EditableRow key={`edit-${c.id}`} data={editedData} onChange={(field, value) => setEditedData(prev => prev ? {...prev, [field]: value} : null)} onSave={handleSave} onCancel={handleCancel} customers={customers} language={language} columns={columns} />
                            ) : (
                                <tr key={c.id} onDoubleClick={() => handleEdit(c)} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-6 py-4 align-top">
                                            {renderDisplayCell(c, col.key)}
                                        </td>
                                    ))}
                                </tr>
                            )
                        ))}
                         {filteredContracts.length === 0 && (
                            <tr><td colSpan={columns.length} className="text-center py-10">{t.noData}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        title: 'عقود الصيانة', subtitle: 'عرض وإدارة عقود الصيانة. انقر نقراً مزدوجاً للتعديل.', type: 'النوع', month: 'الشهر', year: 'السنة', customer: 'العميل',
        projectCode: 'كود المشروع', totalAmount: 'إجمالي العقد', collectedAmount: 'المبلغ المحصل', lostAmount: 'المبلغ المفقود', remainingAmount: 'المتبقي',
        startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية', allCustomers: 'كل العملاء', allYears: 'كل السنوات',
        allMonths: 'كل الشهور', clearFilters: 'مسح الفلاتر', searchByProject: 'ابحث بالكود...', searchCustomers: 'ابحث عن عميل...', noData: 'لا توجد عقود تطابق معايير البحث.',
        allTypes: 'كل الأنواع', notes: 'ملاحظات', notApplicable: 'غير متاح',
        inline: { add: "إضافة", save: "حفظ", cancel: "إلغاء", actions: "إجراءات" },
        addModal: { selectHere: 'اختر...' },
    },
    en: {
        title: 'Maintenance Contracts', subtitle: 'View and manage contracts. Double-click a row to edit.', type: 'Type', month: 'Month', year: 'Year', customer: 'Customer',
        projectCode: 'Project Code', totalAmount: 'Total Amount', collectedAmount: 'Collected', lostAmount: 'Lost', remainingAmount: 'Remaining',
        startDate: 'Start Date', endDate: 'End Date', allCustomers: 'All Customers', allYears: 'All Years',
        allMonths: 'All Months', clearFilters: 'Clear Filters', searchByProject: 'Search by code...', searchCustomers: 'Search customers...', noData: 'No contracts match the search criteria.',
        allTypes: 'All Types', notes: 'Notes', notApplicable: 'N/A',
        inline: { add: "Add", save: "Save", cancel: "Cancel", actions: "Actions" },
        addModal: { selectHere: 'Select...' },
    }
};

export default MaintenanceContracts;