
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Milestone, Lookup, Language, PaymentStatus, User } from '../types';
import { ChevronDown, ChevronUp, BarChart2, List, Grid, RotateCcw, Download, Filter } from 'lucide-react';
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
        expandAll: "توسيع الكل", collapseAll: "طي الكل",
        dataVisualization: "تصور البيانات", showVisualization: "إظهار التصور البياني", hideVisualization: "إخفاء التصور البياني", chartType: "نوع الرسم البياني", dimension: "البعد (المحور السيني)", measure: "المقياس (المحور الصادي)", barChart: "أعمدة", pieChart: "دائري", status: "حالة المشروع", customer: "العميل", manager: "مدير المشروع", country: "الدولة", team: "الفريق", project: "المشروع", projectCount: "عدد المشاريع", milestoneCount: "عدد المعالم", totalPayment: "إجمالي الدفعات",
        monthYear: "الشهر/السنة", lineChart: "خطي", selected: "فترة مختارة"
    },
    en: {
        filter: "Advanced Filter", subtitle: "Advanced search and filtering for project milestones and payments.",
        projectMilestones: "Project Milestones", noMilestones: "No milestones.", Pending: "Pending", Sent: "Sent", Paid: "Paid", noDueDate: "No Due Date", allProjects: "All Projects", allMonths: "All Months", searchProjects: "Search projects...", searchMonths: "Search months...", exportToExcel: "Export to Excel", allCustomers: "All Customers", searchCustomers: "Search customers...", allManagers: "All Managers", searchManagers: "Search managers...", clearFilters: "Clear Filters", milestoneUnit: "Milestones", allPaymentStatuses: "All Payment Statuses", searchPaymentStatuses: "Search statuses...",
        listView: "List View", gridView: "Grid View", projectManagerHeader: "Project/Manager", milestoneCountHeader: "Milestones", countryHeader: "Country", statusHeader: "Status", teamHeader: "Team", unassigned: "Unassigned", noStatus: "No Status",
        expandAll: "Expand All", collapseAll: "Collapse All",
        dataVisualization: "Data Visualization", showVisualization: "Show Data Visualization", hideVisualization: "Hide Data Visualization", chartType: "Chart Type", dimension: "Dimension (X-Axis)", measure: "Measure (Y-Axis)", barChart: "Bar", pieChart: "Pie", status: "Project Status", customer: "Customer", manager: "Project Manager", country: "Country", team: "Team", project: "Project", projectCount: "Number of Projects", milestoneCount: "Number of Milestones", totalPayment: "Total Payments",
        monthYear: "Month/Year", lineChart: "Line", selected: "Periods Selected"
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
    const [selectedMonthYear, setSelectedMonthYear] = useState<string[]>(['all']);
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
    const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
    const [isResultsCollapsed, setIsResultsCollapsed] = useState(true);
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
            if (yearA !== yearB) return yearA - yearB;
            return monthA - monthB;
        });
    }, [milestones, language]);

    const finalMonthYearOptions = useMemo(() => [
        { value: 'all', label: t.allMonths },
        ...monthYearOptions
    ], [monthYearOptions, t.allMonths]);

    const handlePeriodChange = (val: string[]) => {
        if (val.length === 0) {
            setSelectedMonthYear(['all']);
            return;
        }
        const lastSelected = val[val.length - 1];
        if (lastSelected === 'all') {
            setSelectedMonthYear(['all']);
        } else {
            const filtered = val.filter(v => v !== 'all');
            setSelectedMonthYear(filtered.length > 0 ? filtered : ['all']);
        }
    };

    const isAllTime = selectedMonthYear.includes('all');

    const projectsToDisplay = useMemo(() => {
        if (selectedProjectId === 'all') return projectsFilteredByManager;
        return projectsFilteredByManager.filter(p => p.id === selectedProjectId);
    }, [projectsFilteredByManager, selectedProjectId]);

    const filteredMilestones = useMemo(() => {
        const displayedProjectIds = new Set(projectsToDisplay.map(p => p.id));
        return milestones.filter(milestone => {
            const projectMatch = displayedProjectIds.has(milestone.projectId);
            const monthYearMatch = isAllTime || (milestone.dueDate && selectedMonthYear.includes(`${new Date(milestone.dueDate).getFullYear()}-${new Date(milestone.dueDate).getMonth()}`));
            const paymentStatusMatch = selectedPaymentStatus === 'all' || (milestone.hasPayment && (milestone.paymentStatus || PaymentStatus.Pending) === selectedPaymentStatus);
            return projectMatch && monthYearMatch && paymentStatusMatch;
        });
    }, [milestones, projectsToDisplay, selectedMonthYear, isAllTime, selectedPaymentStatus]);

    const projectsWithMilestones: ProjectWithMilestones[] = useMemo(() => {
        return projectsToDisplay.map(project => ({
            ...project,
            milestones: filteredMilestones
                .filter(a => a.projectId === project.id)
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
        })).filter(p => p.milestones.length > 0);
    }, [projectsToDisplay, filteredMilestones]);

    // Cleanup open state on filter change
    useEffect(() => {
        setOpenProjects({});
    }, [JSON.stringify(projectsWithMilestones.map(p => p.id))]);

    const toggleAll = (expand: boolean) => {
        const newState: Record<string, boolean> = {};
        if (expand) {
            projectsWithMilestones.forEach(p => newState[p.id] = true);
        }
        setOpenProjects(newState);
    };

    const handleToggleProject = (projectId: string) => {
        setOpenProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
    };

    const handleClearFilters = () => {
        setSelectedCustomerId('all');
        setSelectedManagerId('all');
        setSelectedProjectId('all');
        setSelectedMonthYear(['all']);
        setSelectedPaymentStatus('all');
    };

    const handleExport = () => {
        const csvT = csvTranslations[language];
        const headers = [csvT.projectName, csvT.milestoneTitle, csvT.description, csvT.team, csvT.dueDate, csvT.status, csvT.hasPayment, csvT.paymentAmount, csvT.paymentStatus];
        
        const rows = projectsWithMilestones.flatMap(p => 
            p.milestones.map(m => [
                p.name, m.title, m.description || '', p.team?.name || '', m.dueDate || '', m.status || '',
                m.hasPayment ? csvT.yes : csvT.no, m.hasPayment ? m.paymentAmount : 0, m.hasPayment ? m.paymentStatus || PaymentStatus.Pending : ''
            ])
        );

        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `milestones_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Visualization Memo ---
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

        return Array.from(chartData.entries()).map(([label, data]) => {
            let value = 0;
            switch (vizMeasure) {
                case 'projectCount': value = data.projects.size; break;
                case 'milestoneCount': value = data.milestones.length; break;
                case 'totalPayment':
                    value = data.milestones.filter(a => a.hasPayment).reduce((sum, a) => sum + a.paymentAmount, 0);
                    break;
            }
            return { label, value };
        }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
    }, [vizDimension, vizMeasure, projectsWithMilestones, filteredMilestones, projects, language, t.unassigned]);

    const vizMaxValue = useMemo(() => Math.max(1, ...vizChartData.map(d => d.value)), [vizChartData]);

    const chartColors = ['#8b5cf6', '#6366f1', '#a78bfa', '#818cf8', '#c4b5fd', '#a5b4fc', '#ddd6fe', '#e0e7ff'];

    return (
        <div className="space-y-6 md:space-y-10">
            {viewingProject && (
                <ProjectDetailModal
                    projectWithMilestones={viewingProject}
                    onClose={() => setViewingProject(null)}
                    language={language}
                />
            )}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{t.filter}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-sm dark:shadow-none overflow-hidden transition-all duration-300 border border-slate-200 dark:border-slate-800">
                <div 
                    className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    onClick={() => setIsResultsCollapsed(!isResultsCollapsed)}
                >
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{t.projectMilestones}</h2>
                            {isResultsCollapsed ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronUp className="h-5 w-5 text-violet-600" />}
                        </div>
                        {!isResultsCollapsed && viewMode === 'grid' && projectsWithMilestones.length > 0 && (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <button onClick={() => toggleAll(true)} className="text-[9px] font-black uppercase text-slate-500 hover:text-violet-600 transition-colors">{t.expandAll}</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => toggleAll(false)} className="text-[9px] font-black uppercase text-slate-500 hover:text-violet-600 transition-colors">{t.collapseAll}</button>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowVisualization(v => !v)} className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-full px-4 py-2 flex items-center gap-1.5 transition-colors border border-violet-100 dark:border-violet-900/50">
                            <BarChart2 className="h-4 w-4" />
                            <span>{showVisualization ? t.hideVisualization : t.showVisualization}</span>
                        </button>
                        <div className="flex items-center bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 p-1 rounded-full">
                            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                                <List className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                                <Grid className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {!isResultsCollapsed && (
                    <div className="p-4 md:p-6 pt-0 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 md:gap-4">
                            <SearchableSelect value={selectedCustomerId} onChange={setSelectedCustomerId} options={customerOptions} placeholder={t.allCustomers} language={language}/>
                            <SearchableSelect value={selectedManagerId} onChange={setSelectedManagerId} options={managerOptions} placeholder={t.allManagers} language={language}/>
                            <SearchableSelect value={selectedProjectId} onChange={setSelectedProjectId} options={projectOptions} placeholder={t.allProjects} language={language}/>
                            <div className="md:min-w-[200px]">
                                <SearchableSelect 
                                    isMulti={true}
                                    value={selectedMonthYear} 
                                    onChange={handlePeriodChange} 
                                    options={finalMonthYearOptions} 
                                    placeholder={t.allMonths} 
                                    language={language}
                                />
                            </div>
                            <SearchableSelect value={selectedPaymentStatus} onChange={setSelectedPaymentStatus} options={paymentStatusOptions} placeholder={t.allPaymentStatuses} language={language}/>
                            
                            <button onClick={handleClearFilters} className="px-4 py-2 text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-xl border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 transition-colors">
                                <RotateCcw className="h-4 w-4" />
                                <span>{t.clearFilters}</span>
                            </button>
                            <button onClick={handleExport} disabled={projectsWithMilestones.length === 0} className="px-4 py-2 text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-xl border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                <Download className="h-4 w-4" />
                                <span>{t.exportToExcel}</span>
                            </button>
                        </div>

                        {showVisualization && (
                            <div className="p-4 md:p-6 border border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-900/20">
                                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">{t.dataVisualization}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{t.measure}</label>
                                        <select value={vizMeasure} onChange={e => setVizMeasure(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-xs font-bold">{vizMeasureOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                                    </div>
                                    <div>
                                         <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{t.dimension}</label>
                                        <select value={vizDimension} onChange={e => setVizDimension(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-xs font-bold">{vizDimensionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">{t.chartType}</label>
                                        <select value={vizChartType} onChange={e => setVizChartType(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 text-xs font-bold">{vizChartTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                                    </div>
                                </div>
                                <div className="h-[300px] flex items-end gap-2 px-2 pb-8 pt-4">
                                    {vizChartData.map((d, index) => (
                                        <div key={d.label} className="flex-1 flex flex-col justify-end group relative h-full">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 shadow-xl">
                                                {d.label}: {vizMeasure === 'totalPayment' ? `${d.value.toLocaleString()} $` : d.value}
                                            </div>
                                            <div 
                                                className="w-full rounded-t-sm transition-all duration-500 group-hover:brightness-110" 
                                                style={{ 
                                                    height: `${(d.value / vizMaxValue) * 100}%`,
                                                    backgroundColor: chartColors[index % chartColors.length]
                                                }}
                                            />
                                            <div className="absolute -bottom-6 left-0 right-0 text-[8px] font-black text-slate-400 truncate text-center uppercase tracking-tighter" title={d.label}>
                                                {d.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            {projectsWithMilestones.length > 0 ? (
                                viewMode === 'grid' ? (
                                    <div className="space-y-4">
                                        {projectsWithMilestones.map(project => {
                                            const isOpen = !!openProjects[project.id];
                                            return (
                                                <div key={project.id} className="bg-white dark:bg-slate-800/30 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 transition-shadow">
                                                    <button 
                                                        onClick={() => handleToggleProject(project.id)} 
                                                        onDoubleClick={() => setViewingProject(project)} 
                                                        className="w-full flex justify-between items-center p-4 text-left rtl:text-right bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm">{project.name}</h3>
                                                            </div>
                                                            <p className="text-[10px] font-mono text-slate-500">{project.projectCode}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-[10px] font-black bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full">{project.milestones.length} {t.milestoneUnit}</span>
                                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                                                            <div className="space-y-4 ps-2 border-s-2 border-slate-200 dark:border-slate-700 rtl:ps-0 rtl:pe-2 rtl:border-s-0 rtl:border-e-2">
                                                                {project.milestones.map(milestone => (
                                                                    <div key={milestone.id} className="text-xs flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                                        <span className="text-slate-700 dark:text-slate-300 font-bold">{milestone.title}</span>
                                                                        <div className="flex items-center gap-3 shrink-0">
                                                                            {milestone.hasPayment && (
                                                                                <span className="font-mono font-bold text-green-600 dark:text-green-400">{milestone.paymentAmount.toLocaleString()} $</span>
                                                                            )}
                                                                            <span className="text-[10px] text-slate-500 font-bold">
                                                                                {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '--'}
                                                                            </span>
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
                                    <div className="min-w-[800px] space-y-2">
                                        <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                            <div className="col-span-4">{t.projectManagerHeader}</div>
                                            <div className="col-span-1 text-center">{t.milestoneCountHeader}</div>
                                            <div className="col-span-2 text-center">{t.countryHeader}</div>
                                            <div className="col-span-2 text-center">{t.statusHeader}</div>
                                            <div className="col-span-3 text-center">{t.teamHeader}</div>
                                        </div>
                                        {projectsWithMilestones.map(project => (
                                            <div key={project.id} onDoubleClick={() => setViewingProject(project)} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-xs">
                                                <div className="col-span-4 flex items-center gap-3 min-w-0">
                                                    <img src={project.projectManager?.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager?.name || '?'}&background=c4b5fd&color=2e1065`} alt={project.projectManager?.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                                                    <div className="min-w-0"><p className="font-bold text-slate-800 dark:text-white truncate">{project.name}</p><p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{project.projectManager?.name || t.unassigned}</p></div>
                                                </div>
                                                <div className="col-span-1 text-center font-mono font-bold">{project.milestones.length}</div>
                                                <div className="col-span-2 text-center text-slate-600 dark:text-slate-300 truncate">{project.country?.name || '--'}</div>
                                                <div className="col-span-2 text-center"><span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>{project.status?.name || t.noStatus}</span></div>
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
                )}
            </div>
        </div>
    );
};

export default MilestoneFilter;
