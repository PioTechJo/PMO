import React, { useState, useMemo } from 'react';
import { Project, Activity, Lookup, Language } from '../types';
import PaymentActivityRow from './PaymentActivityRow';

interface PaymentsProps {
    allProjects: Project[];
    allActivities: Activity[];
    allTeams: Lookup[];
    language: Language;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
}

const Payments: React.FC<PaymentsProps> = ({ allProjects, allActivities, allTeams, language, onUpdateActivity }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const t = translations[language];

    const paymentActivities = useMemo(() => {
        if (!selectedProjectId) return [];
        return allActivities
            .filter(activity => activity.projectId === selectedProjectId && activity.hasPayment)
            .sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            });
    }, [selectedProjectId, allActivities]);

    const projectTotal = useMemo(() => {
        return paymentActivities.reduce((sum, activity) => sum + activity.paymentAmount, 0);
    }, [paymentActivities]);

    const getTeamById = (id: string | null) => id ? allTeams.find(t => t.id === id) : undefined;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <div className="w-full md:w-auto md:min-w-[300px]">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full p-3 bg-slate-200 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white font-bold"
                    >
                        <option value="">{t.selectProject}</option>
                        {allProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedProjectId ? (
                <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl">
                    {paymentActivities.length > 0 ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{allProjects.find(p => p.id === selectedProjectId)?.name}</h2>
                                <div className="bg-green-500/10 text-green-800 dark:text-green-200 font-bold text-sm px-3 py-1.5 rounded-full">
                                    <span>{t.totalPayments}: </span>
                                    <span>{projectTotal.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left rtl:text-right text-slate-500 dark:text-slate-400">
                                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 min-w-[250px]">{t.activity}</th>
                                            <th scope="col" className="px-6 py-3">{t.team}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.amount}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.dueDate}</th>
                                            <th scope="col" className="px-6 py-3 text-center">{t.status}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentActivities.map(activity => (
                                            <PaymentActivityRow
                                                key={activity.id}
                                                activity={activity}
                                                team={getTeamById(activity.teamId)}
                                                language={language}
                                                onUpdateActivity={onUpdateActivity}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-10">{t.noPaymentActivities}</p>
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
        subtitle: "تتبع وإدارة دفعات الأنشطة لكل مشروع.",
        selectProject: "اختر مشروعًا...",
        selectProjectPrompt: "يرجى اختيار مشروع لعرض أنشطة الدفع الخاصة به.",
        noPaymentActivities: "لا توجد أنشطة عليها دفعات في هذا المشروع.",
        totalPayments: "إجمالي المدفوعات",
        activity: "النشاط",
        team: "الفريق",
        amount: "المبلغ",
        dueDate: "تاريخ الاستحقاق",
        status: "الحالة",
    },
    en: {
        title: "Payments Management",
        subtitle: "Track and manage activity payments for each project.",
        selectProject: "Select a Project...",
        selectProjectPrompt: "Please select a project to view its payment activities.",
        noPaymentActivities: "No activities with payments found for this project.",
        totalPayments: "Total Payments",
        activity: "Activity",
        team: "Team",
        amount: "Amount",
        dueDate: "Due Date",
        status: "Status",
    }
};

export default Payments;