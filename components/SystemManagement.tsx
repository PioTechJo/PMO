
import React, { useState, useEffect } from 'react';
import { Lookups, Language, Lookup, User } from '../types';
import LookupEditor from './LookupEditor';

interface SystemManagementProps {
    lookups: Lookups;
    onUpdate: (lookupType: keyof Lookups, newLookups: Lookup[]) => void;
    language: Language;
    onSaveConfig: (supabaseKey: string, supabaseUrl: string) => void;
    isSetupMode?: boolean;
}

const SystemManagement: React.FC<SystemManagementProps> = ({ lookups, onUpdate, language, onSaveConfig, isSetupMode = false }) => {
    const [supabaseKey, setSupabaseKey] = useState('');
    const [supabaseUrl, setSupabaseUrl] = useState('https://dcamlinhazzmbaldsrdo.supabase.co');

    useEffect(() => {
        if (!isSetupMode) {
            setSupabaseKey(localStorage.getItem('supabaseAnonKey') || '');
            setSupabaseUrl(localStorage.getItem('supabaseUrl') || 'https://dcamlinhazzmbaldsrdo.supabase.co');
        }
    }, [isSetupMode]);

    const translations = {
        ar: {
            title: "إدارة النظام", subtitle: "تكوين إعدادات التطبيق وجداول البحث.", configTitle: "إعدادات الاتصال", configSubtitle: "أدخل مفتاح وبيانات Supabase للاتصال بقاعدة البيانات.",
            supabaseLabel: "مفتاح Supabase Anon", supabaseUrlLabel: "رابط Supabase URL", saveConfig: "حفظ الإعدادات والبدء", setupTitle: "إعداد التطبيق لأول مرة",
            setupSubtitle: "مرحبًا بك! يرجى إدخال بيانات الوصول اللازمة لتشغيل النظام الخاص بك.", lookupsTitle: "جداول البحث", lookupsSubtitle: "إدارة القيم للاختيارات المنسدلة في التطبيق.",
            countries: "الدول", categories: "الفئات", teams: "الفرق", products: "المنتجات", statuses: "حالات المشروع", customers: "العملاء",
        },
        en: {
            title: "System Management", subtitle: "Configure application settings and lookup tables.", configTitle: "Connection Settings", configSubtitle: "Enter Supabase credentials to connect to your database.",
            supabaseLabel: "Supabase Anon Key", supabaseUrlLabel: "Supabase Project URL", saveConfig: "Save and Initialize", setupTitle: "First Time Setup",
            setupSubtitle: "Welcome! Please enter your database credentials to run the application.", lookupsTitle: "Lookup Tables", lookupsSubtitle: "Manage values for dropdown selections in the application.",
            countries: "Countries", categories: "Categories", teams: "Teams", products: "Products", statuses: "Project Statuses", customers: "Customers",
        }
    };
    const t = translations[language];

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-8">
            <div className="text-center md:text-start">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{isSetupMode ? t.setupTitle : t.title}</h1>
                <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">{isSetupMode ? t.setupSubtitle : t.subtitle}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-1">{t.configTitle}</h2>
                <p className="text-xs text-slate-400 mb-8">{t.configSubtitle}</p>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-violet-600 uppercase mb-2">{t.supabaseUrlLabel}</label>
                        <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-violet-600 uppercase mb-2">{t.supabaseLabel}</label>
                        <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                    </div>
                     <div className="text-end pt-4">
                        <button onClick={() => onSaveConfig(supabaseKey, supabaseUrl)} className="px-10 py-3 text-xs font-black text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 uppercase tracking-widest">
                            {t.saveConfig}
                        </button>
                    </div>
                </div>
            </div>
            
            {!isSetupMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LookupEditor title={t.countries} initialValues={lookups.countries} onSave={(v) => onUpdate('countries', v as Lookup[])} language={language} />
                    <LookupEditor title={t.categories} initialValues={lookups.categories} onSave={(v) => onUpdate('categories', v as Lookup[])} language={language} />
                    <LookupEditor title={t.teams} initialValues={lookups.teams} onSave={(v) => onUpdate('teams', v as Lookup[])} language={language} />
                    <LookupEditor title={t.products} initialValues={lookups.products} onSave={(v) => onUpdate('products', v as Lookup[])} language={language} />
                    <LookupEditor title={t.statuses} initialValues={lookups.projectStatuses} onSave={(v) => onUpdate('projectStatuses', v as Lookup[])} language={language} />
                    <LookupEditor title={t.customers} initialValues={lookups.customers} onSave={(v) => onUpdate('customers', v as Lookup[])} language={language} />
                </div>
            )}
        </div>
    );
};

export default SystemManagement;
