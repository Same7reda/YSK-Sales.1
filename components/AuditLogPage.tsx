import React, { useState, useMemo } from 'react';
import { useData, useAuth } from '../contexts/AuthContext';
import type { AuditLogEntry, User } from '../types';
import { SearchIcon } from './icons';
import { CustomSelect } from './CustomSelect';

const actionTypeMap: Record<AuditLogEntry['actionType'], string> = {
    CREATE: 'إنشاء',
    UPDATE: 'تعديل',
    DELETE: 'حذف',
    LOGIN: 'تسجيل دخول',
    LOGOUT: 'تسجيل خروج',
    PAYMENT: 'سداد',
};

export const AuditLogPage: React.FC = () => {
    const { auditLog } = useData();
    const { users } = useAuth();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState('all');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    
    const displayedLogs = useMemo(() => {
        return auditLog
            .filter(log => {
                const searchMatch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   log.username.toLowerCase().includes(searchTerm.toLowerCase());
                
                const userMatch = selectedUser === 'all' || log.userId === selectedUser;

                const logDate = new Date(log.timestamp);
                const fromDate = dateRange.from ? new Date(dateRange.from) : null;
                const toDate = dateRange.to ? new Date(dateRange.to) : null;

                if (fromDate) fromDate.setHours(0, 0, 0, 0);
                if (toDate) toDate.setHours(23, 59, 59, 999);

                const dateMatch = (!fromDate || logDate >= fromDate) && (!toDate || logDate <= toDate);

                return searchMatch && userMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLog, searchTerm, selectedUser, dateRange]);

    const userOptions = useMemo(() => [
        { value: 'all', label: 'كل المستخدمين' },
        ...users.map(u => ({ value: u.id, label: u.fullName }))
    ], [users]);

    return (
        <div className="p-8">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border shadow-sm">
                <div className="relative md:col-span-2">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="ابحث في التفاصيل أو اسم المستخدم..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-4 pr-10"
                    />
                </div>
                <div>
                    <CustomSelect 
                        value={selectedUser} 
                        onChange={setSelectedUser} 
                        options={userOptions}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                     <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({...r, from: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-md py-2 px-4 w-full"/>
                     <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({...r, to: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-md py-2 px-4 w-full"/>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center min-w-[800px]">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-center">التاريخ والوقت</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-center">المستخدم</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-center">الإجراء</th>
                            <th className="p-4 text-sm font-semibold text-gray-600 text-right">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedLogs.map(log => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString('ar-EG')}</td>
                                <td className="p-3 font-medium text-gray-800">{log.username}</td>
                                <td className="p-3 text-sm font-semibold">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        log.actionType === 'CREATE' ? 'bg-green-100 text-green-800' :
                                        log.actionType === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                        log.actionType === 'DELETE' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {actionTypeMap[log.actionType] || log.actionType}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-gray-700 text-right">{log.details}</td>
                            </tr>
                        ))}
                         {displayedLogs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    لا توجد سجلات تطابق معايير البحث.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};