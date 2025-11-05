import React from 'react';
import { Activity, Project, Lookup, Language, ActivityStatus, PaymentStatus } from '../types';

interface ActivityCardProps {
    activity: Activity;
    project?: Project;
    team?: Lookup;
    language: Language;
    onOpenEditModal: (activity: Activity) => void;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, project, team, language, onOpenEditModal, onUpdateActivity }) => {
    
    const statusColors: { [key in ActivityStatus]: string } = {
        [ActivityStatus.Completed]: 'bg-green-500/10 text-green-600 dark:text-green-400',
        [ActivityStatus.InProgress]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        [ActivityStatus.Pending]: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    };
    
    const translations = {
        ar: { dueDate: "تاريخ الاستحقاق", inProject: "في مشروع", noProject: "لا يوجد مشروع", unassigned: "غير مسند", noDueDate: "لا يوجد تاريخ استحقاق" },
        en: { dueDate: "Due", inProject: "in", noProject: "No project", unassigned: "Unassigned", noDueDate: "No due date" },
    };
    const t = translations[language];

    const isValidDate = activity.dueDate && !isNaN(new Date(activity.dueDate).getTime());
    const dueDate = isValidDate ? new Date(activity.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && activity.status !== ActivityStatus.Completed;

    return (
        <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl shadow-sm dark:shadow-none transition-all duration-300 hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-violet-900/30">
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{activity.title}</h3>
                <div className="flex items-center gap-1 -mt-1 -mr-1 rtl:-ml-1 rtl:-mr-auto">
                    {team && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{team.name}</span>}
                </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{activity.description}</p>
            
            <div className="flex justify-between items-center text-xs">
                <span className={`px-2 py-1 rounded-full font-semibold ${statusColors[activity.status]}`}>{activity.status}</span>
                <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {t.dueDate}: {dueDate ? dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noDueDate}
                </span>
            </div>

            {project && (
                 <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                    <span>{t.inProject} <strong>{project.name}</strong></span>
                </div>
            )}
        </div>
    );
};

export default ActivityCard;
