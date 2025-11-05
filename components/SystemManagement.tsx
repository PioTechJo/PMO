import React, { useState, useEffect } from 'react';
import { Lookups, Language, Lookup, User } from '../types';
import LookupEditor from './LookupEditor';

interface SystemManagementProps {
    lookups: Lookups;
    onUpdate: (lookupType: keyof Lookups, newLookups: Lookup[]) => void;
    language: Language;
    onSaveConfig: (supabaseKey: string) => void;
    isSetupMode?: boolean;
}

const SystemManagement: React.FC<SystemManagementProps> = ({ lookups, onUpdate, language, onSaveConfig, isSetupMode = false }) => {
    const [supabaseKey, setSupabaseKey] = useState('');

    useEffect(() => {
        if (!isSetupMode) {
            setSupabaseKey(localStorage.getItem('supabaseAnonKey') || '');
        }
    }, [isSetupMode]);

    const translations = {
        ar: {
            title: "إدارة النظام",
            subtitle: "تكوين إعدادات التطبيق وجداول البحث.",
            configTitle: "إعدادات الاتصال",
            configSubtitle: "أدخل مفتاح Supabase Anon المطلوب للاتصال بقاعدة البيانات.",
            supabaseLabel: "مفتاح Supabase Anon",
            saveConfig: "حفظ الإعدادات",
            setupTitle: "إعداد التطبيق",
            setupSubtitle: "مرحبًا بك! يرجى إدخال مفتاح Supabase Anon اللازم لتشغيل التطبيق.",
            lookupsTitle: "جداول البحث",
            lookupsSubtitle: "إدارة القيم للاختيارات المنسدلة في التطبيق.",
            countries: "الدول",
            categories: "الفئات",
            teams: "الفرق",
            products: "المنتجات",
            statuses: "حالات المشروع",
            customers: "العملاء",
        },
        en: {
            title: "System Management",
            subtitle: "Configure application settings and lookup tables.",
            configTitle: "Connection Settings",
            configSubtitle: "Enter the required Supabase Anon Key to connect to the database.",
            supabaseLabel: "Supabase Anon Key",
            saveConfig: "Save Configuration",
            setupTitle: "Application Setup",
            setupSubtitle: "Welcome! Please enter the necessary Supabase Anon Key to run the application.",
            lookupsTitle: "Lookup Tables",
            lookupsSubtitle: "Manage values for dropdown selections in the application.",
            countries: "Countries",
            categories: "Categories",
            teams: "Teams",
            products: "Products",
            statuses: "Project Statuses",
            customers: "Customers",
        }
    };
    const t = translations[language];

    const handleSave = () => {
        onSaveConfig(supabaseKey);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{isSetupMode ? t.setupTitle : t.title}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{isSetupMode ? t.setupSubtitle : t.subtitle}</p>
            </div>

            <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{t.configTitle}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.configSubtitle}</p>
                <div className="space-y-4 max-w-xl">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.supabaseLabel}</label>
                        <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white" />
                    </div>
                     <div className="text-end pt-2">
                        <button onClick={handleSave} className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity">
                            {t.saveConfig}
                        </button>
                    </div>
                </div>
            </div>
            
            {!isSetupMode && (
                <div>
                     <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{t.lookupsTitle}</h2>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.lookupsSubtitle}</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <LookupEditor title={t.countries} initialValues={lookups.countries} onSave={(v) => onUpdate('countries', v as Lookup[])} language={language} />
                        <LookupEditor title={t.categories} initialValues={lookups.categories} onSave={(v) => onUpdate('categories', v as Lookup[])} language={language} />
                        <LookupEditor title={t.teams} initialValues={lookups.teams} onSave={(v) => onUpdate('teams', v as Lookup[])} language={language} />
                        <LookupEditor title={t.products} initialValues={lookups.products} onSave={(v) => onUpdate('products', v as Lookup[])} language={language} />
                        <LookupEditor title={t.statuses} initialValues={lookups.projectStatuses} onSave={(v) => onUpdate('projectStatuses', v as Lookup[])} language={language} />
                        <LookupEditor title={t.customers} initialValues={lookups.customers} onSave={(v) => onUpdate('customers', v as Lookup[])} language={language} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemManagement;
