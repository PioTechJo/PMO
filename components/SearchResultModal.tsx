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
                    <blockquote className="p-4 bg-slate-100 dark:bg-slate-800/50 border-l-4 border-violet-500 dark:border-violet-400 rounded-r-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap italic">{result.summary}</p>
                    </blockquote>
                </div>
            );
        }

        if (result.resultType === 'KPIS' && result.kpis?.length) {
            return (
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t.kpiTitle}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.kpis.map((kpi, index) => (
                            <div key={index} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-center flex flex-col justify-center items-center shadow-sm">
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
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                             <span className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-violet-600 dark:text-violet-300" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM5.05 3.55a.75.75 0 01.04 1.06l-1.06 1.06a.75.75 0 01-1.1-1.06l1.06-1.06a.75.75 0 011.06-.04zM14.95 3.55a.75.75 0 011.06.04l1.06 1.06a.75.75 0 01-1.06 1.1l-1.06-1.06a.75.75 0 01-.04-1.06zM10 18a.75.75 0 01.75-.75h.01a.75.75 0 010 1.5H10a.75.75 0 01-.75-.75zM3.55 14.95a.75.75 0 011.06-.04l1.06 1.06a.75.75 0 01-1.1 1.06l-1.06-1.06a.75.75 0 01.04-1.06zM16.45 14.95a.75.75 0 01.04 1.06l-1.06 1.06a.75.75 0 01-1.1-1.06l1.06-1.06a.75.75 0 011.06-.04zM17.25 10a.75.75 0 01-1.5 0h.01a.75.75 0 010-1.5H17.25a.75.75 0 01.75.75zM2.75 10a.75.75 0 01-1.5 0h.01a.75.75 0 010-1.5H2.75a.75.75 0 01.75.75zM10 6a4 4 0 100 8 4 4 0 000-8zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
                                </svg>
                             </span>
                             {t.title}
                        </h2>
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
