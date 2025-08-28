import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useData } from '../contexts/AuthContext';
import type { Invoice } from '../types';

interface SalesChartProps {}

export const SalesChart: React.FC<SalesChartProps> = () => {
    const { invoices } = useData();
    const data = useMemo(() => {
        const salesByDay: { [key: string]: number } = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        invoices.forEach(invoice => {
            const invoiceDate = new Date(invoice.date);
            if (invoiceDate >= thirtyDaysAgo) {
                const day = invoiceDate.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                salesByDay[day] = (salesByDay[day] || 0) + invoice.total;
            }
        });

        const sortedDays = Object.keys(salesByDay).sort((a, b) => {
             // A simple sort for demonstration. A more robust solution would parse dates.
            return a.localeCompare(b, 'ar-EG');
        });

        return sortedDays.map(day => ({
            name: day,
            revenue: salesByDay[day]
        }));
    }, [invoices]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">إيرادات آخر 30 يومًا</h3>
        <div style={{ width: '100%', height: 300 }}>
            {data.length > 0 ? (
                <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e0e0e0',
                                borderRadius: '0.5rem',
                                fontFamily: 'Cairo, sans-serif'
                            }}
                            formatter={(value: number) => value.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    لا توجد بيانات مبيعات في آخر 30 يومًا.
                </div>
            )}
        </div>
    </div>
  );
};
