
import React from 'react';
import { Project, Lookup, Language } from '../types';

interface TeamProjectsModalProps {
    team: Lookup;
    projects: Project[];
    onClose: () => void;
    onViewProject: (project: Project) => void;
    language: Language;
}

const TeamProjectsModal: React.FC<TeamProjectsModalProps> = ({ team, projects, onClose, onViewProject, language }) => {
    const translations = {
        ar: {
            title: "مشاريع الفريق",
            viewingProjects: "عرض المشاريع المسندة لـ",
            noProjects: "لا توجد مشاريع مسندة لهذا الفريق.",
            projectCode: "كود المشروع",
            status: "الحالة",
            progress: "التقدم",
            viewDetails: "عرض التفاصيل",
            close: "إغلاق",
        },
        en: {
            title: "Team Projects",
            viewingProjects: "Viewing projects assigned to",
            noProjects: "No projects assigned to this team.",
            projectCode: "Project Code",
            status: "Status",
            progress: "Progress",
            viewDetails: "View Details",
            close: "Close",
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-2xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.viewingProjects} <span className="font-bold text-violet-600 dark:text-violet-400">{team.name}</span></p>
                        </div>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {projects.length > 0 ? (
                            projects.map((project) => (
                                <div 
                                    key={project.id} 
                                    className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 transition-all group cursor-pointer"
                                    onClick={() => onViewProject(project)}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">{project.name}</h3>
                                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">{t.projectCode}: {project.projectCode}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                                                {project.status?.name || '--'}
                                            </span>
                                            <div className="text-end min-w-[4rem]">
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{t.progress}</p>
                                                <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{project.progress}%</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10">
                                <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                <p className="text-slate-500 dark:text-slate-400">{t.noProjects}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <button 
                            onClick={onClose} 
                            className="px-6 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors"
                        >
                            {t.close}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamProjectsModal;
