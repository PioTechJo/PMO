
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
        setTimeout(() => onClose(), 1200);
    } catch (err: any) {
        setError(err?.message || "Save failed.");
        setIsSaving(false);
    }
  };

  const inputClasses = "w-full p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500 transition-all";
  const labelClasses = "block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[85vh]">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{t.title}</h2>
            <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors">&times;</button>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Form Section */}
            <div className="flex-1 p-5 border-e border-slate-100 dark:border-slate-800 overflow-y-auto custom-scrollbar space-y-4">
                {error && <div className="p-2 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg">{error}</div>}
                {isSuccess && <div className="p-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-lg">{t.successMsg}</div>}

                <div className="space-y-4">
                    <div className="p-3 bg-violet-50/50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-800/50">
                         <label className={labelClasses + " text-violet-600"}>{t.project}</label>
                         <SearchableSelect options={projectOptions} value={selectedProjectId} onChange={setSelectedProjectId} placeholder={t.selectHere} language={language} />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className={labelClasses}>{t.milestoneTitle}</label>
                            <input type="text" name="title" value={currentMilestone.title} onChange={handleInputChange} placeholder={t.milestoneTitle} className={inputClasses} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClasses}>{t.team}</label>
                                <select name="teamId" value={currentMilestone.teamId} onChange={handleInputChange} className={inputClasses}>
                                    <option value="">{t.selectTeam}</option>
                                    {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>{t.dueDate}</label>
                                <input type="date" name="dueDate" value={currentMilestone.dueDate} onChange={handleInputChange} className={inputClasses} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 items-center">
                            <div>
                                <label className={labelClasses}>{t.status}</label>
                                <select name="status" value={currentMilestone.status} onChange={handleInputChange} className={inputClasses}>
                                    {Object.values(MilestoneStatus).map(s => <option key={s} value={s}>{t[s] || s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-3">
                                <input id="hasPayment" name="hasPayment" type="checkbox" checked={currentMilestone.hasPayment} onChange={handleInputChange} className="w-3.5 h-3.5 text-violet-600 rounded border-slate-300" />
                                <label htmlFor="hasPayment" className="text-[10px] font-black text-slate-500 uppercase">{t.hasPayment}</label>
                            </div>
                        </div>

                        {currentMilestone.hasPayment && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1">
                                <div>
                                    <label className={labelClasses}>{t.paymentAmount}</label>
                                    <input type="number" name="paymentAmount" value={currentMilestone.paymentAmount} onChange={handleInputChange} className={inputClasses} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.paymentStatus}</label>
                                    <select name="paymentStatus" value={currentMilestone.paymentStatus} onChange={handleInputChange} className={inputClasses}>
                                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{t[s] || s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button type="button" onClick={addMilestoneToList} className="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">+ {t.addToList}</button>
                    </div>
                </div>
            </div>

            {/* Queue Section */}
            <div className="w-full md:w-[350px] bg-slate-50 dark:bg-slate-900/40 p-5 flex flex-col overflow-hidden">
                <h3 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">{t.listTitle}</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {milestonesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-20 italic">
                            <p className="text-[10px] font-black uppercase tracking-widest">{t.noItems}</p>
                        </div>
                    ) : milestonesList.map((m, i) => (
                        <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-right-1">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white truncate text-[11px]">{m.title}</p>
                                <div className="flex gap-2 text-[8px] font-black text-slate-400 uppercase mt-0.5">
                                    <span className="text-violet-500">{t[m.status]}</span>
                                    {m.hasPayment && <span className="text-emerald-500">${m.paymentAmount.toLocaleString()}</span>}
                                </div>
                            </div>
                            <button onClick={() => setMilestonesList(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
            <button onClick={onClose} disabled={isSaving} className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.cancel}</button>
            <button onClick={handleFinalSubmit} disabled={isSaving || milestonesList.length === 0 || isSuccess} className="px-8 py-2 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-500/10 transition-all">
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
        title: "معالم المشروع", project: "المشروع", selectHere: "اختر المشروع...", milestoneTitle: "اسم المعلم", 
        team: "الفريق", selectTeam: "اختر الفريق...", dueDate: "التاريخ", status: "الحالة",
        hasPayment: "يوجد دفعة", paymentAmount: "المبلغ", paymentStatus: "الحالة",
        addToList: "إضافة للقائمة", listTitle: "قائمة الحفظ", noItems: "فارغة", 
        saveAll: "حفظ الكل", cancel: "إلغاء", noProjectSelected: "اختر مشروعاً.", 
        validationErrorFields: "الاسم والفريق مطلوبان.", submitting: "حفظ...",
        successMsg: "تم الحفظ!", successLabel: "تم",
        Pending: "معلق", "In Progress": "قيد التنفيذ", Completed: "مكتمل", Sent: "مرسلة", Paid: "مدفوعة"
    },
    en: { 
        title: "Milestones Mgt", project: "Project", selectHere: "Select...", milestoneTitle: "Title", 
        team: "Team", selectTeam: "Select...", dueDate: "Date", status: "Status",
        hasPayment: "Payment", paymentAmount: "Amount", paymentStatus: "Status",
        addToList: "Add to Queue", listTitle: "Batch Queue", noItems: "Empty", 
        saveAll: "Save Batch", cancel: "Cancel", noProjectSelected: "Select project.", 
        validationErrorFields: "Required fields missing.", submitting: "Saving...",
        successMsg: "Saved successfully!", successLabel: "Done",
        Pending: "Pending", "In Progress": "In Progress", Completed: "Completed", Sent: "Sent", Paid: "Paid"
    }
};

export default AddMilestoneModal;
