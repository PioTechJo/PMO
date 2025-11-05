import React, { useState, useEffect } from 'react';
import type { Language } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { SupabaseClient, Session } from '@supabase/supabase-js';

interface LoginProps {
    onLoginSuccess: (session: Session) => void;
    language: Language;
    setLanguage: (language: Language) => void;
    supabaseClient: SupabaseClient;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, language, setLanguage, supabaseClient }) => {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const translations = {
        ar: {
            loginTitle: 'تسجيل الدخول',
            signupTitle: 'إنشاء حساب جديد',
            forgotTitle: 'إعادة تعيين كلمة المرور',
            forgotSubtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لاستعادة حسابك.",
            nameLabel: 'الاسم الكامل',
            emailLabel: 'البريد الإلكتروني',
            passwordLabel: 'كلمة المرور',
            loginButton: 'تسجيل الدخول',
            signupButton: 'إنشاء حساب',
            sendResetLink: 'إرسال رابط إعادة التعيين',
            noAccount: 'ليس لديك حساب؟',
            goSignup: 'أنشئ واحدًا الآن',
            hasAccount: 'لديك حساب بالفعل؟',
            goLogin: 'سجل الدخول',
            backToLogin: 'العودة لتسجيل الدخول',
            signupSuccess: 'تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك.',
            resetSuccess: 'تم إرسال رابط إعادة تعيين كلمة المرور! يرجى التحقق من بريدك الإلكتروني.',
            resendLink: 'إعادة إرسال رابط التأكيد',
            emailNotConfirmed: 'البريد الإلكتروني غير مؤكد. يرجى التحقق من صندوق الوارد الخاص بك.',
            rememberMe: 'ذكرني',
            forgotPassword: 'هل نسيت كلمة المرور؟',
            welcomeTo: 'مرحباً بك في',
            appName: 'محفظة مشاريع بايو-تك'
        },
        en: {
            loginTitle: 'Login',
            signupTitle: 'Create Account',
            forgotTitle: 'Reset Password',
            forgotSubtitle: "Enter your email and we'll send you a link to get back into your account.",
            nameLabel: 'Full Name',
            emailLabel: 'Email Address',
            passwordLabel: 'Password',
            loginButton: 'Login',
            signupButton: 'Create Account',
            sendResetLink: 'Send Reset Link',
            noAccount: "Don't have an account?",
            goSignup: 'Sign up now',
            hasAccount: 'Already have an account?',
            goLogin: 'Log in',
            backToLogin: 'Back to Login',
            signupSuccess: 'Sign up successful! Please check your email to confirm your account.',
            resetSuccess: 'Password reset link sent! Please check your email.',
            resendLink: 'Resend confirmation link',
            emailNotConfirmed: 'Email not confirmed. Please check your inbox.',
            rememberMe: 'Remember me',
            forgotPassword: 'Forgot Password?',
            welcomeTo: 'Welcome to',
            appName: 'Pio-Tech Project Portfolio'
        }
    };
    const t = translations[language];

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (mode === 'signup') {
            const { error } = await supabaseClient.auth.signUp({
                email, password, options: { data: { name: fullName } },
            });
            if (error) setError(error.message);
            else setMessage(t.signupSuccess);
        } else { // Sign In
            if (rememberMe) localStorage.setItem('rememberedEmail', email);
            else localStorage.removeItem('rememberedEmail');
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                 if (error.message.includes('Email not confirmed')) setError(t.emailNotConfirmed);
                 else setError(error.message);
            } else if (data.session) {
                onLoginSuccess(data.session);
            }
        }
        setLoading(false);
    };
    
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError('');
        setMessage('');

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
             redirectTo: window.location.origin,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage(t.resetSuccess);
        }
        setLoading(false);
    };
    
    const handleResendConfirmation = async () => {
        if (!email) return;
        setLoading(true);
        setError('');
        setMessage('');
        
        const { error } = await supabaseClient.auth.resend({ type: 'signup', email: email });

        if (error) setError(error.message);
        else setMessage('A new confirmation link has been sent to your email.');
        setLoading(false);
    };
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-slate-900" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="text-center mb-8">
                <p className="text-xl font-medium text-slate-600 dark:text-slate-300">{t.welcomeTo}</p>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-cyan-400 mt-1">
                    {t.appName}
                </h1>
            </div>
            <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 p-8 rounded-2xl shadow-2xl">
                 {error && <p className="mb-4 text-red-600 dark:text-red-400 text-sm text-center bg-red-100 dark:bg-red-500/20 p-3 rounded-lg">
                    {error}
                    {error === t.emailNotConfirmed && (
                        <button type="button" onClick={handleResendConfirmation} disabled={loading} className="ml-2 rtl:mr-2 font-bold underline hover:text-red-500 dark:hover:text-red-300 disabled:opacity-50">
                            {t.resendLink}
                        </button>
                    )}
                </p>}
                {message && <p className="mb-4 text-green-700 dark:text-green-300 text-sm text-center bg-green-100 dark:bg-green-500/20 p-3 rounded-lg">{message}</p>}
                
                {mode === 'login' && (
                    <>
                        <div className="text-center mb-6"><h1 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{t.loginTitle}</h1></div>
                        <form onSubmit={handleAuthSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.emailLabel}</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.passwordLabel}</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 rounded" />
                                    <label htmlFor="remember-me" className="mx-2 text-sm text-slate-700 dark:text-slate-300">{t.rememberMe}</label>
                                </div>
                                <button type="button" onClick={() => setMode('forgot_password')} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                                    {t.forgotPassword}
                                </button>
                            </div>
                            <button type="submit" disabled={loading} className="w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                                {loading ? '...' : t.loginButton}
                            </button>
                        </form>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-6">{t.noAccount}
                            <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="font-bold text-violet-600 dark:text-violet-400 hover:underline mx-1 rtl:mx-1">{t.goSignup}</button>
                        </p>
                    </>
                )}

                {mode === 'signup' && (
                    <>
                         <div className="text-center mb-6"><h1 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{t.signupTitle}</h1></div>
                         <form onSubmit={handleAuthSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.nameLabel}</label>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.emailLabel}</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.passwordLabel}</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <button type="submit" disabled={loading} className="w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                                {loading ? '...' : t.signupButton}
                            </button>
                        </form>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-6">{t.hasAccount}
                            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="font-bold text-violet-600 dark:text-violet-400 hover:underline mx-1 rtl:mx-1">{t.goLogin}</button>
                        </p>
                    </>
                )}

                {mode === 'forgot_password' && (
                    <>
                        <div className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{t.forgotTitle}</h1>
                            <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">{t.forgotSubtitle}</p>
                        </div>
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{t.emailLabel}</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"/>
                            </div>
                            <button type="submit" disabled={loading} className="w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                                {loading ? '...' : t.sendResetLink}
                            </button>
                        </form>
                        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-6">
                            <button onClick={() => setMode('login')} className="font-bold text-violet-600 dark:text-violet-400 hover:underline">{t.backToLogin}</button>
                        </p>
                    </>
                )}

            </div>
             <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                <LanguageSwitcher language={language} setLanguage={setLanguage} />
            </div>
        </div>
    );
};

export default Login;