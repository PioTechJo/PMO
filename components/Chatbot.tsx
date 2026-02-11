
import React, { useState, useRef, useEffect } from 'react';
import { Language, ChatMessage, Project, Milestone, User, Lookups } from '../types';
import { getChatResponse } from '../services/geminiService';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    projects: Project[];
    milestones: Milestone[];
    users: User[];
    lookups: Lookups;
}

const translations = {
    ar: {
        title: "المساعد الذكي",
        welcomeMessage: "أهلاً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم بخصوص مشاريعك؟",
        placeholder: "اكتب رسالتك هنا...",
        errorMessage: "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.",
        aiName: "Pio-Bot",
        aiSubtitle: "مساعد المشاريع الذكي",
        online: "متصل",
        suggestions: "أو جرب أحد هذه الاقتراحات:",
        suggestion1: "ما هي مؤشرات الأداء الرئيسية؟",
        suggestion2: "اعرض لي المشاريع النشطة",
        suggestion3: "ما هي الأنشطة المتأخرة؟",
    },
    en: {
        title: "AI Assistant",
        welcomeMessage: "Hi there! I'm your AI assistant. How can I help you with your projects today?",
        placeholder: "Type your message here...",
        errorMessage: "Sorry, something went wrong. Please try again.",
        aiName: "Pio-Bot",
        aiSubtitle: "AI Project Assistant",
        online: "Online",
        suggestions: "Or try one of these suggestions:",
        suggestion1: "What are my KPIs?",
        suggestion2: "Show me active projects",
        suggestion3: "Which activities are overdue?",
    }
};

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, language, projects, milestones, users, lookups }) => {
    const t = translations[language];
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = [t.suggestion1, t.suggestion2, t.suggestion3];

    useEffect(() => {
        if (isOpen) {
            if (messages.length === 0) {
                 setMessages([{ id: crypto.randomUUID(), text: t.welcomeMessage, sender: 'ai' }]);
            }
            setTimeout(() => inputRef.current?.focus(), 300); // Focus input when opened
        }
    }, [isOpen, messages.length, t.welcomeMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { id: crypto.randomUUID(), text: messageText, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const aiResponseText = await getChatResponse(messageText, projects, milestones, users, lookups.teams);
            const newAiMessage: ChatMessage = { id: crypto.randomUUID(), text: aiResponseText, sender: 'ai' };
            setMessages(prev => [...prev, newAiMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { id: crypto.randomUUID(), text: t.errorMessage, sender: 'ai' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    const AiAvatar = () => (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5a1.5 1.5 0 011.5 1.5v.065a4.23 4.23 0 010 6.87V15a1.5 1.5 0 01-3 0v-3.065a4.23 4.23 0 010-6.87V5A1.5 1.5 0 0110 3.5zM8.5 7v6.065a2.73 2.73 0 000-4.13V7h3v1.935a2.73 2.73 0 000 4.13V13h-3V7z" />
                <path d="M5 5.5A1.5 1.5 0 016.5 4h.065a4.23 4.23 0 016.87 0H13.5A1.5 1.5 0 0115 5.5v.065a4.23 4.23 0 010 6.87V12.5A1.5 1.5 0 0113.5 14h-.065a4.23 4.23 0 01-6.87 0H6.5A1.5 1.5 0 015 12.5v-.065a4.23 4.23 0 010-6.87V5.5zm6.065 1.5h-4.13a2.73 2.73 0 000 4.13h4.13a2.73 2.73 0 000-4.13z" />
            </svg>
        </div>
    );

    return (
        <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`fixed bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} m-8 w-full max-w-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col h-[70vh] max-h-[600px]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <AiAvatar />
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">{t.aiName}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {t.online}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-900/30">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.sender === 'ai' && <AiAvatar />}
                            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${message.sender === 'user' ? 'bg-violet-600 text-white rounded-br-none rtl:rounded-bl-none rtl:rounded-br-2xl' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none rtl:rounded-br-none rtl:rounded-bl-2xl'}`}>
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                            <AiAvatar />
                            <div className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 rounded-bl-none rtl:rounded-br-none rtl:rounded-bl-2xl">
                                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {messages.length <= 1 && !isLoading && (
                    <div className="p-4 pt-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.suggestions}</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, i) => (
                                <button key={i} onClick={() => handleSendMessage(s)} className="px-3 py-1 bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:text-violet-600 dark:hover:text-violet-300 transition-colors">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={t.placeholder}
                            className="flex-1 w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="p-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
