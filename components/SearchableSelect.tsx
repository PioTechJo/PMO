import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Language } from '../types';

interface SearchableSelectProps {
    options: { value: string; label: string; }[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    searchPlaceholder?: string;
    language: Language;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, searchPlaceholder, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const translations = {
        ar: { noResults: "لا توجد نتائج" },
        en: { noResults: "No results found" }
    };
    const t = translations[language];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const toggleOpen = () => {
        setIsOpen(prev => !prev);
        if (isOpen) {
            setSearchTerm('');
        }
    };

    const buttonClasses = "w-full p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";
    
    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={toggleOpen}
                className={`${buttonClasses} flex justify-between items-center text-left`}
            >
                <span className="truncate">{selectedOption?.label || placeholder}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-20">
                    <div className="p-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchPlaceholder || placeholder}
                            autoFocus
                            className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm"
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(option.value)}
                                        className={`w-full text-left p-2 text-sm rounded-md transition-colors ${value === option.value ? 'bg-violet-500 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="p-2 text-sm text-center text-slate-500 dark:text-slate-400">
                                {t.noResults}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;