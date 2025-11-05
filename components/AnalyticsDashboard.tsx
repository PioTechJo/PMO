

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Activity, Lookup, ActivityStatus, Language, PaymentStatus, User } from '../types';
import StatCard from './StatCard';
import CustomizeDashboardModal from './CustomizeDashboardModal';
import SearchableSelect from './SearchableSelect';
import ProjectDetailModal from './ProjectDetailModal';

// --- Widget Component Definitions ---

const WidgetWrapper: React.FC<{ title: string, children: React.ReactNode, maxHeight?: string, showPadding?: boolean }> = ({ title, children, maxHeight = '400px', showPadding = true }) => (
    <div className={`bg-white dark:bg-gray-800/50 ${showPadding ? 'p-6' : 'pt-6'} rounded-2xl shadow-sm dark:shadow-none h-full flex flex-col`}>
        <h2 className={`text-xl font-semibold text-gray-900 dark:text-white mb-4 ${showPadding ? '' : 'px-6'}`}>{title}</h2>
        <div className="flex-grow overflow-y-auto" style={{ maxHeight }}>{children}</div>
    </div>
);

const StatsOverviewWidget: React.FC<AnalyticsDashboardProps> = ({ projects, activities, language }) => {
    const t = translations[language];
    const totalProjects = projects.length;
    const completedActivitiesCount = activities.filter(a => a.status === ActivityStatus.Completed).length;
    const inProgressActivitiesCount = activities.filter(a => a.status === ActivityStatus.InProgress).length;
    const totalActivities = activities.length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title={t.totalProjects} value={totalProjects.toString()} icon="projects" />
            <StatCard title={t.totalActivities} value={totalActivities.toString()} icon="completed" />
            <StatCard title={t.inProgressActivities} value={inProgressActivitiesCount.toString()} icon="inProgress" />
            <StatCard title={t.completedActivities} value={completedActivitiesCount.toString()} icon="hours" />
        </div>
    );
};

