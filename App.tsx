
import React, { useState, useEffect, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Projects from './components/Projects';
import Activities from './components/Activities';
import Team from './components/Team';
import Payments from './components/Payments';
import SystemManagement from './components/SystemManagement';
import Login from './components/Login';
import EditProjectModal from './components/EditProjectModal';
import EditActivityModal from './components/EditActivityModal';
import ActivityDetailModal from './components/ActivityDetailModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import SearchResultModal from './components/SearchResultModal';
import Chatbot from './components/Chatbot';
import { Language, Theme, View, Project, Activity, User, Lookups, Lookup, ActivityUpdate, AnalysisResult, ProjectImportRow } from './types';
import { analyzeQuery } from './services/geminiService';
import { fetchAllData, addProject as apiAddProject, updateProject as apiUpdateProject, addActivities as apiAddActivities, updateActivity as apiUpdateActivity, updateLookups as apiUpdateLookups, deleteProject as apiDeleteProject, addActivityUpdate as apiAddActivityUpdate, addProjects as apiAddProjects } from './services/api';
import { initSupabase } from './services/supabaseClient';

/**
 * Parses a caught error (from an API call, etc.) and returns a readable string.
 * This function is hyper-defensive to guarantee a readable message and prevent "[object Object]".
 * @param error The error caught in a catch block.
 * @returns A user-friendly error message string.
 */
const getApiErrorMessage = (error: unknown): string => {
    if (error == null) return "An unknown error occurred.";
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object') {
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.details === 'string' && errorObj.details) return errorObj.details;
        if (typeof errorObj.message === 'string' && errorObj.message) return errorObj.message;
    }
    try {
        return JSON.stringify(error, null, 2);
    } catch (e) {
        return "An un-stringifiable error object was received. Check the console for more details.";
    }
};


