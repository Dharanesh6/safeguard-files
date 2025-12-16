import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCardProps } from '../types';

const DashboardCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, color }) => {
  // If color is passed, use it, otherwise default to dark card
  const bgClass = color || 'bg-slate-800';

  return (
    <div className={`${bgClass} p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2 tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-slate-700/50 rounded-xl text-indigo-400 group-hover:text-white group-hover:bg-indigo-600 transition-all duration-300 shadow-inner">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`flex items-center font-bold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
            {trend}
          </span>
          <span className="text-slate-500 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};

export default DashboardCard;