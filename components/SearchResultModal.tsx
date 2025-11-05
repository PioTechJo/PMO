import React from 'react';
import { AnalysisResult, Language } from '../types';

interface SearchResultModalProps {
    result: AnalysisResult;
    onClose: () => void;
    language: Language;
}

const translations = {
    ar: {
        title: "نتيجة بحث المساعد الذكي",
        summaryTitle: "ملخص",
        kpiTitle: "مؤشرات الأداء الرئيسية",
        close: "إغلاق",
    },
    en: {
        title: "AI Assistant Search Result",
        summaryTitle: "Summary",
        kpiTitle: "Key Performance Indicators",
        close: "Close",
    }
};

const SearchResultModal: React.FC<SearchResultModalProps> = ({ result, onClose, language }) => {
    const t = translations[language];

    const renderContent = () => {
        if (result.resultType === 'SUMMARY' && result.summary) {
            return (
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{t.summaryTitle}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{result.summary}</p>
                </div>
            );
        }

        if (result.resultType === 'KPIS' && result.kpis?.length) {
            return (
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t.kpiTitle}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.kpis.map((kpi, index) => (
                            <div key={index} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{kpi.title}</p>
                                <p className="text-3xl font-bold text-violet-600 dark:text-violet-400 mt-1">{kpi.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-lg m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    
                    <div className="py-4">
                        {renderContent()}
                    </div>
                    
                    <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">
                            {t.close}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultModal;
