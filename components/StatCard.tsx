
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: 'projects' | 'completed' | 'inProgress' | 'hours';
  trendColor?: string;
  progress?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trendColor, progress }) => {
  return (
    <div className="bg-white dark:bg-[#1e293b] p-7 rounded-[2rem] shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col justify-between h-full transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 truncate">{title}</p>
          <p className={`text-3xl font-black ${trendColor || 'text-slate-800 dark:text-white'} leading-none`}>{value}</p>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 shadow-inner shrink-0">
            {icon === 'projects' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            {icon === 'hours' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            {icon === 'completed' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            {icon === 'inProgress' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        </div>
      </div>
      
      {progress !== undefined ? (
        <div className="space-y-2">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
            <span>Target Progress</span>
            <span>{progress}%</span>
          </div>
        </div>
      ) : (
          <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Updates</span>
          </div>
      )}
    </div>
  );
};

export default StatCard;
