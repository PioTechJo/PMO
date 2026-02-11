
import React, { useState, useMemo } from 'react';
import { Milestone, Project, Lookup, MilestoneStatus, Language, PaymentStatus } from '../types';
import SearchableSelect from './SearchableSelect';

interface AddMilestoneModalProps {
  teams: Lookup[];
  projects: Project[];
  onClose: () => void;
  onAddMilestone: (newMilestones: Omit<Milestone, 'id'>[]) => Promise<void>;
  language: Language;
}

const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({ teams, projects, onClose, onAddMilestone, language }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [milestonesList, setMilestonesList] = useState<Omit<Milestone, 'id'>[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentMilestone, setCurrentMilestone] = useState({
      title: '', 
      description: '', 
      teamId: '', 
      dueDate: '',
      status: MilestoneStatus.Pending, 
      hasPayment: true, 
      paymentAmount: 0, 
      paymentStatus: PaymentStatus.Pending,
  });

  const t = translations[language];
  const projectOptions = useMemo(() => projects.map(p => ({ value: p.id, label: p.name })), [projects]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setCurrentMilestone(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setCurrentMilestone(prev => ({ ...prev, [name]: value }));
    }
  };

  const addMilestoneToList = () => {
    if (!selectedProjectId) { setError(t.noProjectSelected); return; }
    if (!currentMilestone.title || !currentMilestone.teamId) { setError(t.validationErrorFields); return; }
    
    const newItem: Omit<Milestone, 'id'> = {
      ...currentMilestone,
      projectId: selectedProjectId,
      dueDate: currentMilestone.dueDate ? new Date(currentMilestone.dueDate).toISOString() : null,
      paymentAmount: currentMilestone.hasPayment ? Number(currentMilestone.paymentAmount) : 0,
      paymentStatus: currentMilestone.hasPayment ? currentMilestone.paymentStatus : null,
    };
    
    setMilestonesList(prev => [...prev, newItem]);
    // Reset but keep project & common settings
    setCurrentMilestone({ 
        title: '', 
        description: '', 
        teamId: currentMilestone.teamId, 
        dueDate: '', 
        status: MilestoneStatus.Pending, 
        hasPayment: true, 
        paymentAmount: 0, 
        paymentStatus: PaymentStatus.Pending 
    });
    setError(null);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (milestonesList.length === 0) { setError(t.noItems); return; }
    try {
        setIsSaving(true);
        setError(null);
        await onAddMilestone(milestonesList);
        setIsSuccess(true);
        setIsSaving(false);
        // Delay closing so user sees the success message
        setTimeout(() => {
            onClose();
        }, 1500);
    } catch (err: any) {
        console.error("Save failed:", err);
        setError(err?.message || "Critical: Save failed. Database connection error.");
        setIsSaving(false);
    }
  };

  const inputClasses = "w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-violet-500 transition-all";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-3xl">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h2>
            <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {error && (
                <div className="p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}
            
            {isSuccess && (
                <div className="p-4 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    {t.successMsg}
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-violet-50/50 dark:bg-violet-900/10 p-5 rounded-2xl border border-violet-100 dark:border-violet-800/50">
                         <label className="block text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase mb-2 tracking-widest">{t.project}</label>
                         <SearchableSelect options={projectOptions} value={selectedProjectId} onChange={setSelectedProjectId} placeholder={t.selectHere} language={language} />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <input type="text" name="title" value={currentMilestone.title} onChange={handleInputChange} placeholder={t.milestoneTitle} className={inputClasses} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.team}</label>
                                <select name="teamId" value={currentMilestone.teamId} onChange={handleInputChange} className={inputClasses}>
                                    <option value="">{t.selectTeam}</option>
                                    {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.dueDate}</label>
                                <input type="date" name="dueDate" value={currentMilestone.dueDate} onChange={handleInputChange} className={inputClasses} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.status}</label>
                                <select name="status" value={currentMilestone.status} onChange={handleInputChange} className={inputClasses}>
                                    {Object.values(MilestoneStatus).map(s => <option key={s} value={s}>{t[s] || s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-5">
                                <input id="hasPayment" name="hasPayment" type="checkbox" checked={currentMilestone.hasPayment} onChange={handleInputChange} className="w-4 h-4 text-violet-600 rounded border-slate-300" />
                                <label htmlFor="hasPayment" className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.hasPayment}</label>
                            </div>
                        </div>

                        {currentMilestone.hasPayment && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.paymentAmount}</label>
                                    <input type="number" name="paymentAmount" value={currentMilestone.paymentAmount} onChange={handleInputChange} className={inputClasses} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.paymentStatus}</label>
                                    <select name="paymentStatus" value={currentMilestone.paymentStatus} onChange={handleInputChange} className={inputClasses}>
                                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{t[s] || s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button type="button" onClick={addMilestoneToList} className="w-full py-4 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase hover:bg-black transition-all shadow-lg">+ {t.addToList}</button>
                    </div>
                </div>

                {/* Queue Section */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/20 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">{t.listTitle}</h3>
                    <div className="space-y-3 flex-grow overflow-y-auto custom-scrollbar pr-2">
                        {milestonesList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 italic">
                                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <p className="text-sm font-bold">{t.noItems}</p>
                            </div>
                        ) : milestonesList.map((m, i) => (
                            <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-right-2">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white truncate text-sm">{m.title}</p>
                                    <div className="flex gap-3 text-[9px] font-black text-slate-400 uppercase mt-1">
                                        <span>{t[m.status]}</span>
                                        {m.hasPayment && <span className="text-green-600 dark:text-green-400">${m.paymentAmount.toLocaleString()}</span>}
                                    </div>
                                </div>
                                <button onClick={() => setMilestonesList(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-3xl">
            <button onClick={onClose} disabled={isSaving} className="px-8 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.cancel}</button>
            <button onClick={handleFinalSubmit} disabled={isSaving || milestonesList.length === 0 || isSuccess} className="px-12 py-3 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-violet-500/20 transition-all">
                {isSaving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                {isSuccess ? t.successLabel : (isSaving ? t.submitting : t.saveAll)}
            </button>
        </div>
      </div>
    </div>
  );
};

const translations = {
    ar: { 
        title: "إدارة معالم المشروع", project: "المشروع المستهدف", selectHere: "اختر المشروع...", milestoneTitle: "عنوان المعلم / النشاط", 
        team: "الفريق المسؤول", selectTeam: "اختر الفريق...", dueDate: "تاريخ الاستحقاق", status: "الحالة الحالية",
        hasPayment: "مرتبط بدفعة مالية", paymentAmount: "المبلغ", paymentStatus: "حالة الدفعة",
        addToList: "إضافة للمعالجة", listTitle: "قائمة المعالم الجديدة بانتظار الحفظ", noItems: "القائمة فارغة تماماً.", 
        saveAll: "حفظ نهائي لقاعدة البيانات", cancel: "إلغاء", noProjectSelected: "يرجى اختيار مشروع أولاً.", 
        validationErrorFields: "يرجى تعبئة العنوان وتحديد الفريق.", submitting: "جاري الحفظ...",
        successMsg: "تم حفظ كافة المعالم بنجاح في قاعدة البيانات!", successLabel: "تم الحفظ",
        Pending: "معلق", "In Progress": "قيد التنفيذ", Completed: "مكتمل", Sent: "مرسلة", Paid: "مدفوعة"
    },
    en: { 
        title: "Project Milestones Mgt", project: "Target Project", selectHere: "Select project...", milestoneTitle: "Milestone / Activity Title", 
        team: "Responsible Team", selectTeam: "Select team...", dueDate: "Due Date", status: "Current Status",
        hasPayment: "Include Payment", paymentAmount: "Amount", paymentStatus: "Payment Status",
        addToList: "Add to Queue", listTitle: "Ready for Batch Save", noItems: "Queue is empty.", 
        saveAll: "Save All to Database", cancel: "Cancel", noProjectSelected: "Select a project first.", 
        validationErrorFields: "Title and Team are required.", submitting: "Saving Data...",
        successMsg: "All milestones have been saved successfully!", successLabel: "Saved",
        Pending: "Pending", "In Progress": "In Progress", Completed: "Completed", Sent: "Sent", Paid: "Paid"
    }
};

export default AddMilestoneModal;
