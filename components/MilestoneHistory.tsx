import React, { useState, useEffect } from 'react';
import { Project, MilestoneChangeRequest, Language, User } from '../types';
import { fetchMilestoneChangeRequests } from '../services/api';
import { Calendar, Filter, ArrowRight, History, CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import SearchableSelect from './SearchableSelect';

interface MilestoneHistoryProps {
    language: Language;
    projects: Project[];
    currentUser: User | null;
}

const MilestoneHistory: React.FC<MilestoneHistoryProps> = ({ language, projects, currentUser }) => {
    const [history, setHistory] = useState<MilestoneChangeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedMilestoneTitle, setSelectedMilestoneTitle] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('approved');

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        // Reset milestone filter when project changes
        setSelectedMilestoneTitle('all');
    }, [selectedProjectId]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await fetchMilestoneChangeRequests();
            setHistory(data);
        } catch (err) {
            console.error("Error loading history:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const isAr = language === 'ar';
    const t = {
        title: isAr ? 'سجل تغييرات المواعيد نهائية' : 'Milestone Deadlines History',
        projectFilter: isAr ? 'تصفية حسب المشروع' : 'Filter by Project',
        milestoneFilter: isAr ? 'تصفية حسب المرحلة' : 'Filter by Milestone',
        searchProjects: isAr ? 'ابحث عن مشروع...' : 'Search projects...',
        searchMilestones: isAr ? 'ابحث عن مرحلة...' : 'Search milestones...',
        allProjects: isAr ? 'جميع المشاريع' : 'All Projects',
        allMilestones: isAr ? 'جميع المراحل' : 'All Milestones',
        statusFilter: isAr ? 'حالة الطلب' : 'Request Status',
        allStatuses: isAr ? 'جميع الحالات' : 'All Statuses',
        approved: isAr ? 'مقبول' : 'Approved',
        rejected: isAr ? 'مرفوض' : 'Rejected',
        pending: isAr ? 'قيد الانتظار' : 'Pending',
        tableMilestone: isAr ? 'المرحلة' : 'Milestone',
        tableProject: isAr ? 'المشروع' : 'Project',
        tableOldDate: isAr ? 'التاريخ السابق' : 'Old Date',
        tableNewDate: isAr ? 'التاريخ الجديد' : 'New Date',
        tableRequestedBy: isAr ? 'بواسطة' : 'Requested By',
        tableDate: isAr ? 'التاريخ' : 'Date',
        noChanges: isAr ? 'لا يوجد سجل تغييرات' : 'No change history found',
        reason: isAr ? 'السبب' : 'Reason',
        rejectionReason: isAr ? 'سبب الرفض' : 'Rejection Reason',
    };

    const projectOptions = [
        { value: 'all', label: t.allProjects },
        ...projects.map(p => ({ value: p.id, label: `${p.name} (${p.projectCode})` }))
    ];

    const milestoneOptions = [
        { value: 'all', label: t.allMilestones },
        ...Array.from(new Set(
            history
                .filter(h => selectedProjectId === 'all' || h.projectId === selectedProjectId)
                .map(h => h.milestoneTitle)
        ))
        .filter(Boolean)
        .sort()
        .map(title => ({ value: title!, label: title! }))
    ];

    const filteredHistory = history.filter(item => {
        const projectMatch = selectedProjectId === 'all' || item.projectId === selectedProjectId;
        const statusMatch = statusFilter === 'all' || item.status === statusFilter;
        const milestoneMatch = selectedMilestoneTitle === 'all' || item.milestoneTitle === selectedMilestoneTitle;
        return projectMatch && statusMatch && milestoneMatch;
    });

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm items-end">
                <div className="flex-1 space-y-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1">
                        <Filter className="w-3 h-3" />
                        {t.projectFilter}
                    </label>
                    <SearchableSelect 
                        options={projectOptions} 
                        value={selectedProjectId} 
                        onChange={setSelectedProjectId} 
                        placeholder={t.allProjects} 
                        searchPlaceholder={t.searchProjects} 
                        language={language}
                    />
                </div>

                <div className="flex-1 space-y-1 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1">
                        <Calendar className="w-3 h-3" />
                        {t.milestoneFilter}
                    </label>
                    <SearchableSelect 
                        options={milestoneOptions} 
                        value={selectedMilestoneTitle} 
                        onChange={setSelectedMilestoneTitle} 
                        placeholder={t.allMilestones} 
                        searchPlaceholder={t.searchMilestones} 
                        language={language}
                    />
                </div>

                <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                        <History className="w-3 h-3" />
                        {t.statusFilter}
                    </label>
                    <div className="flex gap-2">
                        {(['all', 'approved', 'rejected', 'pending'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    statusFilter === status 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800' 
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {t[status as keyof typeof t]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-end">
                    <button 
                        onClick={loadHistory}
                        className="p-2 ml-auto text-slate-400 hover:text-amber-500 transition-colors"
                    >
                        <Clock className={`w-5 h-5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-2xl" />
                    ))
                ) : filteredHistory.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-12 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <History className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">{t.noChanges}</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <AnimatePresence mode='popLayout'>
                            {filteredHistory.map((request) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={request.id}
                                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
                                >
                                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold py-0.5 px-2 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-full">
                                                    {request.projectCode}
                                                </span>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {request.milestoneTitle}
                                                </h3>
                                                {request.milestoneAmount !== undefined && request.milestoneAmount > 0 && (
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                                                        {request.milestoneAmount.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate max-w-sm">
                                                {request.projectName}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{t.tableOldDate}</p>
                                                <p className="text-xs text-slate-500 font-medium">{formatDate(request.oldDueDate)}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-amber-500" />
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{t.tableNewDate}.</p>
                                                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{formatDate(request.newDueDate)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 ml-auto">
                                            <div className="text-right flex flex-col items-end">
                                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${
                                                    request.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    request.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {request.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                                    {request.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                    {request.status === 'pending' && <Clock className="w-3 h-3" />}
                                                    {t[request.status]}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {request.requesterName} • {formatDate(request.requestedDate)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(request.reason || request.rejectionReason) && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex flex-col gap-2">
                                            {request.reason && (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-slate-500 mr-1 italic">{t.reason}:</span>
                                                    <span className="text-slate-600 dark:text-slate-400">{request.reason}</span>
                                                </div>
                                            )}
                                            {request.status === 'rejected' && request.rejectionReason && (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-red-500 mr-1 italic">{t.rejectionReason}:</span>
                                                    <span className="text-red-600 dark:text-red-400">{request.rejectionReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MilestoneHistory;
