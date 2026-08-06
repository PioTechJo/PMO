
import React, { useEffect, useState } from 'react';
import { Customer, Project, Milestone, MaintenanceContract, CustomerActivityLog, ActivityLogType, CustomerContact, Issue, Language, User, PaymentStatus } from '../types';
import { fetchCustomerActivities, addCustomerActivity, fetchCustomerContacts, addCustomerContact } from '../services/api';
import { getPaymentStatusLabel } from '../services/paymentStatusLabels';
import { getContractRiskStatus, ContractRiskStatus } from '../services/maintenanceStatus';
import AddEditCustomerModal from './AddEditCustomerModal';

interface CustomerProfileModalProps {
    customer: Customer;
    projects: Project[];
    milestones: Milestone[];
    maintenanceContracts: MaintenanceContract[];
    issues: Issue[];
    allUsers: User[];
    language: Language;
    currentUser?: User;
    onClose: () => void;
    onUpdateCustomer: (customerId: string, data: Omit<Customer, 'id' | 'owner'>) => Promise<void>;
}

const riskColors: Record<ContractRiskStatus, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'renewal-due': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    expired: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

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

const activityIcons: Record<ActivityLogType, React.ReactNode> = {
    call: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
    meeting: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    email: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    visit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    other: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
};

const InfoItem: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
            {children || value || '--'}
        </div>
    </div>
);

const translations = {
    ar: {
        projects: "المشاريع", noProjects: "لا توجد مشاريع لهذا العميل.",
        milestonesPayments: "المعالم والدفعات", noMilestones: "لا توجد معالم.",
        maintenanceContracts: "عقود الصيانة", noContracts: "لا توجد عقود صيانة.",
        riskBanner: "هذا العميل عنده عقود تحتاج انتباه (تجديد قريب أو منتهية).",
        activityLog: "سجل التفاعلات", noActivities: "لا يوجد تفاعلات مسجلة بعد.",
        addActivity: "تسجيل تفاعل جديد", type: "النوع", note: "ملاحظة", notePlaceholder: "اكتب تفصيل المكالمة/الاجتماع...",
        submit: "حفظ", submitting: "جارٍ الحفظ...",
        call: "مكالمة", meeting: "اجتماع", email: "بريد إلكتروني", visit: "زيارة", other: "أخرى",
        active: "نشط", 'renewal-due': "قريب التجديد", expired: "منتهي",
        status: "الحالة", dueDate: "تاريخ الاستحقاق", payment: "الدفعة", code: "الكود", closeBtn: "إغلاق",
        openProjects: "مشاريع مفتوحة", contractsAtRisk: "عقود تحتاج انتباه",
        Pending: "معلق", "In Progress": "قيد التنفيذ", Completed: "مكتمل",
        startDate: "البداية", endDate: "الانتهاء", amount: "المبلغ",
        contactName: "شخص التواصل", contactEmail: "البريد", contactPhone: "الهاتف", industry: "القطاع", owner: "المسؤول",
        tierVIP: "VIP", tierStandard: "عادي", tierOther: "أخرى",
        statusActive: "نشط", statusProspect: "محتمل", statusChurned: "منسحب",
        contacts: "أشخاص التواصل", noContacts: "لا يوجد أشخاص تواصل مسجلين.", addContact: "إضافة شخص تواصل",
        contactPersonName: "الاسم", role: "المنصب", primary: "رئيسي",
        relatedTasks: "المهام المرتبطة", noTasks: "لا توجد مهام مرتبطة بمشاريع هذا العميل.",
        taskTitle: "المهمة", assignee: "المسؤول", unassigned: "غير معين", edit: "تعديل",
    },
    en: {
        projects: "Projects", noProjects: "No projects for this customer.",
        milestonesPayments: "Milestones & Payments", noMilestones: "No milestones.",
        maintenanceContracts: "Maintenance Contracts", noContracts: "No maintenance contracts.",
        riskBanner: "This customer has contracts that need attention (renewal due or expired).",
        activityLog: "Activity Log", noActivities: "No activity logged yet.",
        addActivity: "Log New Activity", type: "Type", note: "Note", notePlaceholder: "What was discussed...",
        submit: "Save", submitting: "Saving...",
        call: "Call", meeting: "Meeting", email: "Email", visit: "Visit", other: "Other",
        active: "Active", 'renewal-due': "Renewal Due", expired: "Expired",
        status: "Status", dueDate: "Due Date", payment: "Payment", code: "Code", closeBtn: "Close",
        openProjects: "Open Projects", contractsAtRisk: "Contracts Needing Attention",
        Pending: "Pending", "In Progress": "In Progress", Completed: "Completed",
        startDate: "Start", endDate: "End", amount: "Amount",
        contactName: "Contact", contactEmail: "Email", contactPhone: "Phone", industry: "Industry", owner: "Owner",
        tierVIP: "VIP", tierStandard: "Standard", tierOther: "Other",
        statusActive: "Active", statusProspect: "Prospect", statusChurned: "Churned",
        contacts: "Contacts", noContacts: "No contacts recorded yet.", addContact: "Add Contact",
        contactPersonName: "Name", role: "Role", primary: "Primary",
        relatedTasks: "Related Tasks", noTasks: "No tasks tied to this customer's projects.",
        taskTitle: "Task", assignee: "Assignee", unassigned: "Unassigned", edit: "Edit",
    }
};

