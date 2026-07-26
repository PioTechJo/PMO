import React, { useState } from 'react';
import { Project, Milestone, User, Lookups, Language } from '../types';
import PaymentsTargetsDashboard from './PaymentsTargetsDashboard';
import StatisticsDashboard from './StatisticsDashboard';

interface DashboardTabsProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    allProjectManagers: User[];
    lookups: Lookups;
    language: Language;
}

type Tab = 'summary' | 'statistics';

const DashboardTabs: React.FC<DashboardTabsProps> = ({ allProjects, allMilestones, allProjectManagers, lookups, language }) => {
    const [tab, setTab] = useState<Tab>('summary');
    const t = translations[language];

    return (
        <div className="space-y-6">
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={() => setTab('summary')}
                    className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    {t.summary}
                </button>
                <button
                    onClick={() => setTab('statistics')}
                    className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === 'statistics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    {t.statistics}
                </button>
            </div>

            {tab === 'summary' && (
                <PaymentsTargetsDashboard allProjects={allProjects} allMilestones={allMilestones} allProjectManagers={allProjectManagers} language={language} />
            )}
            {tab === 'statistics' && (
                <StatisticsDashboard allProjects={allProjects} allMilestones={allMilestones} lookups={lookups} language={language} />
            )}
        </div>
    );
};

const translations = {
    ar: { summary: 'ملخص', statistics: 'إحصائيات' },
    en: { summary: 'Summary', statistics: 'Statistics' },
};

export default DashboardTabs;
