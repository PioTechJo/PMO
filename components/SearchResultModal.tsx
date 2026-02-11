
import React from 'react';
import { AnalysisResult, Language } from '../types';

interface SearchResultModalProps {
    result: AnalysisResult;
    onClose: () => void;
    language: Language;
}

const translations = {
    ar: {
        title: "نتائج البحث الذكي",
        summaryTitle: "الملخص التحليلي",
        kpiTitle: "مؤشرات الأداء المكتشفة",
        errorTitle: "تنبيه من المساعد",
        close: "إغلاق",
        noData: "لم نتمكن من العثور على بيانات مطابقة بدقة، حاول تغيير صياغة السؤال.",
        retry: "إعادة المحاولة",
        aiLabel: "AI INSIGHTS"
    },
    en: {
        title: "AI Search Insights",
        summaryTitle: "Analytical Summary",
        kpiTitle: "Performance Metrics",
        errorTitle: "Assistant Notice",
        close: "Dismiss",
        noData: "No precise data found, try rephrasing your question.",
        retry: "Try Again",
        aiLabel: "AI INSIGHTS"
    }
};

const SearchResultModal: React.FC<SearchResultModalProps> = ({ result, onClose, language }) => {
    const t = translations[language];

    const renderContent = () => {
        if (result.resultType === 'ERROR') {
            return (
                <div className="flex flex-col items-center py-10 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 ring-4 ring-red-500/5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight">{t.errorTitle}</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-8">
                        {result.error || t.noData}
                    </p>
                    <button onClick={onClose} className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">
                        {t.close}
                    </button>
                </div>
            );
        }

        if (result.resultType === 'SUMMARY' && result.summary) {
            return (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-0.5 bg-violet-600 text-white text-[8px] font-black rounded uppercase">{t.aiLabel}</span>
                        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.summaryTitle}</h3>
                    </div>
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">{result.summary}</p>
                    </div>
                </div>
            );
        }

        if (result.resultType === 'KPIS' && result.kpis?.length) {
            return (
                 <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-0.5 bg-violet-600 text-white text-[8px] font-black rounded uppercase">{t.aiLabel}</span>
                        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.kpiTitle}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.kpis.map((kpi, index) => (
                            <div key={index} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:border-violet-500 transition-colors group">
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-2">{kpi.title}</p>
                                <p className="text-3xl font-black text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform origin-left">{kpi.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="text-center py-20">
                <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">{t.noData}</p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 transition-all duration-500">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">{t.title}</h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    
                    <div className="min-h-[200px]">
                        {renderContent()}
                    </div>
                    
                    {result.resultType !== 'ERROR' && (
                        <div className="flex justify-end mt-10 pt-6 border-t border-slate-50 dark:border-slate-800">
                            <button onClick={onClose} className="px-10 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-violet-600 transition-colors">
                                {t.close}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchResultModal;
