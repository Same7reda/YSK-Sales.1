import React from 'react';
import { FileTextIcon, CalendarIcon, PackageIcon, UsersIcon } from './icons';
import type { Page } from '../types';

interface QuickAccessProps {
  onNavigate: (page: Page) => void;
  onAction: (action: 'addProduct' | 'addCustomer' | 'addBooking') => void;
}

export const QuickAccess: React.FC<QuickAccessProps> = ({ onNavigate, onAction }) => {
    
    const actionItems = [
        { label: 'فاتورة جديدة', icon: <FileTextIcon className="w-8 h-8 mx-auto" />, action: () => onNavigate('pos') },
        { label: 'حجز جديد', icon: <CalendarIcon className="w-8 h-8 mx-auto" />, action: () => onAction('addBooking') },
        { label: 'إضافة منتج', icon: <PackageIcon className="w-8 h-8 mx-auto" />, action: () => onAction('addProduct') },
        { label: 'إضافة عميل', icon: <UsersIcon className="w-8 h-8 mx-auto" />, action: () => onAction('addCustomer') },
    ];

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4">وصول سريع</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actionItems.map(item => (
            <button
                key={item.label}
                onClick={item.action}
                className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full w-fit mx-auto mb-2">
                     {item.icon}
                </div>
                <span className="font-semibold text-sm">{item.label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};