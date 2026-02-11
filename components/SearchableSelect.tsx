import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Language } from '../types';

interface SearchableSelectProps {
    options: { value: string; label: string; }[];
    value: string | string[];
    onChange: (value: any) => void;
    placeholder: string;
    searchPlaceholder?: string;
    language: Language;
    isMulti?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, searchPlaceholder, language, isMulti = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const translations = {
        ar: { noResults: "لا توجد نتائج", selected: "مختارة" },
        en: { noResults: "No results found", selected: "selected" }
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

    const selectedOptions = useMemo(() => {
        if (isMulti && Array.isArray(value)) {
            return options.filter(opt => value.includes(opt.value));
        }
        return options.find(opt => opt.value === value) ? [options.find(opt => opt.value === value)!] : [];
    }, [options, value, isMulti]);

    const filteredOptions = useMemo(() => {
        const baseOptions = isMulti ? options.filter(o => o.value !== 'all') : options;
        if (!searchTerm) return baseOptions;
        return baseOptions.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, isMulti]);

    const handleSelect = (optionValue: string) => {
        if (isMulti) {
            const currentValue = Array.isArray(value) ? value : [];
            let newValue;
            if (currentValue.includes(optionValue)) {
                newValue = currentValue.filter(v => v !== optionValue);
            } else {
                newValue = [...currentValue, optionValue];
            }
            onChange(newValue);
        } else {
            onChange(optionValue);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const toggleOpen = () => {
        setIsOpen(prev => !prev);
        if (isOpen) {
            setSearchTerm('');
        }
    };

    const displayLabel = useMemo(() => {
        if (isMulti && Array.isArray(value)) {
            if (value.length === 0) return placeholder;
            if (value.length === 1) return selectedOptions[0]?.label;
            return `${value.length} ${t.selected}`;
        }
        return selectedOptions[0]?.label || placeholder;
    }, [selectedOptions, value, isMulti, placeholder, t.selected]);

    const buttonClasses = "w-full p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";
    
    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={toggleOpen}
                className={`${buttonClasses} flex justify-between items-center text-left rtl:text-right`}
            >
                <span className="truncate">{displayLabel}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchPlaceholder || placeholder}
                            autoFocus
                            className="w-full p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm"
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => {
                                const isSelected = isMulti 
                                    ? (Array.isArray(value) && value.includes(option.value))
                                    : value === option.value;

                                return (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(option.value)}
                                            className={`w-full text-left rtl:text-right p-2 text-sm rounded-md transition-colors flex items-center gap-2 ${isSelected ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            {isMulti && (
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                                </div>
                                            )}
                                            <span className="truncate">{option.label}</span>
                                        </button>
                                    </li>
                                );
                            })
                        ) : (
                            <li className="p-4 text-sm text-center text-slate-500 dark:text-slate-400">
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