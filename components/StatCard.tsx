import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: 'projects' | 'completed' | 'inProgress' | 'hours';
}

const Icon: React.FC<{ icon: StatCardProps['icon'] }> = ({ icon }) => {
    const iconProps = {
        className: "w-7 h-7 text-violet-500 dark:text-violet-400",
        strokeWidth: "1.5",
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
    };
    const icons = {
        projects: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
        completed: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        inProgress: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.182-3.182m0-4.991v4.99" /></svg>,
        hours: <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };
    return icons[icon];
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl flex items-start space-x-4 rtl:space-x-reverse shadow-sm dark:shadow-none">
      <div className="bg-violet-500/10 p-4 rounded-full">
        <Icon icon={icon} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;