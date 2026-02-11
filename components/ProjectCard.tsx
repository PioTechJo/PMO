
import React, { useState, useRef, useEffect } from 'react';
import { Project, Language } from '../types';

interface ProjectCardProps {
    project: Project;
    onEdit: () => void;
    onDelete: () => void;
    language: Language;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, language }) => {
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
        ar: {
            manager: "مدير المشروع",
            edit: "تعديل",
            delete: "حذف",
            unassigned: "غير معين",
            noStatus: "لا توجد حالة",
            customer: "العميل",
            noCustomer: "لا يوجد عميل",
            options: "خيارات المشروع",
            progress: "التقدم",
            score: "الأولوية"
        },
        en: {
            manager: "Project Manager",
            edit: "Edit",
            delete: "Delete",
            unassigned: "Unassigned",
            noStatus: "No Status",
            customer: "Customer",
            noCustomer: "No Customer",
            options: "Project options",
            progress: "Progress",
            score: "Score"
        }
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

    // Requested Formula: (Impacts Sum) - Resource Load
    const priorityScore = (
        (project.revenueImpact || 1) + 
        (project.strategicValue || 1) + 
        (project.deliveryRisk || 1) + 
        (project.customerPressure || 1)
    ) - (project.resourceLoad || 1);
    
    return (
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl shadow-sm dark:shadow-none flex flex-col justify-between h-full transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-violet-900/30">
            <div>
                <div className="flex justify-between items-start mb-2">
                     <div className="flex gap-2 items-center">
                        <span className={`px-2 py-1 rounded-full font-semibold text-xs ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                            {project.status?.name || t.noStatus}
                        </span>
                        <div className="flex items-center gap-1 bg-violet-600 text-white px-2 py-1 rounded-full shadow-sm" title={t.score}>
                            <span className="font-black text-[11px] leading-none">{priorityScore}</span>
                        </div>
                     </div>
                     <div className="relative" ref={menuRef}>
                        <button 
                            onClick={(e) => {e.stopPropagation(); setMenuOpen(!menuOpen);}}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors -mt-2 -mr-2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
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
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{project.name}</h3>
                <p className="text-xs font-mono text-violet-500 dark:text-violet-400 mb-2">{project.projectCode}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10 overflow-hidden">{project.description}</p>
                
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.progress}</span>
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{project.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${project.progress || 0}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                 {project.customer && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">🏢</span>
                         <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.customer}</p>
                            <p className="font-semibold text-sm text-slate-800 dark:text-white">{project.customer.name}</p>
                         </div>
                    </div>
                )}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                     <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.manager}</p>
                     <div className="flex items-center gap-2">
                        <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=8b5cf6&color=f5f3ff`} alt={project.projectManager?.name || t.unassigned} className="w-8 h-8 rounded-full" />
                        <span className="font-semibold text-sm text-slate-800 dark:text-white">{project.projectManager?.name || t.unassigned}</span>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
