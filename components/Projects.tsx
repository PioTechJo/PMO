
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

    const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
        name: 450, milestones: 96, value: 128, status: 128, tasks: 96,
        projectManager: 240, customer: 240, category: 160, team: 160, actions: 64,
    };
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    const toggleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { key, startX, startWidth } = resizingRef.current;
        const dir = language === 'ar' ? -1 : 1;
        const newWidth = Math.max(60, startWidth + (e.clientX - startX) * dir);
        setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
    }, [language]);

    const handleResizeEnd = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove]);

    const handleResizeStart = (key: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
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

    const enrichedProjects = useMemo(() => projectsToDisplay.map(project => {
        const projectMilestones = allMilestones.filter(m => m.projectId === project.id);
        const milestoneCount = projectMilestones.length;
        const issueCount = allIssues.filter(i => i.projectId === project.id).length;
        const milestoneValue = projectMilestones.reduce((acc, m) => acc + (m.paymentAmount || 0), 0);
        const milestoneTypes = Array.from(new Set(projectMilestones.filter(m => m.hasPayment && m.paymentType).map(m => m.paymentType!)));
        return { project, milestoneCount, issueCount, milestoneValue, milestoneTypes };
    }), [projectsToDisplay, allMilestones, allIssues]);

    const sortedProjects = useMemo(() => {
        if (!sortKey) return enrichedProjects;
        const dir = sortDir === 'asc' ? 1 : -1;
        const getValue = (item: typeof enrichedProjects[0]): string | number => {
            switch (sortKey) {
                case 'name': return item.project.name.toLowerCase();
                case 'milestones': return item.milestoneCount;
                case 'value': return item.milestoneValue;
                case 'status': return (item.project.status?.name || '').toLowerCase();
                case 'tasks': return item.issueCount;
                case 'projectManager': return (item.project.projectManager?.name || '').toLowerCase();
                case 'customer': return (item.project.customer?.name || '').toLowerCase();
                case 'category': return (item.project.category?.name || '').toLowerCase();
                case 'team': return (item.project.team?.name || '').toLowerCase();
                default: return '';
            }
        };
        return [...enrichedProjects].sort((a, b) => {
            const va = getValue(a), vb = getValue(b);
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
    }, [enrichedProjects, sortKey, sortDir]);

    const [pageSize, setPageSize] = useState<number>(10);
    const [page, setPage] = useState(0);
    const totalPages = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(sortedProjects.length / pageSize));
    const paginatedProjects = useMemo(
        () => pageSize === Infinity ? sortedProjects : sortedProjects.slice(page * pageSize, page * pageSize + pageSize),
        [sortedProjects, page, pageSize]
    );

    useEffect(() => { setPage(0); }, [searchResult, searchTerm, selectedManagerId, selectedCustomerId, selectedStatusId, selectedCountryId, pageSize, sortKey, sortDir]);

    const handleClearFilters = () => {
        setSearchTerm(''); setSelectedManagerId('all'); setSelectedCustomerId('all'); setSelectedStatusId('all'); setSelectedCountryId('all');
    };

    const alwaysVisibleKeys = ['name', 'milestones', 'value', 'actions'];
    const tableMinWidth = alwaysVisibleKeys
        .concat((Object.keys(visibleColumns) as ProjectColumn[]).filter(k => visibleColumns[k]))
        .reduce((sum, key) => sum + (columnWidths[key] || 0) + 24, 48);

    const renderHeaderCell = (key: string, label: React.ReactNode, extraClass = 'justify-center') => (
        <div
            key={key}
            className={`relative shrink-0 flex items-center gap-1 select-none cursor-pointer hover:text-violet-500 transition-colors ${extraClass}`}
            style={{ width: columnWidths[key] }}
            onClick={() => toggleSort(key)}
        >
            <span className="truncate">{label}</span>
            {sortKey === key && (
                <svg className={`w-3 h-3 shrink-0 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M10 3l7 7H3l7-7z" /></svg>
            )}
            <div
                onMouseDown={handleResizeStart(key)}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-1/2 -translate-y-1/2 -end-3 h-full w-3 cursor-col-resize flex items-center justify-center group z-10"
            >
                <div className="w-[2px] h-4 bg-slate-200 dark:bg-slate-700 group-hover:bg-violet-500 group-hover:h-full transition-colors"></div>
            </div>
        </div>
    );

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
                        {paginatedProjects.map(({ project, milestoneCount, issueCount, milestoneValue, milestoneTypes }) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                milestoneCount={milestoneCount}
                                issueCount={issueCount}
                                milestoneValue={milestoneValue}
                                milestoneTypes={milestoneTypes}
                                onEdit={() => onOpenEditModal(project)}
                                onDelete={() => onOpenDeleteModal(project)}
                                onClick={() => setViewingProject(project)}
                                language={language}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
                        <div className="p-6 text-slate-800 dark:text-slate-200" style={{ minWidth: tableMinWidth }}>
                            <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-6">
                                {renderHeaderCell('name', 'PROJECT NAME', 'text-left rtl:text-right justify-start')}
                                {renderHeaderCell('milestones', t.milestones)}
                                {renderHeaderCell('value', 'VALUE', 'text-emerald-600 dark:text-emerald-400')}
                                {visibleColumns.status && renderHeaderCell('status', 'STATUS')}
                                {visibleColumns.tasks && renderHeaderCell('tasks', 'TASKS')}
                                {visibleColumns.projectManager && renderHeaderCell('projectManager', 'MANAGER')}
                                {visibleColumns.customer && renderHeaderCell('customer', 'CUSTOMER')}
                                {visibleColumns.category && renderHeaderCell('category', 'CATEGORY')}
                                {visibleColumns.team && renderHeaderCell('team', 'TEAM')}
                                <div className="shrink-0 text-center" style={{ width: columnWidths.actions }}>...</div>
                            </div>
                            <div className="space-y-2">
                                {paginatedProjects.map(({ project, milestoneCount, issueCount, milestoneValue, milestoneTypes }) => (
                                    <ProjectListItem
                                        key={project.id}
                                        project={project}
                                        milestoneCount={milestoneCount}
                                        issueCount={issueCount}
                                        milestoneValue={milestoneValue}
                                        milestoneTypes={milestoneTypes}
                                        onEdit={() => onOpenEditModal(project)}
                                        onDelete={() => onOpenDeleteModal(project)}
                                        onClick={() => setViewingProject(project)}
                                        language={language}
                                        visibleColumns={visibleColumns}
                                        columnWidths={columnWidths}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <p className="text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] py-20">{t.noProjectsFound}</p>
            )}

            {projectsToDisplay.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>{t.showingRange.replace('{from}', String(page * pageSize + 1)).replace('{to}', String(pageSize === Infinity ? projectsToDisplay.length : Math.min((page + 1) * pageSize, projectsToDisplay.length))).replace('{total}', String(projectsToDisplay.length))}</span>
                        <select
                            value={pageSize === Infinity ? 'all' : String(pageSize)}
                            onChange={(e) => setPageSize(e.target.value === 'all' ? Infinity : Number(e.target.value))}
                            className="px-2 py-1.5 text-[10px] font-black uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
                        >
                            <option value="10">10 / {t.page}</option>
                            <option value="20">20 / {t.page}</option>
                            <option value="50">50 / {t.page}</option>
                            <option value="100">100 / {t.page}</option>
                            <option value="all">{t.allProjects}</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-4 py-2 text-[10px] font-black uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-40">{t.prev}</button>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-[10px] font-black uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl disabled:opacity-40">{t.next}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const translations = {
    ar: { title: "المشاريع", subtitle: "نظرة عامة على جميع مشاريعك الحالية.", showingRange: "عرض {from}-{to} من {total}", prev: "السابق", next: "التالي", page: "صفحة", allProjects: "الكل", newProject: "إضافة مشروع", noProjectsFound: "لم يتم العثور على مشاريع.", gridView: "عرض شبكي", listView: "عرض قائمة", columns: "الأعمدة", status: "الحالة", tasks: "المهام", milestones: "المعالم", milestoneValue: "القيمة", projectManager: "مدير المشروع", category: "الفئة", team: "الفريق", customer: "العميل", projectName: "اسم المشروع", actions: "إجراءات", allManagers: "كل المدراء", allCustomers: "كل العملاء", allStatuses: "كل الحالات", allCountries: "كل الدول", clearFilters: "مسح الفلاتر", searchManagers: "بحث...", searchCustomers: "بحث...", searchStatuses: "بحث...", searchCountries: "بحث...", searchByName: "بحث بالاسم...", import: { button: "استيراد", title: "استيراد من CSV", instructionsTitle: "تعليمات", instruction1: "صيغة CSV فقط.", instruction2: "الصف الأول رؤوس.", downloadTemplate: "تنزيل القالب", instruction3: "الأعمدة الإلزامية.", instruction4: "التاريخ YYYY-MM-DD.", dropzone: "اسحب ملف CSV هنا.", fileReadAbort: "تم إلغاء القراءة.", fileReadError: "خطأ في الملف.", parsingError: "خطأ في التحليل.", missingHeadersError: "رؤوس مفقودة", moreRows: "صفوف إضافية", cancel: "إلغاء", importButton: "بدء الاستيراد", importing: "جاري الاستيراد..." } },
    en: { title: "Projects", subtitle: "An overview of all current projects.", showingRange: "Showing {from}-{to} of {total}", prev: "Prev", next: "Next", page: "page", allProjects: "All", newProject: "Add Project", noProjectsFound: "No projects found.", gridView: "Grid View", listView: "List View", columns: "Columns", status: "Status", tasks: "Tasks", milestones: "Milestones", milestoneValue: "Value", projectManager: "Manager", category: "Category", team: "Team", customer: "Customer", projectName: "Project Name", actions: "Actions", allManagers: "All Managers", allCustomers: "All Customers", allStatuses: "All Statuses", allCountries: "All Countries", clearFilters: "Clear Filters", searchManagers: "Search...", searchCustomers: "Search...", searchStatuses: "Search...", searchCountries: "Search...", searchByName: "Search Name...", import: { button: "Import", title: "Import CSV", instructionsTitle: "How-to", instruction1: "CSV format only.", instruction2: "Headers in 1st row.", downloadTemplate: "Download Template", instruction3: "Required columns.", instruction4: "YYYY-MM-DD dates.", dropzone: "Drop CSV here.", fileReadAbort: "Aborted.", fileReadError: "Error.", parsingError: "Parse Error.", missingHeadersError: "Missing headers", moreRows: "rows", cancel: "Cancel", importButton: "Import", importing: "Importing..." } }
};

export default Projects;
