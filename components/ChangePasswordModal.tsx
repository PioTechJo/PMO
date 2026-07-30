
import React, { useState } from 'react';
import { Language } from '../types';
import { getSupabase } from '../services/supabaseClient';

interface ChangePasswordModalProps {
    language: Language;
    userEmail: string;
    onClose: () => void;
}

const translations = {
    ar: {
        title: "تغيير كلمة المرور",
        currentPassword: "كلمة المرور الحالية",
        newPassword: "كلمة المرور الجديدة",
        confirmPassword: "تأكيد كلمة المرور الجديدة",
        cancel: "إلغاء",
        save: "حفظ",
        saving: "جارٍ الحفظ...",
        success: "تم تغيير كلمة المرور بنجاح.",
        close: "إغلاق",
        mismatchError: "كلمتا المرور الجديدتان غير متطابقتين.",
        lengthError: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
        currentWrongError: "كلمة المرور الحالية غير صحيحة.",
    },
    en: {
        title: "Change Password",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm New Password",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving...",
        success: "Your password has been changed successfully.",
        close: "Close",
        mismatchError: "The new passwords do not match.",
        lengthError: "Password must be at least 8 characters.",
        currentWrongError: "Current password is incorrect.",
    }
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ language, userEmail, onClose }) => {
    const t = translations[language];
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const inputClasses = "w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white transition-all";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError(t.lengthError);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t.mismatchError);
            return;
        }

        const supabase = getSupabase();
        if (!supabase) return;

        setLoading(true);

        // Re-verify the current password first (the active session alone
        // isn't proof of intent - this stops someone at an unlocked, logged
        // in device from silently taking over the account).
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword,
        });

        if (reauthError) {
            setError(t.currentWrongError);
            setLoading(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess(true);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                {success ? (
                    <div className="text-center space-y-4">
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold">{t.success}</p>
                        <button onClick={onClose} className="w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity">
                            {t.close}
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-6">{t.title}</h2>
                        {error && <p className="mb-4 text-red-600 dark:text-red-400 text-sm text-center bg-red-100 dark:bg-red-500/20 p-3 rounded-lg">{error}</p>}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.currentPassword}</label>
                                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.newPassword}</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.confirmPassword}</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClasses} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 px-5 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-opacity">
                                    {t.cancel}
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {loading ? t.saving : t.save}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
