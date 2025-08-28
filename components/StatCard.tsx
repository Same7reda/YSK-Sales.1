import React from 'react';
import { TrendingUpIcon, TrendingDownIcon } from './icons';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  // FIX: Specifically typed the `icon` prop as a ReactElement accepting SVGProps.
  // This provides TypeScript with the necessary type information to validate the `className` prop passed via `React.cloneElement`, resolving the overload error.
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon }) => {
  const isPositive = change >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="bg-blue-100 text-blue-600 p-4 rounded-full">
        {React.cloneElement(icon, { className: "w-7 h-7" })}
      </div>
      <div className="flex flex-col">
        <span className="text-gray-500 font-medium">{title}</span>
        <span className="text-3xl font-bold text-gray-800 my-1">{value}</span>
        <div className="flex items-center text-sm">
            <div className={`flex items-center font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUpIcon className="w-4 h-4 mr-1" /> : <TrendingDownIcon className="w-4 h-4 mr-1" />}
                <span>{Math.abs(change)}%</span>
            </div>
            <span className="text-gray-400 mr-2">عن الشهر الماضي</span>
        </div>
      </div>
    </div>
  );
};