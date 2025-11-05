import React, { useState, useRef, useEffect } from 'react';
import { Language, ChatMessage, Project, Activity, User, Lookups } from '../types';
import { getChatResponse } from '../services/geminiService';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    projects: Project[];
    activities: Activity[];
    users: User[];
    lookups: Lookups;
}

const translations = {
    ar: {
        title: "المساعد الذكي",
        welcomeMessage: "أهلاً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم بخصوص مشاريعك؟",
        placeholder: "اكتب رسالتك هنا...",
        errorMessage: "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    },
    en: {
        title: "AI Assistant",
        welcomeMessage: "Hi there! I'm your AI assistant. How can I help you with your projects today?",
        placeholder: "Type your message here...",
        errorMessage: "Sorry, something went wrong. Please try again.",
    }
};

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, language, projects, activities, users, lookups }) => {
    const t = translations[language];
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ id: crypto.randomUUID(), text: t.welcomeMessage, sender: 'ai' }]);
        }
    }, [isOpen, messages.length, t.welcomeMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { id: crypto.randomUUID(), text: userInput, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        try {
            const aiResponseText = await getChatResponse(currentInput, projects, activities, users, lookups.teams);
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

    return (
        <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={`fixed bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} m-8 w-full max-w-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] transition-all duration-300 ease-in-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col h-[60vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    AI
                                </div>
                            )}
                            <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-2xl ${message.sender === 'user' ? 'bg-violet-600 text-white rounded-br-none rtl:rounded-bl-none rtl:rounded-br-2xl' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none rtl:rounded-br-none rtl:rounded-bl-2xl'}`}>
                                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">AI</div>
                            <div className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-800 rounded-bl-none rtl:rounded-br-none rtl:rounded-bl-2xl">
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

                {/* Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={t.placeholder}
                            className="flex-1 w-full p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-800 dark:text-white"
                        />
                        <button type="submit" disabled={isLoading} className="p-3 rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;