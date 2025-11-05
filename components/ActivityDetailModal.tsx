import React, { useState, useMemo } from 'react';
import { Activity, Project, Lookup, Language, PaymentStatus, ActivityStatus, ActivityUpdate, User, Lookups } from '../types';

interface ActivityDetailModalProps {
    activity: Activity;
    projects: Project[];
    allActivityUpdates: ActivityUpdate[];
    allUsers: User[];
    lookups: Lookups;
    onClose: () => void;
    language: Language;
}

const InfoItem: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
            {children || value || '--'}
        </div>
    </div>
);

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ activity, projects, allActivityUpdates, allUsers, lookups, onClose, language }) => {
    const t = translations[language];
    const project = projects.find(p => p.id === activity.projectId);
    const team = lookups.teams.find(t => t.id === activity.teamId);
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const statusColors: { [key in ActivityStatus]: string } = {
        [ActivityStatus.Completed]: 'bg-green-500/10 text-green-600 dark:text-green-400',
        [ActivityStatus.InProgress]: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        [ActivityStatus.Pending]: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    };
    
    const paymentStatusColors: { [key in PaymentStatus]: string } = {
        [PaymentStatus.Paid]: 'bg-green-500/10 text-green-700 dark:text-green-300',
        [PaymentStatus.Sent]: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
        [PaymentStatus.Pending]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    };

    const getUserById = (id: string) => allUsers.find(u => u.id === id);

    const filteredUpdates = useMemo(() => {
        return allActivityUpdates
            .filter(update => {
                if (update.activityId !== activity.id) return false;
                const updateDate = new Date(update.createdAt);
                if (startDate && updateDate < new Date(startDate)) return false;
                if (endDate) {
                    const endOfDay = new Date(endDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (updateDate > endOfDay) return false;
                }
                return true;
            });
    }, [startDate, endDate, allActivityUpdates, activity.id]);
    
    const handleExport = () => {
        const printContent = `
            <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
            <head>
                <title>${t.activityReport}: ${activity.title}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    h1, h2 { color: #1e1b4b; border-bottom: 2px solid #c4b5fd; padding-bottom: 5px; }
                    .details { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .details-grid { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; }
                    .details-grid dt { font-weight: bold; color: #4c1d95; }
                    .update { border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
                    .update:last-child { border-bottom: none; }
                    .update-header { font-size: 0.9em; color: #64748b; }
                    .update-user { font-weight: bold; }
                    .update-text { margin-top: 5px; }
                </style>
            </head>
            <body>
                <h1>${t.activityReport}: ${activity.title}</h1>
                <div class="details">
                    <h2>${t.details}</h2>
                    <dl class="details-grid">
                        <dt>${t.project}</dt><dd>${project?.name || t.unassigned}</dd>
                        <dt>${t.status}</dt><dd>${activity.status}</dd>
                        <dt>${t.dueDate}</dt><dd>${formatDate(activity.dueDate)}</dd>
                        <dt>${t.team}</dt><dd>${team?.name || t.unassigned}</dd>
                    </dl>
                </div>
                <h2>${t.updatesTitle} (${filteredUpdates.length})</h2>
                ${filteredUpdates.map(update => `
                    <div class="update">
                        <p class="update-header">
                            <span class="update-user">${getUserById(update.userId)?.name || 'Unknown User'}</span> &mdash; 
                            <span>${new Date(update.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        </p>
                        <p class="update-text">${update.updateText.replace(/\n/g, '<br>')}</p>
                    </div>
                `).join('')}
                ${filteredUpdates.length === 0 ? `<p>${t.noUpdates}</p>` : ''}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    const handleExportExcel = () => {
        if (filteredUpdates.length === 0) return;
        const t_csv = csvTranslations[language];
        const headers = [t_csv.userName, t_csv.date, t_csv.update];
        
        const escapeCsvCell = (cell: any): string => {
            const cellStr = String(cell === null || cell === undefined ? '' : cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        };

        const rows = filteredUpdates.map(update => {
            const user = getUserById(update.userId);
            return [
                user?.name || 'Unknown User',
                new Date(update.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
                update.updateText
            ];
        });

        const csvContent = [
            headers.map(escapeCsvCell).join(','),
            ...rows.map(row => row.map(escapeCsvCell).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const safeFilename = activity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute('href', url);
        link.setAttribute('download', `${safeFilename}_updates.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-3xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <div>
                            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{t.inProject}: {project?.name}</p>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{activity.title}</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">{activity.description || t.noDescription}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InfoItem label={t.status}>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[activity.status]}`}>{activity.status}</span>
                            </InfoItem>
                            <InfoItem label={t.team} value={team?.name} />
                            <InfoItem label={t.dueDate} value={formatDate(activity.dueDate)} />
                            <InfoItem label={t.payment}>
                                {activity.hasPayment ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusColors[activity.paymentStatus || PaymentStatus.Pending]}`}>
                                            {t[activity.paymentStatus || PaymentStatus.Pending]}
                                        </span>
                                        <span className="font-mono font-bold text-green-600 dark:text-green-400 text-xs">
                                            {activity.paymentAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                        </span>
                                    </div>
                                ) : (<span>--</span>)}
                            </InfoItem>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{t.updatesTitle}</h3>
                            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                <div className="flex-grow flex items-center gap-2">
                                    <label htmlFor="startDate" className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.from}</label>
                                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 bg-white dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-600 text-sm w-full sm:w-auto"/>
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <label htmlFor="endDate" className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.to}</label>
                                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 bg-white dark:bg-slate-900/50 rounded-md border border-slate-300 dark:border-slate-600 text-sm w-full sm:w-auto"/>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={handleExport} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-500/20 rounded-md hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v3a2 2 0 002 2h10a2 2 0 002-2v-3h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                                        <span>{t.exportPdf}</span>
                                    </button>
                                     <button onClick={handleExportExcel} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-500/20 rounded-md hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clipRule="evenodd" />
                                        </svg>
                                        <span>{t.exportExcel}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 rtl:pl-2">
                                {filteredUpdates.length > 0 ? filteredUpdates.map(update => {
                                    const user = getUserById(update.userId);
                                    return (
                                        <div key={update.id} className="flex items-start gap-3">
                                            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || '?'}&background=a78bfa&color=f5f3ff`} alt={user?.name || 'User'} className="w-8 h-8 rounded-full mt-1 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{user?.name}</span>
                                                    <span className="mx-1">&middot;</span>
                                                    <span>{new Date(update.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                </p>
                                                <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{update.updateText}</p>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-6">{t.noUpdates}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const translations = {
    ar: {
        inProject: "في مشروع", noDescription: "لا يوجد وصف.", status: "الحالة", team: "الفريق", dueDate: "تاريخ الاستحقاق", payment: "الدفعة", updatesTitle: "تحديثات النشاط", noUpdates: "لا توجد تحديثات في هذه الفترة.", unassigned: "غير معين",
        from: "من", to: "إلى", exportPdf: "تصدير PDF", exportExcel: "تصدير Excel", activityReport: "تقرير النشاط", details: "التفاصيل", project: "المشروع",
        Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة",
    },
    en: {
        inProject: "In project", noDescription: "No description provided.", status: "Status", team: "Team", dueDate: "Due Date", payment: "Payment", updatesTitle: "Activity Updates", noUpdates: "No updates found for this period.", unassigned: "Unassigned",
        from: "From", to: "To", exportPdf: "Export to PDF", exportExcel: "Export to Excel", activityReport: "Activity Report", details: "Details", project: "Project",
        Pending: "Pending", Sent: "Sent", Paid: "Paid",
    },
};

const csvTranslations = {
    ar: {
        userName: "المستخدم",
        date: "التاريخ",
        update: "التحديث",
    },
    en: {
        userName: "User",
        date: "Date",
        update: "Update",
    },
};

export default ActivityDetailModal;