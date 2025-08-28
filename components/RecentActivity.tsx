import React, { useMemo } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Invoice, Customer } from '../types';

interface RecentActivityProps {}

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `قبل ${Math.floor(interval)} سنوات`;
    interval = seconds / 2592000;
    if (interval > 1) return `قبل ${Math.floor(interval)} أشهر`;
    interval = seconds / 86400;
    if (interval > 1) return `قبل ${Math.floor(interval)} أيام`;
    interval = seconds / 3600;
    if (interval > 1) return `قبل ${Math.floor(interval)} ساعات`;
    interval = seconds / 60;
    if (interval > 1) return `قبل ${Math.floor(interval)} دقائق`;
    return `قبل ${Math.floor(seconds)} ثوان`;
};

export const RecentActivity: React.FC<RecentActivityProps> = () => {
    const { invoices, customers } = useData();

    const activities = useMemo(() => {
        const invoiceActivities = invoices.map(inv => ({
            type: 'invoice',
            date: new Date(inv.date),
            text: `فاتورة جديدة #${inv.id.split('-')[1]} لـ ${inv.customerName}.`,
        }));

        const customerActivities = customers.map(cus => ({
            type: 'customer',
            date: new Date(cus.createdAt),
            text: `تمت إضافة عميل جديد: ${cus.name}.`,
        }));

        return [...invoiceActivities, ...customerActivities]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5);
    }, [invoices, customers]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-4">آخر النشاطات</h3>
      <div className="space-y-4">
        {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 ${activity.type === 'invoice' ? 'bg-purple-500' : 'bg-blue-500'} rounded-full mt-1.5`}></div>
                </div>
                <div className="mr-4">
                  <p className="text-sm text-gray-700">{activity.text}</p>
                  <p className="text-xs text-gray-400">{timeAgo(activity.date)}</p>
                </div>
              </div>
            ))
        ) : (
            <p className="text-sm text-gray-500">لا توجد نشاطات لعرضها.</p>
        )}
      </div>
    </div>
  );
};
