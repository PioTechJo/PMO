import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Milestone, Project, Lookup, Language, Lookups, User, PaymentStatus } from '../types';
import MilestoneListItem from './MilestoneListItem';
import AddMilestoneModal from './AddMilestoneModal';
import SearchableSelect from './SearchableSelect';

interface MilestonesProps {
    allMilestones: Milestone[];
    allProjects: Project[];
    language: Language;
    onAddMilestones: (milestones: Omit<Milestone, 'id'>[]) => Promise<void>;
    onOpenEditModal: (milestone: Milestone) => void;
    onViewMilestoneDetails: (milestone: Milestone) => void;
    onUpdateMilestone: (milestoneId: string, updatedData: Partial<Omit<Milestone, 'id'>>) => Promise<void>;
    searchResult?: { id: string }[];
    lookups: Lookups;
    currentUser?: User;
}

const Milestones: React.FC<MilestonesProps> = ({ allMilestones, allProjects, language, onAddMilestones, onOpenEditModal, onViewMilestoneDetails, onUpdateMilestone, searchResult, lookups, currentUser }) => {
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
            title: "المعالم",
            subtitle: "نظرة على جميع المعالم الخاصة بك، منظمة حسب المشروع.",
            newMilestone: "إضافة معلم",
            unassignedMilestones: "معالم غير مسندة لمشروع",
            noMilestonesInProject: "لا توجد معالم في هذا المشروع.",
            noMilestonesFound: "لم يتم العثور على معالم.",
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
            exportGantt: "تصدير مخطط جانت",
            start: "البداية",
            end: "النهاية",
        },
        en: {
            title: "Milestones",
            subtitle: "An overview of all your milestones, organized by project.",
            newMilestone: "Add Milestone",
            unassignedMilestones: "Unassigned Milestones",
            noMilestonesInProject: "No milestones in this project.",
            noMilestonesFound: "No milestones found.",
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
            exportGantt: "Export Gantt Chart",
            start: "Start",
            end: "End",
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
        allMilestones.forEach(milestone => {
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
            if (yearB !== yearA) return yearB - yearA;
            return monthB - monthA;
        });
    }, [allMilestones, language]);

    const finalMonthYearOptions = useMemo(() => [
        { value: 'all', label: t.allMonths },
        ...monthYearOptions
    ], [monthYearOptions, t.allMonths]);

    useEffect(() => {
        if (selectedProjectId !== 'all' && !projectsFilteredByManager.some(p => p.id === selectedProjectId)) {
            setSelectedProjectId('all');
        }
    }, [projectsFilteredByManager, selectedProjectId]);
    

    const filteredMilestones = useMemo(() => {
        let milestones = searchResult
            ? allMilestones.filter(a => searchResult.some(res => res.id === a.id))
            : allMilestones;

        const managerProjectIds = new Set(projectsFilteredByManager.map(p => p.id));
        
        return milestones.filter(milestone => {
            if (selectedManagerId !== 'all' && !managerProjectIds.has(milestone.projectId)) {
                return false;
            }
            if (selectedProjectId !== 'all' && milestone.projectId !== selectedProjectId) {
                return false;
            }
            if (selectedHasPayment !== 'all') {
                if ((selectedHasPayment === 'yes' && !milestone.hasPayment) || (selectedHasPayment === 'no' && milestone.hasPayment)) {
                    return false;
                }
            }
            if (selectedPaymentStatus !== 'all' && milestone.paymentStatus !== selectedPaymentStatus) {
                return false;
            }
            const monthYearMatch = selectedMonthYear === 'all' || (milestone.dueDate && `${new Date(milestone.dueDate).getFullYear()}-${new Date(milestone.dueDate).getMonth()}` === selectedMonthYear);
            if (!monthYearMatch) {
                return false;
            }
            return true;
        });
    }, [searchResult, allMilestones, selectedManagerId, projectsFilteredByManager, selectedProjectId, selectedHasPayment, selectedPaymentStatus, selectedMonthYear]);


    const groupedMilestones = useMemo(() => {
        const projectMap: Map<string, Project & { milestones: Milestone[], totalPayments: number }> = new Map();

        filteredMilestones.forEach(milestone => {
            const project = allProjects.find(p => p.id === milestone.projectId);
            if (project) {
                 if (!projectMap.has(project.id)) {
                    projectMap.set(project.id, { ...project, milestones: [], totalPayments: 0 });
                }
                projectMap.get(project.id)!.milestones.push(milestone);
            }
        });

        projectMap.forEach(project => {
            project.totalPayments = project.milestones.reduce((sum, milestone) => {
                return sum + (milestone.hasPayment ? milestone.paymentAmount : 0);
            }, 0);
            project.milestones.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        });
        
        return Array.from(projectMap.values());
    }, [filteredMilestones, allProjects]);

    const getProjectById = (id: string) => allProjects.find(p => p.id === id);
    const getTeamById = (id: string | null) => id ? lookups.teams.find(t => t.id === id) : undefined;

    const handleAddMilestone = async (newMilestonesData: Omit<Milestone, 'id'>[]) => {
        await onAddMilestones(newMilestonesData);
        setShowAddModal(false);
    };

    const handleClearFilters = () => {
        setSelectedProjectId('all');
        setSelectedManagerId('all');
        setSelectedPaymentStatus('all');
        setSelectedHasPayment('all');
        setSelectedMonthYear('all');
    };
    
    const handleExportGantt = (project: Project & { milestones: Milestone[] }) => {
        const milestones = project.milestones.filter(a => a.dueDate && !isNaN(new Date(a.dueDate).getTime()));
        if (milestones.length === 0) return;
    
        const ROW_HEIGHT = 50;
        const HEADER_HEIGHT = 60;
        const SVG_PADDING = 20;
        const SIDE_WIDTH = 250;
        const BAR_HEIGHT = 20;
        const BAR_PADDING = (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const FONT_FAMILY = 'Tajawal, sans-serif';
    
        const escapeXml = (unsafe: string): string => {
            return unsafe.replace(/[<>&'"]/g, c => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        };
    
        const tasks = milestones.map(act => {
            const endDate = new Date(act.dueDate!);
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 7);
            return { id: act.id, name: act.title, start: startDate, end: endDate };
        }).sort((a, b) => a.start.getTime() - b.start.getTime());
    
        if (tasks.length === 0) return;
        
        let chartStartDate = new Date(tasks[0].start);
        let chartEndDate = new Date(tasks[0].end);
        tasks.forEach(task => {
            if (task.start < chartStartDate) chartStartDate = task.start;
            if (task.end > chartEndDate) chartEndDate = task.end;
        });
    
        chartStartDate.setDate(chartStartDate.getDate() - 3);
        chartEndDate.setDate(chartEndDate.getDate() + 3);
    
        const totalDays = Math.ceil((chartEndDate.getTime() - chartStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const CHART_WIDTH = totalDays * 40;
        
        const svgHeight = HEADER_HEIGHT + tasks.length * ROW_HEIGHT + SVG_PADDING * 2;
        const svgWidth = SIDE_WIDTH + CHART_WIDTH + SVG_PADDING * 2;
        
        const getX = (date: Date): number => {
            const diffDays = (date.getTime() - chartStartDate.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays * (CHART_WIDTH / totalDays);
        };
    
        let svgContent = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT_FAMILY}">`;
        
        svgContent += `
            <defs>
                <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#8b5cf6;" />
                    <stop offset="100%" style="stop-color:#6366f1;" />
                </linearGradient>
            </defs>
            <style>
                .bg { fill: #f8fafc; }
                .grid-line { stroke: #e2e8f0; stroke-width: 1; }
                .weekend-bg { fill: #f1f5f9; }
                .month-text { font-size: 14px; font-weight: bold; fill: #334155; }
                .day-text { font-size: 12px; fill: #64748b; }
                .task-label { font-size: 14px; fill: #1e293b; font-weight: 500; }
                .bar-text { font-size: 12px; fill: white; font-weight: bold; pointer-events: none; }
                .today-line { stroke: #ef4444; stroke-width: 2; stroke-dasharray: 6 4; }
                .today-text { fill: #ef4444; font-weight: bold; font-size: 12px; }
                .project-title { font-size: 24px; font-weight: 700; fill: #1e293b; }
            </style>
        `;
    
        svgContent += `<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" class="bg"/>`;
    
        svgContent += `<g transform="translate(${SVG_PADDING}, ${SVG_PADDING})">`;
        svgContent += `<text x="0" y="25" class="project-title">${escapeXml(project.name)}</text>`;
    
        let headerGroup = `<g transform="translate(${SIDE_WIDTH}, 0)">`;
        const months: { [key: string]: { startX: number, days: number, name: string, year: number } } = {};
    
        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(chartStartDate);
            date.setDate(date.getDate() + i);
            const xPos = getX(date);
            
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!months[monthKey]) {
                months[monthKey] = { 
                    startX: xPos, 
                    days: 0, 
                    name: date.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' }),
                    year: date.getFullYear()
                };
            }
            months[monthKey].days++;
    
            headerGroup += `<text x="${xPos + 20}" y="${HEADER_HEIGHT - 10}" text-anchor="middle" class="day-text">${date.getDate()}</text>`;
            headerGroup += `<line x1="${xPos}" y1="${HEADER_HEIGHT}" x2="${xPos}" y2="${svgHeight - SVG_PADDING*2}" class="grid-line" />`;
    
            const dayOfWeek = date.getDay();
            if ((language === 'ar' && (dayOfWeek === 5 || dayOfWeek === 6)) || (language === 'en' && (dayOfWeek === 0 || dayOfWeek === 6))) {
                headerGroup += `<rect x="${xPos}" y="${HEADER_HEIGHT}" width="${CHART_WIDTH / totalDays}" height="${tasks.length * ROW_HEIGHT}" class="weekend-bg" />`;
            }
        }
        
        Object.values(months).forEach(month => {
            const monthWidth = month.days * (CHART_WIDTH / totalDays);
            headerGroup += `<text x="${month.startX + monthWidth / 2}" y="${HEADER_HEIGHT - 35}" text-anchor="middle" class="month-text">${month.name} ${month.year}</text>`;
        });
    
        headerGroup += `</g>`;
        svgContent += headerGroup;
    
        let tasksGroup = `<g transform="translate(0, ${HEADER_HEIGHT})">`;
        tasks.forEach((task, index) => {
            const y = index * ROW_HEIGHT;
            
            tasksGroup += `<text x="10" y="${y + ROW_HEIGHT / 2}" dominant-baseline="middle" class="task-label">${escapeXml(task.name.length > 35 ? task.name.substring(0, 32) + '...' : task.name)}</text>`;
            tasksGroup += `<line x1="0" y1="${y + ROW_HEIGHT}" x2="${SIDE_WIDTH + CHART_WIDTH}" y2="${y + ROW_HEIGHT}" class="grid-line" />`;
            
            const barX = SIDE_WIDTH + getX(task.start);
            const barWidth = Math.max(1, getX(task.end) - getX(task.start));
            
            tasksGroup += `
                <g transform="translate(${barX}, ${y + BAR_PADDING})">
                    <rect x="0" y="0" width="${barWidth}" height="${BAR_HEIGHT}" rx="5" ry="5" fill="url(#barGradient)">
                        <title>${escapeXml(task.name)}\n${t.start}: ${task.start.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}\n${t.end}: ${task.end.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</title>
                    </rect>
                    ${barWidth > 50 ? `<text x="10" y="${BAR_HEIGHT/2}" dominant-baseline="middle" class="bar-text">${escapeXml(task.name.length > barWidth / 9 ? task.name.substring(0, Math.floor(barWidth/9)-3) + '...' : task.name)}</text>` : ''}
                </g>
            `;
        });
        tasksGroup += `</g>`;
        svgContent += tasksGroup;
    
        const today = new Date();
        if (today >= chartStartDate && today <= chartEndDate) {
            const todayX = SIDE_WIDTH + getX(today);
            svgContent += `
                <g class="today-marker">
                    <line x1="${todayX}" y1="${HEADER_HEIGHT - 20}" x2="${todayX}" y2="${svgHeight - SVG_PADDING*2}" class="today-line" />
                    <text x="${todayX}" y="${HEADER_HEIGHT - 25}" text-anchor="middle" class="today-text">${language === 'ar' ? 'اليوم' : 'Today'}</text>
                </g>
            `;
        }
    
        svgContent += `</g></svg>`;
    
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeProjectName}_gantt_chart.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            {showAddModal && <AddMilestoneModal teams={lookups.teams} projects={allProjects} onClose={() => setShowAddModal(false)} onAddMilestone={handleAddMilestone} language={language} />}

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-violet-700/50">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"></path></svg>
                        <span>{t.newMilestone}</span>
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
                {groupedMilestones.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-10">{t.noMilestonesFound}</p>
                )}

                {groupedMilestones.map(project => (
                    <div key={project.id}>
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4 pb-2 border-b-2 border-violet-500/50">
                            <div className="flex items-center gap-4">
                               <h2 className="text-xl font-bold text-slate-800 dark:text-white">{project.name}</h2>
                               <button 
                                    onClick={() => handleExportGantt(project)}
                                    title={t.exportGantt}
                                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 11a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm5 2a1 1 0 011-1h10a1 1 0 110 2H8a1 1 0 01-1-1zM2 5a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm5 2a1 1 0 011-1h10a1 1 0 110 2H8a1 1 0 01-1-1z"/>
                                    </svg>
                                    <span>{t.exportGantt}</span>
                                </button>
                            </div>
                            {project.totalPayments > 0 && (
                                <div className="bg-green-500/10 text-green-800 dark:text-green-200 font-bold text-sm px-3 py-1.5 rounded-full">
                                    <span>{t.totalPayments}: </span>
                                    <span>{project.totalPayments.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                             {project.milestones.map(milestone => (
                                <MilestoneListItem
                                    key={milestone.id}
                                    milestone={milestone}
                                    project={getProjectById(milestone.projectId)}
                                    team={getTeamById(milestone.teamId)}
                                    language={language}
                                    onOpenEditModal={() => onOpenEditModal(milestone)}
                                    onDoubleClick={() => onViewMilestoneDetails(milestone)}
                                    onUpdateMilestone={onUpdateMilestone}
                                />
                             ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Milestones;