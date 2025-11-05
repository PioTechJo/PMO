
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { WIDGETS_CONFIG } from './AnalyticsDashboard';

interface CustomizeDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLayout: string[];
    onSaveLayout: (newLayout: string[]) => void;
    language: Language;
}

const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ isOpen, onClose, currentLayout, onSaveLayout, language }) => {
    const [visible, setVisible] = useState<string[]>([]);
    const [hidden, setHidden] = useState<string[]>([]);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setVisible(currentLayout);
            const hiddenItems = WIDGETS_CONFIG
                .map(w => w.id)
                .filter(id => !currentLayout.includes(id));
            setHidden(hiddenItems);
        }
    }, [isOpen, currentLayout]);

    const translations = {
        ar: {
            title: "تخصيص لوحة التحكم",
            visibleWidgets: "العناصر المرئية",
            hiddenWidgets: "العناصر المخفية",
            save: "حفظ",
            cancel: "إلغاء",
        },
        en: {
            title: "Customize Dashboard",
            visibleWidgets: "Visible Widgets",
            hiddenWidgets: "Hidden Widgets",
            save: "Save",
            cancel: "Cancel",
        }
    };
    const t = translations[language];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetList: 'visible' | 'hidden') => {
        e.preventDefault();
        if (!draggedItemId) return;
        
        const targetElement = e.currentTarget.closest('[data-widget-id]');
        const targetId = targetElement ? targetElement.getAttribute('data-widget-id') : null;
    
        // Remove from both lists
        const newVisible = visible.filter(id => id !== draggedItemId);
        const newHidden = hidden.filter(id => id !== draggedItemId);
    
        if (targetList === 'visible') {
            if (targetId && targetId !== draggedItemId) {
                const targetIndex = newVisible.indexOf(targetId);
                newVisible.splice(targetIndex, 0, draggedItemId);
            } else {
                newVisible.push(draggedItemId);
            }
        } else {
             if (targetId && targetId !== draggedItemId) {
                const targetIndex = newHidden.indexOf(targetId);
                newHidden.splice(targetIndex, 0, draggedItemId);
            } else {
                newHidden.push(draggedItemId);
            }
        }
        
        setVisible(newVisible);
        setHidden(newHidden);
        setDraggedItemId(null);
    };

    if (!isOpen) return null;

    interface DraggableWidgetProps {
        id: string;
    }

    const DraggableWidget: React.FC<DraggableWidgetProps> = ({ id }) => {
        const widget = WIDGETS_CONFIG.find(w => w.id === id);
        if (!widget) return null;
        const isDragging = draggedItemId === id;
        
        return (
            <div
                data-widget-id={id}
                draggable
                onDragStart={(e) => handleDragStart(e, id)}
                onDragEnd={() => setDraggedItemId(null)}
                className={`p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-3 cursor-grab transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{widget.name}</span>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-3xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-2">{t.visibleWidgets}</h3>
                            <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'visible')} className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg space-y-2 min-h-[200px]">
                                {visible.map(id => <DraggableWidget key={id} id={id} />)}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-2">{t.hiddenWidgets}</h3>
                            <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'hidden')} className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg space-y-2 min-h-[200px]">
                                {hidden.map(id => <DraggableWidget key={id} id={id} />)}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 rtl:space-x-reverse pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">
                            {t.cancel}
                        </button>
                        <button type="button" onClick={() => onSaveLayout(visible)} className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity">
                            {t.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizeDashboardModal;