const App: React.FC = () => {
    // UI State
    const [view, setView] = useState<View>('dashboard');
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'ar');
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Data State
    const [projects, setProjects] = useState<Project[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activityUpdates, setActivityUpdates] = useState<ActivityUpdate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [lookups, setLookups] = useState<Lookups>({
        countries: [], categories: [], teams: [], products: [], projectStatuses: [], projectManagers: [], customers: []
    });

    // AI Search State
    const [searchResult, setSearchResult] = useState<AnalysisResult | null>(null);
    const [aiInsightResult, setAiInsightResult] = useState<AnalysisResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    // Auth & DB State
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
    const [isAppConfigured, setIsAppConfigured] = useState(false);
    const [isDbConnected, setIsDbConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- Effects ---

    useEffect(() => {
        localStorage.setItem('theme', theme);
        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);
    
    useEffect(() => {
        const key = localStorage.getItem('supabaseAnonKey');
        if (key && key.trim()) {
            try {
                const client = initSupabase('https://dcamlinhazzmbaldsrdo.supabase.co', key);
                setSupabaseClient(client);
                setIsAppConfigured(true);
            } catch (error) {
                console.error("Supabase auto-initialization failed:", error);
                localStorage.removeItem('supabaseAnonKey');
                setIsAppConfigured(false);
                const errorMessage = getApiErrorMessage(error);
                setNotification({
                    message: language === 'ar' ? `فشل الاتصال التلقائي: ${errorMessage}` : `Auto-connection failed: ${errorMessage}`,
                    type: 'error'
                });
                setIsLoading(false);
            }
        } else {
            if (key) localStorage.removeItem('supabaseAnonKey');
            setIsAppConfigured(false);
            setIsLoading(false);
        }
    }, [language]);

    useEffect(() => {
        if (supabaseClient) {
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                if (session) setIsDbConnected(true);
                setIsLoading(false);
            });

            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
                setSession(session);
                setIsDbConnected(!!session);
            });

            return () => subscription.unsubscribe();
        }
    }, [supabaseClient]);

    const loadDataFromDb = useCallback(async () => {
        if (!isDbConnected) return;
        try {
            setIsLoading(true);
            const data = await fetchAllData();
            setProjects(data.projects);
            setActivities(data.activities);
            setUsers(data.users);
            setLookups(data.lookups);
            setActivityUpdates(data.activityUpdates);
        } catch (error) {
            console.error("Failed to load data from database:", error);
            setIsDbConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [isDbConnected]);

    useEffect(() => {
        if (isDbConnected) {
            loadDataFromDb();
        } else {
            setProjects([]);
            setActivities([]);
            setUsers([]);
            setActivityUpdates([]);
            setLookups({ countries: [], categories: [], teams: [], products: [], projectStatuses: [], projectManagers: [], customers: [] });
        }
    }, [isDbConnected, loadDataFromDb]);
    
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // --- Handlers ---

    const handleConfigSave = (supabaseKey: string) => {
        if (!supabaseKey.trim()) {
            setNotification({ message: language === 'ar' ? 'مفتاح Supabase مطلوب.' : 'Supabase Key is required.', type: 'error' });
            return;
        }
        try {
            const client = initSupabase('https://dcamlinhazzmbaldsrdo.supabase.co', supabaseKey);
            localStorage.setItem('supabaseAnonKey', supabaseKey);
            setSupabaseClient(client);
            setIsAppConfigured(true);
            setNotification({ message: language === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'Configuration saved successfully!', type: 'success' });
        } catch (error) {
            console.error("Supabase initialization failed on save:", error);
            localStorage.removeItem('supabaseAnonKey');
            setIsAppConfigured(false);
            const errorMessage = getApiErrorMessage(error);
            setNotification({ 
                message: language === 'ar' ? `فشل حفظ الإعدادات: ${errorMessage}` : `Failed to save config: ${errorMessage}`, 
                type: 'error' 
            });
        }
    };

    const handleLoginSuccess = (session: Session) => {
        setSession(session);
        setIsDbConnected(true);
    };
    
    const handleLogout = async () => {
        if (supabaseClient) await supabaseClient.auth.signOut();
    };
    
    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResult(null);
            setAiInsightResult(null);
            return;
        }
        setIsSearching(true);
        setSearchResult(null);
        setAiInsightResult(null);
        try {
            const result = await analyzeQuery(query, projects, activities, users, lookups.teams);
            
            switch (result.resultType) {
                case 'PROJECTS':
                    setSearchResult(result);
                    if (result.projects?.length) setView('projects');
                    break;
                case 'ACTIVITIES':
                    setSearchResult(result);
                    if (result.activities?.length) setView('activities');
                    break;
                case 'SUMMARY':
                case 'KPIS':
                    setAiInsightResult(result);
                    break;
                case 'ERROR':
                    setNotification({ message: `${language === 'ar' ? 'فشل البحث' : 'Search Failed'}: ${result.error || 'Unknown AI error'}`, type: 'error' });
                    break;
                default:
                    setNotification({ message: language === 'ar' ? 'لم يتم العثور على نتائج واضحة.' : 'No clear results found.', type: 'error' });
            }

        } catch (error) {
            console.error("AI search failed:", error);
            setNotification({ message: `${language === 'ar' ? 'فشل البحث بالذكاء الاصطناعي' : 'AI Search Failed'}: ${getApiErrorMessage(error)}`, type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddProject = async (newProjectData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => {
        if (!isDbConnected) return;
        setNotification(null);
        try {
            const newProject = await apiAddProject(newProjectData);
            const newProjectWithLookups: Project = {
                ...newProject,
                country: lookups.countries.find(l => l.id === newProject.countryId),
                category: lookups.categories.find(l => l.id === newProject.categoryId),
                team: lookups.teams.find(l => l.id === newProject.teamId),
                product: lookups.products.find(l => l.id === newProject.productId),
                status: lookups.projectStatuses.find(l => l.id === newProject.statusId),
                projectManager: lookups.projectManagers.find(l => l.id === newProject.projectManagerId),
                customer: lookups.customers.find(l => l.id === newProject.customerId),
            };
            setProjects(prevProjects => [...prevProjects, newProjectWithLookups]);
            setNotification({ message: language === 'ar' ? 'تمت إضافة المشروع بنجاح!' : 'Project added successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to add project:", error);
            setNotification({ message: `${language === 'ar' ? 'فشل إضافة المشروع' : 'Failed to add project'}: ${getApiErrorMessage(error)}`, type: 'error' });
        }
    };
    
    const handleImportProjects = async (importedRows: ProjectImportRow[]): Promise<void> => {
        if (!isDbConnected) return;
        setNotification(null);

        const t = {
            ar: {
                row: "صف",
                nameMissing: "اسم المشروع مفقود.",
                customerMissing: "اسم العميل مفقود.",
                managerMissing: "اسم مدير المشروع مفقود.",
                statusMissing: "اسم الحالة مفقود.",
                customerNotFound: (name: string) => `العميل '${name}' غير موجود.`,
                managerNotFound: (name: string) => `مدير المشروع '${name}' غير موجود.`,
                statusNotFound: (name: string) => `الحالة '${name}' غير موجودة.`,
                invalidDate: (field: string) => `تنسيق غير صالح لـ ${field} (المتوقع YYYY-MM-DD).`,
                invalidProgress: "يجب أن يكون التقدم رقمًا بين 0 و 100.",
                importSuccess: (count: number) => `تم استيراد ${count} مشروع بنجاح.\n`,
                importFail: (count: number, details: string) => `فشل استيراد ${count} صف.\n${details}`,
                apiError: "خطأ في واجهة برمجة التطبيقات",
            },
            en: {
                row: "Row",
                nameMissing: "Project name is missing.",
                customerMissing: "Customer name is missing.",
                managerMissing: "Project manager name is missing.",
                statusMissing: "Status name is missing.",
                customerNotFound: (name: string) => `Customer '${name}' not found.`,
                managerNotFound: (name: string) => `Project Manager '${name}' not found.`,
                statusNotFound: (name: string) => `Status '${name}' not found.`,
                invalidDate: (field: string) => `Invalid format for ${field} (expected YYYY-MM-DD).`,
                invalidProgress: "Progress must be a number between 0 and 100.",
                importSuccess: (count: number) => `Successfully imported ${count} projects.\n`,
                importFail: (count: number, details: string) => `Failed to import ${count} rows.\n${details}`,
                apiError: "API Error",
            }
        };
        const importT = t[language];
        
        const validProjects: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>[] = [];
        const errors: string[] = [];

        importedRows.forEach((row, index) => {
            const rowErrors: string[] = [];
            
            if (!row.name) rowErrors.push(importT.nameMissing);
            if (!row.customerName) rowErrors.push(importT.customerMissing);
            if (!row.projectManagerName) rowErrors.push(importT.managerMissing);
            if (!row.statusName) rowErrors.push(importT.statusMissing);
            
            if(rowErrors.length > 0) {
                errors.push(`${importT.row} ${index + 2}: ${rowErrors.join(' ')}`);
                return;
            }

            const customer = lookups.customers.find(c => c.name.toLowerCase() === row.customerName?.toLowerCase());
            if (!customer) rowErrors.push(importT.customerNotFound(row.customerName!));

            const manager = lookups.projectManagers.find(pm => pm.name.toLowerCase() === row.projectManagerName?.toLowerCase());
            if (!manager) rowErrors.push(importT.managerNotFound(row.projectManagerName!));

            const status = lookups.projectStatuses.find(s => s.name.toLowerCase() === row.statusName?.toLowerCase());
            if (!status) rowErrors.push(importT.statusNotFound(row.statusName!));
            
            const validateDate = (dateString: string | undefined): boolean => {
                if (!dateString || dateString.trim() === '') return true;
                return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString).getTime());
            };

            if (!validateDate(row.launchDate)) rowErrors.push(importT.invalidDate('launchDate'));
            if (!validateDate(row.actualStartDate)) rowErrors.push(importT.invalidDate('actualStartDate'));
            if (!validateDate(row.expectedClosureDate)) rowErrors.push(importT.invalidDate('expectedClosureDate'));
            
            let progressValue = 0;
            if (row.progress) {
                const parsedProgress = parseInt(row.progress, 10);
                if (isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
                    rowErrors.push(importT.invalidProgress);
                } else {
                    progressValue = parsedProgress;
                }
            }

            if (rowErrors.length > 0) {
                errors.push(`${importT.row} ${index + 2}: ${rowErrors.join(' ')}`);
                return;
            }

            validProjects.push({
                name: row.name!,
                description: row.description || '',
                customerId: customer!.id,
                projectManagerId: manager!.id,
                statusId: status!.id,
                countryId: lookups.countries.find(c => c.name.toLowerCase() === row.countryName?.toLowerCase())?.id || null,
                categoryId: lookups.categories.find(c => c.name.toLowerCase() === row.categoryName?.toLowerCase())?.id || null,
                teamId: lookups.teams.find(t => t.name.toLowerCase() === row.teamName?.toLowerCase())?.id || null,
                productId: lookups.products.find(p => p.name.toLowerCase() === row.productName?.toLowerCase())?.id || null,
                launchDate: row.launchDate || null,
                actualStartDate: row.actualStartDate || null,
                expectedClosureDate: row.expectedClosureDate || null,
                progress: progressValue,
            });
        });

        let successCount = 0;
        if (validProjects.length > 0) {
            try {
                const newProjects = await apiAddProjects(validProjects);
                successCount = newProjects.length;
                const newProjectsWithLookups: Project[] = newProjects.map(newProject => ({
                    ...newProject,
                    country: lookups.countries.find(l => l.id === newProject.countryId),
                    category: lookups.categories.find(l => l.id === newProject.categoryId),
                    team: lookups.teams.find(l => l.id === newProject.teamId),
                    product: lookups.products.find(l => l.id === newProject.productId),
                    status: lookups.projectStatuses.find(l => l.id === newProject.statusId),
                    projectManager: lookups.projectManagers.find(l => l.id === newProject.projectManagerId),
                    customer: lookups.customers.find(l => l.id === newProject.customerId),
                }));
                setProjects(prev => [...prev, ...newProjectsWithLookups]);
            } catch (error) {
                errors.push(`${importT.apiError}: ${getApiErrorMessage(error)}`);
            }
        }
        
        const errorCount = importedRows.length - successCount;
        let message = '';

        if (successCount > 0) {
            message += importT.importSuccess(successCount);
        }
        if (errorCount > 0) {
            const errorDetails = errors.slice(0, 5).join('\n');
            message += importT.importFail(errorCount, errorDetails);
        }
        
        if (message) {
            setNotification({
                message,
                type: errorCount > 0 ? 'error' : 'success',
            });
        }
        setIsImportModalOpen(false);
    };

    const handleUpdateProject = async (projectId: string, updatedData: Omit<Project, 'id' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>): Promise<void> => {
        if (!isDbConnected) {
            const error = new Error(language === 'ar' ? 'غير متصل بقاعدة البيانات.' : 'Not connected to the database.');
            setNotification({ message: error.message, type: 'error' });
            throw error;
        }
        setNotification(null);
        try {
            await apiUpdateProject(projectId, updatedData);
            const updatedProjectWithLookups: Project = {
                id: projectId, ...updatedData,
                country: lookups.countries.find(l => l.id === updatedData.countryId),
                category: lookups.categories.find(l => l.id === updatedData.categoryId),
                team: lookups.teams.find(l => l.id === updatedData.teamId),
                product: lookups.products.find(l => l.id === updatedData.productId),
                status: lookups.projectStatuses.find(l => l.id === updatedData.statusId),
                projectManager: lookups.projectManagers.find(l => l.id === updatedData.projectManagerId),
                customer: lookups.customers.find(l => l.id === updatedData.customerId),
            };
            setProjects(prevProjects => prevProjects.map(p => p.id === projectId ? updatedProjectWithLookups : p));
        } catch (error) {
            console.error("Failed to update project:", error);
            const detailMessage = getApiErrorMessage(error);
            setNotification({ message: `${language === 'ar' ? 'فشل تحديث المشروع' : 'Failed to update project'}: ${detailMessage}`, type: 'error' });
            throw new Error(detailMessage);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!isDbConnected) return;
        setNotification(null);
        try {
            await apiDeleteProject(projectId);
            setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
            setActivities(prevActivities => prevActivities.filter(a => a.projectId !== projectId));
            setDeletingProject(null);
            setNotification({ message: language === 'ar' ? 'تم حذف المشروع بنجاح!' : 'Project deleted successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to delete project:", error);
            setNotification({ message: `${language === 'ar' ? 'فشل حذف المشروع' : 'Failed to delete project'}: ${getApiErrorMessage(error)}`, type: 'error' });
        }
    };

    const handleAddActivities = async (newActivitiesData: Omit<Activity, 'id'>[]) => {
        if (!isDbConnected) return;
        setNotification(null);
        try {
            const newActivities = await apiAddActivities(newActivitiesData);
            setActivities(prevActivities => [...prevActivities, ...newActivities]);
            setNotification({ message: language === 'ar' ? 'تمت إضافة الأنشطة بنجاح!' : 'Activities added successfully!', type: 'success' });
        } catch (error) {
            console.error("Failed to add activities:", error);
            setNotification({ message: `${language === 'ar' ? 'فشل إضافة الأنشطة' : 'Failed to add activities'}: ${getApiErrorMessage(error)}`, type: 'error' });
        }
    };

    const handleUpdateActivity = async (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>): Promise<void> => {
        if (!isDbConnected) {
            const error = new Error(language === 'ar' ? 'غير متصل بقاعدة البيانات.' : 'Not connected to the database.');
            setNotification({ message: error.message, type: 'error' });
            throw error;
        }
        setNotification(null);
        try {
            const updatedActivity = await apiUpdateActivity(activityId, updatedData);
            setActivities(prevActivities => prevActivities.map(a => a.id === activityId ? { ...a, ...updatedActivity } : a));
        } catch (error) {
            console.error("Failed to update activity:", error);
            const detailMessage = getApiErrorMessage(error);
            setNotification({ message: `${language === 'ar' ? 'فشل تحديث النشاط' : 'Failed to update activity'}: ${detailMessage}`, type: 'error' });
            throw new Error(detailMessage);
        }
    };

    const handleAddActivityUpdate = async (updateData: Omit<ActivityUpdate, 'id' | 'createdAt' | 'user'>) => {
        if (!isDbConnected) return;
        setNotification(null);
        try {
            const newUpdate = await apiAddActivityUpdate(updateData);
            setActivityUpdates(prev => [newUpdate, ...prev]);
        } catch (error) {
             console.error("Failed to add activity update:", error);
            setNotification({ message: `${language === 'ar' ? 'فشل إضافة تحديث' : 'Failed to add update'}: ${getApiErrorMessage(error)}`, type: 'error' });
        }
    };
    
    const handleLookupsUpdate = async (lookupType: keyof Lookups, newLookups: Lookup[]) => {
        const t = {
            ar: { success: 'تم تحديث القائمة بنجاح!', error: 'فشل تحديث القائمة' },
            en: { success: 'Lookup list updated successfully!', error: 'Failed to update list' },
        };
        if (!isDbConnected) return;
        setNotification(null);
        try {
            await apiUpdateLookups(lookupType, newLookups);
            setNotification({ message: t[language].success, type: 'success' });
        } catch (error) {
            console.error(`Failed to update ${String(lookupType)}:`, error);
            setNotification({ 
                message: `${t[language].error}: ${getApiErrorMessage(error)}`, 
                type: 'error' 
            });
        } finally {
            // Always reload data to ensure UI consistency after an update attempt.
            await loadDataFromDb();
        }
    };

    // --- Render Logic ---
    const currentUser = users.find(u => u.id === session?.user.id);

    const renderView = () => {
        if (isLoading && !projects.length) return <div className="text-center text-slate-400">Loading Data...</div>;

        switch (view) {
            case 'projects':
                return <Projects allProjects={projects} allUsers={users} language={language} onAddProject={handleAddProject} onOpenEditModal={setEditingProject} onOpenDeleteModal={setDeletingProject} searchResult={searchResult?.resultType === 'PROJECTS' ? searchResult.projects : undefined} lookups={lookups} currentUser={currentUser} onOpenImportModal={() => setIsImportModalOpen(true)} isImportModalOpen={isImportModalOpen} onCloseImportModal={() => setIsImportModalOpen(false)} onImportProjects={handleImportProjects} />;
            case 'activities':
                return <Activities allActivities={activities} allProjects={projects} language={language} onAddActivities={handleAddActivities} onOpenEditModal={setEditingActivity} onViewActivityDetails={setViewingActivity} onUpdateActivity={handleUpdateActivity} searchResult={searchResult?.resultType === 'ACTIVITIES' ? searchResult.activities : undefined} lookups={lookups} currentUser={currentUser} />;
            case 'team':
                return <Team allUsers={users} allProjects={projects} language={language} />;
            case 'payments':
                return <Payments allProjects={projects} allActivities={activities} allTeams={lookups.teams} language={language} onUpdateActivity={handleUpdateActivity} />;
            case 'system':
                return <SystemManagement lookups={lookups} onUpdate={handleLookupsUpdate} language={language} onSaveConfig={handleConfigSave} />;
            case 'dashboard':
            default:
                return <AnalyticsDashboard 
                    projects={projects} 
                    activities={activities} 
                    teams={lookups.teams} 
                    customers={lookups.customers} 
                    projectManagers={lookups.projectManagers}
                    language={language}
                    currentUser={currentUser}
                    onUpdateActivity={handleUpdateActivity}
                />;
        }
    };
    
    if (isLoading) {
       return <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-300">Initializing...</div>;
    }

    const notificationClasses = `fixed bottom-5 p-4 rounded-lg shadow-lg text-white text-sm z-[9999] transition-all whitespace-pre-wrap max-w-md ${notification?.type === 'error' ? 'bg-red-800/90 border border-red-600' : 'bg-green-800/90 border border-green-600'} ${language === 'ar' ? 'left-5' : 'right-5'}`;

    if (!isAppConfigured) {
        return (
            <div dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language} className="flex h-screen font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                {notification && <div className={notificationClasses} role="alert">{notification.message}</div>}
                <Sidebar currentView={'system'} setCurrentView={() => {}} language={language} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                        <SystemManagement isSetupMode={true} lookups={lookups} onUpdate={async () => {}} language={language} onSaveConfig={handleConfigSave} />
                    </main>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Login language={language} setLanguage={setLanguage} onLoginSuccess={handleLoginSuccess} supabaseClient={supabaseClient!} />;
    }

    return (
        <div dir={language === 'ar' ? 'rtl' : 'ltr'} lang={language} className="flex h-screen font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            {editingProject && (
                <EditProjectModal projectToEdit={editingProject} lookups={lookups} onClose={() => setEditingProject(null)} onUpdateProject={handleUpdateProject} language={language} />
            )}
            {editingActivity && (
                <EditActivityModal
                    activityToEdit={editingActivity}
                    teams={lookups.teams}
                    projects={projects}
                    allActivityUpdates={activityUpdates}
                    allUsers={users}
                    currentUser={currentUser}
                    onClose={() => setEditingActivity(null)}
                    onUpdateActivity={handleUpdateActivity}
                    onAddUpdate={handleAddActivityUpdate}
                    language={language}
                />
            )}
            {viewingActivity && (
                 <ActivityDetailModal
                    activity={viewingActivity}
                    onClose={() => setViewingActivity(null)}
                    projects={projects}
                    allActivityUpdates={activityUpdates}
                    allUsers={users}
                    lookups={lookups}
                    language={language}
                />
            )}
            {deletingProject && (
                <ConfirmDeleteModal project={deletingProject} onClose={() => setDeletingProject(null)} onConfirm={() => handleDeleteProject(deletingProject.id)} language={language} />
            )}
            {aiInsightResult && (
                <SearchResultModal
                    result={aiInsightResult}
                    onClose={() => setAiInsightResult(null)}
                    language={language}
                />
            )}
            {notification && <div className={notificationClasses} role="alert">{notification.message}</div>}
            
            <Sidebar currentView={view} setCurrentView={setView} language={language} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    user={currentUser}
                    language={language} 
                    setLanguage={setLanguage} 
                    onSearch={handleSearch}
                    onLogout={handleLogout}
                    theme={theme}
                    setTheme={setTheme}
                    isDbConnected={isDbConnected}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                    {isSearching ? <div className="text-center text-slate-400">Asking AI...</div> : renderView()}
                </main>
            </div>
            
            <button
                onClick={() => setIsChatbotOpen(true)}
                title={language === 'ar' ? 'اسأل المساعد الذكي' : 'Ask AI Assistant'}
                className="fixed bottom-8 right-8 rtl:right-auto rtl:left-8 z-40 w-16 h-16 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 ease-in-out"
            >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </button>

            <Chatbot
                isOpen={isChatbotOpen}
                onClose={() => setIsChatbotOpen(false)}
                language={language}
                projects={projects}
                activities={activities}
                users={users}
                lookups={lookups}
            />
        </div>
    );
};

export default App;
