
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Project, User, Language, Lookups, ProjectImportRow } from '../types';
import ProjectCard from './ProjectCard';
import ProjectListItem from './ProjectListItem';
import AddProjectModal from './AddProjectModal';
import SearchableSelect from './SearchableSelect';

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

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1 });

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
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-2xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{ti.title}</h2>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">&times;</button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg text-sm">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">{ti.instructionsTitle}</h3>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                                <li>{ti.instruction1}</li>
                                <li>{ti.instruction2} <button onClick={handleDownloadTemplate} className="text-violet-600 dark:text-violet-400 font-bold hover:underline">{ti.downloadTemplate}</button></li>
                                <li>{ti.instruction3}<code>name, customerName, projectManagerName, statusName</code>.</li>
                                <li>{ti.instruction4}<code>YYYY-MM-DD</code>.</li>
                            </ul>
                        </div>
                        <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-xl cursor-pointer text-center transition-colors ${isDragActive ? 'border-violet-500 bg-violet-500/10' : 'border-slate-300 dark:border-slate-600 hover:border-violet-400'}`}>
                            <input {...getInputProps()} />
                            <p className="text-slate-500 dark:text-slate-400">{ti.dropzone}</p>
                        </div>
                        {error && <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>}
                        {parsedData.length > 0 && (
                             <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{Object.keys(parsedData[0]).map(h => <th key={h} className="p-2 font-semibold text-left rtl:text-right">{h}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {parsedData.slice(0, 5).map((row, i) => <tr key={i}>{Object.values(row).map((val, j) => <td key={j} className="p-2 truncate">{val}</td>)}</tr>)}
                                    </tbody>
                                </table>
                                {parsedData.length > 5 && <p className="text-center text-xs p-2 bg-slate-100 dark:bg-slate-800">...{parsedData.length - 5} {ti.moreRows}</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-4 rtl:space-x-reverse pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">{ti.cancel}</button>
                        <button onClick={handleImport} disabled={parsedData.length === 0 || isLoading} className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">{isLoading ? ti.importing : ti.importButton}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Projects Component ---

export type ProjectColumn = 'status' | 'projectManager' | 'category' | 'team' | 'customer' | 'score';

interface ProjectsProps {
    allProjects: Project[];
    allUsers: User[];
    language: Language;
    onAddProject: (project: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => Promise<void>;
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

const Projects: React.FC<ProjectsProps> = ({ allProjects, allUsers, language, onAddProject, onOpenEditModal, onOpenDeleteModal, searchResult, lookups, currentUser, isImportModalOpen, onOpenImportModal, onCloseImportModal, onImportProjects }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
    const columnsMenuRef = useRef<HTMLDivElement>(null);
    const [visibleColumns, setVisibleColumns] = useState<Record<ProjectColumn, boolean>>({
        status: true,
        projectManager: true,
        category: true,
        team: false,
        customer: true,
        score: true,
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedStatusId, setSelectedStatusId] = useState<string>('all');
    const [selectedCountryId, setSelectedCountryId] = useState<string>('all');
    const hasSetDefaultManager = useRef(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
                setIsColumnsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const columnOptions: { key: ProjectColumn, label: string }[] = [
        { key: 'status', label: t.status },
        { key: 'score', label: t.score },
        { key: 'projectManager', label: t.projectManager },
        { key: 'customer', label: t.customer },
        { key: 'category', label: t.category },
        { key: 'team', label: t.team },
    ];

    const managerOptions = useMemo(() => [
        { value: 'all', label: t.allManagers },
        ...lookups.projectManagers.map(m => ({ value: m.id, label: m.name }))
    ], [lookups.projectManagers, t.allManagers]);

    const customerOptions = useMemo(() => [
        { value: 'all', label: t.allCustomers },
        ...lookups.customers.map(c => ({ value: c.id, label: c.name }))
    ], [lookups.customers, t.allCustomers]);

    const statusOptions = useMemo(() => [
        { value: 'all', label: t.allStatuses },
        ...lookups.projectStatuses.map(s => ({ value: s.id, label: s.name }))
    ], [lookups.projectStatuses, t.allStatuses]);

    const countryOptions = useMemo(() => [
        { value: 'all', label: t.allCountries },
        ...lookups.countries.map(c => ({ value: c.id, label: c.name }))
    ], [lookups.countries, t.allCountries]);

    const projectsToDisplay = useMemo(() => {
        let filteredProjects = searchResult
            ? allProjects.filter(p => new Set(searchResult.map(res => res.id)).has(p.id))
            : allProjects;
        
        if (searchTerm.trim()) {
            filteredProjects = filteredProjects.filter(p =>
                p.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        if (selectedManagerId !== 'all') {
            filteredProjects = filteredProjects.filter(p => p.projectManagerId === selectedManagerId);
        }
        if (selectedCustomerId !== 'all') {
            filteredProjects = filteredProjects.filter(p => p.customerId === selectedCustomerId);
        }
        if (selectedStatusId !== 'all') {
            filteredProjects = filteredProjects.filter(p => p.statusId === selectedStatusId);
        }
        if (selectedCountryId !== 'all') {
            filteredProjects = filteredProjects.filter(p => p.countryId === selectedCountryId);
        }
        
        return filteredProjects;
    }, [searchResult, allProjects, searchTerm, selectedManagerId, selectedCustomerId, selectedStatusId, selectedCountryId]);

    const handleAddProject = async (newProjectData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => {
        await onAddProject(newProjectData);
        setShowAddModal(false);
    };

    const handleColumnToggle = (column: ProjectColumn) => {
        setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }));
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedManagerId('all');
        setSelectedCustomerId('all');
        setSelectedStatusId('all');
        setSelectedCountryId('all');
    };
    
    return (
        <div className="space-y-8">
            {showAddModal && <AddProjectModal lookups={lookups} onClose={() => setShowAddModal(false)} onAddProject={handleAddProject} language={language} />}
            <ImportProjectsModal isOpen={isImportModalOpen} onClose={onCloseImportModal} onImport={onImportProjects} language={language} />

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-200 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 p-1 rounded-full">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.listView}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`} title={t.gridView}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                    </div>
                     {viewMode === 'list' && (
                        <div className="relative" ref={columnsMenuRef}>
                            <button onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)} className="bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
                                {t.columns}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                             {isColumnsMenuOpen && (
                                <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 p-2">
                                    {columnOptions.map(option => (
                                        <label key={option.key} className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={visibleColumns[option.key]} onChange={() => handleColumnToggle(option.key)} className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900" />
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={onOpenImportModal} className="bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600/50 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        <span>{t.import.button}</span>
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-violet-700/50">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"></path></svg>
                        <span>{t.newProject}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                 <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 rtl:pl-0 rtl:pr-3">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchByName}
                        className="w-full p-2 pl-10 rtl:pr-10 rtl:pl-2 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-slate-800 dark:text-white text-sm"
                    />
                </div>
                <SearchableSelect options={managerOptions} value={selectedManagerId} onChange={setSelectedManagerId} placeholder={t.allManagers} searchPlaceholder={t.searchManagers} language={language} />
                <SearchableSelect options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} placeholder={t.allCustomers} searchPlaceholder={t.searchCustomers} language={language} />
                <SearchableSelect options={statusOptions} value={selectedStatusId} onChange={setSelectedStatusId} placeholder={t.allStatuses} searchPlaceholder={t.searchStatuses} language={language} />
                <SearchableSelect options={countryOptions} value={selectedCountryId} onChange={setSelectedCountryId} placeholder={t.allCountries} searchPlaceholder={t.searchCountries} language={language} />
                <button
                    onClick={handleClearFilters}
                    title={t.clearFilters}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700/50 rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600/50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                    <span>{t.clearFilters}</span>
                </button>
            </div>

            {projectsToDisplay.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {projectsToDisplay.map(project => (
                            <ProjectCard key={project.id} project={project} onEdit={() => onOpenEditModal(project)} onDelete={() => onOpenDeleteModal(project)} language={language} />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-full inline-block align-middle">
                            <div className="bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-3 rounded-lg flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                <div className="flex-1 min-w-0">{t.projectName}</div>
                                {columnOptions.map(col => visibleColumns[col.key] && (
                                    <div key={col.key} className="w-40 text-center shrink-0">{col.label}</div>
                                ))}
                                <div className="w-16 text-center shrink-0">{t.actions}</div>
                            </div>
                            <div className="space-y-2">
                                {projectsToDisplay.map(project => (
                                    <ProjectListItem key={project.id} project={project} onEdit={() => onOpenEditModal(project)} onDelete={() => onOpenDeleteModal(project)} language={language} visibleColumns={visibleColumns} />
                                ))}
                            </div>
                        </div>
                    </div>
                )
            ) : (
                <p className="text-center text-slate-500 dark:text-slate-400 py-10">{t.noProjectsFound}</p>
            )}
        </div>
    );
};

const translations = {
    ar: {
        title: "المشاريع",
        subtitle: "نظرة عامة على جميع مشاريعك الحالية.",
        newProject: "إضافة مشروع",
        noProjectsFound: "لم يتم العثور على مشاريع.",
        gridView: "عرض شبكي",
        listView: "عرض قائمة",
        columns: "الأعمدة",
        status: "الحالة",
        score: "الأولوية",
        projectManager: "مدير المشروع",
        category: "الفئة",
        team: "الفريق",
        customer: "العميل",
        projectName: "اسم المشروع",
        actions: "إجراءات",
        allManagers: "كل المدراء",
        allCustomers: "كل العملاء",
        allStatuses: "كل الحالات",
        allCountries: "كل الدول",
        clearFilters: "مسح الفلاتر",
        searchManagers: "ابحث عن مدير...",
        searchCustomers: "ابحث عن عميل...",
        searchStatuses: "ابحث عن حالة...",
        searchCountries: "ابحث عن دولة...",
        searchByName: "ابحث باسم المشروع...",
        import: {
            button: "استيراد",
            title: "استيراد المشاريع من ملف CSV",
            instructionsTitle: "تعليمات",
            instruction1: "يجب أن يكون الملف بصيغة CSV.",
            instruction2: "يجب أن يحتوي الصف الأول على رؤوس الأعمدة الصحيحة. ",
            downloadTemplate: "تنزيل القالب",
            instruction3: "الأعمدة الإلزامية هي ",
            instruction4: "يجب أن تكون التواريخ بصيغة ",
            dropzone: "اسحب وأفلت ملف CSV هنا، أو انقر للتحديد.",
            fileReadAbort: "تم إحباط قراءة الملف.",
            fileReadError: "حدث خطأ أثناء قراءة الملف.",
            parsingError: "حدث خطأ أثناء تحليل الملف. يرجى التحقق من التنسيق.",
            missingHeadersError: "رؤوس الأعمدة المطلوبة مفقودة",
            moreRows: "صفوف أخرى...",
            cancel: "إلغاء",
            importButton: "استيراد",
            importing: "جاري الاستيراد...",
        }
    },
    en: {
        title: "Projects",
        subtitle: "An overview of all your current projects.",
        newProject: "Add Project",
        noProjectsFound: "No projects found.",
        gridView: "Grid View",
        listView: "List View",
        columns: "Columns",
        status: "Status",
        score: "Priority Score",
        projectManager: "Project Manager",
        category: "Category",
        team: "Team",
        customer: "Customer",
        projectName: "Project Name",
        actions: "Actions",
        allManagers: "All Managers",
        allCustomers: "All Customers",
        allStatuses: "All Statuses",
        allCountries: "All Countries",
        clearFilters: "Clear Filters",
        searchManagers: "Search managers...",
        searchCustomers: "Search customers...",
        searchStatuses: "Search statuses...",
        searchCountries: "Search countries...",
        searchByName: "Search by project name...",
        import: {
            button: "Import",
            title: "Import Projects from CSV",
            instructionsTitle: "Instructions",
            instruction1: "Your file must be in CSV format.",
            instruction2: "The first row must contain the correct headers. ",
            downloadTemplate: "Download Template",
            instruction3: "The required columns are ",
            instruction4: "Dates should be in ",
            dropzone: "Drag 'n' drop a CSV file here, or click to select.",
            fileReadAbort: "File reading was aborted.",
            fileReadError: "An error occurred reading the file.",
            parsingError: "An error occurred while parsing the file. Please check the format.",
            missingHeadersError: "Required headers are missing",
            moreRows: "more rows...",
            cancel: "Cancel",
            importButton: "Import",
            importing: "Importing...",
        }
    }
};

export default Projects;
