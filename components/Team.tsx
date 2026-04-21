
import React from 'react';
import { User, Project, Language } from '../types';
import UserCard from './UserCard';

interface TeamProps {
  allUsers: User[];
  allProjects: Project[];
  language: Language;
}

const Team: React.FC<TeamProps> = ({ allUsers, allProjects, language }) => {
  const translations = {
    ar: {
      title: "إدارة مديري المشاريع",
      subtitle: "نظرة عامة على مديري المشاريع النشطين في النظام."
    },
    en: {
      title: "Projects Managers Management",
      subtitle: "An overview of active project managers in the system."
    }
  };
  const t = translations[language];

  // Filter users to only show those with type 'PM'
  const pmUsers = allUsers.filter(u => u.type === 'PM');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{t.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pmUsers.map(user => (
          <UserCard 
            key={user.id} 
            user={user}
            projects={allProjects.filter(p => p.projectManagerId === user.id)}
            language={language}
          />
        ))}
        {pmUsers.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-20 italic font-black uppercase tracking-[0.4em]">
                No PMs Found
            </div>
        )}
      </div>
    </div>
  );
};

export default Team;
