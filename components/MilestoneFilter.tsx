
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Milestone, Lookup, Language, PaymentStatus, User } from '../types';
import SearchableSelect from './SearchableSelect';
import ProjectDetailModal from './ProjectDetailModal';

type ProjectWithMilestones = Project & { milestones: Milestone[] };

interface MilestoneFilterProps {
    projects: Project[];
    milestones: Milestone[];
    teams: Lookup[];
    customers: Lookup[];
    projectManagers: User[];
    language: Language;
    currentUser?: User;
    onUpdateMilestone: (milestoneId: string, updatedData: Partial<Omit<Milestone, 'id'>>) => Promise<void>;
}

const translations = {
    ar: {
        filter: "الفلترة المتقدمة", subtitle: "بحث وتصفية متقدمة لمعالم المشاريع والدفعات.", 
        projectMilestones: "معالم المشاريع", noMilestones: "لا توجد معالم.", Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة", noDueDate: "لا يوجد تاريخ استحقاق", allProjects: "كل المشاريع", allMonths: "كل الشهور", searchProjects: "ابحث عن مشروع...", searchMonths: "ابحث عن شهر...", exportToExcel: "تصدير إلى Excel", allCustomers: "كل العملاء", searchCustomers: "ابحث عن عميل...", allManagers: "كل المدراء", searchManagers: "ابحث عن مدير...", clearFilters: "مسح الفلاتر", milestoneUnit: "معالم", allPaymentStatuses: "كل حالات الدفع", searchPaymentStatuses: "ابحث عن حالة...",
        listView: "عرض قائمة", gridView: "عرض شبكي", projectManagerHeader: "المشروع/المدير", milestoneCountHeader: "المعالم", countryHeader: "البلد", statusHeader: "الحالة", teamHeader: "الفريق", unassigned: "غير معين", noStatus: "لا توجد حالة",
        dataVisualization: "تصور البيانات", showVisualization: "إظهار التصور البياني", hideVisualization: "إخفاء التصور البياني", chartType: "نوع الرسم البياني", dimension: "البعد (المحور السيني)", measure: "المقياس (المحور الصادي)", barChart: "أعمدة", pieChart: "دائري", status: "حالة المشروع", customer: "العميل", manager: "مدير المشروع", country: "الدولة", team: "الفريق", project: "المشروع", projectCount: "عدد المشاريع", milestoneCount: "عدد المعالم", totalPayment: "إجمالي الدفعات",
        monthYear: "الشهر/السنة", lineChart: "خطي",
    },
    en: {
        filter: "Advanced Filter", subtitle: "Advanced search and filtering for project milestones and payments.",
        projectMilestones: "Project Milestones", noMilestones: "No milestones.", Pending: "Pending", Sent: "Sent", Paid: "Paid", noDueDate: "No Due Date", allProjects: "All Projects", allMonths: "All Months", searchProjects: "Search projects...", searchMonths: "Search months...", exportToExcel: "Export to Excel", allCustomers: "All Customers", searchCustomers: "Search customers...", allManagers: "All Managers", searchManagers: "Search managers...", clearFilters: "Clear Filters", milestoneUnit: "Milestones", allPaymentStatuses: "All Payment Statuses", searchPaymentStatuses: "Search statuses...",
        listView: "List View", gridView: "Grid View", projectManagerHeader: "Project/Manager", milestoneCountHeader: "Milestones", countryHeader: "Country", statusHeader: "Status", teamHeader: "Team", unassigned: "Unassigned", noStatus: "No Status",
        dataVisualization: "Data Visualization", showVisualization: "Show Data Visualization", hideVisualization: "Hide Data Visualization", chartType: "Chart Type", dimension: "Dimension (X-Axis)", measure: "Measure (Y-Axis)", barChart: "Bar", pieChart: "Pie", status: "Project Status", customer: "Customer", manager: "Project Manager", country: "Country", team: "Team", project: "Project", projectCount: "Number of Projects", milestoneCount: "Number of Milestones", totalPayment: "Total Payments",
        monthYear: "Month/Year", lineChart: "Line",
    }
};

