
import React, { useMemo, useState } from 'react';
import { Customer, Project, MaintenanceContract, User, Language } from '../types';
import { getContractRiskStatus } from '../services/maintenanceStatus';
import AddEditCustomerModal from './AddEditCustomerModal';

interface CustomersProps {
    customers: Customer[];
    allProjects: Project[];
    allMaintenanceContracts: MaintenanceContract[];
    allUsers: User[];
    language: Language;
    currentUser?: User;
    onViewCustomer: (customer: Customer) => void;
    onAddCustomer: (data: Omit<Customer, 'id' | 'owner'>) => Promise<void>;
    onUpdateCustomer: (customerId: string, data: Omit<Customer, 'id' | 'owner'>) => Promise<void>;
}

const tierColors: Record<string, string> = {
    VIP: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    Standard: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    Other: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    prospect: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    churned: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const translations = {
    ar: {
        title: "العملاء", subtitle: "ملف كل عميل: مشاريعه، عقوده، وسجل التفاعلات.",
        search: "بحث بالاسم...", colName: "الاسم", colTier: "الفئة", colStatus: "الحالة", colProjects: "المشاريع", colContracts: "عقود الصيانة",
        colAtRisk: "تحتاج انتباه", noCustomers: "لا يوجد عملاء بهذا البحث", atRisk: "خطر التجديد",
        addCustomer: "إضافة عميل", tierVIP: "VIP", tierStandard: "عادي", tierOther: "أخرى",
        statusActive: "نشط", statusProspect: "محتمل", statusChurned: "منسحب",
    },
    en: {
        title: "Customers", subtitle: "Every customer's profile: projects, contracts, and interaction history.",
        search: "Search by name...", colName: "Name", colTier: "Tier", colStatus: "Status", colProjects: "Projects", colContracts: "Maintenance Contracts",
        colAtRisk: "Needs Attention", noCustomers: "No customers match your search", atRisk: "At Risk",
        addCustomer: "Add Customer", tierVIP: "VIP", tierStandard: "Standard", tierOther: "Other",
        statusActive: "Active", statusProspect: "Prospect", statusChurned: "Churned",
    }
};

const Customers: React.FC<CustomersProps> = ({ customers, allProjects, allMaintenanceContracts, allUsers, language, currentUser, onViewCustomer, onAddCustomer, onUpdateCustomer }) => {
    const t = translations[language];
    const [search, setSearch] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const isManagerOrPM = currentUser?.type === 'Manager' || currentUser?.type === 'PM';

    const statusLabels: Record<string, string> = { active: t.statusActive, prospect: t.statusProspect, churned: t.statusChurned };
    const tierLabels: Record<string, string> = { VIP: t.tierVIP, Standard: t.tierStandard, Other: t.tierOther };

    const rows = useMemo(() => {
        return customers
            .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
            .map(customer => {
                const projects = allProjects.filter(p => p.customerId === customer.id);
                const contracts = allMaintenanceContracts.filter(c => c.customerId === customer.id);
                const atRiskCount = contracts.filter(c => getContractRiskStatus(c.endDate) !== 'active').length;
                return { customer, projectCount: projects.length, contractCount: contracts.length, atRiskCount };
            })
            .sort((a, b) => a.customer.name.localeCompare(b.customer.name, language === 'ar' ? 'ar' : 'en'));
    }, [customers, allProjects, allMaintenanceContracts, search, language]);

    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <div className="w-full md:w-64 relative">
                        <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t.search}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-9 pr-3 rtl:pr-9 rtl:pl-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    {isManagerOrPM && (
                        <button
                            onClick={() => setIsAddOpen(true)}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20 whitespace-nowrap"
                        >
                            + {t.addCustomer}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {rows.length === 0 ? (
                    <div className="py-12 text-center opacity-30 italic text-sm">{t.noCustomers}</div>
                ) : (
                    <table className="w-full text-left rtl:text-right">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.colName}</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.colTier}</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.colStatus}</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.colProjects}</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.colContracts}</th>
                                <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.colAtRisk}</th>
                                {isManagerOrPM && <th className="px-5 py-3"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                            {rows.map(({ customer, projectCount, contractCount, atRiskCount }) => (
                                <tr
                                    key={customer.id}
                                    onClick={() => onViewCustomer(customer)}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                                >
                                    <td className="px-5 py-3 text-sm font-bold text-slate-800 dark:text-white">{customer.name}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${tierColors[customer.tier] || tierColors.Standard}`}>{tierLabels[customer.tier] || customer.tier}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${statusColors[customer.status] || statusColors.active}`}>{statusLabels[customer.status] || customer.status}</span>
                                    </td>
                                    <td className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 text-center">{projectCount}</td>
                                    <td className="px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 text-center">{contractCount}</td>
                                    <td className="px-5 py-3 text-center">
                                        {atRiskCount > 0 ? (
                                            <span className="text-[9px] font-black text-red-500 bg-red-500/10 uppercase tracking-widest px-2 py-1 rounded-lg">{t.atRisk} ({atRiskCount})</span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                    </td>
                                    {isManagerOrPM && (
                                        <td className="px-5 py-3 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); }}
                                                className="p-1.5 text-slate-400 hover:text-violet-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddOpen && (
                <AddEditCustomerModal
                    allUsers={allUsers}
                    onClose={() => setIsAddOpen(false)}
                    onAddCustomer={onAddCustomer}
                    language={language}
                />
            )}
            {editingCustomer && (
                <AddEditCustomerModal
                    customerToEdit={editingCustomer}
                    allUsers={allUsers}
                    onClose={() => setEditingCustomer(null)}
                    onUpdateCustomer={onUpdateCustomer}
                    language={language}
                />
            )}
        </div>
    );
};

export default Customers;
