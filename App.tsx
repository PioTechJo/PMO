
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPIDashboard from './components/KPIDashboard';
import MyTasks from './components/MyTasks';
import TasksOverview from './components/TasksOverview';
import DashboardTabs from './components/DashboardTabs';
import Projects from './components/Projects';
import Milestones from './components/Milestones';
import Team from './components/Team';
import Payments from './components/Payments';
import MaintenanceContracts from './components/MaintenanceContracts';
import MaintenanceOverview from './components/MaintenanceOverview';
import Issues from './components/Issues';
import SystemManagement from './components/SystemManagement';
import MilestoneFilter from './components/MilestoneFilter';
import ReportsBuilder from './components/ReportsBuilder';
import Login from './components/Login';
import EditProjectModal from './components/EditProjectModal';
import EditMilestoneModal from './components/EditMilestoneModal';
import MilestoneDetailModal from './components/MilestoneDetailModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import { Language, Theme, View, Project, Milestone, User, Lookups, MaintenanceContract, Issue, IssueStatus, Notification, RolePermissions } from './types';
import { 
    fetchAllData, 
    addProject as apiAddProject, 
    updateProject as apiUpdateProject, 
    addMilestones as apiAddMilestones, 
    updateMilestone as apiUpdateMilestone, 
    updateLookups as apiUpdateLookups, 
    deleteProject as apiDeleteProject,
    addMaintenanceContract as apiAddContract,
    updateMaintenanceContract as apiUpdateContract,
    addIssue as apiAddIssue,
    updateIssue as apiUpdateIssue,
    deleteIssue as apiDeleteIssue,
    addIssueComment as apiAddIssueComment,
} from './services/api';
import { initSupabase, getSupabase } from './services/supabaseClient';

