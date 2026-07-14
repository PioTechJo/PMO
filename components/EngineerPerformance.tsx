import React, { useMemo } from 'react';
import { Issue, User, Language, IssueStatus } from '../types';
import StatCard from './StatCard';

interface EngineerPerformanceProps {
    allIssues: Issue[];
    allUsers: User[];
    language: Language;
    t: any;
}

const EngineerPerformance: React.FC<EngineerPerformanceProps> = ({ allIssues, allUsers, language, t }) => {
    // Only consider users of type 'PS' (Professional Services / Engineers)
    const engineers = useMemo(() => allUsers.filter(u => u.type === 'PS'), [allUsers]);

    const performanceData = useMemo(() => {
        return engineers.map(eng => {
            const engIssues = allIssues.filter(i => i.assigneeId === eng.id);
            const resolvedIssues = engIssues.filter(i => i.status === IssueStatus.Resolved || i.status === IssueStatus.Closed);
            
            // 1. Avg Resolution Speed in Days
            let totalResolutionDays = 0;
            let resolvedCountWithDates = 0;
            
            resolvedIssues.forEach(issue => {
                if (issue.createdAt && issue.resolvedAt) {
                    const start = new Date(issue.createdAt).getTime();
                    const end = new Date(issue.resolvedAt).getTime();
                    // Duration strictly in days
                    const days = (end - start) / (1000 * 60 * 60 * 24);
                    if (days >= 0) {
                        totalResolutionDays += days;
                        resolvedCountWithDates++;
                    }
                }
            });
            const avgResolutionSpeedDays = resolvedCountWithDates > 0 ? (totalResolutionDays / resolvedCountWithDates) : 0;

            // 2. Internal Escalations
            const escalatedIssues = engIssues.filter(i => i.isEscalated);
            const internalEscalationsCount = escalatedIssues.length;

            // 3. Avg Turnaround (for escalated issues) in days
            let totalTurnaroundDays = 0;
            let turnaroundCount = 0;

            escalatedIssues.forEach(issue => {
                if (issue.escalatedAt && issue.resolvedAt) {
                    const start = new Date(issue.escalatedAt).getTime();
                    const end = new Date(issue.resolvedAt).getTime();
                    // Duration strictly in days
                    const days = (end - start) / (1000 * 60 * 60 * 24);
                    if (days >= 0) {
                        totalTurnaroundDays += days;
                        turnaroundCount++;
                    }
                }
            });
            const avgTurnaroundDays = turnaroundCount > 0 ? (totalTurnaroundDays / turnaroundCount) : 0;

            return {
                engineer: eng,
                totalAssigned: engIssues.length,
                resolvedCount: resolvedIssues.length,
                avgResolutionSpeedDays,
                internalEscalationsCount,
                avgTurnaroundDays,
                escalatedIssues
            };
        }).sort((a, b) => b.resolvedCount - a.resolvedCount);
    }, [engineers, allIssues]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {performanceData.map((data) => (
                <div key={data.engineer.id} className="bg-white dark:bg-[#111927] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-black text-lg">
                            {data.engineer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{data.engineer.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مهندس دعم فني' : 'Support Engineer'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard 
                            title={language === 'ar' ? 'إجمالي المهام' : 'Total Tasks'}
                            value={data.totalAssigned}
                            color="blue"
                        />
                        <StatCard 
                            title={language === 'ar' ? 'متوسط سرعة الحل' : 'Avg Resolution Speed'}
                            value={`${Math.ceil(data.avgResolutionSpeedDays)} ${language === 'ar' ? 'أيام' : 'Days'}`}
                            color="emerald"
                            trend={{ val: language === 'ar' ? 'بالأيام' : 'In Days', type: 'up' }}
                        />
                        <StatCard 
                            title={language === 'ar' ? 'التصعيدات الداخلية' : 'Internal Escalations'}
                            value={data.internalEscalationsCount}
                            color="orange"
                        />
                        <StatCard 
                            title={language === 'ar' ? 'متوسط سرعة الإنجاز' : 'Avg Turnaround'}
                            value={`${Math.ceil(data.avgTurnaroundDays)} ${language === 'ar' ? 'أيام' : 'Days'}`}
                            color="red"
                            trend={{ val: language === 'ar' ? 'بالأيام' : 'In Days', type: 'up' }}
                        />
                    </div>

                    {data.escalatedIssues.length > 0 && (
                        <div className="mt-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                {language === 'ar' ? 'تفاصيل التصعيد' : 'Escalation Details'}
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
                                            <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.issueTitle}</th>
                                            <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.status}</th>
                                            <th className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المدة' : 'Duration'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {data.escalatedIssues.map(issue => {
                                            let durationText = '-';
                                            if (issue.escalatedAt) {
                                                const start = new Date(issue.escalatedAt).getTime();
                                                const end = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : new Date().getTime();
                                                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                                durationText = `${Math.max(0, days)} ${language === 'ar' ? 'أيام' : 'Days'}`;
                                            }
                                            return (
                                                <tr key={issue.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{issue.title}</td>
                                                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{issue.status}</td>
                                                    <td className="px-4 py-3 text-xs font-black text-red-500">{durationText}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {performanceData.length === 0 && (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-500 text-sm font-bold">{language === 'ar' ? 'لا يوجد مهندسين لعرض أدائهم' : 'No engineers found to display performance'}</p>
                </div>
            )}
        </div>
    );
};

export default EngineerPerformance;
