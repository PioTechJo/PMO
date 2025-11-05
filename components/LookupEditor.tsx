import React, { useState, useEffect } from 'react';
import { Language, Lookup } from '../types';

interface LookupEditorProps {
    title: string;
    initialValues: readonly Lookup[];
    onSave: (newValues: readonly Lookup[]) => void;
    language: Language;
}

const LookupEditor: React.FC<LookupEditorProps> = ({ title, initialValues, onSave, language }) => {
    const [values, setValues] = useState<Lookup[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [editId, setEditId] = useState<string | null>(null);

    useEffect(() => {
        // Deep copy to avoid mutating props
        setValues(initialValues.map(v => ({...v})));
    }, [initialValues]);

    const translations = {
        ar: {
            edit: "تعديل",
            delete: "حذف",
            update: "تحديث",
            add: "إضافة",
            placeholder: "أضف أو عدل قيمة...",
            save: "حفظ التغييرات"
        },
        en: {
            edit: "Edit",
            delete: "Delete",
            update: "Update",
            add: "Add",
            placeholder: "Add or edit value...",
            save: "Save Changes"
        }
    };
    const t = translations[language];


    const handleAddOrUpdate = () => {
        if (!inputValue.trim()) return;

        if (editId) { // We are updating an existing item
            setValues(values.map(v => v.id === editId ? { ...v, name: inputValue } : v));
        } else { // We are adding a new item
            const newItem: Lookup = {
                id: crypto.randomUUID(), // Generate a client-side UUID for the new item
                name: inputValue
            };
            setValues([...values, newItem]);
        }
        setInputValue('');
        setEditId(null);
    };

    const handleRemove = (idToRemove: string) => {
        setValues(values.filter(v => v.id !== idToRemove));
    };

    const handleEdit = (item: Lookup) => {
        setEditId(item.id);
        setInputValue(item.name);
    };
    
    const handleSave = () => {
        onSave(values);
    };

    return (
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl flex flex-col h-full">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{title}</h2>
            <div className="space-y-2 mb-4 flex-grow overflow-y-auto max-h-48 pr-2 rtl:pl-2">
                {values.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg group">
                        <span className="text-sm text-slate-700 dark:text-slate-200">{item.name}</span>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleEdit(item)} className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">{t.edit}</button>
                           <button onClick={() => handleRemove(item.id)} className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline">{t.delete}</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-auto">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t.placeholder}
                    className="flex-grow w-full p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white"
                />
                <button onClick={handleAddOrUpdate} className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
                    {editId !== null ? t.update : t.add}
                </button>
            </div>
            <div className="text-end mt-4">
                 <button onClick={handleSave} className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity">
                    {t.save}
                </button>
            </div>
        </div>
    );
};

export default LookupEditor;