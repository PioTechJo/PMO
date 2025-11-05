import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
    language: Language;
    setLanguage: (language: Language) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ language, setLanguage }) => {
    const isArabic = language === 'ar';

    return (
        <div className="relative flex items-center bg-slate-800 rounded-full p-1 w-[140px] h-10 shadow-inner">
            <span
                className={`absolute top-1 h-8 w-[65px] bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-md transition-transform duration-300 ease-in-out ${
                    isArabic ? 'transform translate-x-[2px]' : 'transform translate-x-[67px]'
                }`}
            />
            <button
                onClick={() => setLanguage('ar')}
                className={`relative z-10 w-1/2 h-full rounded-full text-sm font-bold transition-colors duration-300 ${
                    isArabic ? 'text-white' : 'text-slate-300'
                }`}
            >
                العربية
            </button>
            <button
                onClick={() => setLanguage('en')}
                className={`relative z-10 w-1/2 h-full rounded-full text-sm font-bold transition-colors duration-300 ${
                    !isArabic ? 'text-white' : 'text-slate-300'
                }`}
            >
                English
            </button>
        </div>
    );
};

export default LanguageSwitcher;