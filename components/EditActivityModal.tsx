

import React, { useState, useEffect } from 'react';
import { Activity, Project, Lookup, ActivityStatus, Language, PaymentStatus, ActivityUpdate, User } from '../types';

interface EditActivityModalProps {
  activityToEdit: Activity;
  teams: Lookup[];
  projects: Project[];
  allActivityUpdates: ActivityUpdate[];
  allUsers: User[];
  currentUser?: User;
  onClose: () => void;
  onUpdateActivity: (activityId: string, updatedData: Partial<Omit<Activity, 'id'>>) => Promise<void>;
  onAddUpdate: (updateData: Omit<ActivityUpdate, 'id' | 'createdAt' | 'user'>) => Promise<void>;
  language: Language;
}

const EditActivityModal: React.FC<EditActivityModalProps> = ({ activityToEdit, teams, projects, allActivityUpdates, allUsers, currentUser, onClose, onUpdateActivity, onAddUpdate, language }) => {
    const [formData, setFormData] = useState<Omit<Activity, 'id'>>({
        title: '', description: '', projectId: '', teamId: '', dueDate: '',
        status: ActivityStatus.Pending, hasPayment: false, paymentAmount: 0, paymentStatus: PaymentStatus.Pending,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [newUpdateText, setNewUpdateText] = useState('');

    useEffect(() => {
        if (activityToEdit) {
            const isValidDate = activityToEdit.dueDate && !isNaN(new Date(activityToEdit.dueDate).getTime());
            setFormData({
                title: activityToEdit.title,
                description: activityToEdit.description,
                projectId: activityToEdit.projectId || '',
                teamId: activityToEdit.teamId || '',
                dueDate: isValidDate ? new Date(activityToEdit.dueDate).toISOString().split('T')[0] : '',
                status: activityToEdit.status,
                hasPayment: activityToEdit.hasPayment,
                paymentAmount: activityToEdit.paymentAmount,
                paymentStatus: activityToEdit.paymentStatus || PaymentStatus.Pending,
            });
        }
    }, [activityToEdit, projects, teams]);

    const translations = {
      ar: {
          title: "تعديل النشاط", activityTitle: "اسم النشاط", description: "الوصف", project: "المشروع", team: "الفريق المسؤول", dueDate: "تاريخ الاستحقاق", status: "الحالة", hasPayment: "عليه دفعة", paymentAmount: "مبلغ الدفعة", paymentStatus: "حالة الدفع", update: "تحديث النشاط", cancel: "إلغاء", Pending: "معلقة", Sent: "مرسلة", Paid: "مدفوعة", submitting: "جاري التحديث...", validationError: "يرجى ملء جميع الحقول المطلوبة.", successMessage: "تم التحديث بنجاح!",
          updatesTitle: "سجل التحديثات", noUpdates: "لا توجد تحديثات لهذا النشاط بعد.", addUpdatePlaceholder: "أضف تحديثًا...", post: "نشر",
          selectHere: "اختر من هنا...",
      },
      en: {
          title: "Edit Activity", activityTitle: "Activity Title", description: "Description", project: "Project", team: "Assigned Team", dueDate: "Due Date", status: "Status", hasPayment: "Has Payment", paymentAmount: "Payment Amount", paymentStatus: "Payment Status", update: "Update Activity", cancel: "Cancel", Pending: "Pending", Sent: "Sent", Paid: "Paid", submitting: "Updating...", validationError: "Please fill all required fields.", successMessage: "Updated successfully!",
          updatesTitle: "Activity Updates", noUpdates: "No updates for this activity yet.", addUpdatePlaceholder: "Add an update...", post: "Post",
          selectHere: "Select from here...",
      },
  };
  const t = translations[language];

  const activityUpdates = allActivityUpdates.filter(u => u.activityId === activityToEdit.id);
  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === 'checkbox') {
          setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      } else {
          setFormData(prev => ({ ...prev, [name]: value }));
      }
  };
  
  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim() || !currentUser) return;
    onAddUpdate({
        activityId: activityToEdit.id,
        userId: currentUser.id,
        updateText: newUpdateText,
    });
    setNewUpdateText('');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    if (!formData.title || !formData.projectId || !formData.teamId) {
        setError(t.validationError);
        return;
    }

    setIsSubmitting(true);
    const updatedData: Partial<Omit<Activity, 'id'>> = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      paymentAmount: formData.hasPayment ? formData.paymentAmount : 0,
      paymentStatus: formData.hasPayment ? formData.paymentStatus : null,
    };
    
    try {
        await onUpdateActivity(activityToEdit.id, updatedData);
        setIsSuccess(true);
        setTimeout(() => onClose(), 1000);
    } catch (err: any) {
        setError(err?.message || "An unknown error occurred.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white";
  const selectClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-lg m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.activityTitle}</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required className={inputClasses}/>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.description}</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={inputClasses}/>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.project}</label>
                      <select name="projectId" value={formData.projectId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.team}</label>
                      <select name="teamId" value={formData.teamId || ''} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {teams.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}
                      </select>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.dueDate}</label>
                  <input type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} className={inputClasses} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.status}</label>
                    <select name="status" value={formData.status} onChange={handleChange} required className={selectClasses}>
                        {Object.values(ActivityStatus).sort().map(s => (<option key={s} value={s}>{s}</option>))}
                    </select>
                </div>
              </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center pt-5">
                      <input id="hasPayment" name="hasPayment" type="checkbox" checked={formData.hasPayment} onChange={handleChange} className="w-4 h-4 text-violet-600 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-violet-500" />
                      <label htmlFor="hasPayment" className="ms-2 text-sm font-medium text-slate-600 dark:text-slate-300">{t.hasPayment}</label>
                    </div>
                   {formData.hasPayment && (
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.paymentAmount}</label>
                            <input type="number" name="paymentAmount" value={formData.paymentAmount} onChange={(e) => setFormData(p => ({...p, paymentAmount: parseFloat(e.target.value) || 0}))} className={inputClasses} min="0" />
                        </div>
                    )}
               </div>

                {formData.hasPayment && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.paymentStatus}</label>
                        <select name="paymentStatus" value={formData.paymentStatus || ''} onChange={handleChange} required className={selectClasses}>
                            {Object.values(PaymentStatus)
                                .map(s => ({ value: s, label: t[s as keyof typeof t] || s }))
                                .sort((a, b) => a.label.localeCompare(b.label))
                                .map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                        </select>
                    </div>
                )}
                
                {/* Updates Section */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-3">{t.updatesTitle}</h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2 rtl:pl-2 mb-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                        {activityUpdates.length > 0 ? activityUpdates.map(update => {
                            const user = getUserById(update.userId);
                            return (
                                <div key={update.id} className="flex items-start gap-3">
                                    <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name || '?'}&background=a78bfa&color=f5f3ff`} alt={user?.name || 'User'} className="w-7 h-7 rounded-full mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{user?.name}</span>
                                            <span className="mx-1">&middot;</span>
                                            <span>{new Date(update.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                                        </p>
                                        <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{update.updateText}</p>
                                    </div>
                                </div>
                            )
                        }) : (
                             <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">{t.noUpdates}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.name || '?'}&background=8b5cf6&color=f5f3ff`} alt={currentUser?.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                        <input
                            type="text"
                            value={newUpdateText}
                            onChange={(e) => setNewUpdateText(e.target.value)}
                            placeholder={t.addUpdatePlaceholder}
                            className="flex-grow w-full p-2 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                        />
                        <button type="button" onClick={handleAddUpdate} className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">{t.post}</button>
                    </div>
                </div>

              <div className="flex justify-end items-center space-x-4 rtl:space-x-reverse pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                  <div className="flex-grow text-sm">
                      {error && <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>}
                      {isSuccess && <p className="text-green-600 dark:text-green-400 font-medium">{t.successMessage}</p>}
                  </div>
                  <button type="button" onClick={onClose} className="px-5 py-2 font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">{t.cancel}</button>
                  <button type="submit" disabled={isSubmitting || isSuccess} className="px-5 py-3 font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">{isSubmitting ? t.submitting : t.update}</button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default EditActivityModal;