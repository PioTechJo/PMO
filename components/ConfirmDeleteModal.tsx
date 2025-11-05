import React from 'react';
import { Project, Language } from '../types';

interface ConfirmDeleteModalProps {
  project: Project;
  onClose: () => void;
  onConfirm: () => void;
  language: Language;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ project, onClose, onConfirm, language }) => {
  const translations = {
    ar: {
      title: "تأكيد الحذف",
      message: "هل أنت متأكد أنك تريد حذف المشروع",
      warning: "هذا الإجراء لا يمكن التراجع عنه وسيحذف أيضًا جميع المهام المرتبطة به.",
      cancel: "إلغاء",
      delete: "حذف",
    },
    en: {
      title: "Confirm Deletion",
      message: "Are you sure you want to delete the project",
      warning: "This action cannot be undone and will also delete all associated tasks.",
      cancel: "Cancel",
      delete: "Delete",
    }
  };
  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-2 rounded-2xl shadow-2xl w-full max-w-md m-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="p-6">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-white mt-5" id="modal-title">
                    {t.title}
                </h3>
                <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                       {t.message} <span className="font-bold">"{project.name}"</span>?
                       <br/>
                       {t.warning}
                    </p>
                </div>
            </div>
          <div className="flex justify-center items-center space-x-4 rtl:space-x-reverse pt-6">
            <button
              onClick={onClose}
              type="button"
              className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={onConfirm}
              type="button"
              className="px-6 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              {t.delete}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;