import React from 'react';
import { useData } from '../contexts/AuthContext';
import type { Booking, Page, NotificationSettings } from '../types';
import { AlertTriangleIcon, CalendarIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface DashboardAlertsProps {
    onNavigate: (page: Page, itemId?: string) => void;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ onNavigate }) => {
    const { products, bookings } = useData();
    const [settings] = useLocalStorage<NotificationSettings>('notificationSettings', {
        lowStockThreshold: 10,
        bookingReminderDays: 2,
        customerDebtThreshold: 0,
        supplierDueThreshold: 0,
        expiryReminderDays: 30,
    });

    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= settings.lowStockThreshold).slice(0, 3);

    const now = new Date();
    
    const upcomingBookings = bookings
        .filter(b => {
            const bookingDate = new Date(b.bookingDate);
            const reminderDateLimit = new Date();
            reminderDateLimit.setDate(now.getDate() + settings.bookingReminderDays);
            return b.status === 'confirmed' && bookingDate >= now && bookingDate <= reminderDateLimit;
        })
        .sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime())
        .slice(0, 3);
        
    const nearingExpiryProducts = products
        .filter(p => {
            if (!p.expiryDate) return false;
            const expiryDate = new Date(p.expiryDate);
            const reminderLimit = new Date();
            reminderLimit.setDate(now.getDate() + (settings.expiryReminderDays || 30));
            return expiryDate >= now && expiryDate <= reminderLimit;
        })
        .sort((a,b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
        .slice(0, 3);

    const handleNavigate = (page: Page, itemId: string) => {
        sessionStorage.setItem('globalSearchTerm', itemId);
        onNavigate(page);
    };

    const hasAlerts = lowStockProducts.length > 0 || upcomingBookings.length > 0 || nearingExpiryProducts.length > 0;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">تنبيهات هامة</h3>
            {!hasAlerts && <p className="text-gray-500 text-sm">لا توجد تنبيهات حاليًا.</p>}
            <div className="space-y-4">
                {lowStockProducts.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm text-gray-600 mb-2">منتجات منخفضة المخزون</h4>
                        <div className="space-y-2">
                            {lowStockProducts.map(product => (
                                <div key={product.id} onClick={() => handleNavigate('inventory', product.id)} className="flex items-center justify-between p-2 bg-orange-50 rounded-md cursor-pointer hover:bg-orange-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                                            <p className="text-xs text-orange-700 font-bold">المتبقي: {product.stock}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 hover:text-black">عرض</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {upcomingBookings.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm text-gray-600 mb-2 mt-4">حجوزات قادمة</h4>
                        <div className="space-y-2">
                            {upcomingBookings.map(booking => (
                                <div key={booking.id} onClick={() => handleNavigate('bookings', booking.id)} className="flex items-center justify-between p-2 bg-blue-50 rounded-md cursor-pointer hover:bg-blue-100 transition-colors">
                                     <div className="flex items-center gap-3">
                                        <CalendarIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{booking.customerName}</p>
                                            <p className="text-xs text-blue-700 font-bold">{new Date(booking.bookingDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 hover:text-black">عرض</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                 {nearingExpiryProducts.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm text-gray-600 mb-2 mt-4">منتجات قريبة من انتهاء الصلاحية</h4>
                        <div className="space-y-2">
                            {nearingExpiryProducts.map(product => (
                                <div key={product.id} onClick={() => handleNavigate('inventory', product.id)} className="flex items-center justify-between p-2 bg-yellow-50 rounded-md cursor-pointer hover:bg-yellow-100 transition-colors">
                                     <div className="flex items-center gap-3">
                                        <AlertTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{product.name}</p>
                                            <p className="text-xs text-yellow-700 font-bold">ينتهي في: {new Date(product.expiryDate!).toLocaleDateString('ar-EG')}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-500 hover:text-black">عرض</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
