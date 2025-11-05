import React, { useState, useEffect } from 'react';
import { Project, Lookups, Language, User } from '../types';

interface EditProjectModalProps {
  projectToEdit: Project;
  lookups: Lookups;
  onClose: () => void;
  onUpdateProject: (projectId: string, updatedData: Omit<Project, 'id' | 'projectCode' | 'country' | 'category' | 'team' | 'product' | 'status' | 'projectManager' | 'customer'>) => Promise<void>;
  language: Language;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({ projectToEdit, lookups, onClose, onUpdateProject, language }) => {
  const [formData, setFormData] = useState({
      name: '',
      description: '',
      countryId: '',
      categoryId: '',
      teamId: '',
      productId: '',
      statusId: '',
      projectManagerId: '',
      customerId: '',
      launchDate: '',
      actualStartDate: '',
      expectedClosureDate: '',
      progress: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
        setFormData({
            name: projectToEdit.name,
            description: projectToEdit.description,
            countryId: projectToEdit.countryId || '',
            categoryId: projectToEdit.categoryId || '',
            teamId: projectToEdit.teamId || '',
            productId: projectToEdit.productId || '',
            statusId: projectToEdit.statusId || '',
            projectManagerId: projectToEdit.projectManagerId || '',
            customerId: projectToEdit.customerId || '',
            launchDate: projectToEdit.launchDate ? new Date(projectToEdit.launchDate).toISOString().split('T')[0] : '',
            actualStartDate: projectToEdit.actualStartDate ? new Date(projectToEdit.actualStartDate).toISOString().split('T')[0] : '',
            expectedClosureDate: projectToEdit.expectedClosureDate ? new Date(projectToEdit.expectedClosureDate).toISOString().split('T')[0] : '',
            progress: projectToEdit.progress || 0,
        });
    }
  }, [projectToEdit]);

  const translations = {
      ar: {
          title: "تعديل المشروع",
          projectName: "اسم المشروع",
          projectCode: "كود المشروع",
          description: "الوصف",
          country: "الدولة",
          category: "الفئة",
          team: "الفريق",
          product: "المنتج",
          status: "الحالة",
          projectManager: "مدير المشروع",
          customer: "العميل",
          launchDate: "تاريخ الإطلاق",
          actualStartDate: "تاريخ البدء الفعلي",
          expectedClosureDate: "تاريخ الإغلاق المتوقع",
          progress: "نسبة التقدم",
          update: "تحديث المشروع",
          cancel: "إلغاء",
          submitting: "جاري التحديث...",
          successMessage: "تم التحديث بنجاح!",
          selectHere: "اختر من هنا...",
      },
      en: {
          title: "Edit Project",
          projectName: "Project Name",
          projectCode: "Project Code",
          description: "Description",
          country: "Country",
          category: "Category",
          team: "Team",
          product: "Product",
          status: "Status",
          projectManager: "Project Manager",
          customer: "Customer",
          launchDate: "Launch Date",
          actualStartDate: "Actual Start Date",
          expectedClosureDate: "Expected Closure Date",
          progress: "Progress",
          update: "Update Project",
          cancel: "Cancel",
          submitting: "Updating...",
          successMessage: "Updated successfully!",
          selectHere: "Select from here...",
      },
  };
  const t = translations[language];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setError(null);
    setIsSuccess(false);
    setIsSubmitting(true);
    
    const updatedData = {
        ...formData,
        launchDate: formData.launchDate || null,
        actualStartDate: formData.actualStartDate || null,
        expectedClosureDate: formData.expectedClosureDate || null,
        progress: Number(formData.progress),
    };

    try {
        await onUpdateProject(projectToEdit.id, updatedData);
        setIsSuccess(true);
        setTimeout(() => {
            onClose();
        }, 1000);
    } catch (err: any) {
        setError(err?.message || "An unknown error occurred while updating.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white";
  const selectClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-2xl m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.title}</h2>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.projectName}</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClasses}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.projectCode}</label>
                    <input type="text" value={projectToEdit.projectCode} disabled className={`${inputClasses} bg-slate-200 dark:bg-slate-800 cursor-not-allowed`}/>
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.description}</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={inputClasses}/>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.customer}</label>
                      <select name="customerId" value={formData.customerId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.customers.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.projectManager}</label>
                      <select name="projectManagerId" value={formData.projectManagerId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.projectManagers.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.status}</label>
                      <select name="statusId" value={formData.statusId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.projectStatuses.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.country}</label>
                      <select name="countryId" value={formData.countryId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.countries.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.category}</label>
                      <select name="categoryId" value={formData.categoryId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.categories.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.team}</label>
                      <select name="teamId" value={formData.teamId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.teams.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.product}</label>
                      <select name="productId" value={formData.productId} onChange={handleChange} required className={selectClasses}>
                          <option value="" disabled>{t.selectHere}</option>
                          {lookups.products.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                      </select>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.launchDate}</label>
                      <input type="date" name="launchDate" value={formData.launchDate} onChange={handleChange} className={inputClasses}/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.actualStartDate}</label>
                      <input type="date" name="actualStartDate" value={formData.actualStartDate} onChange={handleChange} className={inputClasses}/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.expectedClosureDate}</label>
                      <input type="date" name="expectedClosureDate" value={formData.expectedClosureDate} onChange={handleChange} className={inputClasses}/>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.progress} ({formData.progress}%)</label>
                  <input type="range" name="progress" min="0" max="100" value={formData.progress} onChange={handleChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-violet-600"/>
              </div>

              <div className="flex justify-end items-center space-x-4 rtl:space-x-reverse pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                  <div className="flex-grow text-sm">
                      {error && <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>}
                      {isSuccess && <p className="text-green-600 dark:text-green-400 font-medium">{t.successMessage}</p>}
                  </div>
                  <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors">
                  {t.cancel}
                  </button>
                  <button type="submit" disabled={isSubmitting || isSuccess} className="px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {isSubmitting ? t.submitting : t.update}
                  </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;