const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ customer, projects, milestones, maintenanceContracts, issues, allUsers, language, currentUser, onClose, onUpdateCustomer }) => {
    const t = translations[language];
    const [activities, setActivities] = useState<CustomerActivityLog[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const [newType, setNewType] = useState<ActivityLogType>('call');
    const [newNote, setNewNote] = useState('');
    const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);

    const [contacts, setContacts] = useState<CustomerContact[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);
    const [newContactName, setNewContactName] = useState('');
    const [newContactRole, setNewContactRole] = useState('');
    const [newContactEmail, setNewContactEmail] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [isSubmittingContact, setIsSubmittingContact] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);

    const loadActivities = async () => {
        setIsLoadingActivities(true);
        try {
            const data = await fetchCustomerActivities(customer.id);
            setActivities(data);
        } finally {
            setIsLoadingActivities(false);
        }
    };

    const loadContacts = async () => {
        setIsLoadingContacts(true);
        try {
            const data = await fetchCustomerContacts(customer.id);
            setContacts(data);
        } finally {
            setIsLoadingContacts(false);
        }
    };

    useEffect(() => { loadActivities(); loadContacts(); }, [customer.id]);

    const formatDate = (dateString: string | null | undefined) => dateString ? new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '--';
    const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
    const formatCurrency = (val: number) => val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const contractsWithRisk = maintenanceContracts.map(c => ({ contract: c, risk: getContractRiskStatus(c.endDate) }));
    const atRiskCount = contractsWithRisk.filter(c => c.risk !== 'active').length;
    const relatedIssues = issues.filter(i => projects.some(p => p.id === i.projectId));

    const statusLabels: Record<string, string> = { active: t.statusActive, prospect: t.statusProspect, churned: t.statusChurned };
    const tierLabels: Record<string, string> = { VIP: t.tierVIP, Standard: t.tierStandard, Other: t.tierOther };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !currentUser) return;
        setIsSubmittingActivity(true);
        try {
            await addCustomerActivity(customer.id, newType, newNote.trim(), currentUser.id);
            setNewNote('');
            await loadActivities();
        } finally {
            setIsSubmittingActivity(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContactName.trim()) return;
        setIsSubmittingContact(true);
        try {
            await addCustomerContact(customer.id, {
                name: newContactName.trim(),
                role: newContactRole.trim() || null,
                email: newContactEmail.trim() || null,
                phone: newContactPhone.trim() || null,
                isPrimary: contacts.length === 0,
            });
            setNewContactName(''); setNewContactRole(''); setNewContactEmail(''); setNewContactPhone('');
            await loadContacts();
        } finally {
            setIsSubmittingContact(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity p-4">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-4xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{customer.name}</h2>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${tierColors[customer.tier] || tierColors.Standard}`}>{tierLabels[customer.tier] || customer.tier}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${statusColors[customer.status] || statusColors.active}`}>{statusLabels[customer.status] || customer.status}</span>
                            <button onClick={() => setIsEditOpen(true)} className="text-[10px] font-black uppercase text-violet-500 hover:text-violet-700 tracking-widest">{t.edit}</button>
                        </div>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Contact info + KPI chips */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InfoItem label={t.contactName} value={customer.contactName} />
                            <InfoItem label={t.contactEmail} value={customer.contactEmail} />
                            <InfoItem label={t.contactPhone} value={customer.contactPhone} />
                            <InfoItem label={t.industry} value={customer.industry} />
                            <InfoItem label={t.owner}>
                                {customer.owner ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-900 flex items-center justify-center text-[10px] font-bold text-violet-700 dark:text-violet-200">
                                            {customer.owner.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                        <span>{customer.owner.name}</span>
                                    </div>
                                ) : '--'}
                            </InfoItem>
                            <InfoItem label={t.openProjects} value={String(projects.length)} />
                            {atRiskCount > 0 && <InfoItem label={t.contractsAtRisk}><span className="text-red-600 dark:text-red-400">{atRiskCount}</span></InfoItem>}
                        </div>

                        {/* Projects */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.projects} ({projects.length})</h3>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {projects.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{customer.name}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.status}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.code}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {projects.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{p.name}</td>
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{p.status?.name || '--'}</td>
                                                    <td className="p-3 text-center font-mono text-xs text-slate-500">{p.projectCode}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noProjects}</div>
                                )}
                            </div>
                        </div>

                        {/* Milestones / Payments */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.milestonesPayments} ({milestones.length})</h3>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {milestones.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.milestonesPayments}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.dueDate}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.payment}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {milestones.map(m => (
                                                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{m.title}</td>
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{formatDate(m.dueDate)}</td>
                                                    <td className="p-3 text-center">
                                                        {m.hasPayment ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-500">{getPaymentStatusLabel(m.paymentStatus || PaymentStatus.Pending, language)}</span>
                                                                <span className="font-mono font-bold text-green-600 dark:text-green-400 text-xs">{formatCurrency(m.paymentAmount)}</span>
                                                            </div>
                                                        ) : <span className="text-slate-300 dark:text-slate-600">--</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noMilestones}</div>
                                )}
                            </div>
                        </div>

                        {/* Maintenance Contracts */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.maintenanceContracts} ({maintenanceContracts.length})</h3>
                            {atRiskCount > 0 && (
                                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/50 rounded-xl text-sm text-red-600 dark:text-red-400 font-bold">
                                    {t.riskBanner}
                                </div>
                            )}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {contractsWithRisk.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.code}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.endDate}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.amount}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.status}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {contractsWithRisk.map(({ contract, risk }) => (
                                                <tr key={contract.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-mono text-xs text-slate-500">{contract.projectCode || '--'}</td>
                                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{formatDate(contract.endDate)}</td>
                                                    <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(contract.totalAmount)}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${riskColors[risk]}`}>{t[risk]}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noContracts}</div>
                                )}
                            </div>
                        </div>

                        {/* Related Tasks */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.relatedTasks} ({relatedIssues.length})</h3>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {relatedIssues.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.taskTitle}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.assignee}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.status}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {relatedIssues.map(issue => (
                                                <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{issue.title}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{issue.assignee?.name || <span className="italic text-slate-400">{t.unassigned}</span>}</td>
                                                    <td className="p-3 text-center">
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 whitespace-nowrap">{issue.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noTasks}</div>
                                )}
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.contacts} ({contacts.length})</h3>

                            <form onSubmit={handleAddContact} className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder={t.contactPersonName} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-500" />
                                    <input type="text" value={newContactRole} onChange={(e) => setNewContactRole(e.target.value)} placeholder={t.role} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-500" />
                                    <input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder={t.contactEmail} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-500" />
                                    <input type="text" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder={t.contactPhone} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-500" />
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" disabled={isSubmittingContact || !newContactName.trim()} className="px-6 py-2 bg-violet-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-violet-700 transition-colors disabled:opacity-50">
                                        {isSubmittingContact ? t.submitting : t.addContact}
                                    </button>
                                </div>
                            </form>

                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {isLoadingContacts ? (
                                    <div className="p-6 text-center text-slate-400 text-sm italic">...</div>
                                ) : contacts.length > 0 ? (
                                    <table className="w-full text-sm text-left rtl:text-right">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.contactPersonName}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.role}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.contactEmail}</th>
                                                <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.contactPhone}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {contacts.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                        {c.name}
                                                        {c.isPrimary && <span className="text-[8px] font-black uppercase text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">{t.primary}</span>}
                                                    </td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{c.role || '--'}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{c.email || '--'}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{c.phone || '--'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noContacts}</div>
                                )}
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 tracking-tight">{t.activityLog} ({activities.length})</h3>

                            {currentUser && (
                                <form onSubmit={handleAddActivity} className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <select
                                            value={newType}
                                            onChange={(e) => setNewType(e.target.value as ActivityLogType)}
                                            className="md:w-48 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-violet-500"
                                        >
                                            {(['call', 'meeting', 'email', 'visit', 'other'] as ActivityLogType[]).map(type => (
                                                <option key={type} value={type}>{t[type]}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder={t.notePlaceholder}
                                            className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-violet-500"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmittingActivity || !newNote.trim()}
                                            className="px-6 py-2 bg-violet-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-violet-700 transition-colors disabled:opacity-50"
                                        >
                                            {isSubmittingActivity ? t.submitting : t.submit}
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-2">
                                {isLoadingActivities ? (
                                    <div className="p-6 text-center text-slate-400 text-sm italic">...</div>
                                ) : activities.length > 0 ? activities.map(a => (
                                    <div key={a.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                                            {activityIcons[a.type]}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">{t[a.type]}</span>
                                                <span className="text-[10px] text-slate-400 font-bold shrink-0">{formatDateTime(a.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{a.note}</p>
                                            {a.user?.name && <p className="text-[10px] text-slate-400 mt-1">{a.user.name}</p>}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-slate-500 italic">{t.noActivities}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isEditOpen && (
                <AddEditCustomerModal
                    customerToEdit={customer}
                    allUsers={allUsers}
                    onClose={() => setIsEditOpen(false)}
                    onUpdateCustomer={onUpdateCustomer}
                    language={language}
                />
            )}
        </div>
    );
};

export default CustomerProfileModal;
