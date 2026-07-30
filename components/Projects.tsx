
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Project, Milestone, User, Language, Lookups, ProjectImportRow, Issue } from '../types';
import ProjectCard from './ProjectCard';
import ProjectListItem from './ProjectListItem';
import AddProjectModal from './AddProjectModal';
import SearchableSelect from './SearchableSelect';
import ProjectDetailModal from './ProjectDetailModal';

// Co-located Modal Component for Project Import
interface ImportProjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: ProjectImportRow[]) => void;
    language: Language;
}

const ImportProjectsModal: React.FC<ImportProjectsModalProps> = ({ isOpen, onClose, onImport, language }) => {
    const [parsedData, setParsedData] = useState<ProjectImportRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const t = translations[language];
    const expectedHeaders = useMemo(() => ['name', 'description', 'customerName', 'projectManagerName', 'statusName', 'countryName', 'categoryName', 'teamName', 'productName', 'launchDate', 'actualStartDate', 'expectedClosureDate', 'progress'], []);

    const parseCsv = (csvText: string): { headers: string[], data: ProjectImportRow[] } => {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim());
        if (lines.length < 1) return { headers: [], data: [] };

        const headers = lines[0].split(',').map(h => h.trim());
        const data: ProjectImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row: { [key: string]: string } = {};
            const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            
            headers.forEach((header, index) => {
                let value = values[index];
                if (value) {
                    value = value.trim();
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.substring(1, value.length - 1).replace(/""/g, '"');
                    }
                    row[header] = value;
                }
            });
            data.push(row as unknown as ProjectImportRow);
        }
        return { headers, data };
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setError(null);
        setParsedData([]);
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onabort = () => setError(t.import.fileReadAbort);
        reader.onerror = () => setError(t.import.fileReadError);
        reader.onload = () => {
            try {
                const text = reader.result as string;
                const { headers, data } = parseCsv(text);
                const missingHeaders = expectedHeaders.filter(h => !headers.includes(h) && ['name', 'customerName', 'projectManagerName', 'statusName'].includes(h));
                if (missingHeaders.length > 0) {
                    setError(`${t.import.missingHeadersError}: ${missingHeaders.join(', ')}`);
                    return;
                }
                setParsedData(data);
            } catch (e) {
                setError(t.import.parsingError);
                console.error(e);
            }
        };
        reader.readAsText(file);
    }, [language, expectedHeaders]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1, multiple: false } as any);

    const handleImport = () => {
        setIsLoading(true);
        onImport(parsedData);
    };

    const handleDownloadTemplate = () => {
        const csvContent = expectedHeaders.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'project_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;
    
    const ti = t.import;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity p-2 sm:p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-3xl shadow-2xl w-full max-w-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{ti.title}</h2>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 text-3xl font-light">&times;</button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl text-xs md:text-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">{ti.instructionsTitle}</h3>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                <li>{ti.instruction1}</li>
                                <li>{ti.instruction2} <button onClick={handleDownloadTemplate} className="text-violet-600 dark:text-violet-400 font-bold hover:underline">{ti.downloadTemplate}</button></li>
                                <li>{ti.instruction3}<code>name, customerName...</code></li>
                            </ul>
                        </div>
                        <div {...getRootProps()} className={`p-8 md:p-10 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-colors ${isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-slate-300 dark:border-slate-600'}`}>
                            <input {...getInputProps()} />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{ti.dropzone}</p>
                        </div>
                        {error && <p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase">{error}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <button onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl">{ti.cancel}</button>
                        <button onClick={handleImport} disabled={parsedData.length === 0 || isLoading} className="px-10 py-3 text-[10px] font-black uppercase text-white bg-violet-600 rounded-xl disabled:opacity-50">{isLoading ? ti.importing : ti.importButton}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export type ProjectColumn = 'status' | 'projectManager' | 'category' | 'team' | 'customer' | 'tasks';

interface ProjectsProps {
    allProjects: Project[];
    allMilestones: Milestone[];
    allIssues: Issue[];
    allUsers: User[];
    language: Language;
    onAddProject: (project: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => Promise<Project>;
    onAddMilestones: (milestones: Omit<Milestone, 'id'>[]) => Promise<void>;
    onOpenEditModal: (project: Project) => void;
    onOpenDeleteModal: (project: Project) => void;
    searchResult?: { id: string }[];
    lookups: Lookups;
    currentUser?: User;
    isImportModalOpen: boolean;
    onOpenImportModal: () => void;
    onCloseImportModal: () => void;
    onImportProjects: (rows: ProjectImportRow[]) => Promise<void>;
}

const Projects: React.FC<ProjectsProps> = ({ allProjects, allMilestones, allIssues, allUsers, language, onAddProject, onAddMilestones, onOpenEditModal, onOpenDeleteModal, searchResult, lookups, currentUser, isImportModalOpen, onOpenImportModal, onCloseImportModal, onImportProjects }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewingProject, setViewingProject] = useState<Project | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<Record<ProjectColumn, boolean>>({
        status: true, projectManager: true, category: false, team: false, customer: true, tasks: true,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setIsColumnDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (col: ProjectColumn) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
    const [selectedCountryId, setSelectedCountryId] = useState<string>('all');
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

    const t = translations[language];

    const managerOptions = useMemo(() => [{ value: 'all', label: t.allManagers }, ...lookups.projectManagers.map(m => ({ value: m.id, label: m.name }))], [lookups.projectManagers, t.allManagers]);
    const customerOptions = useMemo(() => [{ value: 'all', label: t.allCustomers }, ...lookups.customers.map(c => ({ value: c.id, label: c.name }))], [lookups.customers, t.allCustomers]);
    const statusOptions = useMemo(() => [{ value: 'all', label: t.allStatuses }, ...lookups.projectStatuses.map(s => ({ value: s.id, label: s.name }))], [lookups.projectStatuses, t.allStatuses]);
    const countryOptions = useMemo(() => [{ value: 'all', label: t.allCountries }, ...lookups.countries.map(c => ({ value: c.id, label: c.name }))], [lookups.countries, t.allCountries]);

    const projectsToDisplay = useMemo(() => {
        let filtered = searchResult ? allProjects.filter(p => new Set(searchResult.map(res => res.id)).has(p.id)) : allProjects;
        if (searchTerm.trim()) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (selectedManagerId !== 'all') filtered = filtered.filter(p => p.projectManagerId === selectedManagerId);
        if (selectedCustomerId !== 'all') filtered = filtered.filter(p => p.customerId === selectedCustomerId);
        if (selectedStatusId !== 'all') filtered = filtered.filter(p => p.statusId === selectedStatusId);
        if (selectedCountryId !== 'all') filtered = filtered.filter(p => p.countryId === selectedCountryId);
        return filtered;
    }, [searchResult, allProjects, searchTerm, selectedManagerId, selectedCustomerId, selectedStatusId, selectedCountryId]);

    const handleClearFilters = () => {
        setSearchTerm(''); setSelectedManagerId('all'); setSelectedCustomerId('all'); setSelectedStatusId('all'); setSelectedCountryId('all');
    };
    
    return (
        <div className="space-y-6 md:space-y-8">
            {showAddModal && <AddProjectModal lookups={lookups} onClose={() => setShowAddModal(false)} onAddProject={onAddProject} onAddMilestones={onAddMilestones} language={language} />}
            <ImportProjectsModal isOpen={isImportModalOpen} onClose={onCloseImportModal} onImport={onImportProjects} language={language} />

            {viewingProject && (
                <ProjectDetailModal
                    projectWithMilestones={{
                        ...viewingProject,
                        milestones: allMilestones.filter(m => m.projectId === viewingProject.id),
                        issues: allIssues.filter(i => i.projectId === viewingProject.id)
                    }}
                    onClose={() => setViewingProject(null)}
                    language={language}
                    teams={lookups.teams}
                    onAddMilestones={onAddMilestones}
                />
            )}

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="w-full xl:w-auto">
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{t.subtitle}</p>
                </div>
                 <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {viewMode === 'list' && (
                        <div className="relative" ref={columnMenuRef}>
                            <button 
                                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-violet-500 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                <span>{language === 'ar' ? 'تخصيص الأعمدة' : 'Customize Columns'}</span>
                            </button>
                            
                            {isColumnDropdownOpen && (
                                <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{language === 'ar' ? 'الأعمدة المرئية' : 'Visible Columns'}</h4>
                                    {(Object.keys(visibleColumns) as ProjectColumn[]).map(col => (
                                        <label key={col} className="flex items-center gap-3 cursor-pointer group">
                                            <div 
                                                onClick={() => toggleColumn(col)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${visibleColumns[col] ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${visibleColumns[col] ? 'right-1' : 'left-1'}`}></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-violet-600 transition-colors">
                                                {col === 'status' && (language === 'ar' ? 'الحالة' : 'Status')}
                                                {col === 'projectManager' && (language === 'ar' ? 'المدير' : 'Manager')}
                                                {col === 'category' && (language === 'ar' ? 'الفئة' : 'Category')}
                                                {col === 'team' && (language === 'ar' ? 'الفريق' : 'Team')}
                                                {col === 'customer' && (language === 'ar' ? 'العميل' : 'Customer')}
                                                {col === 'tasks' && (language === 'ar' ? 'المهام' : 'Tasks')}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 rounded-2xl shadow-sm">
                        <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30' : 'text-slate-400'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30' : 'text-slate-400'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" /><path d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg></button>
                    </div>
                    <button onClick={onOpenImportModal} className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-violet-500 transition-all">{t.import.button}</button>
                    <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none px-8 py-3 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all">{t.newProject}</button>
                </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                 <div className="relative">
                    <span className="absolute inset-y-0 left-3 rtl:left-auto rtl:right-3 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </span>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.searchByName} className="w-full pl-10 pr-4 rtl:pr-10 rtl:pl-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-violet-500 h-[40px]" />
                </div>
                {currentUser?.type === 'Manager' && (
                    <SearchableSelect options={managerOptions} value={selectedManagerId} onChange={setSelectedManagerId} placeholder={t.allManagers} language={language} />
                )}
                <SearchableSelect options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} placeholder={t.allCustomers} language={language} />
                <SearchableSelect options={statusOptions} value={selectedStatusId} onChange={setSelectedStatusId} placeholder={t.allStatuses} language={language} />
                <SearchableSelect options={countryOptions} value={selectedCountryId} onChange={setSelectedCountryId} placeholder={t.allCountries} language={language} />
                <button onClick={handleClearFilters} className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-violet-600 transition-colors h-[40px] border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">{t.clearFilters}</button>
            </div>

            {projectsToDisplay.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {projectsToDisplay.map(project => {
                            const projectMilestones = allMilestones.filter(m => m.projectId === project.id);
                            const projectMilestonesCount = projectMilestones.length;
                            const projectIssuesCount = allIssues.filter(i => i.projectId === project.id).length;
                            const milestoneValue = projectMilestones.reduce((acc, m) => acc + (m.paymentAmount || 0), 0);
                            const milestoneTypes = Array.from(new Set(projectMilestones.filter(m => m.hasPayment && m.paymentType).map(m => m.paymentType!)));
                            
                            return (
                                <ProjectCard 
                                    key={project.id} 
                                    project={project} 
                                    milestoneCount={projectMilestonesCount}
                                    issueCount={projectIssuesCount}
                                    milestoneValue={milestoneValue}
                                    milestoneTypes={milestoneTypes}
                                    onEdit={() => onOpenEditModal(project)} 
                                    onDelete={() => onOpenDeleteModal(project)} 
                                    onClick={() => setViewingProject(project)}
                                    language={language} 
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
                        <div className="min-w-[1600px] p-6 text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-6">
                                <div className="w-[450px] shrink-0">PROJECT NAME</div>
                                <div className="w-24 shrink-0 text-center">{t.milestones}</div>
                                <div className="w-32 shrink-0 text-center text-emerald-600 dark:text-emerald-400">VALUE</div>
                                {visibleColumns.status && <div className="w-32 shrink-0 text-center">STATUS</div>}
                                {visibleColumns.tasks && <div className="w-24 shrink-0 text-center">TASKS</div>}
                                {visibleColumns.projectManager && <div className="w-60 shrink-0 text-center">MANAGER</div>}
                                {visibleColumns.customer && <div className="w-60 shrink-0 text-center">CUSTOMER</div>}
                                {visibleColumns.category && <div className="w-40 shrink-0 text-center">CATEGORY</div>}
                                {visibleColumns.team && <div className="w-40 shrink-0 text-center">TEAM</div>}
                                <div className="w-16 shrink-0 text-center">...</div>
                            </div>
                            <div className="space-y-2">
                                {projectsToDisplay.map(project => {
                                    const projectMilestones = allMilestones.filter(m => m.projectId === project.id);
                                    const projectMilestonesCount = projectMilestones.length;
                                    const projectIssuesCount = allIssues.filter(i => i.projectId === project.id).length;
                                    const milestoneValue = projectMilestones.reduce((acc, m) => acc + (m.paymentAmount || 0), 0);
                                    const milestoneTypes = Array.from(new Set(projectMilestones.filter(m => m.hasPayment && m.paymentType).map(m => m.paymentType!)));

                                    return (
                                        <ProjectListItem 
                                            key={project.id} 
                                            project={project} 
                                            milestoneCount={projectMilestonesCount}
                                            issueCount={projectIssuesCount}
                                            milestoneValue={milestoneValue}
                                            milestoneTypes={milestoneTypes}
                                            onEdit={() => onOpenEditModal(project)} 
                                            onDelete={() => onOpenDeleteModal(project)} 
                                            onClick={() => setViewingProject(project)}
                                            language={language} 
                                            visibleColumns={visibleColumns} 
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <p className="text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] py-20">{t.noProjectsFound}</p>
            )}
        </div>
    );
};

const translations = {
    ar: { title: "المشاريع", subtitle: "نظرة عامة على جميع مشاريعك الحالية.", newProject: "إضافة مشروع", noProjectsFound: "لم يتم العثور على مشاريع.", gridView: "عرض شبكي", listView: "عرض قائمة", columns: "الأعمدة", status: "الحالة", tasks: "المهام", milestones: "المعالم", milestoneValue: "القيمة", projectManager: "مدير المشروع", category: "الفئة", team: "الفريق", customer: "العميل", projectName: "اسم المشروع", actions: "إجراءات", allManagers: "كل المدراء", allCustomers: "كل العملاء", allStatuses: "كل الحالات", allCountries: "كل الدول", clearFilters: "مسح الفلاتر", searchManagers: "بحث...", searchCustomers: "بحث...", searchStatuses: "بحث...", searchCountries: "بحث...", searchByName: "بحث بالاسم...", import: { button: "استيراد", title: "استيراد من CSV", instructionsTitle: "تعليمات", instruction1: "صيغة CSV فقط.", instruction2: "الصف الأول رؤوس.", downloadTemplate: "تنزيل القالب", instruction3: "الأعمدة الإلزامية.", instruction4: "التاريخ YYYY-MM-DD.", dropzone: "اسحب ملف CSV هنا.", fileReadAbort: "تم إلغاء القراءة.", fileReadError: "خطأ في الملف.", parsingError: "خطأ في التحليل.", missingHeadersError: "رؤوس مفقودة", moreRows: "صفوف إضافية", cancel: "إلغاء", importButton: "بدء الاستيراد", importing: "جاري الاستيراد..." } },
    en: { title: "Projects", subtitle: "An overview of all current projects.", newProject: "Add Project", noProjectsFound: "No projects found.", gridView: "Grid View", listView: "List View", columns: "Columns", status: "Status", tasks: "Tasks", milestones: "Milestones", milestoneValue: "Value", projectManager: "Manager", category: "Category", team: "Team", customer: "Customer", projectName: "Project Name", actions: "Actions", allManagers: "All Managers", allCustomers: "All Customers", allStatuses: "All Statuses", allCountries: "All Countries", clearFilters: "Clear Filters", searchManagers: "Search...", searchCustomers: "Search...", searchStatuses: "Search...", searchCountries: "Search...", searchByName: "Search Name...", import: { button: "Import", title: "Import CSV", instructionsTitle: "How-to", instruction1: "CSV format only.", instruction2: "Headers in 1st row.", downloadTemplate: "Download Template", instruction3: "Required columns.", instruction4: "YYYY-MM-DD dates.", dropzone: "Drop CSV here.", fileReadAbort: "Aborted.", fileReadError: "Error.", parsingError: "Parse Error.", missingHeadersError: "Missing headers", moreRows: "rows", cancel: "Cancel", importButton: "Import", importing: "Importing..." } }
};

export default Projects;
