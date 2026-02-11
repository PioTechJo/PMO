
import React from 'react';
import { Project, Milestone, Language, PaymentStatus } from '../types';

type ProjectWithMilestones = Project & { milestones: Milestone[] };

interface ProjectDetailModalProps {
    projectWithMilestones: ProjectWithMilestones;
    onClose: () => void;
    language: Language;
}

const statusColors: { [key: string]: string } = {
    'نشط': 'bg-green-500/10 text-green-600 dark:text-green-400',
    'Active': 'bg-green-500/10 text-green-600 dark:text-green-400',
    'متوقف': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    'On Hold': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    'مكتمل': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'Completed': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'ملغي': 'bg-red-500/10 text-red-600 dark:text-red-400',
    'Cancelled': 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const paymentStatusColors: { [key in PaymentStatus]: string } = {
    [PaymentStatus.Paid]: 'bg-green-500/10 text-green-700 dark:text-green-300',
    [PaymentStatus.Sent]: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    [PaymentStatus.Pending]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
};

const InfoItem: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({ label, value, children }) => (
    <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">
            {children || value || '--'}
        </div>
    </div>
);

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ projectWithMilestones, onClose, language }) => {
    const { milestones, ...project } = projectWithMilestones;
    const t = translations[language];

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    };

    // Final Requested Formula: Score = (Impacts Sum) - Resource Load
    const impactsSum = (project.revenueImpact || 1) + (project.strategicValue || 1) + (project.deliveryRisk || 1) + (project.customerPressure || 1);
    const resourceLoad = (project.resourceLoad || 1);
    const priorityScore = impactsSum - resourceLoad;

    const getScoreColor = (score: number) => {
        if (score >= 12) return 'text-green-600 dark:text-green-400';
        if (score >= 7) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-4xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{project.name}</h2>
                                <p className="text-sm font-mono text-violet-500 dark:text-violet-400">{project.projectCode}</p>
                            </div>
                            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-center border border-slate-200 dark:border-slate-700 group relative">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{t.priorityScore}</p>
                                <p className={`text-xl font-black ${getScoreColor(priorityScore)}`}>{priorityScore}</p>
                                {/* Tooltip for formula explanation */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                    {t.formulaTip}: ({impactsSum} {t.impacts}) - ({resourceLoad} {t.load}) = {priorityScore}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Project Overview */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className={`px-3 py-1 rounded-full font-semibold text-sm ${project.status?.name ? statusColors[project.status.name] : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                                    {project.status?.name || t.noStatus}
                                </span>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t.progress}</span>
                                    <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{project.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-2.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">{project.description}</p>
                        </div>

                        {/* Weights Display */}
                        <div className="p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/50 rounded-xl">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">{t.weights}</h3>
                                <span className="text-[10px] text-slate-400 italic">{t.scaleNote}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <InfoItem label={t.revenueImpact} value={String(project.revenueImpact || 1)} />
                                <InfoItem label={t.strategicValue} value={String(project.strategicValue || 1)} />
                                <InfoItem label={t.deliveryRisk} value={String(project.deliveryRisk || 1)} />
                                <InfoItem label={t.customerPressure} value={String(project.customerPressure || 1)} />
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-800/30">
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mb-0.5">{t.resourceLoad}</p>
                                    <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{project.resourceLoad || 1}</p>
                                </div>
                            </div>
                        </div>

                        {/* Key Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <InfoItem label={t.customer} value={project.customer?.name} />
                            <InfoItem label={t.manager}>
                                {project.projectManager && (
                                    <div className="flex items-center gap-2">
                                        <img src={project.projectManager.avatarUrl || `https://ui-avatars.com/api/?name=${project.projectManager.name}&background=c4b5fd&color=2e1065`} alt={project.projectManager.name} className="w-6 h-6 rounded-full" />
                                        <span>{project.projectManager.name}</span>
                                    </div>
                                )}
                            </InfoItem>
                            <InfoItem label={t.category} value={project.category?.name} />
                            <InfoItem label={t.country} value={project.country?.name} />
                            <InfoItem label={t.launchDate} value={formatDate(project.launchDate)} />
                            <InfoItem label={t.actualStartDate} value={formatDate(project.actualStartDate)} />
                            <InfoItem label={t.expectedClosureDate} value={formatDate(project.expectedClosureDate)} />
                            <InfoItem label={t.team} value={project.team?.name} />
                        </div>

                        {/* Milestones List */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">{t.milestones} ({milestones.length})</h3>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-64 overflow-y-auto">
                                <table className="w-full text-sm text-left rtl:text-right">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300">{t.milestoneTitle}</th>
                                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.status}</th>
                                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.dueDate}</th>
                                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center">{t.payment}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {milestones.length > 0 ? milestones.map(milestone => (
                                            <tr key={milestone.id}>
                                                <td className="p-3 font-medium text-slate-700 dark:text-slate-200">{milestone.title}</td>
                                                <td className="p-3 text-center">{milestone.status}</td>
                                                <td className="p-3 text-center">{formatDate(milestone.dueDate)}</td>
                                                <td className="p-3 text-center">
                                                    {milestone.hasPayment ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusColors[milestone.paymentStatus || PaymentStatus.Pending]}`}>
                                                                {t[milestone.paymentStatus || PaymentStatus.Pending]}
                                                            </span>
                                                            <span className="font-mono font-bold text-green-600 dark:text-green-400 text-xs">
                                                                {milestone.paymentAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'USD' })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span>--</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-500">{t.noMilestones}</td></tr>
                                        )}
                                    </tbody>
                                </table>
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
        progress: "التقدم",
        milestones: "المعالم",
        customer: "العميل",
        manager: "مدير المشروع",
        category: "الفئة",
        country: "الدولة",
        launchDate: "تاريخ الإطلاق",
        actualStartDate: "البدء الفعلي",
        expectedClosureDate: "الإغلاق المتوقع",
        team: "الفريق",
        milestoneTitle: "عنوان المعلم",
        status: "الحالة",
        dueDate: "تاريخ الاستحقاق",
        payment: "الدفعة",
        noStatus: "لا توجد حالة",
        noMilestones: "لا توجد معالم لهذا المشروع.",
        Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة",
        weights: "أوزان التقييم",
        revenueImpact: "تأثير الإيرادات",
        strategicValue: "القيمة الاستراتيجية",
        deliveryRisk: "مخاطر التسليم",
        customerPressure: "ضغط العميل",
        resourceLoad: "حمل الموارد",
        priorityScore: "نقاط الأولوية",
        formulaTip: "المعادلة",
        impacts: "نقاط التأثير",
        load: "حمل الموارد",
        scaleNote: "(1: الأقل، 5: الأعلى)",
    },
    en: {
        progress: "Progress",
        milestones: "Milestones",
        customer: "Customer",
        manager: "Project Manager",
        category: "Category",
        country: "Country",
        launchDate: "Launch Date",
        actualStartDate: "Actual Start",
        expectedClosureDate: "Expected Closure",
        team: "Team",
        milestoneTitle: "Milestone Title",
        status: "Status",
        dueDate: "Due Date",
        payment: "Payment",
        noStatus: "No Status",
        noMilestones: "No milestones for this project.",
        Pending: "Pending", Sent: "Sent", Paid: "Paid",
        weights: "Project Weights",
        revenueImpact: "Revenue Impact",
        strategicValue: "Strategic Value",
        deliveryRisk: "Delivery Risk",
        customerPressure: "Customer Pressure",
        resourceLoad: "Resource Load",
        priorityScore: "Priority Score",
        formulaTip: "Formula",
        impacts: "Impact pts",
        load: "Resource Load",
        scaleNote: "(1: Low, 5: High)",
    },
};


export default ProjectDetailModal;
