
import React, { useState, useRef, useEffect } from 'react';
import { Project, Language } from '../types';
import { ProjectColumn } from './Projects';

interface ProjectListItemProps {
    project: Project;
    milestoneCount: number;
    issueCount: number;
    milestoneValue: number;
    milestoneTypes: string[];
    onEdit: () => void;
    onDelete: () => void;
    onClick: () => void;
    language: Language;
    visibleColumns: Record<ProjectColumn, boolean>;
    columnWidths: Record<string, number>;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({
    project,
    milestoneCount,
    issueCount,
    milestoneValue,
    milestoneTypes,
    onEdit,
    onDelete,
    onClick,
    language,
    visibleColumns,
    columnWidths,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const translations = {
        ar: { edit: "تعديل", delete: "حذف", unassigned: "غير معين", noStatus: "لا توجد حالة", options: "خيارات المشروع", progress: "التقدم", tasks: "المهام", milestones: "المعالم", Downpayment: "دفعة مقدمة", Progress: "دفعة إنجاز", Final: "دفعة نهائية", Retention: "محجوزات", Other: "أخرى" },
        en: { edit: "Edit", delete: "Delete", unassigned: "Unassigned", noStatus: "No Status", options: "Project options", progress: "Progress", tasks: "Tasks", milestones: "Milestones", Downpayment: "Downpayment", Progress: "Progress Payment", Final: "Final Payment", Retention: "Retention", Other: "Other" }
    };
    const t = translations[language];

    const statusColors: { [key: string]: string } = {
        'نشط': 'bg-green-500/10 text-green-600 dark:text-green-400',
        'Active': 'bg-green-500/10 text-green-600 dark:text-green-400',
        'متوقف': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        'On Hold': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        'مكتمل': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        'Completed': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        'ملغي': 'bg-red-500/10 text-red-600 dark:text-red-400',
        'Cancelled': 'bg-red-500/10 text-red-600 dark:text-red-400',
    };

    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-300 text-sm cursor-pointer shadow-sm hover:shadow-md group"
        >
            <div className="shrink-0 min-w-0 overflow-hidden" style={{ width: columnWidths.name }}>
                <p className="font-black text-slate-800 dark:text-white group-hover:text-violet-600 transition-colors uppercase tracking-tight leading-relaxed truncate">{project.name}</p>
            </div>

            <div className="text-center shrink-0" style={{ width: columnWidths.milestones }}>
                <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-800 inline-flex items-center gap-1.5 font-black text-[10px] text-slate-500 dark:text-slate-400" title={t.milestones}>
                    <span className="text-red-500">🚩</span>
                    <span>{milestoneCount}</span>
                </div>
            </div>

            <div className="text-center shrink-0 min-w-0 overflow-hidden" style={{ width: columnWidths.value }}>
                <p className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm leading-none">
                    {milestoneValue.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                </p>
                {milestoneTypes.length > 0 && <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate" title={milestoneTypes.map(mt => t[mt] || mt).join(', ')}>{milestoneTypes.map(mt => t[mt] || mt).join(', ')}</p>}
            </div>

            {visibleColumns.status && (
                <div className="text-center shrink-0" style={{ width: columnWidths.status }}>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                        {project.status?.name ? (language === 'ar' ? project.status.name : (project.status.name === 'نشط' ? 'ACTIVE' : project.status.name)) : t.noStatus}
                    </span>
                </div>
            )}

            {visibleColumns.tasks && (
                <div className="text-center shrink-0" style={{ width: columnWidths.tasks }}>
                     <div className="flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-lg font-black text-[11px] mx-auto w-max" title={t.tasks}>
                        {issueCount}
                    </div>
                </div>
            )}

            {visibleColumns.projectManager && (
                <div className="flex items-center gap-3 shrink-0 px-2 min-w-0 overflow-hidden" style={{ width: columnWidths.projectManager }}>
                    <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=8b5cf6&color=f5f3ff`} alt={project.projectManager?.name || t.unassigned} className="w-8 h-8 rounded-xl shrink-0 shadow-sm" />
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{project.projectManager?.name || t.unassigned}</span>
                </div>
            )}

            {visibleColumns.customer && (
                 <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 text-center shrink-0 truncate" style={{ width: columnWidths.customer }}>{project.customer?.name || '--'}</div>
            )}

            {visibleColumns.category && (
                 <div className="text-center shrink-0 text-slate-600 dark:text-slate-300 truncate" style={{ width: columnWidths.category }}>{project.category?.name || '--'}</div>
            )}

            {visibleColumns.team && (
                 <div className="text-center shrink-0 text-slate-600 dark:text-slate-300 truncate" style={{ width: columnWidths.team }}>{project.team?.name || '--'}</div>
            )}

            <div className="text-center shrink-0 sticky right-0 rtl:left-0 rtl:right-auto bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 transition-colors z-[1] -my-4 py-4 border-s border-slate-100 dark:border-slate-800" style={{ width: columnWidths.actions }}>
                 <div className="relative" ref={menuRef}>
                    <button 
                        onClick={(e) => {e.stopPropagation(); setMenuOpen(!menuOpen);}}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700/50"
                        aria-label={t.options}
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                    </button>
                    {menuOpen && (
                        <div className="absolute top-full right-0 rtl:left-0 rtl:right-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 w-32 mt-1 py-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }} 
                                className="block w-full text-start px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t.edit}
                            </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} 
                                className="block w-full text-start px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                {t.delete}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectListItem;
