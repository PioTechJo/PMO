import React, { useState, useEffect, useMemo } from 'react';
import { Milestone, Project, Lookup, MilestoneStatus, Language, PaymentStatus, MilestoneUpdate, User } from '../types';

interface EditMilestoneModalProps {
  milestoneToEdit: Milestone;
  allMilestones: Milestone[];
  teams: Lookup[];
  projects: Project[];
  allMilestoneUpdates: MilestoneUpdate[];
  allUsers: User[];
  currentUser?: User;
  onClose: () => void;
  onUpdateMilestone: (milestoneId: string, updatedData: Partial<Omit<Milestone, 'id'>>) => Promise<void>;
  onAddMilestones: (newMilestones: Omit<Milestone, 'id'>[]) => Promise<void>;
  onAddUpdate: (updateData: Omit<MilestoneUpdate, 'id' | 'createdAt' | 'user'>) => Promise<void>;
  language: Language;
}

const EditMilestoneModal: React.FC<EditMilestoneModalProps> = ({ 
    milestoneToEdit, 
    allMilestones,
    teams, 
    projects, 
    allMilestoneUpdates, 
    allUsers, 
    currentUser, 
    onClose, 
    onUpdateMilestone, 
    onAddMilestones,
    onAddUpdate, 
    language 
}) => {
    // Current Form State
    const [formData, setFormData] = useState<Omit<Milestone, 'id'>>({
        title: '', 
        description: '', 
        projectId: milestoneToEdit.projectId, 
        teamId: '', 
        dueDate: '',
        status: MilestoneStatus.Pending, 
        hasPayment: true, 
        paymentAmount: 0, 
        paymentStatus: PaymentStatus.Pending,
    });
    
    // Tracking edits and additions in session
    const [editingTargetId, setEditingTargetId] = useState<string | null>(milestoneToEdit.id);
    const [modifiedExisting, setModifiedExisting] = useState<Record<string, Partial<Omit<Milestone, 'id'>>>>({});
    const [newItemsQueue, setNewItemsQueue] = useState<Omit<Milestone, 'id'>[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [newUpdateText, setNewUpdateText] = useState('');

    // Load initial or selected milestone into form
    useEffect(() => {
        const target = allMilestones.find(m => m.id === editingTargetId);
        if (target) {
            // Apply any local modifications first
            const localMod = modifiedExisting[target.id] || {};
            const merged = { ...target, ...localMod };
            
            const isValidDate = merged.dueDate && !isNaN(new Date(merged.dueDate).getTime());
            setFormData({
                title: merged.title || '',
                description: merged.description || '',
                projectId: merged.projectId || milestoneToEdit.projectId,
                teamId: merged.teamId || '',
                dueDate: isValidDate ? new Date(merged.dueDate!).toISOString().split('T')[0] : '',
                status: merged.status || MilestoneStatus.Pending,
                hasPayment: merged.hasPayment ?? false,
                paymentAmount: merged.paymentAmount || 0,
                paymentStatus: merged.paymentStatus || PaymentStatus.Pending,
            });
        }
    }, [editingTargetId, allMilestones, milestoneToEdit.projectId, modifiedExisting]);

    const translations = {
      ar: {
          title: "إدارة معالم المشروع",
          associatedProject: "المشروع النشط",
          detailSection: "تحرير المعلم المختار",
          milestoneTitle: "اسم المعلم",
          description: "الوصف",
          project: "المشروع",
          team: "الفريق المسؤول",
          dueDate: "تاريخ الاستحقاق",
          status: "الحالة",
          hasPayment: "مرتبط بدفعة",
          paymentAmount: "المبلغ",
          paymentStatus: "حالة الدفعة",
          saveAll: "حفظ كافة التغييرات",
          cancel: "إلغاء",
          applyToList: "تحديث المعلم في القائمة",
          addAsNew: "إضافة كمعلم جديد للمشروع",
          submitting: "جاري الحفظ...",
          validationError: "يرجى ملء الحقول المطلوبة (الاسم والفريق).",
          successMessage: "تم حفظ كافة التغييرات بنجاح!",
          updatesTitle: "سجل التحديثات (للمعلم الحالي)",
          noUpdates: "لا توجد تحديثات.",
          addUpdatePlaceholder: "أضف تحديثاً...",
          post: "نشر",
          existingListTitle: "معالم المشروع الحالية",
          queueTitle: "معالم جديدة (للمشروع الحالي)",
          queueEmpty: "لا يوجد",
          remove: "حذف",
          editingMode: "وضع التعديل لـ: ",
          addingMode: "إضافة معلم جديد",
          doubleClickTip: "انقر نقراً مزدوجاً على معلم لتحميله للتعديل",
          Pending: "معلق", "In Progress": "قيد التنفيذ", Completed: "مكتمل", Sent: "مرسلة", Paid: "مدفوعة",
      },
      en: {
          title: "Manage Project Milestones",
          associatedProject: "Active Project",
          detailSection: "Milestone Editor",
          milestoneTitle: "Milestone Title",
          description: "Description",
          project: "Project",
          team: "Team",
          dueDate: "Due Date",
          status: "Status",
          hasPayment: "Payment Included",
          paymentAmount: "Amount",
          paymentStatus: "Payment Status",
          saveAll: "Save All Changes",
          cancel: "Cancel",
          applyToList: "Apply Changes to Item",
          addAsNew: "Add as New to Project",
          submitting: "Saving...",
          validationError: "Fill required fields (Title, Team).",
          successMessage: "All changes saved!",
          updatesTitle: "Updates (Active Item)",
          noUpdates: "No updates.",
          addUpdatePlaceholder: "Write an update...",
          post: "Post",
          existingListTitle: "Existing Project Milestones",
          queueTitle: "New Queue",
          queueEmpty: "Empty",
          remove: "Remove",
          editingMode: "Editing: ",
          addingMode: "Adding New Milestone",
          doubleClickTip: "Double-click an item to edit it",
          Pending: "Pending", "In Progress": "In Progress", Completed: "Completed", Sent: "Sent", Paid: "Paid",
      },
  };
  const t = translations[language];

  const currentProjectName = projects.find(p => p.id === milestoneToEdit.projectId)?.name || '--';
  const projectMilestones = useMemo(() => allMilestones.filter(m => m.projectId === milestoneToEdit.projectId), [allMilestones, milestoneToEdit.projectId]);
  const activeUpdates = useMemo(() => editingTargetId ? allMilestoneUpdates.filter(u => u.milestoneId === editingTargetId) : [], [editingTargetId, allMilestoneUpdates]);
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim() || !currentUser || !editingTargetId) return;
    onAddUpdate({
        milestoneId: editingTargetId,
        userId: currentUser.id,
        updateText: newUpdateText,
    });
    setNewUpdateText('');
  };

  const applyChangesToLocal = () => {
      if (!formData.title || !formData.teamId) {
          setError(t.validationError);
          return;
      }
      const data: Partial<Omit<Milestone, 'id'>> = {
          ...formData,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
          paymentAmount: formData.hasPayment ? Number(formData.paymentAmount) : 0,
          paymentStatus: formData.hasPayment ? formData.paymentStatus : null,
      };

      if (editingTargetId) {
          setModifiedExisting(prev => ({ ...prev, [editingTargetId]: data }));
      } else {
          setNewItemsQueue(prev => [...prev, data as Omit<Milestone, 'id'>]);
          resetForm();
      }
      setError(null);
  };

  const resetForm = () => {
      setEditingTargetId(null);
      setFormData({
          title: '', description: '', projectId: milestoneToEdit.projectId, teamId: '', dueDate: '',
          status: MilestoneStatus.Pending, hasPayment: true, paymentAmount: 0, paymentStatus: PaymentStatus.Pending,
      });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
        // 1. Update modified existing ones
        for (const [id, data] of Object.entries(modifiedExisting)) {
            await onUpdateMilestone(id, data);
        }
        // 2. Add new ones
        if (newItemsQueue.length > 0) {
            await onAddMilestones(newItemsQueue);
        }
        
        setIsSuccess(true);
        setTimeout(() => onClose(), 1200);
    } catch (err: any) {
        setError(err?.message || "Error saving changes.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const inputClasses = "w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white text-sm transition-all";
  const selectClasses = "w-full p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white text-sm";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100]">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl m-4 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-8 max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t.title}</h2>
                    <p className="text-xs text-slate-500 font-black mt-2 uppercase tracking-[0.2em]">{t.associatedProject}: <span className="text-violet-600 dark:text-violet-400">{currentProjectName}</span></p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">&times;</button>
            </div>
            
            {error && <div className="p-4 mb-6 text-sm font-bold text-red-800 bg-red-100 dark:bg-red-500/20 dark:text-red-200 rounded-xl" role="alert">{error}</div>}
            {isSuccess && <div className="p-4 mb-6 text-sm font-bold text-green-800 bg-green-100 dark:bg-green-500/20 dark:text-green-200 rounded-xl" role="alert">{t.successMessage}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Side: Form & Active Mode */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-violet-600"></div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                                {editingTargetId ? `${t.editingMode} ${formData.title}` : t.addingMode}
                            </h3>
                            {editingTargetId && (
                                <button onClick={resetForm} className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400 hover:bg-violet-600 hover:text-white transition-colors uppercase">
                                    {t.addingMode}
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder={t.milestoneTitle} className={inputClasses} required/>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder={t.description} rows={3} className={inputClasses}/>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.team}</label>
                                    <select name="teamId" value={formData.teamId} onChange={handleInputChange} className={selectClasses} required>
                                        <option value="" disabled>{t.team}</option>
                                        {teams.map(tm => (<option key={tm.id} value={tm.id}>{tm.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{t.dueDate}</label>
                                    <input type="date" name="dueDate" value={formData.dueDate} onChange={handleInputChange} className={inputClasses} />
                                </div>
                            </div>

                            <div className="p-4 bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-inner">
                                <div className="flex items-center justify-between">
                                    <div className="w-1/2 pe-2">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.status}</label>
                                        <select name="status" value={formData.status} onChange={handleInputChange} className={selectClasses}>
                                            {Object.values(MilestoneStatus).map(s => (<option key={s} value={s}>{t[s] || s}</option>))}
                                        </select>
                                    </div>
                                    <div className="w-1/2 flex items-center gap-2 pt-4">
                                        <input id="pay_sw" name="hasPayment" type="checkbox" checked={formData.hasPayment} onChange={handleInputChange} className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-800" />
                                        <label htmlFor="pay_sw" className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.hasPayment}</label>
                                    </div>
                                </div>
                                {formData.hasPayment && (
                                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1">
                                        <input type="number" name="paymentAmount" value={formData.paymentAmount} onChange={handleInputChange} className={inputClasses} placeholder="0.00" />
                                        <select name="paymentStatus" value={formData.paymentStatus || ''} onChange={handleInputChange} className={selectClasses}>
                                            {Object.values(PaymentStatus).map(s => (<option key={s} value={s}>{t[s] || s}</option>))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button type="button" onClick={applyChangesToLocal} className="w-full py-4 bg-violet-600 text-white text-xs font-black rounded-2xl hover:bg-violet-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-violet-500/20 uppercase tracking-widest">
                                {editingTargetId ? t.applyToList : t.addAsNew}
                            </button>
                        </div>
                    </div>
                    
                    {/* Active Milestone Updates */}
                    {editingTargetId && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest px-1">{t.updatesTitle}</h3>
                            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2 rtl:pl-2">
                                {activeUpdates.length > 0 ? activeUpdates.map(up => {
                                    const u = getUserById(up.userId);
                                    return (
                                        <div key={up.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{u?.name}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(up.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400">{up.updateText}</p>
                                        </div>
                                    )
                                }) : <p className="text-center text-[10px] text-slate-400 font-bold py-4">{t.noUpdates}</p>}
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={newUpdateText} onChange={e => setNewUpdateText(e.target.value)} placeholder={t.addUpdatePlaceholder} className={inputClasses} />
                                <button onClick={handleAddUpdate} className="px-6 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700">{t.post}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Existing + New Lists */}
                <div className="lg:col-span-7 space-y-10 border-l dark:border-slate-800 px-6 rtl:border-l-0 rtl:border-r">
                    
                    {/* Existing Milestones List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.1em]">{t.existingListTitle}</h3>
                            <span className="text-[10px] text-slate-400 italic font-bold">{t.doubleClickTip}</span>
                        </div>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-2 rtl:pl-2">
                            {projectMilestones.map(item => {
                                const isDirty = !!modifiedExisting[item.id];
                                const currentData = isDirty ? modifiedExisting[item.id] : item;
                                const isActive = editingTargetId === item.id;
                                
                                return (
                                    <div 
                                        key={item.id} 
                                        onDoubleClick={() => setEditingTargetId(item.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group flex justify-between items-center ${isActive ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/10 dark:border-violet-700' : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-violet-300'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isActive ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    {isActive ? 'ACTIVE' : 'ID: ' + item.id.substring(0,4)}
                                                </span>
                                                <h4 className="font-bold text-slate-800 dark:text-white truncate">{currentData.title}</h4>
                                                {isDirty && <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 text-[8px] font-black px-1.5 py-0.5 rounded-full">MODIFIED</span>}
                                            </div>
                                            <div className="flex gap-4 text-[10px] font-bold text-slate-400">
                                                <span>{teams.find(tm => tm.id === currentData.teamId)?.name}</span>
                                                <span>{currentData.dueDate ? new Date(currentData.dueDate).toLocaleDateString() : '--'}</span>
                                                <span className="text-violet-500">{t[currentData.status!]}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {currentData.hasPayment && <p className="text-xs font-black text-green-600 dark:text-green-400">${currentData.paymentAmount?.toLocaleString()}</p>}
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{t[currentData.paymentStatus || 'Pending']}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* New Queue List */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.1em]">{t.queueTitle}</h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 rtl:pl-2">
                            {newItemsQueue.length > 0 ? newItemsQueue.map((item, qIdx) => (
                                <div key={qIdx} className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl flex justify-between items-center animate-in slide-in-from-right-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{item.title}</p>
                                        <p className="text-[10px] font-bold text-indigo-400">{teams.find(tm => tm.id === item.teamId)?.name}</p>
                                    </div>
                                    <button onClick={() => setNewItemsQueue(prev => prev.filter((_, i) => i !== qIdx))} className="p-2 text-indigo-300 hover:text-red-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            )) : <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-8 border-2 border-dashed dark:border-slate-800 rounded-3xl">{t.queueEmpty}</p>}
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="lg:col-span-12 flex justify-end gap-4 pt-8 border-t border-slate-200 dark:border-slate-800 mt-10">
                    <button type="button" onClick={onClose} className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 rounded-2xl transition-all uppercase tracking-widest">{t.cancel}</button>
                    <button type="submit" onClick={handleFinalSubmit} disabled={isSubmitting || isSuccess} className="px-12 py-4 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl hover:opacity-90 shadow-2xl shadow-violet-500/30 transition-all disabled:opacity-50 uppercase tracking-widest">
                        {isSubmitting ? t.submitting : t.saveAll}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditMilestoneModal;