
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Projects from './components/Projects';
import Milestones from './components/Milestones';
import Team from './components/Team';
import Payments from './components/Payments';
import MaintenanceContracts from './components/MaintenanceContracts';
import SystemManagement from './components/SystemManagement';
import MilestoneFilter from './components/MilestoneFilter';
import ReportsBuilder from './components/ReportsBuilder';
import Login from './components/Login';
import EditProjectModal from './components/EditProjectModal';
import EditMilestoneModal from './components/EditMilestoneModal';
import MilestoneDetailModal from './components/MilestoneDetailModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import Chatbot from './components/Chatbot';
import SearchResultModal from './components/SearchResultModal';
import { Language, Theme, View, Project, Milestone, User, Lookups, AnalysisResult } from './types';
import { fetchAllData, addProject as apiAddProject, updateProject as apiUpdateProject, addMilestones as apiAddMilestones, updateMilestone as apiUpdateMilestone, updateLookups as apiUpdateLookups, deleteProject as apiDeleteProject } from './services/api';
import { initSupabase } from './services/supabaseClient';
import { analyzeQuery } from './services/geminiService';

const App: React.FC = () => {
    const [view, setView] = useState<View>(() => (localStorage.getItem('lastView') as View) || 'dashboard');
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [lookups, setLookups] = useState<Lookups>({ countries: [], categories: [], teams: [], products: [], projectStatuses: [], projectManagers: [], customers: [] });

    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [viewingMilestone, setViewingMilestone] = useState<Milestone | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    // AI Search States
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<AnalysisResult | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
    const [isAppConfigured, setIsAppConfigured] = useState(false);
    
    const isFetching = useRef(false);

    useEffect(() => { localStorage.setItem('lastView', view); }, [view]);
    useEffect(() => { localStorage.setItem('language', language); }, [language]);
    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
    }, [theme]);

    // Close sidebar on view change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [view]);
    
    const setupClient = useCallback((key: string, url: string) => {
        try {
            const client = initSupabase(url, key);
            setSupabaseClient(client);
            setIsAppConfigured(true);
            setErrorMsg(null);
            return true;
        } catch (e: any) {
            setErrorMsg(e.message || "Invalid Supabase Configuration");
            setIsAppConfigured(false);
            return false;
        }
    }, []);

    useEffect(() => {
        const key = localStorage.getItem('supabaseAnonKey');
        const url = localStorage.getItem('supabaseUrl') || 'https://dcamlinhazzmbaldsrdo.supabase.co';
        if (key?.trim()) {
            setupClient(key, url);
        } else {
            setIsAppConfigured(false);
            setIsLoading(false);
        }
    }, [setupClient]);

    useEffect(() => {
        if (!supabaseClient) return;
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, [supabaseClient]);

    const loadData = useCallback(async () => {
        if (!session || isFetching.current) return;
        try {
            isFetching.current = true;
            const data = await fetchAllData();
            setProjects(data.projects || []);
            setMilestones(data.milestones || []);
            setUsers(data.users || []);
            if (data.lookups) setLookups(data.lookups);
            setErrorMsg(null);
        } catch (e: any) {
            setErrorMsg("Connection error: Make sure your tables exist in Supabase.");
        } finally {
            isFetching.current = false;
        }
    }, [session]);

    useEffect(() => {
        if (session) loadData();
    }, [session, loadData]);

    const handleSaveConfig = (key: string, url: string) => {
        localStorage.setItem('supabaseAnonKey', key);
        localStorage.setItem('supabaseUrl', url);
        if (setupClient(key, url)) {
            // Success
        }
    };

    const handleAiSearch = async (query: string) => {
        if (!query.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeQuery(query, projects, milestones, users, lookups.teams);
            setAiAnalysisResult(result);
            
            // Contextual view switching based on AI result
            if (result.resultType === 'PROJECTS' && result.projects && result.projects.length > 0) {
                setView('projects');
            } else if (result.resultType === 'MILESTONES' && result.milestones && result.milestones.length > 0) {
                setView('milestones');
            }
        } catch (err) {
            console.error("AI Search Error:", err);
            setAiAnalysisResult({ resultType: 'ERROR', error: "Critical error connecting to AI services. Please check your internet or configuration." });
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center flex-col gap-4"><div className="w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin"></div></div>;
    if (!isAppConfigured) return <SystemManagement lookups={lookups} onUpdate={() => {}} language={language} onSaveConfig={handleSaveConfig} isSetupMode={true} />;
    if (!session) return <Login onLoginSuccess={() => loadData()} language={language} setLanguage={setLanguage} supabaseClient={supabaseClient!} />;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            
            <div className={`fixed inset-y-0 z-50 lg:relative lg:z-auto transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0`}>
                <Sidebar currentView={view} setCurrentView={setView} language={language} />
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header 
                    user={users.find(u => u.id === session.user.id)} 
                    language={language} 
                    setLanguage={setLanguage} 
                    onSearch={handleAiSearch} 
                    onLogout={() => supabaseClient?.auth.signOut()} 
                    theme={theme} 
                    setTheme={setTheme} 
                    isDbConnected={!!session}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
                
                {/* AI Progress Bar */}
                {isAnalyzing && (
                    <div className="h-0.5 w-full bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
                        <div className="h-full bg-violet-600 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '30%', transformOrigin: 'left' }}></div>
                    </div>
                )}

                {errorMsg && (
                    <div className="mx-4 lg:mx-8 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl flex justify-between items-center animate-in slide-in-from-top-1">
                        <p className="text-[10px] font-black uppercase text-red-600">{errorMsg}</p>
                        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-lg">RESET</button>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    {view === 'dashboard' && <AnalyticsDashboard projects={projects} milestones={milestones} projectManagers={lookups.projectManagers} language={language} />}
                    {view === 'projects' && (
                        <Projects 
                            allProjects={projects} 
                            allUsers={users} 
                            language={language} 
                            onAddProject={async (d) => { await apiAddProject(d); loadData(); }} 
                            onOpenEditModal={setEditingProject} 
                            onOpenDeleteModal={setDeletingProject} 
                            lookups={lookups} 
                            isImportModalOpen={isImportModalOpen} 
                            onOpenImportModal={() => setIsImportModalOpen(true)} 
                            onCloseImportModal={() => setIsImportModalOpen(false)} 
                            onImportProjects={async () => {}} 
                            searchResult={aiAnalysisResult?.resultType === 'PROJECTS' ? aiAnalysisResult.projects : undefined}
                        />
                    )}
                    {view === 'milestones' && (
                        <Milestones 
                            allMilestones={milestones} 
                            allProjects={projects} 
                            language={language} 
                            onAddMilestones={async (d) => { await apiAddMilestones(d); loadData(); }} 
                            onOpenEditModal={setEditingMilestone} 
                            onViewMilestoneDetails={setViewingMilestone} 
                            onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} 
                            lookups={lookups} 
                            searchResult={aiAnalysisResult?.resultType === 'MILESTONES' ? aiAnalysisResult.milestones : undefined}
                        />
                    )}
                    {view === 'team' && <Team allUsers={users} allProjects={projects} language={language} />}
                    {view === 'payments' && <Payments allProjects={projects} allMilestones={milestones} allTeams={lookups.teams} language={language} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} />}
                    {view === 'system' && <SystemManagement lookups={lookups} onUpdate={apiUpdateLookups} language={language} onSaveConfig={handleSaveConfig} />}
                    {view === 'filter' && <MilestoneFilter projects={projects} milestones={milestones} teams={lookups.teams} customers={lookups.customers} projectManagers={lookups.projectManagers} language={language} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} />}
                    {view === 'reports' && <ReportsBuilder projects={projects} milestones={milestones} teams={lookups.teams} language={language} />}
                </main>
            </div>

            {/* Modals */}
            {aiAnalysisResult && (aiAnalysisResult.resultType === 'SUMMARY' || aiAnalysisResult.resultType === 'KPIS' || aiAnalysisResult.resultType === 'ERROR') && (
                <SearchResultModal 
                    result={aiAnalysisResult} 
                    onClose={() => setAiAnalysisResult(null)} 
                    language={language} 
                />
            )}

            {editingProject && <EditProjectModal projectToEdit={editingProject} lookups={lookups} onClose={() => setEditingProject(null)} onUpdateProject={async (id, d) => { await apiUpdateProject(id, d); loadData(); }} language={language} />}
            {editingMilestone && <EditMilestoneModal milestoneToEdit={editingMilestone} allMilestones={milestones} teams={lookups.teams} projects={projects} allMilestoneUpdates={[]} allUsers={users} currentUser={users.find(u => u.id === session.user.id)} onClose={() => setEditingMilestone(null)} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} onAddMilestones={async (d) => { await apiAddMilestones(d); loadData(); }} onAddUpdate={async () => {}} language={language} />}
            {viewingMilestone && <MilestoneDetailModal milestone={viewingMilestone} projects={projects} allMilestoneUpdates={[]} allUsers={users} lookups={lookups} onClose={() => setViewingMilestone(null)} language={language} />}
            {deletingProject && <ConfirmDeleteModal project={deletingProject} onClose={() => setDeletingProject(null)} onConfirm={async () => { await apiDeleteProject(deletingProject.id); setDeletingProject(null); loadData(); }} language={language} />}
            
            <button onClick={() => setIsChatbotOpen(true)} className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 rtl:left-6 rtl:right-auto lg:rtl:left-8 lg:rtl:right-auto bg-slate-900 text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-40"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" /></svg></button>
            <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} language={language} projects={projects} milestones={milestones} users={users} lookups={lookups} />
            
            <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
            `}</style>
        </div>
    );
};

export default App;
