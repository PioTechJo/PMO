
import React, { useState, useMemo } from 'react';
import { Project, Milestone, Lookup, Language } from '../types';
import PaymentMilestoneRow from './PaymentMilestoneRow';
import SearchableSelect from './SearchableSelect';

interface PaymentsProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    allTeams: Lookup[];
    language: Language;
    onUpdateMilestone: (milestoneId: string, updatedData: Partial<Omit<Milestone, 'id'>>) => Promise<void>;
}

const Payments: React.FC<PaymentsProps> = ({ allProjects, allMilestones, allTeams, language, onUpdateMilestone }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const t = translations[language];

    const projectOptions = useMemo(() => allProjects.map(p => ({ value: p.id, label: p.name })), [allProjects]);

    const paymentMilestones = useMemo(() => {
        if (!selectedProjectId) return [];
        return allMilestones
            .filter(milestone => milestone.projectId === selectedProjectId && milestone.hasPayment)
            .sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            });
    }, [selectedProjectId, allMilestones]);

    const projectTotal = useMemo(() => {
        return paymentMilestones.reduce((sum, milestone) => sum + milestone.paymentAmount, 0);
    }, [paymentMilestones]);

    const getTeamById = (id: string | null) => id ? allTeams.find(t => t.id === id) : undefined;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <div className="w-full md:w-auto md:min-w-[300px]">
                    <SearchableSelect
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        options={projectOptions}
                        placeholder={t.selectProject}
                        searchPlaceholder={t.searchProjects}
                        language={language}
                    />
                </div>
            </div>

            {selectedProjectId ? (
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl">
                    {paymentMilestones.length > 0 ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{allProjects.find(p => p.id === selectedProjectId)?.name}</h2>
                                <div className="bg-green-500/10 text-green-800 dark:text-green-200 font-bold text-sm px-3 py-1.5 rounded-full">
                                    <span>{t.totalPayments}: </span>
                                    <span>{projectTotal.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' })}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
                                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 min-w-[250px]">{t.milestone}</th>
                                            <th scope="col" className="px-6 py-3">{t.team}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.amount}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.dueDate}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.status}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentMilestones.map(milestone => (
                                            <PaymentMilestoneRow
                                                key={milestone.id}
                                                milestone={milestone}
                                                team={getTeamById(milestone.teamId)}
                                                language={language}
                                                onUpdateMilestone={onUpdateMilestone}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-10">{t.noPaymentMilestones}</p>
                    )}
                </div>
            ) : (
                <div className="text-center text-slate-500 dark:text-slate-400 py-20 bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-dashed border-slate-300 dark:border-slate-700/50 rounded-2xl">
                    <p>{t.selectProjectPrompt}</p>
                </div>
            )}
        </div>
    );
};

const translations = {
    ar: {
        title: "إدارة الدفعات",
        subtitle: "تتبع وإدارة دفعات المعالم لكل مشروع.",
        selectProject: "اختر مشروعًا...",
        selectProjectPrompt: "يرجى اختيار مشروع لعرض معالم الدفع الخاصة به.",
        noPaymentMilestones: "لا توجد معالم عليها دفعات في هذا المشروع.",
        totalPayments: "إجمالي المدفوعات",
        milestone: "المعلم",
        team: "الفريق",
        amount: "المبلغ",
        dueDate: "تاريخ الاستحقاق",
        status: "الحالة",
        searchProjects: "ابحث عن مشروع...",
    },
    en: {
        title: "Payments Management",
        subtitle: "Track and manage milestone payments for each project.",
        selectProject: "Select a Project...",
        selectProjectPrompt: "Please select a project to view its payment milestones.",
        noPaymentMilestones: "No milestones with payments found for this project.",
        totalPayments: "Total Payments",
        milestone: "Milestone",
        team: "Team",
        amount: "Amount",
        dueDate: "Due Date",
        status: "Status",
        searchProjects: "Search projects...",
    }
};

export default Payments;
