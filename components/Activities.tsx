

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Activity, Project, Lookup, Language, Lookups, User, PaymentStatus } from '../types';
import ActivityListItem from './ActivityListItem';
import AddActivityModal from './AddActivityModal';
import SearchableSelect from './SearchableSelect';

interface ActivitiesProps {
    allActivities: Activity[];
    allProjects: Project[];
    language: Language;
    onAddActivities: (activities: Omit<Activity, 'id'>[]) => Promise<void>;
    onOpenEditModal: (activity: Activity) => void;
    onViewActivityDetails: (activity: Activity) => void;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
    searchResult?: { id: string }[];
    lookups: Lookups;
    currentUser?: User;
}

const Activities: React.FC<ActivitiesProps> = ({ allActivities, allProjects, language, onAddActivities, onOpenEditModal, onViewActivityDetails, onUpdateActivity, searchResult, lookups, currentUser }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
    const [selectedHasPayment, setSelectedHasPayment] = useState<string>('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('all');
    const hasSetDefaultManager = useRef(false);

    useEffect(() => {
        if (currentUser && !hasSetDefaultManager.current) {
            const isCurrentUserAManager = lookups.projectManagers.some(pm => pm.id === currentUser.id);
            if (isCurrentUserAManager) {
                setSelectedManagerId(currentUser.id);
                hasSetDefaultManager.current = true;
            }
        }
    }, [currentUser, lookups.projectManagers]);
    
    const translations = {
        ar: {
            title: "الأنشطة",
            subtitle: "نظرة على جميع الأنشطة الخاصة بك، منظمة حسب المشروع.",
            newActivity: "إضافة نشاط",
            unassignedActivities: "أنشطة غير مسندة لمشروع",
            noActivitiesInProject: "لا توجد أنشطة في هذا المشروع.",
            noActivitiesFound: "لم يتم العثور على أنشطة.",
            totalPayments: "إجمالي الدفعات",
            allProjects: "كل المشاريع",
            allManagers: "كل المدراء",
            allPaymentStatuses: "كل حالات الدفع",
            all: "الكل",
            yes: "نعم",
            no: "لا",
            hasPayment: "يوجد دفعة",
            clearFilters: "مسح الفلاتر",
            searchProjects: "ابحث عن مشروع...",
            searchManagers: "ابحث عن مدير...",
            searchPaymentStatuses: "ابحث عن حالة...",
            allMonths: "كل الشهور",
            searchMonths: "ابحث عن شهر...",
            Paid: "مدفوعة",
            Pending: "معلقة",
            Sent: "مرسلة",
        },
        en: {
            title: "Activities",
            subtitle: "An overview of all your activities, organized by project.",
            newActivity: "Add Activity",
            unassignedActivities: "Unassigned Activities",
            noActivitiesInProject: "No activities in this project.",
            noActivitiesFound: "No activities found.",
            totalPayments: "Total Payments",
            allProjects: "All Projects",
            allManagers: "All Managers",
            allPaymentStatuses: "All Payment Statuses",
            all: "All",
            yes: "Yes",
            no: "No",
            hasPayment: "Has Payment",
            clearFilters: "Clear Filters",
            searchProjects: "Search projects...",
            searchManagers: "Search managers...",
            searchPaymentStatuses: "Search statuses...",
            allMonths: "All Months",
            searchMonths: "Search months...",
            Paid: "Paid",
            Pending: "Pending",
            Sent: "Sent",
        }
    };
    const t = translations[language];

    const projectsFilteredByManager = useMemo(() => {
        if (selectedManagerId === 'all') return allProjects;
        return allProjects.filter(p => p.projectManagerId === selectedManagerId);
    }, [allProjects, selectedManagerId]);

    const managerOptions = useMemo(() => [
        { value: 'all', label: t.allManagers },
        ...lookups.projectManagers.map(m => ({ value: m.id, label: m.name }))
    ], [lookups.projectManagers, t.allManagers]);

    const projectOptions = useMemo(() => [
        { value: 'all', label: t.allProjects },
        ...projectsFilteredByManager.map(p => ({ value: p.id, label: p.name }))
    ], [projectsFilteredByManager, t.allProjects]);

    const paymentStatusOptions = useMemo(() => [
        { value: 'all', label: t.allPaymentStatuses },
        ...Object.values(PaymentStatus).map(s => ({ value: s, label: t[s] || s })).sort((a,b) => a.label.localeCompare(b.label))
    ], [t]);

    const hasPaymentOptions = useMemo(() => [
        { value: 'all', label: t.all },
        { value: 'yes', label: t.yes },
        { value: 'no', label: t.no },
    ], [t.all, t.yes, t.no]);
    
    const monthYearOptions = useMemo(() => {
        const uniqueMonthYears = new Set<string>();
        allActivities.forEach(activity => {
            if (activity.dueDate) {
                const date = new Date(activity.dueDate);
                const year = date.getFullYear();
                const month = date.getMonth();
                uniqueMonthYears.add(`${year}-${month}`);
            }
        });
        return Array.from(uniqueMonthYears).map(my => {
            const [year, month] = my.split('-').map(Number);
            const date = new Date(year, month);
            return {
                value: my,
                label: date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })
            };
        }).sort((a, b) => {
            const [yearA, monthA] = a.value.split('-').map(Number);
            const [yearB, monthB] = b.value.split('-').map(Number);
            if (yearB !== yearA) return yearB - yearA;
            return monthB - monthA;
        });
    }, [allActivities, language]);

    const finalMonthYearOptions = useMemo(() => [
        { value: 'all', label: t.allMonths },
        ...monthYearOptions
    ], [monthYearOptions, t.allMonths]);

    useEffect(() => {
        // If the current selected project is no longer in the filtered list of projects, reset it.
        if (selectedProjectId !== 'all' && !projectsFilteredByManager.some(p => p.id === selectedProjectId)) {
            setSelectedProjectId('all');
        }
    }, [projectsFilteredByManager, selectedProjectId]);
    

    const filteredActivities = useMemo(() => {
        let activities = searchResult
            ? allActivities.filter(a => searchResult.some(res => res.id === a.id))
            : allActivities;

        const managerProjectIds = new Set(projectsFilteredByManager.map(p => p.id));
        
        return activities.filter(activity => {
            if (selectedManagerId !== 'all' && !managerProjectIds.has(activity.projectId)) {
                return false;
            }
            if (selectedProjectId !== 'all' && activity.projectId !== selectedProjectId) {
                return false;
            }
            if (selectedHasPayment !== 'all') {
                if ((selectedHasPayment === 'yes' && !activity.hasPayment) || (selectedHasPayment === 'no' && activity.hasPayment)) {
                    return false;
                }
            }
            if (selectedPaymentStatus !== 'all' && activity.paymentStatus !== selectedPaymentStatus) {
                return false;
            }
            const monthYearMatch = selectedMonthYear === 'all' || (activity.dueDate && `${new Date(activity.dueDate).getFullYear()}-${new Date(activity.dueDate).getMonth()}` === selectedMonthYear);
            if (!monthYearMatch) {
                return false;
            }
            return true;
        });
    }, [searchResult, allActivities, selectedManagerId, projectsFilteredByManager, selectedProjectId, selectedHasPayment, selectedPaymentStatus, selectedMonthYear]);


    const groupedActivities = useMemo(() => {
        const projectMap: Map<string, Project & { activities: Activity[], totalPayments: number }> = new Map();

        filteredActivities.forEach(activity => {
            const project = allProjects.find(p => p.id === activity.projectId);
            if (project) {
                 if (!projectMap.has(project.id)) {
                    projectMap.set(project.id, { ...project, activities: [], totalPayments: 0 });
                }
                projectMap.get(project.id)!.activities.push(activity);
            }
        });

        projectMap.forEach(project => {
            project.totalPayments = project.activities.reduce((sum, activity) => {
                return sum + (activity.hasPayment ? activity.paymentAmount : 0);
            }, 0);
            project.activities.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        });
        
        return Array.from(projectMap.values());
    }, [filteredActivities, allProjects]);

    const getProjectById = (id: string) => allProjects.find(p => p.id === id);
    const getTeamById = (id: string | null) => id ? lookups.teams.find(t => t.id === id) : undefined;

    const handleAddActivity = async (newActivityData: Omit<Activity, 'id'>) => {
        await onAddActivities([newActivityData]);
        setShowAddModal(false);
    };

    const handleClearFilters = () => {
        setSelectedProjectId('all');
        setSelectedManagerId('all');
        setSelectedPaymentStatus('all');
        setSelectedHasPayment('all');
        setSelectedMonthYear('all');
    };
    
    return (
        <div className="space-y-8">
            {showAddModal && <AddActivityModal teams={lookups.teams} projects={allProjects} onClose={() => setShowAddModal(false)} onAddActivity={handleAddActivity} language={language} />}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-violet-700/50">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"></path></svg>
                        <span>{t.newActivity}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <SearchableSelect options={managerOptions} value={selectedManagerId} onChange={setSelectedManagerId} placeholder={t.allManagers} searchPlaceholder={t.searchManagers} language={language} />
                <SearchableSelect options={projectOptions} value={selectedProjectId} onChange={setSelectedProjectId} placeholder={t.allProjects} searchPlaceholder={t.searchProjects} language={language} />
                <SearchableSelect options={paymentStatusOptions} value={selectedPaymentStatus} onChange={setSelectedPaymentStatus} placeholder={t.allPaymentStatuses} searchPlaceholder={t.searchPaymentStatuses} language={language} />
                <SearchableSelect options={hasPaymentOptions} value={selectedHasPayment} onChange={setSelectedHasPayment} placeholder={t.hasPayment} language={language} />
                <SearchableSelect options={finalMonthYearOptions} value={selectedMonthYear} onChange={setSelectedMonthYear} placeholder={t.allMonths} searchPlaceholder={t.searchMonths} language={language} />
                <button
                    onClick={handleClearFilters}
                    title={t.clearFilters}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                    <span>{t.clearFilters}</span>
                </button>
            </div>


            <div className="space-y-10">
                {groupedActivities.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-10">{t.noActivitiesFound}</p>
                )}

                {groupedActivities.map(project => (
                    <div key={project.id}>
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4 pb-2 border-b-2 border-violet-500/50">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{project.name}</h2>
                            {project.totalPayments > 0 && (
                                <div className="bg-green-500/10 text-green-800 dark:text-green-200 font-bold text-sm px-3 py-1.5 rounded-full">
                                    <span>{t.totalPayments}: </span>
                                    <span>{project.totalPayments.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                             {project.activities.map(activity => (
                                <ActivityListItem
                                    key={activity.id}
                                    activity={activity}
                                    project={getProjectById(activity.projectId)}
                                    team={getTeamById(activity.teamId)}
                                    language={language}
                                    onOpenEditModal={() => onOpenEditModal(activity)}
                                    onDoubleClick={() => onViewActivityDetails(activity)}
                                    onUpdateActivity={onUpdateActivity}
                                />
                             ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Activities;