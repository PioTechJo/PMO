
import React, { useState, useRef, useEffect } from 'react';
import { Project, Language } from '../types';
import { ProjectColumn } from './Projects';

interface ProjectListItemProps {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
    language: Language;
    visibleColumns: Record<ProjectColumn, boolean>;
}

const ProjectListItem: React.FC<ProjectListItemProps> = ({ project, onEdit, onDelete, language, visibleColumns }) => {
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
        ar: { edit: "تعديل", delete: "حذف", unassigned: "غير معين", noStatus: "لا توجد حالة", options: "خيارات المشروع", progress: "التقدم", score: "الأولوية" },
        en: { edit: "Edit", delete: "Delete", unassigned: "Unassigned", noStatus: "No Status", options: "Project options", progress: "Progress", score: "Score" }
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

    const priorityScore = (
        (project.revenueImpact || 1) + 
        (project.strategicValue || 1) + 
        (project.deliveryRisk || 1) + 
        (project.customerPressure || 1)
    ) - (project.resourceLoad || 1);

    return (
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-3 rounded-lg flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all duration-300 text-sm">
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white truncate">{project.name}</p>
                <p className="text-xs font-mono text-violet-500 dark:text-violet-400">{project.projectCode}</p>
                <div className="mt-2">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.progress}</span>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                    </div>
                </div>
            </div>
            
            {visibleColumns.status && (
                <div className="w-40 text-center shrink-0">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                        {project.status?.name || t.noStatus}
                    </span>
                </div>
            )}

            {visibleColumns.score && (
                <div className="w-40 text-center shrink-0">
                     <div className="flex items-center justify-center gap-1 bg-violet-600 text-white px-3 py-1 rounded-full shadow-sm mx-auto w-max" title={t.score}>
                        <span className="font-black text-[12px] leading-none">{priorityScore}</span>
                    </div>
                </div>
            )}

            {visibleColumns.projectManager && (
                <div className="w-40 flex items-center gap-2 shrink-0 min-w-0">
                    <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=8b5cf6&color=f5f3ff`} alt={project.projectManager?.name || t.unassigned} className="w-7 h-7 rounded-full shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-white truncate">{project.projectManager?.name || t.unassigned}</span>
                </div>
            )}

            {visibleColumns.customer && (
                 <div className="w-40 text-center shrink-0 text-slate-600 dark:text-slate-300 truncate">{project.customer?.name || '--'}</div>
            )}
            
            {visibleColumns.category && (
                 <div className="w-40 text-center shrink-0 text-slate-600 dark:text-slate-300 truncate">{project.category?.name || '--'}</div>
            )}
            
            {visibleColumns.team && (
                 <div className="w-40 text-center shrink-0 text-slate-600 dark:text-slate-300 truncate">{project.team?.name || '--'}</div>
            )}

            <div className="w-16 text-center shrink-0">
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
                                onClick={() => { onEdit(); setMenuOpen(false); }} 
                                className="block w-full text-start px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                {t.edit}
                            </button>
                             <button 
                                onClick={() => { onDelete(); setMenuOpen(false); }} 
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