const ProjectStatusChartWidget: React.FC<AnalyticsDashboardProps> = ({ projects, language }) => {
    const t = translations[language];
    const statusCounts = useMemo(() => {
        const counts = new Map<string, { count: number, color: string }>();
        const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500'];
        let colorIndex = 0;
        projects.forEach(p => {
            const statusName = p.status?.name || t.unknownStatus;
            if (!counts.has(statusName)) {
                counts.set(statusName, { count: 0, color: colors[colorIndex % colors.length] });
                colorIndex++;
            }
            counts.get(statusName)!.count++;
        });
        return Array.from(counts.entries());
    }, [projects, t.unknownStatus]);

    const maxCount = Math.max(...statusCounts.map(([, {count}]) => count), 1);
    
    return (
        <WidgetWrapper title={t.projectStatuses} maxHeight="auto">
             <div className="space-y-3 pt-2">
                {statusCounts.length > 0 ? statusCounts.map(([status, {count, color}]) => (
                    <div key={status} className="flex items-center gap-4">
                        <span className="w-1/3 text-sm text-gray-600 dark:text-gray-300 truncate">{status}</span>
                        <div className="w-2/3 flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className={`${color} h-4 rounded-full transition-all duration-500`} style={{ width: `${(count / maxCount) * 100}%` }}></div>
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{count}</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noProjects}</p>}
            </div>
        </WidgetWrapper>
    );
};

const TeamWorkloadChartWidget: React.FC<AnalyticsDashboardProps> = ({ activities, teams, language }) => {
    const t = translations[language];
    const teamActivityCounts = useMemo(() => {
        const counts = new Map<string, number>();
        teams.forEach(t => counts.set(t.id, 0));
        activities.forEach(a => {
            if (a.teamId && counts.has(a.teamId)) {
                counts.set(a.teamId, counts.get(a.teamId)! + 1);
            }
        });
        return Array.from(counts.entries())
            .map(([teamId, count]) => ({ team: teams.find(t => t.id === teamId), count }))
            .filter(item => item.team)
            .sort((a,b) => b.count - a.count);
    }, [activities, teams]);

    const maxCount = Math.max(...teamActivityCounts.map(({ count }) => count), 1);

    return (
         <WidgetWrapper title={t.teamWorkload} maxHeight="auto">
             <div className="space-y-3 pt-2">
                {teamActivityCounts.length > 0 ? teamActivityCounts.map(({ team, count }) => (
                    <div key={team!.id} className="flex items-center gap-4">
                        <div className="w-1/3 flex items-center gap-2">
                           <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{team!.name}</span>
                        </div>
                        <div className="w-2/3 flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-4 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{count}</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noTeams}</p>}
            </div>
        </WidgetWrapper>
    );
};

const ProjectsByLaunchYearWidget: React.FC<AnalyticsDashboardProps> = ({ projects, language }) => {
    const t = translations[language];
    const yearlyData = useMemo(() => {
        const counts = new Map<string, number>();
        projects.forEach(p => {
            const year = p.launchDate ? new Date(p.launchDate).getFullYear().toString() : t.noLaunchDate;
            counts.set(year, (counts.get(year) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year.localeCompare(b.year));
    }, [projects, t.noLaunchDate]);

    const maxCount = Math.max(...yearlyData.map(({ count }) => count), 1);

    return (
        <WidgetWrapper title={t.projectsByYear} maxHeight="400px">
            <div className="space-y-3 pt-2 pr-2 rtl:pl-2">
                {yearlyData.length > 0 ? yearlyData.map(({ year, count }) => (
                    <div key={year} className="flex items-center gap-4">
                        <span className="w-1/4 text-sm text-gray-600 dark:text-gray-300 truncate">{year}</span>
                        <div className="w-3/4 flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{count}</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noProjects}</p>}
            </div>
        </WidgetWrapper>
    );
};

const ProjectsByCountryWidget: React.FC<AnalyticsDashboardProps> = ({ projects, language }) => {
    const t = translations[language];
    const countryData = useMemo(() => {
        const counts = new Map<string, number>();
        projects.forEach(p => {
            const countryName = p.country?.name || t.unknownCountry;
            counts.set(countryName, (counts.get(countryName) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [projects, t.unknownCountry]);

    const maxCount = Math.max(...countryData.map(({ count }) => count), 1);

    return (
        <WidgetWrapper title={t.projectsByCountry} maxHeight="auto">
            <div className="space-y-3 pt-2">
                {countryData.length > 0 ? countryData.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-4">
                        <span className="w-1/3 text-sm text-gray-600 dark:text-gray-300 truncate">{name}</span>
                        <div className="w-2/3 flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-4 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{count}</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noProjects}</p>}
        </WidgetWrapper>
    );
};

const ProjectsByProductWidget: React.FC<AnalyticsDashboardProps> = ({ projects, language }) => {
    const t = translations[language];
    const productData = useMemo(() => {
        const counts = new Map<string, number>();
        projects.forEach(p => {
            const productName = p.product?.name || t.unknownProduct;
            counts.set(productName, (counts.get(productName) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [projects, t.unknownProduct]);

    const maxCount = Math.max(...productData.map(({ count }) => count), 1);

    return (
        <WidgetWrapper title={t.projectsByProduct} maxHeight="auto">
            <div className="space-y-3 pt-2">
                {productData.length > 0 ? productData.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-4">
                        <span className="w-1/3 text-sm text-gray-600 dark:text-gray-300 truncate">{name}</span>
                        <div className="w-2/3 flex items-center gap-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-4 rounded-full transition-all duration-500" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                            </div>
                            <span className="font-bold text-gray-800 dark:text-white text-sm">{count}</span>
                        </div>
                    </div>
                )) : <p className="text-gray-500 dark:text-gray-400 text-sm">{t.noProjects}</p>}
        </WidgetWrapper>
    );
};


type ProjectWithActivities = Project & { activities: Activity[] };

interface ProjectActivitiesWidgetProps extends AnalyticsDashboardProps {
    onViewProjectDetails: (project: ProjectWithActivities) => void;
}

const ProjectActivitiesWidget: React.FC<ProjectActivitiesWidgetProps> = ({ projects, activities, teams, customers, projectManagers, language, currentUser, onViewProjectDetails, onUpdateActivity }) => {
    const t = translations[language];
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
    const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const hasSetDefaultManager = useRef(false);

    // --- Visualization State ---
    const [showVisualization, setShowVisualization] = useState(false);
    const [vizDimension, setVizDimension] = useState<string>('customer');
    const [vizMeasure, setVizMeasure] = useState<string>('totalPayment');
    const [vizChartType, setVizChartType] = useState<string>('bar');


    useEffect(() => {
        if (currentUser && !hasSetDefaultManager.current) {
            const isCurrentUserAManager = projectManagers.some(pm => pm.id === currentUser.id);
            if (isCurrentUserAManager) {
                setSelectedManagerId(currentUser.id);
                hasSetDefaultManager.current = true;
            }
        }
    }, [currentUser, projectManagers]);

    const paymentStatusColors: { [key in PaymentStatus]: string } = {
        [PaymentStatus.Paid]: 'bg-green-500/10 text-green-700 dark:text-green-300',
        [PaymentStatus.Sent]: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
        [PaymentStatus.Pending]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    };

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

    const customerOptions = useMemo(() => [
        { value: 'all', label: t.allCustomers },
        ...(customers || []).map(c => ({ value: c.id, label: c.name }))
    ], [customers, t.allCustomers]);

    const managerOptions = useMemo(() => [
        { value: 'all', label: t.allManagers },
        ...(projectManagers || []).map(m => ({ value: m.id, label: m.name }))
    ], [projectManagers, t.allManagers]);

    const paymentStatusOptions = useMemo(() => [
        { value: 'all', label: t.allPaymentStatuses },
        ...Object.values(PaymentStatus).map(s => ({ value: s, label: t[s as keyof typeof t] || s })).sort((a,b) => a.label.localeCompare(b.label))
    ], [t]);

    // --- Sequenced Filtering Logic ---
    const projectsFilteredByCustomer = useMemo(() => {
        if (selectedCustomerId === 'all') return projects;
        return projects.filter(p => p.customerId === selectedCustomerId);
    }, [projects, selectedCustomerId]);

    const projectsFilteredByManager = useMemo(() => {
        if (selectedManagerId === 'all') return projectsFilteredByCustomer;
        return projectsFilteredByCustomer.filter(p => p.projectManagerId === selectedManagerId);
    }, [projectsFilteredByCustomer, selectedManagerId]);

    useEffect(() => {
        if (selectedProjectId !== 'all' && !projectsFilteredByManager.some(p => p.id === selectedProjectId)) {
            setSelectedProjectId('all');
        }
    }, [projectsFilteredByManager, selectedProjectId]);

    const projectOptions = useMemo(() => [
        { value: 'all', label: t.allProjects },
        ...projectsFilteredByManager.map(p => ({ value: p.id, label: p.name }))
    ], [projectsFilteredByManager, t.allProjects]);

    const monthYearOptions = useMemo(() => {
        const uniqueMonthYears = new Set<string>();
        activities.forEach(activity => {
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
    }, [activities, language]);

    const finalMonthYearOptions = useMemo(() => [
        { value: 'all', label: t.allMonths },
        ...monthYearOptions
    ], [monthYearOptions, t.allMonths]);

    const projectsToDisplay = useMemo(() => {
        if (selectedProjectId === 'all') return projectsFilteredByManager;
        return projectsFilteredByManager.filter(p => p.id === selectedProjectId);
    }, [projectsFilteredByManager, selectedProjectId]);

    const filteredActivities = useMemo(() => {
        const displayedProjectIds = new Set(projectsToDisplay.map(p => p.id));
        return activities.filter(activity => {
            const projectMatch = displayedProjectIds.has(activity.projectId);
            const monthYearMatch = selectedMonthYear === 'all' || (activity.dueDate && `${new Date(activity.dueDate).getFullYear()}-${new Date(activity.dueDate).getMonth()}` === selectedMonthYear);
            const paymentStatusMatch = selectedPaymentStatus === 'all' || (activity.hasPayment && (activity.paymentStatus || PaymentStatus.Pending) === selectedPaymentStatus);
            return projectMatch && monthYearMatch && paymentStatusMatch;
        });
    }, [activities, projectsToDisplay, selectedMonthYear, selectedPaymentStatus]);

    const projectsWithActivities: ProjectWithActivities[] = useMemo(() => {
        return projectsToDisplay.map(project => ({
            ...project,
            activities: filteredActivities
                .filter(a => a.projectId === project.id)
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
        })).filter(p => p.activities.length > 0);
    }, [projectsToDisplay, filteredActivities]);
    
    // --- Visualization Data Processing ---
    const vizDimensionOptions = useMemo(() => [
        { value: 'status', label: t.status }, { value: 'customer', label: t.customer },
        { value: 'manager', label: t.manager }, { value: 'country', label: t.country }, { value: 'team', label: t.team },
        { value: 'monthYear', label: t.monthYear }, { value: 'project', label: t.project }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);
    const vizMeasureOptions = useMemo(() => [
        { value: 'projectCount', label: t.projectCount }, { value: 'activityCount', label: t.activityCount }, { value: 'totalPayment', label: t.totalPayment }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);
    const vizChartTypeOptions = useMemo(() => [
        { value: 'bar', label: t.barChart }, { value: 'line', label: t.lineChart }, { value: 'pie', label: t.pieChart }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);

    const vizChartData = useMemo(() => {
        const chartData = new Map<string, { projects: Set<string>; activities: Activity[] }>();
        const allRelevantActivities = vizDimension === 'monthYear' ? filteredActivities : projectsWithActivities.flatMap(p => p.activities);

        allRelevantActivities.forEach(activity => {
            const project = projects.find(p => p.id === activity.projectId);
            if (!project) return;
            let key: string | undefined;
            switch (vizDimension) {
                case 'status': key = project.status?.name; break;
                case 'customer': key = project.customer?.name; break;
                case 'manager': key = project.projectManager?.name; break;
                case 'country': key = project.country?.name; break;
                case 'team': key = project.team?.name; break;
                case 'project': key = project.name; break;
                case 'monthYear':
                    if (activity.dueDate) {
                        const date = new Date(activity.dueDate);
                        key = date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
                    }
                    break;
            }
            key = key || t.unassigned;
            if (!chartData.has(key)) chartData.set(key, { projects: new Set(), activities: [] });
            chartData.get(key)!.projects.add(project.id);
            chartData.get(key)!.activities.push(activity);
        });

        const aggregatedData = Array.from(chartData.entries()).map(([label, data]) => {
            let value = 0;
            switch (vizMeasure) {
                case 'projectCount': value = data.projects.size; break;
                case 'activityCount': value = data.activities.length; break;
                case 'totalPayment':
                    value = data.activities.filter(a => a.hasPayment).reduce((sum, a) => sum + a.paymentAmount, 0);
                    break;
            }
            return { label, value };
        });

        return aggregatedData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [vizDimension, vizMeasure, projectsWithActivities, filteredActivities, projects, language, t.unassigned]);

    const vizMaxValue = useMemo(() => {
        if (!vizChartData || vizChartData.length === 0) return 1;
        return Math.max(...vizChartData.map(d => d.value));
    }, [vizChartData]);

    const chartColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#a5b4fc', '#ddd6fe', '#e0e7ff'];

    useEffect(() => {
        const newOpenState: Record<string, boolean> = {};
        if (projectsWithActivities.length > 0) {
            newOpenState[projectsWithActivities[0].id] = true;
        }
        setOpenProjects(newOpenState);
    }, [JSON.stringify(projectsWithActivities.map(p => p.id))]); // Depend on the array of IDs
    
    const handleToggleProject = (projectId: string) => {
        setOpenProjects(prevOpen => ({
            ...prevOpen,
            [projectId]: !prevOpen[projectId],
        }));
    };

    const getTeamById = (id: string | null) => id ? teams.find(t => t.id === id) : undefined;
    
    const handleClearFilters = () => {
        setSelectedCustomerId('all');
        setSelectedManagerId('all');
        setSelectedProjectId('all');
        setSelectedMonthYear('all');
        setSelectedPaymentStatus('all');
    };
    
    const handleExport = () => {
        if (projectsWithActivities.length === 0) return;
        const t_csv = csvTranslations[language];
        const headers = [ t_csv.projectName, t_csv.activityTitle, t_csv.description, t_csv.team, t_csv.dueDate, t_csv.status, t_csv.hasPayment, t_csv.paymentAmount, t_csv.paymentStatus ];
        const escapeCsvCell = (cell: any): string => {
            const cellStr = String(cell === null || cell === undefined ? '' : cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) return `"${cellStr.replace(/"/g, '""')}"`;
            return cellStr;
        };
        const rows = projectsWithActivities.flatMap(project =>
            project.activities.map(activity => [ project.name, activity.title, activity.description, getTeamById(activity.teamId)?.name || '', activity.dueDate ? new Date(activity.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '', activity.status, activity.hasPayment ? t_csv.yes : t_csv.no, activity.paymentAmount, activity.paymentStatus || '' ])
        );
        const csvContent = [ headers.map(escapeCsvCell).join(','), ...rows.map(row => row.map(escapeCsvCell).join(',')) ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'project_activities.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderChart = () => {
        switch (vizChartType) {
            case 'pie':
                const totalValue = vizChartData.reduce((sum, item) => sum + item.value, 0);
                if (totalValue === 0) return null;
                let accumulatedPercentage = 0;
                const conicGradientSegments = vizChartData.map((d, i) => {
                    const percentage = (d.value / totalValue) * 100;
                    const segment = `${chartColors[i % chartColors.length]} ${accumulatedPercentage}% ${accumulatedPercentage + percentage}%`;
                    accumulatedPercentage += percentage;
                    return segment;
                }).join(', ');
                return (
                    <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6 p-4">
                        <div
                            className="w-48 h-48 rounded-full flex-shrink-0"
                            style={{ background: `conic-gradient(${conicGradientSegments})` }}
                        />
                        <div className="w-full md:w-auto overflow-y-auto max-h-48">
                            <ul className="space-y-1 text-xs">
                                {vizChartData.map((d, i) => (
                                    <li key={d.label} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{d.label}:</span>
                                        <span className="text-slate-500 dark:text-slate-400">{d.value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} ({(d.value / totalValue * 100).toFixed(1)}%)</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'line':
                const path = vizChartData.map((d, i) => {
                    const x = (i / (vizChartData.length - 1 || 1)) * 100;
                    const y = 100 - (d.value / vizMaxValue) * 100;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');
                 return (
                    <div className="w-full h-full flex flex-col items-center p-4">
                        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                            <path d={path} fill="none" stroke={chartColors[0]} strokeWidth="1" />
                        </svg>
                        <div className="w-full flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {vizChartData.map(d => <span key={d.label} className="truncate">{d.label}</span>)}
                        </div>
                    </div>
                );
            case 'bar':
            default:
                return (
                    <div className="h-full flex items-end gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-2 px-2 pt-5">
                        {vizChartData.map((d, i) => (
                             <div key={d.label} className="w-full h-full flex flex-col justify-end items-center group relative">
                                <div className="absolute bottom-full mb-2 w-max p-2 text-xs bg-slate-800 text-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <p className="font-bold">{d.label}</p>
                                    <p>{d.value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                </div>
                                <div 
                                    style={{ height: `${(d.value / vizMaxValue) * 100}%`, backgroundColor: chartColors[i % chartColors.length] }} 
                                    className="w-full rounded-t-md transition-all duration-300 relative"
                                >
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-200 pointer-events-none">
                                        {d.value > 0 ? d.value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-1 truncate w-full">{d.label}</p>
                            </div>
                        ))}
                    </div>
                );
        }
    };
    
    return (
         <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm dark:shadow-none h-full flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.projectActivities}</h2>
                    <button onClick={() => setShowVisualization(v => !v)} title={showVisualization ? t.hideVisualization : t.showVisualization} className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-full px-3 py-1 flex items-center gap-1.5 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                        <span>{showVisualization ? t.hideVisualization : t.showVisualization}</span>
                    </button>
                </div>
                <div className="flex items-center bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 p-1 rounded-full">
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.listView}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.gridView}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    </button>
                </div>
            </div>
             <div className="px-6 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                <div className="lg:col-span-1"><SearchableSelect value={selectedCustomerId} onChange={setSelectedCustomerId} options={customerOptions} placeholder={t.allCustomers} searchPlaceholder={t.searchCustomers} language={language}/></div>
                <div className="lg:col-span-1"><SearchableSelect value={selectedManagerId} onChange={setSelectedManagerId} options={managerOptions} placeholder={t.allManagers} searchPlaceholder={t.searchManagers} language={language}/></div>
                <div className="lg:col-span-1"><SearchableSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectOptions} placeholder={t.allProjects} searchPlaceholder={t.searchProjects} language={language}/></div>
                <div className="lg:col-span-1"><SearchableSelect value={selectedMonthYear} onChange={setSelectedMonthYear} options={finalMonthYearOptions} placeholder={t.allMonths} searchPlaceholder={t.searchMonths} language={language}/></div>
                <div className="lg:col-span-1"><SearchableSelect value={selectedPaymentStatus} onChange={setSelectedPaymentStatus} options={paymentStatusOptions} placeholder={t.allPaymentStatuses} searchPlaceholder={t.searchPaymentStatuses} language={language}/></div>
                <button onClick={handleClearFilters} title={t.clearFilters} className="lg:col-span-1 flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg><span>{t.clearFilters}</span></button>
                <button onClick={handleExport} disabled={projectsWithActivities.length === 0} title={t.exportToExcel} className="lg:col-span-1 flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg><span>{t.exportToExcel}</span></button>
            </div>

            {showVisualization && (
                <div className="p-6 border-y border-slate-200 dark:border-slate-700/50 my-4 bg-slate-50 dark:bg-slate-900/20">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t.dataVisualization}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.measure}</label>
                            <select value={vizMeasure} onChange={e => setVizMeasure(e.target.value)} className="w-full mt-1 p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-sm">{vizMeasureOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.dimension}</label>
                            <select value={vizDimension} onChange={e => setVizDimension(e.target.value)} className="w-full mt-1 p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-sm">{vizDimensionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.chartType}</label>
                            <select value={vizChartType} onChange={e => setVizChartType(e.target.value)} className="w-full mt-1 p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-sm">{vizChartTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                       {vizChartData.length > 0 ? renderChart() : <p className="text-sm text-slate-500 dark:text-slate-400 w-full text-center pt-24">{t.noActivities}</p>}
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-y-auto" style={{ maxHeight: '320px' }}>
                {projectsWithActivities.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="space-y-3 pr-2 rtl:pl-2 px-6">
                            {projectsWithActivities.map(project => {
                                const isOpen = !!openProjects[project.id];
                                return (
                                    <div key={project.id} onDoubleClick={() => onViewProjectDetails(project)} className="bg-white dark:bg-slate-800/30 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 transition-shadow hover:shadow-lg dark:hover:shadow-violet-900/30 cursor-pointer">
                                        <button onClick={() => handleToggleProject(project.id)} className="w-full flex justify-between items-center p-4 text-left rtl:text-right bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors" aria-expanded={isOpen}>
                                            <div className="flex-1 min-w-0"><h3 className="font-bold text-slate-800 dark:text-white truncate flex-shrink">{project.name}</h3><div className="flex justify-between items-center mt-2"><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5"><div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div></div></div></div>
                                            <div className="flex items-center gap-4 flex-shrink-0 ms-4 rtl:ms-0 rtl:me-4">
                                                 <span className="text-xs font-mono bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full flex-shrink-0">{project.activities.length} {t.activityUnit}</span>
                                                {project.projectManager && (<div className="hidden sm:flex items-center gap-2"><img src={project.projectManager.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager.name}&background=c4b5fd&color=2e1065`} alt={project.projectManager.name} className="w-6 h-6 rounded-full" /><span className="text-sm font-medium text-slate-600 dark:text-slate-300">{project.projectManager.name}</span></div>)}
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </div>
                                        </button>
                                        
                                        {isOpen && (<div className="p-4 border-t border-slate-200 dark:border-slate-700/50"><div className="space-y-2.5 border-s-2 border-slate-200 dark:border-slate-700 ps-4 ms-1 rtl:border-s-0 rtl:border-e-2 rtl:ps-0 rtl:pe-4 rtl:ms-0 rtl:me-1">{project.activities.map(activity => { const isValidDate = activity.dueDate && !isNaN(new Date(activity.dueDate).getTime()); const dueDate = isValidDate ? new Date(activity.dueDate) : null; return (<div key={activity.id} className="text-sm"><div className="flex justify-between items-center gap-4"><span className="text-slate-700 dark:text-slate-300 truncate font-medium flex-grow">{activity.title}</span><div className="flex items-center gap-4 text-xs shrink-0">{activity.hasPayment && (<div className="flex items-center gap-3"><span className={`px-2 py-0.5 rounded-full font-semibold ${paymentStatusColors[activity.paymentStatus || PaymentStatus.Pending]}`}>{t[activity.paymentStatus || PaymentStatus.Pending]}</span><span className="font-mono font-bold text-green-600 dark:text-green-400 w-20 text-right rtl:text-left">{activity.paymentAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span></div>)}<div className="w-24 text-right rtl:text-left font-semibold text-slate-800 dark:text-slate-200">{dueDate ? dueDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noDueDate}</div></div></div></div>);})}</div></div>)}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2 px-6 pr-2 rtl:pl-2">
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase p-3">
                                <div className="col-span-4">{t.projectManagerHeader}</div>
                                <div className="col-span-1 text-center">{t.activityCountHeader}</div>
                                <div className="col-span-2 text-center">{t.countryHeader}</div>
                                <div className="col-span-2 text-center">{t.statusHeader}</div>
                                <div className="col-span-3 text-center">{t.teamHeader}</div>
                            </div>
                            {projectsWithActivities.map(project => (
                                <div key={project.id} onDoubleClick={() => onViewProjectDetails(project)} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm">
                                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                                        <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=c4b5fd&color=2e1065`} alt={project.projectManager?.name || t.unassigned} className="w-7 h-7 rounded-full flex-shrink-0" />
                                        <div className="min-w-0"><p className="font-bold text-slate-800 dark:text-white truncate">{project.name}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.projectManager?.name || t.unassigned}</p></div>
                                    </div>
                                    <div className="col-span-1 text-center font-mono">{project.activities.length}</div>
                                    <div className="col-span-2 text-center text-slate-600 dark:text-slate-300 truncate">{project.country?.name || '--'}</div>
                                    <div className="col-span-2 text-center"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>{project.status?.name || t.noStatus}</span></div>
                                    <div className="col-span-3 text-center text-slate-600 dark:text-slate-300 truncate">{project.team?.name || '--'}</div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 h-full flex items-center justify-center py-10">{t.noActivities}</p>
                )}
            </div>
        </div>
    );
};


export const WIDGETS_CONFIG = [
    { id: 'project_activities', name: 'Project Activities', component: ProjectActivitiesWidget, default: true, colSpan: 4 },
    { id: 'stats', name: 'Stats Overview', component: StatsOverviewWidget, default: true, colSpan: 4 },
    { id: 'project_status', name: 'Project Statuses', component: ProjectStatusChartWidget, default: true, colSpan: 2 },
    { id: 'team_workload', name: 'Team Workload', component: TeamWorkloadChartWidget, default: true, colSpan: 2 },
    { id: 'projects_by_year', name: 'Projects by Launch Year', component: ProjectsByLaunchYearWidget, default: false, colSpan: 4 },
    { id: 'projects_by_country', name: 'Projects by Country', component: ProjectsByCountryWidget, default: false, colSpan: 2 },
    { id: 'projects_by_product', name: 'Projects by Product', component: ProjectsByProductWidget, default: false, colSpan: 2 },
];

const translations = {
    ar: {
        dashboard: "لوحة التحكم", overview: "نظرة عامة على مشاريعك وأنشطتك.", totalProjects: "إجمالي المشاريع", completedActivities: "أنشطة مكتملة", inProgressActivities: "أنشطة قيد التنفيذ", totalActivities: "إجمالي الأنشطة", projectStatuses: "حالات المشاريع", teamWorkload: "عبء عمل الفرق", customize: "تخصيص", unknownStatus: "غير معروف", noProjects: "لا توجد مشاريع لعرضها.", noTeams: "لا توجد فرق لعرضها.", projectActivities: "أنشطة المشاريع", noActivities: "لا توجد أنشطة.", Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة", noDueDate: "لا يوجد تاريخ استحقاق", allProjects: "كل المشاريع", allMonths: "كل الشهور", searchProjects: "ابحث عن مشروع...", searchMonths: "ابحث عن شهر...", exportToExcel: "تصدير إلى Excel", allCustomers: "كل العملاء", searchCustomers: "ابحث عن عميل...", allManagers: "كل المدراء", searchManagers: "ابحث عن مدير...", clearFilters: "مسح الفلاتر", activityUnit: "أنشطة", allPaymentStatuses: "كل حالات الدفع", searchPaymentStatuses: "ابحث عن حالة...",
        listView: "عرض قائمة", gridView: "عرض شبكي", projectManagerHeader: "المشروع/المدير", activityCountHeader: "الأنشطة", countryHeader: "البلد", statusHeader: "الحالة", teamHeader: "الفريق", unassigned: "غير معين", noStatus: "لا توجد حالة",
        dataVisualization: "تصور البيانات", showVisualization: "إظهار التصور البياني", hideVisualization: "إخفاء التصور البياني", chartType: "نوع الرسم البياني", dimension: "البعد (المحور السيني)", measure: "المقياس (المحور الصادي)", barChart: "أعمدة", pieChart: "دائري", status: "حالة المشروع", customer: "العميل", manager: "مدير المشروع", country: "الدولة", team: "الفريق", project: "المشروع", projectCount: "عدد المشاريع", activityCount: "عدد الأنشطة", totalPayment: "إجمالي الدفعات",
        monthYear: "الشهر/السنة", lineChart: "خطي",
        projectsByYear: "المشاريع حسب سنة الإطلاق", noLaunchDate: "بدون تاريخ إطلاق", projectsByCountry: "المشاريع حسب البلد", unknownCountry: "بلد غير معروف", projectsByProduct: "المشاريع حسب المنتج", unknownProduct: "منتج غير معروف",
    },
    en: {
        dashboard: "Dashboard", overview: "An overview of your projects and activities.", totalProjects: "Total Projects", completedActivities: "Completed Activities", inProgressActivities: "In Progress Activities", totalActivities: "Total Activities", projectStatuses: "Project Statuses", teamWorkload: "Team Workload", customize: "Customize", unknownStatus: "Unknown", noProjects: "No projects to display.", noTeams: "No teams to display.", projectActivities: "Project Activities", noActivities: "No activities.", Pending: "Pending", Sent: "Sent", Paid: "Paid", noDueDate: "No Due Date", allProjects: "All Projects", allMonths: "All Months", searchProjects: "Search projects...", searchMonths: "Search months...", exportToExcel: "Export to Excel", allCustomers: "All Customers", searchCustomers: "Search customers...", allManagers: "All Managers", searchManagers: "Search managers...", clearFilters: "Clear Filters", activityUnit: "Activities", allPaymentStatuses: "All Payment Statuses", searchPaymentStatuses: "Search statuses...",
        listView: "List View", gridView: "Grid View", projectManagerHeader: "Project/Manager", activityCountHeader: "Activities", countryHeader: "Country", statusHeader: "Status", teamHeader: "Team", unassigned: "Unassigned", noStatus: "No Status",
        dataVisualization: "Data Visualization", showVisualization: "Show Data Visualization", hideVisualization: "Hide Data Visualization", chartType: "Chart Type", dimension: "Dimension (X-Axis)", measure: "Measure (Y-Axis)", barChart: "Bar", pieChart: "Pie", status: "Project Status", customer: "Customer", manager: "Project Manager", country: "Country", team: "Team", project: "Project", projectCount: "Number of Projects", activityCount: "Number of Activities", totalPayment: "Total Payments",
        monthYear: "Month/Year", lineChart: "Line",
        projectsByYear: "Projects by Launch Year", noLaunchDate: "No Launch Date", projectsByCountry: "Projects by Country", unknownCountry: "Unknown Country", projectsByProduct: "Projects by Product", unknownProduct: "Unknown Product",
    }
};

const csvTranslations = {
    ar: {
        projectName: "اسم المشروع", activityTitle: "عنوان النشاط", description: "الوصف", team: "الفريق", dueDate: "تاريخ الاستحقاق", status: "الحالة", hasPayment: "عليه دفعة", paymentAmount: "قيمة الدفعة", paymentStatus: "حالة الدفعة", yes: "نعم", no: "لا",
    },
    en: {
        projectName: "Project Name", activityTitle: "Activity Title", description: "Description", team: "Team", dueDate: "Due Date", status: "Status", hasPayment: "Has Payment", paymentAmount: "Payment Amount", paymentStatus: "Payment Status", yes: "Yes", no: "No",
    }
};

interface AnalyticsDashboardProps {
    projects: Project[];
    activities: Activity[];
    teams: Lookup[];
    customers: Lookup[];
    projectManagers: User[];
    language: Language;
    currentUser?: User;
    onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = (props) => {
    const { language } = props;
    const t = translations[language];

    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [layout, setLayout] = useState<string[]>([]);
    const [viewingProject, setViewingProject] = useState<ProjectWithActivities | null>(null);
    
    useEffect(() => {
        try {
            const savedLayout = localStorage.getItem('dashboardLayout');
            if (savedLayout) {
                const parsedLayout = JSON.parse(savedLayout);
                const validWidgetIds = new Set(WIDGETS_CONFIG.map(w => w.id));
                const filteredLayout = parsedLayout.filter((id: string) => validWidgetIds.has(id));
                setLayout(filteredLayout);
            } else {
                setLayout(WIDGETS_CONFIG.filter(w => w.default).map(w => w.id));
            }
        } catch (error) {
            console.error("Failed to load dashboard layout", error);
            setLayout(WIDGETS_CONFIG.filter(w => w.default).map(w => w.id));
        }
    }, []);

    const handleSaveLayout = (newLayout: string[]) => {
        setLayout(newLayout);
        localStorage.setItem('dashboardLayout', JSON.stringify(newLayout));
        setIsCustomizeModalOpen(false);
    };

    const renderedWidgets = useMemo(() => {
        return layout.map(widgetId => {
            const widget = WIDGETS_CONFIG.find(w => w.id === widgetId);
            if (!widget) return null;
            const Component = widget.component as React.FC<any>; // Cast to allow onViewProjectDetails
            const colSpan = widget.colSpan;
            const colSpanClass = `lg:col-span-${colSpan}`;

            return (
                <div key={widget.id} className={colSpanClass}>
                  <Component {...props} onViewProjectDetails={setViewingProject} />
                </div>
            );
        });
    }, [layout, props]);
    
    return (
        <div className="space-y-8">
             {isCustomizeModalOpen && (
                <CustomizeDashboardModal
                    isOpen={isCustomizeModalOpen}
                    onClose={() => setIsCustomizeModalOpen(false)}
                    currentLayout={layout}
                    onSaveLayout={handleSaveLayout}
                    language={language}
                />
            )}
            {viewingProject && (
                <ProjectDetailModal
                    projectWithActivities={viewingProject}
                    onClose={() => setViewingProject(null)}
                    language={language}
                />
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.dashboard}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t.overview}</p>
                </div>
                <button onClick={() => setIsCustomizeModalOpen(true)} className="bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                    <span>{t.customize}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {renderedWidgets}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;