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
      title: "إدارة الفريق",
      subtitle: "نظرة عامة على جميع أعضاء الفريق."
    },
    en: {
      title: "Team Management",
      subtitle: "An overview of all team members."
    }
  };
  const t = translations[language];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allUsers.map(user => (
          <UserCard 
            key={user.id} 
            user={user}
            projects={allProjects.filter(p => p.projectManagerId === user.id)}
            language={language}
          />
        ))}
      </div>
    </div>
  );
};

export default Team;
