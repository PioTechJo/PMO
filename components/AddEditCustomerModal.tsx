
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, CustomerTier, CustomerStatus, User, Language } from '../types';
import SearchableSelect from './SearchableSelect';

interface AddEditCustomerModalProps {
    customerToEdit?: Customer | null;
    allUsers: User[];
    onClose: () => void;
    onAddCustomer?: (data: Omit<Customer, 'id' | 'owner'>) => Promise<void>;
    onUpdateCustomer?: (customerId: string, data: Omit<Customer, 'id' | 'owner'>) => Promise<void>;
    language: Language;
}

const translations = {
    ar: {
        addTitle: "إضافة عميل جديد", editTitle: "تعديل العميل",
        name: "اسم العميل", contactName: "اسم شخص التواصل", contactEmail: "بريد التواصل", contactPhone: "هاتف التواصل",
        industry: "القطاع", tier: "الفئة", status: "حالة العلاقة", owner: "المسؤول الداخلي",
        tierVIP: "VIP", tierStandard: "عادي", tierOther: "أخرى",
        statusActive: "نشط", statusProspect: "عميل محتمل", statusChurned: "منسحب",
        selectHere: "اختر...", cancel: "إلغاء", add: "إضافة", update: "تحديث",
        submitting: "جارٍ الحفظ...", errorPrefix: "خطأ: ",
    },
    en: {
        addTitle: "New Customer", editTitle: "Edit Customer",
        name: "Customer Name", contactName: "Contact Person", contactEmail: "Contact Email", contactPhone: "Contact Phone",
        industry: "Industry", tier: "Tier", status: "Relationship Status", owner: "Account Owner",
        tierVIP: "VIP", tierStandard: "Standard", tierOther: "Other",
        statusActive: "Active", statusProspect: "Prospect", statusChurned: "Churned",
        selectHere: "Select...", cancel: "Cancel", add: "Add Customer", update: "Update",
        submitting: "Saving...", errorPrefix: "Error: ",
    }
};

const AddEditCustomerModal: React.FC<AddEditCustomerModalProps> = ({ customerToEdit, allUsers, onClose, onAddCustomer, onUpdateCustomer, language }) => {
    const t = translations[language];
    const isEditing = !!customerToEdit;

    const [formData, setFormData] = useState({
        name: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        industry: '',
        tier: 'Standard' as CustomerTier,
        status: 'active' as CustomerStatus,
        ownerId: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name,
                contactName: customerToEdit.contactName || '',
                contactEmail: customerToEdit.contactEmail || '',
                contactPhone: customerToEdit.contactPhone || '',
                industry: customerToEdit.industry || '',
                tier: customerToEdit.tier || 'Standard',
                status: customerToEdit.status || 'active',
                ownerId: customerToEdit.ownerId || '',
            });
        }
    }, [customerToEdit]);

    const ownerOptions = useMemo(() =>
        allUsers.filter(u => u.type === 'Manager' || u.type === 'PM').map(u => ({ value: u.id, label: u.name })),
        [allUsers]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setError(null);
        setIsSubmitting(true);
        try {
            const submissionData = {
                name: formData.name.trim(),
                contactName: formData.contactName.trim() || null,
                contactEmail: formData.contactEmail.trim() || null,
                contactPhone: formData.contactPhone.trim() || null,
                industry: formData.industry.trim() || null,
                tier: formData.tier,
                status: formData.status,
                ownerId: formData.ownerId || null,
            };

            if (isEditing && customerToEdit && onUpdateCustomer) {
                await onUpdateCustomer(customerToEdit.id, submissionData);
            } else if (onAddCustomer) {
                await onAddCustomer(submissionData);
            }
            onClose();
        } catch (err: any) {
            setError(t.errorPrefix + (err.message || "Connection failed"));
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-xs";
    const selectClasses = inputClasses;
    const labelClasses = "block text-[10px] font-black text-slate-400 uppercase mb-1";

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-visible" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 rounded-t-3xl">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{isEditing ? t.editTitle : t.addTitle}</h2>
                    <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">&times;</button>
                </div>

                <div className="p-5 space-y-4 rounded-b-3xl">
                    {error && <div className="p-2.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-xl">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={labelClasses}>{t.name}</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} className={inputClasses} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClasses}>{t.contactName}</label>
                                <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} disabled={isSubmitting} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>{t.contactEmail}</label>
                                <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} disabled={isSubmitting} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>{t.contactPhone}</label>
                                <input type="text" name="contactPhone" value={formData.contactPhone} onChange={handleChange} disabled={isSubmitting} className={inputClasses} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClasses}>{t.industry}</label>
                                <input type="text" name="industry" value={formData.industry} onChange={handleChange} disabled={isSubmitting} className={inputClasses} />
                            </div>
                            <div>
                                <label className={labelClasses}>{t.tier}</label>
                                <select name="tier" value={formData.tier} onChange={handleChange} disabled={isSubmitting} className={selectClasses}>
                                    <option value="VIP">{t.tierVIP}</option>
                                    <option value="Standard">{t.tierStandard}</option>
                                    <option value="Other">{t.tierOther}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>{t.status}</label>
                                <select name="status" value={formData.status} onChange={handleChange} disabled={isSubmitting} className={selectClasses}>
                                    <option value="active">{t.statusActive}</option>
                                    <option value="prospect">{t.statusProspect}</option>
                                    <option value="churned">{t.statusChurned}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>{t.owner}</label>
                                <SearchableSelect options={ownerOptions} value={formData.ownerId} onChange={(val: string) => setFormData(prev => ({ ...prev, ownerId: val }))} placeholder={t.selectHere} language={language} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.cancel}</button>
                            <button type="submit" disabled={isSubmitting} className="px-10 py-2.5 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 shadow-lg shadow-violet-500/20 flex items-center gap-2">
                                {isSubmitting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                {isSubmitting ? t.submitting : (isEditing ? t.update : t.add)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddEditCustomerModal;
