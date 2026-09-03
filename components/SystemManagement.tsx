
import React, { useState, useEffect } from 'react';
import { Lookups, Language, Lookup, RolePermissions, View, User } from '../types';
import LookupEditor from './LookupEditor';
import AuditLog from './AuditLog';

interface SystemManagementProps {
    lookups: Lookups;
    onUpdate: (lookupType: keyof Lookups, newLookups: Lookup[]) => void;
    language: Language;
    onSaveConfig: (supabaseKey: string, supabaseUrl: string) => void;
    isSetupMode?: boolean;
    rolePermissions: RolePermissions[];
    onUpdatePermissions: (newPermissions: RolePermissions[]) => void;
    allUsers?: User[];
    currentUser?: User;
}

const SystemManagement: React.FC<SystemManagementProps> = ({ lookups, onUpdate, language, onSaveConfig, isSetupMode = false, rolePermissions, onUpdatePermissions, allUsers = [], currentUser }) => {
    const [supabaseKey, setSupabaseKey] = useState('');
    const [supabaseUrl, setSupabaseUrl] = useState('https://dcamlinhazzmbaldsrdo.supabase.co');
    const [activeTab, setActiveTab] = useState<'lookups' | 'permissions' | 'auditLog'>('lookups');
    const isManager = currentUser?.type === 'Manager';

    useEffect(() => {
        if (isSetupMode) {
            setSupabaseKey(localStorage.getItem('supabaseAnonKey') || '');
            setSupabaseUrl(localStorage.getItem('supabaseUrl') || 'https://dcamlinhazzmbaldsrdo.supabase.co');
        }
    }, [isSetupMode]);

    const translations = {
        ar: {
            title: "إدارة النظام", subtitle: "تكوين إعدادات التطبيق وجداول البحث والصلاحيات.", configTitle: "إعدادات الاتصال", configSubtitle: "أدخل مفتاح وبيانات Supabase للاتصال بقاعدة البيانات.",
            supabaseLabel: "مفتاح Supabase Anon", supabaseUrlLabel: "رابط Supabase URL", saveConfig: "حفظ الإعدادات", setupTitle: "إعداد التطبيق لأول مرة",
            setupSubtitle: "مرحبًا بك! يرجى إدخل بيانات الوصول اللازمة.", lookupsTitle: "جداول البحث", 
            countries: "الدول", categories: "الفئات", teams: "الفرق", products: "المنتجات", statuses: "حالات المشروع",
            permissionsTitle: "إدارة صلاحيات الأدوار", permissionsSubtitle: "حدد الصفحات التي يمكن لكل دور الوصول إليها.",
            role: "الدور", views: "الصفحات المتاحة", config: "الإعدادات", lookups: "جداول البحث", permissions: "الصلاحيات", auditLog: "سجل التدقيق"
        },
        en: {
            title: "System Management", subtitle: "Configure settings, lookup tables and role permissions.", configTitle: "Connection Settings", configSubtitle: "Enter Supabase credentials to connect to your database.",
            supabaseLabel: "Supabase Anon Key", supabaseUrlLabel: "Supabase URL", saveConfig: "Save Settings", setupTitle: "First Time Setup",
            setupSubtitle: "Welcome! Please enter credentials.", lookupsTitle: "Lookup Tables",
            countries: "Countries", categories: "Categories", teams: "Teams", products: "Products", statuses: "Statuses",
            permissionsTitle: "Role Permissions Manager", permissionsSubtitle: "Define allowed views for each system role.",
            role: "Role", views: "Allowed Views", config: "Settings", lookups: "Lookups", permissions: "Permissions", auditLog: "Audit Log"
        }
    };
    const t = translations[language];

    const allAvailableViews: {id: View, label: string}[] = [
        { id: 'dashboard', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
        { id: 'paymentsTargetsDashboard', label: language === 'ar' ? 'لوحة المتابعة' : 'Dashboard' },
        { id: 'filter', label: language === 'ar' ? 'الفلاتر' : 'Filters' },
        { id: 'projects', label: language === 'ar' ? 'المشاريع' : 'Projects' },
        { id: 'customers', label: language === 'ar' ? 'العملاء' : 'Customers' },
        { id: 'milestones', label: language === 'ar' ? 'المعالم' : 'Milestones' },
        { id: 'team', label: language === 'ar' ? 'فريق العمل' : 'Team' },
        { id: 'payments', label: language === 'ar' ? 'المدفوعات' : 'Payments' },
        { id: 'reports', label: language === 'ar' ? 'التقارير' : 'Reports' },
        { id: 'maintenanceContracts', label: language === 'ar' ? 'عقود الصيانة' : 'Maintenance Contracts' },
        { id: 'maintenanceOverview', label: language === 'ar' ? 'نظرة عامة على الصيانة' : 'Maintenance Overview' },
        { id: 'issues', label: language === 'ar' ? 'سجل الأعطال' : 'Issues Log' },
        { id: 'internalTasks', label: language === 'ar' ? 'المهام الداخلية' : 'Internal Tasks' },
        { id: 'customerTasks', label: language === 'ar' ? 'مهام العملاء' : 'Customer Tasks' },
        { id: 'system', label: language === 'ar' ? 'إدارة النظام' : 'System Mgt' },
        { id: 'clientIssues', label: language === 'ar' ? 'بوابة العملاء' : 'Client Portal' },
    ];

    const togglePermission = (role: string, view: View) => {
        const newPermissions = rolePermissions.map(rp => {
            if (rp.role === role) {
                const alreadyAllowed = rp.allowedViews.includes(view);
                return {
                    ...rp,
                    allowedViews: alreadyAllowed 
                        ? rp.allowedViews.filter(v => v !== view) 
                        : [...rp.allowedViews, view]
                };
            }
            return rp;
        });
        onUpdatePermissions(newPermissions);
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-24">
            <div className="text-center md:text-start">
                <h1 className="text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{isSetupMode ? t.setupTitle : t.title}</h1>
                <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">{isSetupMode ? t.setupSubtitle : t.subtitle}</p>
            </div>

            {!isSetupMode && (
                <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-max">
                    <button onClick={() => setActiveTab('lookups')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'lookups' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-600'}`}>{t.lookups}</button>
                    <button onClick={() => setActiveTab('permissions')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissions' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-600'}`}>{t.permissions}</button>
                    {isManager && (
                        <button onClick={() => setActiveTab('auditLog')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'auditLog' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-600'}`}>{t.auditLog}</button>
                    )}
                </div>
            )}

            {isSetupMode && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-1">{t.configTitle}</h2>
                    <p className="text-xs text-slate-400 mb-8">{t.configSubtitle}</p>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-violet-600 uppercase mb-2">{t.supabaseUrlLabel}</label>
                            <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 text-sm font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-violet-600 uppercase mb-2">{t.supabaseLabel}</label>
                            <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500 text-sm font-bold" />
                        </div>
                        <div className="text-end pt-4">
                            <button onClick={() => onSaveConfig(supabaseKey, supabaseUrl)} className="px-12 py-3.5 text-xs font-black text-white bg-violet-600 rounded-2xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 uppercase tracking-widest">
                                {t.saveConfig}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'lookups' && !isSetupMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <LookupEditor title={t.countries} initialValues={lookups.countries} onSave={(v) => onUpdate('countries', v as Lookup[])} language={language} />
                    <LookupEditor title={t.categories} initialValues={lookups.categories} onSave={(v) => onUpdate('categories', v as Lookup[])} language={language} />
                    <LookupEditor title={t.teams} initialValues={lookups.teams} onSave={(v) => onUpdate('teams', v as Lookup[])} language={language} />
                    <LookupEditor title={t.products} initialValues={lookups.products} onSave={(v) => onUpdate('products', v as Lookup[])} language={language} />
                    <LookupEditor title={t.statuses} initialValues={lookups.projectStatuses} onSave={(v) => onUpdate('projectStatuses', v as Lookup[])} language={language} />
                </div>
            )}

            {activeTab === 'permissions' && !isSetupMode && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl animate-in fade-in zoom-in-95">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-1">{t.permissionsTitle}</h2>
                    <p className="text-xs text-slate-400 mb-8">{t.permissionsSubtitle}</p>
                    
                    <div className="space-y-8">
                        {rolePermissions.map(rolePerm => (
                            <div key={rolePerm.role} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <span className="text-sm font-black">{rolePerm.role}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{rolePerm.role} Access Profile</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{rolePerm.allowedViews.length} pages enabled</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {allAvailableViews.map(viewDef => {
                                        const isAllowed = rolePerm.allowedViews.includes(viewDef.id);
                                        return (
                                            <label 
                                                key={viewDef.id} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group ${isAllowed ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAllowed} 
                                                    onChange={() => togglePermission(rolePerm.role, viewDef.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                                />
                                                <span className={`text-[10px] font-black uppercase tracking-tight ${isAllowed ? 'text-violet-700 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>{viewDef.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'auditLog' && !isSetupMode && isManager && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl animate-in fade-in zoom-in-95">
                    <AuditLog allUsers={allUsers} language={language} />
                </div>
            )}
        </div>
    );
};

export default SystemManagement;
