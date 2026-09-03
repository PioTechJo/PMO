
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: 'gradient' | 'white';
  color?: 'blue' | 'emerald' | 'orange' | 'red' | 'violet';
  trend?: { val: string | number; label: string; type: 'up' | 'down' | 'warning' };
  badge?: { icon: React.ReactNode; label: string };
  progress?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, variant = 'white', color = 'blue', trend, badge, progress }) => {
  const colorConfig = {
    blue: {
      gradient: 'from-[#1e40af] to-[#3b82f6]',
      accent: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-100 dark:border-blue-900/30',
      shadow: 'shadow-blue-500/10'
    },
    emerald: {
      gradient: 'from-[#065f46] to-[#10b981]',
      accent: 'bg-emerald-500',
      text: 'text-emerald-600',
      border: 'border-emerald-100 dark:border-emerald-900/30',
      shadow: 'shadow-emerald-500/10'
    },
    orange: {
      gradient: 'from-[#9a3412] to-[#f97316]',
      accent: 'bg-orange-500',
      text: 'text-orange-600',
      border: 'border-orange-100 dark:border-orange-900/30',
      shadow: 'shadow-orange-500/10'
    },
    red: {
      gradient: 'from-[#991b1b] to-[#ef4444]',
      accent: 'bg-red-500',
      text: 'text-red-600',
      border: 'border-red-100 dark:border-red-900/30',
      shadow: 'shadow-red-500/10'
    },
    violet: {
      gradient: 'from-[#5b21b6] to-[#8b5cf6]',
      accent: 'bg-violet-500',
      text: 'text-violet-600',
      border: 'border-violet-100 dark:border-violet-900/30',
      shadow: 'shadow-violet-500/10'
    }
  };

  const config = colorConfig[color];

  if (variant === 'gradient') {
    return (
      <div className={`relative bg-gradient-to-br ${config.gradient} p-6 rounded-[1.5rem] shadow-xl overflow-hidden group h-full`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-700" />
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-4">{title}</p>
            <h3 className="text-4xl font-black text-white leading-tight mb-2">{value}</h3>
            {trend && (
              <div className="flex items-center gap-2 mb-6">
                <span className={`text-xs font-bold ${trend.type === 'up' ? 'text-emerald-300' : 'text-red-300'}`}>
                  {trend.type === 'up' ? '↑' : '↓'} {trend.val}
                </span>
                <span className="text-[10px] font-medium text-white/60">{trend.label}</span>
              </div>
            )}
          </div>
          {badge && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/15 backdrop-blur-md rounded-xl border border-white/10 w-fit">
              <span className="text-white/80">{badge.icon}</span>
              <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">{badge.label}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-[#111927] p-6 rounded-[1.5rem] border ${config.border} shadow-sm relative group h-full transition-all hover:shadow-lg lg:hover:-translate-y-1`}>
      <div className={`absolute top-0 left-6 right-6 h-1 ${config.accent} rounded-b-full opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 ${config.text} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className={`text-3xl font-black text-slate-900 dark:text-white ${config.text.replace('text-', 'group-hover:text-')}`}>{value}</h3>
        {trend && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black ${trend.type === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.type === 'up' ? '↑' : '↓'} {trend.val}
            </span>
            <span className="text-[10px] font-bold text-slate-400">{trend.label}</span>
          </div>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className={`${config.accent} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;
