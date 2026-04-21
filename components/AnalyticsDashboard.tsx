
import React, { useMemo } from 'react';
import { Project, Milestone, Language, Issue, User } from '../types';
import StatCard from './StatCard';

interface AnalyticsDashboardProps {
    projects: Project[];
    milestones: Milestone[];
    issues: Issue[];
    users: User[];
    language: Language;
}

export const WIDGETS_CONFIG = [
    { id: 'stats', name: 'Statistics Summary' },
    { id: 'project_status', name: 'Project Status Distribution' },
    { id: 'task_completion', name: 'Milestone Completion' },
    { id: 'recent_issues', name: 'Recent Tasks' },
    { id: 'system_alert', name: 'System Performance' },
    { id: 'activity_stream', name: 'Team Activity' },
];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
    projects = [], 
    milestones = [], 
    issues = [], 
    users = [], 
    language 
}) => {
    const t = translations[language];

    // حساب الإحصائيات الفعلية من البيانات
    const stats = useMemo(() => {
        const activeCount = projects.filter(p => p.status?.name === 'Active' || p.status?.name === 'نشط').length;
        const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
        const openIssues = issues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
        
        // حساب إجمالي الدفعات المحصلة
        const totalCollected = milestones
            .filter(m => m.hasPayment && m.paymentStatus === 'Paid')
            .reduce((sum, m) => sum + (m.paymentAmount || 0), 0);

        return {
            activeProjects: activeCount,
            milestoneProgress: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0,
            openIssues: openIssues,
            revenue: totalCollected.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' })
        };
    }, [projects, milestones, issues, language]);

    // بيانات توزيع حالة المشاريع للرسم البياني
    const projectStatusData = useMemo(() => {
        const counts: Record<string, number> = {};
        projects.forEach(p => {
            const status = p.status?.name || (language === 'ar' ? 'غير محدد' : 'Undefined');
            counts[status] = (counts[status] || 0) + 1;
        });
        return Object.entries(counts).map(([label, value]) => ({ label, value }));
    }, [projects, language]);

    const maxStatusValue = Math.max(...projectStatusData.map(d => d.value), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* صف البطاقات العلوية - بيانات حقيقية */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={t.activeProjects} 
                    value={stats.activeProjects.toString()} 
                    icon="projects" 
                    progress={Math.round((stats.activeProjects / (projects.length || 1)) * 100)} 
                />
                <StatCard 
                    title={t.milestoneCompletion} 
                    value={`${stats.milestoneProgress}%`} 
                    icon="completed" 
                    progress={stats.milestoneProgress} 
                />
                <StatCard 
                    title={t.openIssues} 
                    value={stats.openIssues.toString()} 
                    icon="inProgress" 
                    trendColor="text-red-500"
                />
                <StatCard 
                    title={t.collectedRevenue} 
                    value={stats.revenue} 
                    icon="hours" 
                />
            </div>

            {/* القسم الأوسط: الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* توزيع حالات المشاريع (Bar Chart Style) */}
                <div className="lg:col-span-8 bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.projectStatusDistribution}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">{t.realTimeOverview}</p>
                        </div>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-4 px-2">
                        {projectStatusData.length > 0 ? projectStatusData.map((data, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl relative h-48 overflow-hidden">
                                    <div 
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-violet-400 rounded-t-2xl transition-all duration-1000 group-hover:from-indigo-500" 
                                        style={{ height: `${(data.value / maxStatusValue) * 100}%` }}
                                    >
                                        <div className="absolute top-2 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-black text-white">{data.value}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase truncate w-full text-center">{data.label}</span>
                            </div>
                        )) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 italic uppercase tracking-widest text-xs">
                                {t.noDataAvailable}
                            </div>
                        )}
                    </div>
                </div>

                {/* مؤشر الإنجاز (Circle Chart) */}
                <div className="lg:col-span-4 bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">{t.overallProgress}</h3>
                    </div>
                    <div className="relative w-48 h-48 mx-auto mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="40%" fill="transparent" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-slate-800" />
                            <circle 
                                cx="50%" cy="50%" r="40%" 
                                fill="transparent" 
                                stroke="currentColor" 
                                strokeWidth="16" 
                                className="text-indigo-500 transition-all duration-1000" 
                                strokeDasharray="251" 
                                strokeDashoffset={251 - (251 * stats.milestoneProgress) / 100} 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-800 dark:text-white">{stats.milestoneProgress}%</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.completed}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"></div><span className="text-slate-500">{t.totalMilestones}</span></div>
                            <span className="text-slate-800 dark:text-white">{milestones.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div><span className="text-slate-500">{t.done}</span></div>
                            <span className="text-slate-800 dark:text-white">{milestones.filter(m => m.status === 'Completed').length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* القسم السفلي: المهام والنشاطات */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* قائمة المهام الأخيرة */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-slate-800">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase mb-8">{t.recentIssues}</h3>
                    <div className="space-y-4">
                        {issues.slice(0, 4).map((issue, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${issue.priority === 'Critical' ? 'bg-red-50 text-red-500' : 'bg-white dark:bg-slate-700 text-indigo-500'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{issue.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{issue.project?.name || t.unknownProject}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase ${issue.priority === 'Critical' ? 'bg-red-500' : 'bg-indigo-500'}`}>{issue.status}</span>
                            </div>
                        ))}
                        {issues.length === 0 && <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">{t.noIssuesFound}</p>}
                    </div>
                </div>

                {/* تنبيهات النظام وسير العمل */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h4 className="text-white font-black uppercase text-sm">{t.systemHealth}</h4>
                            </div>
                            <p className="text-indigo-50 text-sm leading-relaxed mb-6">{t.systemHealthMsg}</p>
                            <div className="flex items-center justify-between text-white/80 text-[10px] font-black uppercase mb-4">
                                <span>DB Connectivity</span>
                                <span className="text-emerald-300">Operational</span>
                            </div>
                            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-50 transition-all">{t.viewReports}</button>
                        </div>
                    </div>

                    {/* النشاطات الأخيرة للفريق */}
                    <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2.5rem] shadow-sm border border-slate-50 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">{t.teamActivity}</h3>
                        <div className="space-y-6">
                            {users.slice(0, 3).map((user, i) => (
                                <div key={i} className="flex gap-4">
                                    <img 
                                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} 
                                        className="w-10 h-10 rounded-2xl shadow-sm shrink-0" 
                                        alt={user.name}
                                    />
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{user.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.type || 'Staff'}</p>
                                        <p className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase mt-1">Active Now</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: { 
        activeProjects: 'المشاريع النشطة', milestoneCompletion: 'إنجاز المعالم', openIssues: 'المهام المفتوحة', teamEfficiency: 'كفاءة الفريق',
        projectStatusDistribution: 'توزيع حالة المشاريع', realTimeOverview: 'نظرة عامة فورية', overallProgress: 'التقدم الإجمالي', 
        completed: 'مكتمل', done: 'تم إنجازه', totalMilestones: 'إجمالي المعالم', recentIssues: 'المهام الأخيرة', 
        noIssuesFound: 'لا توجد مهام حالية.', systemHealth: 'حالة النظام', systemHealthMsg: 'جميع الخدمات تعمل بشكل طبيعي. تم تأمين قاعدة البيانات بنجاح.',
        viewReports: 'عرض التقارير التفصيلية', teamActivity: 'نشاط الفريق', unknownProject: 'مشروع غير معروف', noDataAvailable: 'لا توجد بيانات كافية',
        collectedRevenue: 'الدفعات المحصلة'
    },
    en: { 
        activeProjects: 'Active Projects', milestoneCompletion: 'Milestone Completion', openIssues: 'Open Tasks', teamEfficiency: 'Team Efficiency',
        projectStatusDistribution: 'Project Status Distribution', realTimeOverview: 'Real-time overview', overallProgress: 'Overall Progress', 
        completed: 'Completed', done: 'Done', totalMilestones: 'Total Milestones', recentIssues: 'Recent Tasks', 
        noIssuesFound: 'No tasks found.', systemHealth: 'System Health', systemHealthMsg: 'All services are operational. Database connection is secure.',
        viewReports: 'View Detailed Reports', teamActivity: 'Team Activity', unknownProject: 'Unknown Project', noDataAvailable: 'No data available',
        collectedRevenue: 'Collected Revenue'
    }
};

export default AnalyticsDashboard;
