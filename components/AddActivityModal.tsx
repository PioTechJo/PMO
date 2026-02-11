
import React, { useState, useMemo } from 'react';
// Fixed: Changed 'Activity' and 'ActivityStatus' to 'Milestone' and 'MilestoneStatus'
import { Milestone, Project, Lookup, MilestoneStatus, Language, PaymentStatus } from '../types';
import SearchableSelect from './SearchableSelect';

interface AddActivityModalProps {
  teams: Lookup[];
  projects: Project[];
  onClose: () => void;
  // Fixed: Changed 'Activity' to 'Milestone'
  onAddActivity: (newActivity: Omit<Milestone, 'id'>) => void;
  language: Language;
}

const AddActivityModal: React.FC<AddActivityModalProps> = ({ teams, projects, onClose, onAddActivity, language }) => {
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      projectId: '',
      teamId: '',
      dueDate: '',
      // Fixed: Changed 'ActivityStatus' to 'MilestoneStatus'
      status: MilestoneStatus.Pending,
      hasPayment: false,
      paymentAmount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  const canAdd = projects.length > 0 && teams.length > 0;
  
  const translations = {
      ar: {
          title: "إضافة نشاط جديد",
          activityTitle: "اسم النشاط",
          description: "الوصف",
          project: "المشروع",
          team: "الفريق المسؤول",
          dueDate: "تاريخ الاستحقاق",
          status: "الحالة",
          hasPayment: "عليه دفعة",
          paymentAmount: "مبلغ الدفعة",
          add: "إضافة نشاط",
          cancel: "إلغاء",
          validationError: "يجب إنشاء مشروع وفريق أولاً قبل إضافة الأنشطة.",
          validationErrorFields: "يرجى ملء جميع الحقول المطلوبة (العنوان، المشروع، الفريق).",
          selectHere: "اختر من هنا...",
          searchProject: "ابحث عن مشروع...",
      },
      en: {
          title: "Add New Activity",
          activityTitle: "Activity Title",
          description: "Description",
          project: "Project",
          team: "Assigned Team",
          dueDate: "Due Date",
          status: "Status",
          hasPayment: "Has Payment",
          paymentAmount: "Payment Amount",
          add: "Add Activity",
          cancel: "Cancel",
          validationError: "A project and a team must be created before adding activities.",
          validationErrorFields: "Please fill all required fields (Title, Project, Team).",
          selectHere: "Select from here...",
          searchProject: "Search for a project...",
      },
  };
  const t = translations[language];

  const projectOptions = useMemo(() => 
    projects.map(p => ({ value: p.id, label: p.name })),
    [projects]
  );

  const handleProjectChange = (projectId: string) => {
      setFormData(prev => ({...prev, projectId: projectId}));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canAdd) {
        setError(t.validationError);
        return;
    }

    if (!formData.title || !formData.projectId || !formData.teamId) {
        setError(t.validationErrorFields);
        return;
    }

    // Fixed: Changed 'Activity' to 'Milestone'
    const newActivityData: Omit<Milestone, 'id'> = {
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      paymentAmount: formData.hasPayment ? formData.paymentAmount : 0,
      paymentStatus: formData.hasPayment ? PaymentStatus.Pending : null,
    };
    onAddActivity(newActivityData);
  };
  
  const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500";
  const selectClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-lg m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">&times;</button>
            </div>
            
            {error && <div className="p-3 mb-4 text-sm text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-500/20 rounded-lg" role="alert">{error}</div>}

            {!canAdd ? (
                 <div className="p-4 text-sm text-center text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">{t.validationError}</div>
            ) : (
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
                           <SearchableSelect
                            options={projectOptions}
                            value={formData.projectId}
                            onChange={handleProjectChange}
                            placeholder={t.selectHere}
                            searchPlaceholder={t.searchProject}
                            language={language}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.team}</label>
                          <select name="teamId" value={formData.teamId} onChange={handleChange} required className={selectClasses}>
                              <option value="" disabled>{t.selectHere}</option>
                              {teams.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                          </select>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.dueDate}</label>
                      <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={inputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.status}</label>
                        <select name="status" value={formData.status} onChange={handleChange} required className={selectClasses}>
                            {/* Fixed: Changed 'ActivityStatus' to 'MilestoneStatus' */}
                            {Object.values(MilestoneStatus).sort().map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                  </div>
                  
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center pt-5">
                          <input id="has_payment" name="hasPayment" type="checkbox" checked={formData.hasPayment} onChange={handleChange} className="w-4 h-4 text-violet-600 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-violet-500" />
                          <label htmlFor="has_payment" className="ms-2 text-sm font-medium text-slate-600 dark:text-slate-300">{t.hasPayment}</label>
                        </div>
                       {formData.hasPayment && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.paymentAmount}</label>
                                <input type="number" name="paymentAmount" value={formData.paymentAmount} onChange={(e) => setFormData(p => ({...p, paymentAmount: parseFloat(e.target.value) || 0}))} className={inputClasses} min="0" />
                            </div>
                        )}
                   </div>

                  <div className="flex justify-end space-x-4 rtl:space-x-reverse pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                      <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600/80 transition-colors">{t.cancel}</button>
                      <button type="submit" disabled={!canAdd} className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">{t.add}</button>
                  </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddActivityModal;