const csvTranslations = {
    ar: {
        projectName: "اسم المشروع", milestoneTitle: "عنوان المعلم", description: "الوصف", team: "الفريق", dueDate: "تاريخ الاستحقاق", status: "الحالة", hasPayment: "عليه دفعة", paymentAmount: "قيمة الدفعة", paymentStatus: "حالة الدفعة", yes: "نعم", no: "لا",
    },
    en: {
        projectName: "Project Name", milestoneTitle: "Milestone Title", description: "Description", team: "Team", dueDate: "Due Date", status: "Status", hasPayment: "Has Payment", paymentAmount: "Payment Amount", paymentStatus: "Payment Status", yes: "Yes", no: "No",
    }
};

const MilestoneFilter: React.FC<MilestoneFilterProps> = ({ projects, milestones, teams, customers, projectManagers, language, currentUser, onUpdateMilestone }) => {
    const t = translations[language];
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
    const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [viewingProject, setViewingProject] = useState<ProjectWithMilestones | null>(null);
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
        milestones.forEach(milestone => {
            if (milestone.dueDate) {
                const date = new Date(milestone.dueDate);
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
            // Fixed: Changed sort order to ASC (a - b) as requested
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });
    }, [milestones, language]);

    const finalMonthYearOptions = useMemo(() => [
        { value: 'all', label: t.allMonths },
        ...monthYearOptions
    ], [monthYearOptions, t.allMonths]);

    const projectsToDisplay = useMemo(() => {
        if (selectedProjectId === 'all') return projectsFilteredByManager;
        return projectsFilteredByManager.filter(p => p.id === selectedProjectId);
    }, [projectsFilteredByManager, selectedProjectId]);

    const filteredMilestones = useMemo(() => {
        const displayedProjectIds = new Set(projectsToDisplay.map(p => p.id));
        return milestones.filter(milestone => {
            const projectMatch = displayedProjectIds.has(milestone.projectId);
            const monthYearMatch = selectedMonthYear === 'all' || (milestone.dueDate && `${new Date(milestone.dueDate).getFullYear()}-${new Date(milestone.dueDate).getMonth()}` === selectedMonthYear);
            const paymentStatusMatch = selectedPaymentStatus === 'all' || (milestone.hasPayment && (milestone.paymentStatus || PaymentStatus.Pending) === selectedPaymentStatus);
            return projectMatch && monthYearMatch && paymentStatusMatch;
        });
    }, [milestones, projectsToDisplay, selectedMonthYear, selectedPaymentStatus]);

    const projectsWithMilestones: ProjectWithMilestones[] = useMemo(() => {
        return projectsToDisplay.map(project => ({
            ...project,
            milestones: filteredMilestones
                .filter(a => a.projectId === project.id)
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
        })).filter(p => p.milestones.length > 0);
    }, [projectsToDisplay, filteredMilestones]);
    
    // --- Visualization Data Processing ---
    const vizDimensionOptions = useMemo(() => [
        { value: 'status', label: t.status }, { value: 'customer', label: t.customer },
        { value: 'manager', label: t.manager }, { value: 'country', label: t.country }, { value: 'team', label: t.team },
        { value: 'monthYear', label: t.monthYear }, { value: 'project', label: t.project }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);
    const vizMeasureOptions = useMemo(() => [
        { value: 'projectCount', label: t.projectCount }, { value: 'milestoneCount', label: t.milestoneCount }, { value: 'totalPayment', label: t.totalPayment }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);
    const vizChartTypeOptions = useMemo(() => [
        { value: 'bar', label: t.barChart }, { value: 'line', label: t.lineChart }, { value: 'pie', label: t.pieChart }
    ].sort((a,b) => a.label.localeCompare(b.label)), [t]);

    const vizChartData = useMemo(() => {
        const chartData = new Map<string, { projects: Set<string>; milestones: Milestone[] }>();
        const allRelevantMilestones = vizDimension === 'monthYear' ? filteredMilestones : projectsWithMilestones.flatMap(p => p.milestones);

        allRelevantMilestones.forEach(milestone => {
            const project = projects.find(p => p.id === milestone.projectId);
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
                    if (milestone.dueDate) {
                        const date = new Date(milestone.dueDate);
                        key = date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
                    }
                    break;
            }
            key = key || t.unassigned;
            if (!chartData.has(key)) chartData.set(key, { projects: new Set(), milestones: [] });
            chartData.get(key)!.projects.add(project.id);
            chartData.get(key)!.milestones.push(milestone);
        });

        const aggregatedData = Array.from(chartData.entries()).map(([label, data]) => {
            let value = 0;
            switch (vizMeasure) {
                case 'projectCount': value = data.projects.size; break;
                case 'milestoneCount': value = data.milestones.length; break;
                case 'totalPayment':
                    value = data.milestones.filter(a => a.hasPayment).reduce((sum, a) => sum + a.paymentAmount, 0);
                    break;
            }
            return { label, value };
        });

        return aggregatedData.filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [vizDimension, vizMeasure, projectsWithMilestones, filteredMilestones, projects, language, t.unassigned]);

    const vizMaxValue = useMemo(() => {
        if (!vizChartData || vizChartData.length === 0) return 1;
        return Math.max(...vizChartData.map(d => d.value));
    }, [vizChartData]);

    const chartColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#a5b4fc', '#ddd6fe', '#e0e7ff'];

    useEffect(() => {
        const newOpenState: Record<string, boolean> = {};
        if (projectsWithMilestones.length > 0) {
            newOpenState[projectsWithMilestones[0].id] = true;
        }
        setOpenProjects(newOpenState);
    }, [JSON.stringify(projectsWithMilestones.map(p => p.id))]);
    
    const handleToggleProject = (projectId: string) => {
        setOpenProjects(prevOpen => ({ ...prevOpen, [projectId]: !prevOpen[projectId] }));
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
        if (projectsWithMilestones.length === 0) return;
        const t_csv = csvTranslations[language];
        const headers = [ t_csv.projectName, t_csv.milestoneTitle, t_csv.description, t_csv.team, t_csv.dueDate, t_csv.status, t_csv.hasPayment, t_csv.paymentAmount, t_csv.paymentStatus ];
        const escapeCsvCell = (cell: any): string => {
            const cellStr = String(cell === null || cell === undefined ? '' : cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) return `"${cellStr.replace(/"/g, '""')}"`;
            return cellStr;
        };
        const rows = projectsWithMilestones.flatMap(project =>
            project.milestones.map(milestone => [ project.name, milestone.title, milestone.description, getTeamById(milestone.teamId)?.name || '', milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '', milestone.status, milestone.hasPayment ? t_csv.yes : t_csv.no, milestone.paymentAmount, milestone.paymentStatus || '' ])
        );
        const csvContent = [ headers.map(escapeCsvCell).join(','), ...rows.map(row => row.map(escapeCsvCell).join(',')) ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'project_milestones.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const formatVizValue = (value: number) => {
        if (vizMeasure === 'totalPayment') {
            return value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' });
        }
        return value.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
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
                        <div className="w-48 h-48 rounded-full flex-shrink-0" style={{ background: `conic-gradient(${conicGradientSegments})` }} />
                        <div className="w-full md:w-auto overflow-y-auto max-h-48">
                            <ul className="space-y-1 text-xs">
                                {vizChartData.map((d, i) => (
                                    <li key={d.label} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{d.label}:</span>
                                        <span className="text-slate-500 dark:text-slate-400">{formatVizValue(d.value)} ({(d.value / totalValue * 100).toFixed(1)}%)</span>
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
                                    <p>{formatVizValue(d.value)}</p>
                                </div>
                                <div style={{ height: `${(d.value / vizMaxValue) * 100}%`, backgroundColor: chartColors[i % chartColors.length] }} className="w-full rounded-t-md transition-all duration-300 relative">
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-200 pointer-events-none">
                                        {d.value > 0 ? formatVizValue(d.value) : ''}
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
        <div className="space-y-8">
            {viewingProject && (
                <ProjectDetailModal
                    projectWithMilestones={viewingProject}
                    onClose={() => setViewingProject(null)}
                    language={language}
                />
            )}
            
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.filter}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm dark:shadow-none p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.projectMilestones}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowVisualization(v => !v)} className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-full px-4 py-2 flex items-center gap-1.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                            <span>{showVisualization ? t.hideVisualization : t.showVisualization}</span>
                        </button>
                        <div className="flex items-center bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 p-1 rounded-full">
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.listView}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            </button>
                            <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.gridView}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                    <SearchableSelect value={selectedCustomerId} onChange={setSelectedCustomerId} options={customerOptions} placeholder={t.allCustomers} searchPlaceholder={t.searchCustomers} language={language}/>
                    <SearchableSelect value={selectedManagerId} onChange={setSelectedManagerId} options={managerOptions} placeholder={t.allManagers} searchPlaceholder={t.searchManagers} language={language}/>
                    <SearchableSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectOptions} placeholder={t.allProjects} searchPlaceholder={t.searchProjects} language={language}/>
                    <SearchableSelect value={selectedMonthYear} onChange={setSelectedMonthYear} options={finalMonthYearOptions} placeholder={t.allMonths} searchPlaceholder={t.searchMonths} language={language}/>
                    <SearchableSelect value={selectedPaymentStatus} onChange={setSelectedPaymentStatus} options={paymentStatusOptions} placeholder={t.allPaymentStatuses} searchPlaceholder={t.searchPaymentStatuses} language={language}/>
                    <button onClick={handleClearFilters} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                        <span>{t.clearFilters}</span>
                    </button>
                    <button onClick={handleExport} disabled={projectsWithMilestones.length === 0} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        <span>{t.exportToExcel}</span>
                    </button>
                </div>

                {showVisualization && (
                    <div className="p-6 border border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-900/20">
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
                           {vizChartData.length > 0 ? renderChart() : <p className="text-sm text-slate-500 dark:text-slate-400 w-full text-center pt-24">{t.noMilestones}</p>}
                        </div>
                    </div>
                )}

                <div className="overflow-y-auto">
                    {projectsWithMilestones.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="space-y-4">
                                {projectsWithMilestones.map(project => {
                                    const isOpen = !!openProjects[project.id];
                                    return (
                                        <div key={project.id} className="bg-white dark:bg-slate-800/30 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 transition-shadow hover:shadow-lg">
                                            <button onClick={() => handleToggleProject(project.id)} onDoubleClick={() => setViewingProject(project)} className="w-full flex justify-between items-center p-4 text-left rtl:text-right bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 dark:text-white truncate">{project.name}</h3>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs font-mono text-slate-500">{project.projectCode}</span>
                                                        <div className="flex-1 max-w-[200px] bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-1.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0 ms-4 rtl:ms-0 rtl:me-4">
                                                    <span className="text-xs font-mono bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full">{project.milestones.length} {t.milestoneUnit}</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </div>
                                            </button>
                                            {isOpen && (
                                                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                                                    <div className="space-y-3 ps-4 border-s-2 border-slate-200 dark:border-slate-700 rtl:ps-0 rtl:pe-4 rtl:border-s-0 rtl:border-e-2">
                                                        {project.milestones.map(milestone => (
                                                            <div key={milestone.id} className="text-sm flex justify-between items-center gap-4">
                                                                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">{milestone.title}</span>
                                                                <div className="flex items-center gap-4 text-xs shrink-0">
                                                                    {milestone.hasPayment && (
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`px-2 py-0.5 rounded-full font-semibold ${paymentStatusColors[milestone.paymentStatus || PaymentStatus.Pending]}`}>{t[milestone.paymentStatus || PaymentStatus.Pending]}</span>
                                                                            <span className="font-mono font-bold text-green-600 dark:text-green-400 w-20 text-right rtl:text-left">{milestone.paymentAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' })}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="w-24 text-right rtl:text-left font-semibold text-slate-800 dark:text-slate-200">
                                                                        {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : t.noDueDate}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <div className="col-span-4">{t.projectManagerHeader}</div>
                                    <div className="col-span-1 text-center">{t.milestoneCountHeader}</div>
                                    <div className="col-span-2 text-center">{t.countryHeader}</div>
                                    <div className="col-span-2 text-center">{t.statusHeader}</div>
                                    <div className="col-span-3 text-center">{t.teamHeader}</div>
                                </div>
                                {projectsWithMilestones.map(project => (
                                    <div key={project.id} onDoubleClick={() => setViewingProject(project)} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm">
                                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                                            <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=c4b5fd&color=2e1065`} alt={project.projectManager?.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <div className="min-w-0"><p className="font-bold text-slate-800 dark:text-white truncate">{project.name}</p><p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.projectManager?.name || t.unassigned}</p></div>
                                        </div>
                                        <div className="col-span-1 text-center font-mono font-bold">{project.milestones.length}</div>
                                        <div className="col-span-2 text-center text-slate-600 dark:text-slate-300 truncate">{project.country?.name || '--'}</div>
                                        <div className="col-span-2 text-center"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>{project.status?.name || t.noStatus}</span></div>
                                        <div className="col-span-3 text-center text-slate-600 dark:text-slate-300 truncate">{project.team?.name || '--'}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-10">{t.noMilestones}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MilestoneFilter;