const App: React.FC = () => {
    const [view, setView] = useState<View>(() => (localStorage.getItem('lastView') as View) || 'dashboard');
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [projects, setProjects] = useState<Project[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [maintenanceContracts, setMaintenanceContracts] = useState<MaintenanceContract[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [lookups, setLookups] = useState<Lookups>({ countries: [], categories: [], teams: [], products: [], projectStatuses: [], projectManagers: [], customers: [] });

    // Permissions State
    const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>(() => {
        // "My Tasks" is only relevant to PS - they're the only type that
        // actually gets issues assigned to them (see AddIssueModal's
        // assignee list). Everyone else keeps their existing landing page.
        const defaultPermissions = [
            { role: 'Manager', allowedViews: ['dashboard', 'tasksOverview', 'paymentsTargetsDashboard', 'filter', 'projects', 'milestones', 'team', 'payments', 'reports', 'maintenanceContracts', 'maintenanceOverview', 'system', 'issues'] },
            { role: 'PM', allowedViews: ['dashboard', 'tasksOverview', 'paymentsTargetsDashboard', 'filter', 'projects', 'milestones', 'team', 'payments', 'reports', 'maintenanceContracts', 'maintenanceOverview', 'issues'] },
            { role: 'PS', allowedViews: ['myTasks', 'tasksOverview', 'issues'] },
            { role: 'Staff', allowedViews: ['dashboard', 'tasksOverview', 'projects', 'issues'] },
            { role: 'User', allowedViews: ['dashboard', 'tasksOverview', 'projects', 'issues'] },
            // Sees/manages every task across every project, but has no
            // access to Projects, Milestones, Payments, etc. - a narrower
            // admin than Manager, scoped to Tasks only.
            { role: 'TasksAdmin', allowedViews: ['tasksOverview', 'issues'] }
        ];
        const saved = localStorage.getItem('rolePermissions');
        if (!saved) return defaultPermissions;

        try {
            const parsed = JSON.parse(saved);
            // Check if Manager role is missing in the saved version
            if (!parsed.some((p: any) => p.role === 'Manager')) {
                return defaultPermissions;
            }
            // Migrate: grant tasksOverview to any role that already had dashboard access
            let migrated = parsed.map((p: any) => (
                p.allowedViews.includes('dashboard') && !p.allowedViews.includes('tasksOverview')
                    ? { ...p, allowedViews: [...p.allowedViews, 'tasksOverview'] }
                    : p
            ));
            // Migrate: add the new TasksAdmin role if it's missing
            if (!migrated.some((p: any) => p.role === 'TasksAdmin')) {
                migrated = [...migrated, { role: 'TasksAdmin', allowedViews: ['tasksOverview', 'issues'] }];
            }
            // Migrate: give only PS access to the new My Tasks page; strip it
            // from any other role that may have picked it up in a previous
            // (broader) version of this migration.
            migrated = migrated.map((p: any) => {
                const shouldHave = p.role === 'PS';
                const has = p.allowedViews.includes('myTasks');
                if (shouldHave && !has) return { ...p, allowedViews: ['myTasks', ...p.allowedViews] };
                if (!shouldHave && has) return { ...p, allowedViews: p.allowedViews.filter((v: string) => v !== 'myTasks') };
                return p;
            });
            // Migrate: System Management is Admin-only (Manager role) -
            // strip it from any other role that may have picked it up in a
            // previous (broader) version of this migration.
            migrated = migrated.map((p: any) => (
                p.role !== 'Manager' && p.allowedViews.includes('system')
                    ? { ...p, allowedViews: p.allowedViews.filter((v: string) => v !== 'system') }
                    : p
            ));
            return migrated;
        } catch (e) {
            return defaultPermissions;
        }
    });

    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [viewingMilestone, setViewingMilestone] = useState<Milestone | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [session, setSession] = useState<Session | null>(null);
    const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
    const [isAppConfigured, setIsAppConfigured] = useState(false);
    
    const isFetching = useRef(false);

    const currentUser = useMemo(() => users.find(u => u.id === session?.user?.id), [users, session]);

    const allowedViews = useMemo(() => {
        if (!currentUser) return [];
        const config = rolePermissions.find(p => p.role === currentUser.type);
        return config ? config.allowedViews : [];
    }, [currentUser, rolePermissions]);

    useEffect(() => {
        if (currentUser && allowedViews.length > 0 && !allowedViews.includes(view)) {
            setView(allowedViews[0]);
        }
    }, [view, allowedViews, currentUser]);

    useEffect(() => { localStorage.setItem('lastView', view); }, [view]);
    useEffect(() => { localStorage.setItem('language', language); }, [language]);
    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
    }, [theme]);

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
        // The anon key is a public, RLS-protected key (not a secret like the
        // service role key) - baked in as the one true value so every user
        // just lands on the login screen. Deliberately NOT reading from
        // localStorage here anymore: a stale/bad value saved by someone
        // during the old manual-setup flow would otherwise permanently
        // override the correct key on that person's browser.
        const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYW1saW5oYXp6bWJhbGRzcmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzQwNjEsImV4cCI6MjA3NTkxMDA2MX0.Gjn3QbnmRkapXmiMaks7luZnh6xlahL9UWNoDsP06bc';
        const SUPABASE_URL = 'https://dcamlinhazzmbaldsrdo.supabase.co';
        localStorage.removeItem('supabaseAnonKey');
        localStorage.removeItem('supabaseUrl');
        setupClient(ANON_KEY, SUPABASE_URL);
    }, [setupClient]);

    useEffect(() => {
        if (!supabaseClient) return;
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, [supabaseClient]);

    const loadData = useCallback(async () => {
        if (!session || isFetching.current) return;
        try {
            isFetching.current = true;
            const data = await fetchAllData();
            setProjects(data.projects || []);
            setMilestones(data.milestones || []);
            setMaintenanceContracts(data.maintenanceContracts || []);
            setIssues(data.issues || []);
            setNotifications(data.notifications || []);
            setUsers(data.users || []);
            if (data.lookups) setLookups(data.lookups);
        } catch (e: any) {
            setErrorMsg("Database Connection Error.");
        } finally {
            isFetching.current = false;
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            loadData();
            const sb = getSupabase();
            if (sb) {
                const channel = sb.channel('notif-updates')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => loadData())
                    .subscribe();
                return () => { sb.removeChannel(channel); };
            }
        }
    }, [session, loadData]);

    const handleLogout = async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
            setSession(null);
        }
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    if (isLoading) return <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-violet-600/20 border-t-violet-600 rounded-full animate-spin"></div></div>;
    if (!isAppConfigured) return <SystemManagement lookups={lookups} onUpdate={() => {}} language={language} onSaveConfig={(k, u) => { localStorage.setItem('supabaseAnonKey', k); localStorage.setItem('supabaseUrl', u); setupClient(k, u); }} isSetupMode={true} rolePermissions={rolePermissions} onUpdatePermissions={() => {}} />;
    if (!session) return <Login onLoginSuccess={() => loadData()} language={language} setLanguage={setLanguage} supabaseClient={supabaseClient!} />;

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <Sidebar 
                currentView={view} 
                setCurrentView={(v) => { setView(v); closeSidebar(); }} 
                language={language} 
                allowedViews={allowedViews} 
                onLogout={handleLogout} 
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                projectsCount={projects.length}
                openTasksCount={issues.filter(i => i.status === IssueStatus.Open || i.status === IssueStatus.InProgress).length}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header 
                    user={currentUser} 
                    language={language} setLanguage={setLanguage} onLogout={handleLogout}
                    theme={theme} setTheme={setTheme} isDbConnected={!!session}
                    onToggleSidebar={toggleSidebar}
                    notifications={notifications} onNotificationRead={loadData}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
                    {view === 'myTasks' && allowedViews.includes('myTasks') && <MyTasks allIssues={issues} allProjects={projects} currentUser={currentUser} language={language} onUpdateIssue={async (id, d) => { await apiUpdateIssue(id, d); loadData(); }} onAddComment={async (id, uid, c) => { await apiAddIssueComment(id, uid, c); loadData(); }} />}
                    {view === 'dashboard' && allowedViews.includes('dashboard') && <KPIDashboard projects={projects} milestones={milestones} issues={issues} allUsers={users} projectManagers={lookups.projectManagers} language={language} />}
                    {view === 'tasksOverview' && allowedViews.includes('tasksOverview') && <TasksOverview issues={issues} projects={projects} allUsers={users} language={language} currentUser={currentUser} onUpdateIssue={async (id, d) => { await apiUpdateIssue(id, d); loadData(); }} onAddComment={async (id, uid, c) => { await apiAddIssueComment(id, uid, c); loadData(); }} />}
                    {view === 'paymentsTargetsDashboard' && allowedViews.includes('paymentsTargetsDashboard') && <DashboardTabs allProjects={projects} allMilestones={milestones} allProjectManagers={lookups.projectManagers} lookups={lookups} language={language} />}
                    {view === 'projects' && allowedViews.includes('projects') && <Projects allProjects={projects} allMilestones={milestones} allIssues={issues} allUsers={users} language={language} onAddProject={async (d) => { const created = await apiAddProject(d); await loadData(); return created; }} onAddMilestones={async (d) => { await apiAddMilestones(d); loadData(); }} onOpenEditModal={setEditingProject} onOpenDeleteModal={setDeletingProject} lookups={lookups} isImportModalOpen={isImportModalOpen} onOpenImportModal={() => setIsImportModalOpen(true)} onCloseImportModal={() => setIsImportModalOpen(false)} onImportProjects={async () => {}} currentUser={currentUser} />}
                    {view === 'milestones' && allowedViews.includes('milestones') && <Milestones allMilestones={milestones} allProjects={projects} language={language} onOpenEditModal={setEditingMilestone} onViewMilestoneDetails={setViewingMilestone} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} onRefresh={loadData} lookups={lookups} currentUser={currentUser} />}
                    {view === 'team' && allowedViews.includes('team') && <Team allUsers={users} allProjects={projects} allIssues={issues} language={language} currentUser={currentUser} onUserInvited={loadData} />}
                    {view === 'payments' && allowedViews.includes('payments') && <Payments allProjects={projects} allMilestones={milestones} allTeams={lookups.teams} language={language} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} />}
                    {view === 'maintenanceContracts' && allowedViews.includes('maintenanceContracts') && <MaintenanceContracts contracts={maintenanceContracts} customers={lookups.customers} language={language} onAddContract={async (d) => { await apiAddContract(d); loadData(); }} onUpdateContract={async (id, d) => { await apiUpdateContract(id, d); loadData(); }} />}
                    {view === 'maintenanceOverview' && allowedViews.includes('maintenanceOverview') && <MaintenanceOverview maintenanceContracts={maintenanceContracts} customers={lookups.customers} language={language} />}
                    {view === 'issues' && allowedViews.includes('issues') && <Issues allIssues={issues} allProjects={projects} allMilestones={milestones} allUsers={users} language={language} onAddIssue={async (d) => { await apiAddIssue(d); loadData(); }} onUpdateIssue={async (id, d) => { await apiUpdateIssue(id, d); loadData(); }} onAddComment={async (id, uid, c) => { await apiAddIssueComment(id, uid, c); loadData(); }} onDeleteIssue={async (id) => { await apiDeleteIssue(id); setIssues(prev => prev.filter(i => i.id !== id)); loadData(); }} currentUser={currentUser} />}
                    {view === 'system' && allowedViews.includes('system') && <SystemManagement lookups={lookups} onUpdate={apiUpdateLookups} language={language} onSaveConfig={(k, u) => { localStorage.setItem('supabaseAnonKey', k); localStorage.setItem('supabaseUrl', u); setupClient(k, u); }} rolePermissions={rolePermissions} onUpdatePermissions={(p) => { setRolePermissions(p); localStorage.setItem('rolePermissions', JSON.stringify(p)); }} />}
                    {view === 'filter' && allowedViews.includes('filter') && <MilestoneFilter projects={projects} milestones={milestones} teams={lookups.teams} customers={lookups.customers} projectManagers={lookups.projectManagers} language={language} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} />}
                    {view === 'reports' && allowedViews.includes('reports') && <ReportsBuilder projects={projects} milestones={milestones} issues={issues} users={users} teams={lookups.teams} language={language} />}
                </main>
            </div>

            {editingProject && <EditProjectModal projectToEdit={editingProject} lookups={lookups} onClose={() => setEditingProject(null)} onUpdateProject={async (id, d) => { await apiUpdateProject(id, d); loadData(); }} language={language} />}
            {editingMilestone && <EditMilestoneModal milestoneToEdit={editingMilestone} allMilestones={milestones} teams={lookups.teams} projects={projects} allMilestoneUpdates={[]} allUsers={users} currentUser={currentUser} onClose={() => setEditingMilestone(null)} onUpdateMilestone={async (id, d) => { await apiUpdateMilestone(id, d); loadData(); }} onAddMilestones={async (d) => { await apiAddMilestones(d); loadData(); }} onAddUpdate={async () => {}} language={language} />}
            {viewingMilestone && <MilestoneDetailModal milestone={viewingMilestone} projects={projects} allMilestoneUpdates={[]} allUsers={users} lookups={lookups} onClose={() => setViewingMilestone(null)} language={language} />}
            {deletingProject && <ConfirmDeleteModal project={deletingProject} onClose={() => setDeletingProject(null)} onConfirm={async () => { await apiDeleteProject(deletingProject.id); setDeletingProject(null); loadData(); }} language={language} />}
            <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
        </div>
    );
};

export default App;
