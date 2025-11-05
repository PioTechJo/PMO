
import React from 'react';
import { User, Project, Language } from '../types';

interface UserCardProps {
  user: User;
  projects: Project[];
  language: Language;
}

const UserCard: React.FC<UserCardProps> = ({ user, projects, language }) => {
    const translations = {
        ar: {
            projects: "مشاريع مدارة",
            userId: "معرف المستخدم"
        },
        en: {
            projects: "Managed Projects",
            userId: "User ID"
        }
    };
    const t = translations[language];
    
    return (
        <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-sm dark:shadow-none text-center">
            <img 
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=8b5cf6&color=f5f3ff`} 
                alt={user.name} 
                className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-gray-200 dark:border-gray-700"
            />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
            <p className="text-sm text-cyan-600 dark:text-cyan-400 mb-4">{t.userId}</p>

            <div className="flex justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t.projects}</p>
                </div>
            </div>
        </div>
    );
};

export default UserCard;
