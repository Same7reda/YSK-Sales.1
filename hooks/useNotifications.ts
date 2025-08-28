import { useMemo } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Product, Customer, Supplier, Booking, Page, NotificationSettings } from '../types';

export type NotificationType = 'low_stock' | 'customer_debt' | 'supplier_due' | 'booking_reminder' | 'product_expiry';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  page: Page;
  itemId?: string;
}

export const useNotifications = (): Notification[] => {
    const { products, customers, suppliers, bookings, notificationSettings: settings } = useData();

    const notifications = useMemo(() => {
        if (!products || !customers || !suppliers || !bookings || !settings) {
            return [];
        }

        const allNotifications: Notification[] = [];
        const now = new Date();
        const reminderDateLimit = new Date();
        reminderDateLimit.setDate(now.getDate() + settings.bookingReminderDays);

        // Low stock notifications
        products.forEach(p => {
            if (p.stock > 0 && p.stock <= settings.lowStockThreshold) {
                allNotifications.push({ 
                    id: `stock-${p.id}`, 
                    type: 'low_stock', 
                    message: `المنتج "${p.name}" على وشك النفاد (${p.stock} متبقي).`, 
                    page: 'inventory', 
                    itemId: p.id 
                });
            }
        });

        // Customer debt notifications
        customers.forEach(c => {
            if (c.debt > (settings.customerDebtThreshold || 0)) {
                allNotifications.push({ 
                    id: `c-debt-${c.id}`, 
                    type: 'customer_debt', 
                    message: `العميل "${c.name}" عليه دين مستحق.`, 
                    page: 'customers', 
                    itemId: c.id 
                });
            }
        });

        // Supplier due notifications
        suppliers.forEach(s => {
            if (s.debt > (settings.supplierDueThreshold || 0)) {
                allNotifications.push({ 
                    id: `s-due-${s.id}`, 
                    type: 'supplier_due', 
                    message: `لديك مبلغ مستحق للمورد "${s.name}".`, 
                    page: 'suppliers', 
                    itemId: s.id 
                });
            }
        });

        // Upcoming booking notifications
        bookings.forEach(b => {
            const bookingDate = new Date(b.bookingDate);
            if (b.status === 'confirmed' && bookingDate >= now && bookingDate <= reminderDateLimit) {
                allNotifications.push({ 
                    id: `booking-${b.id}`, 
                    type: 'booking_reminder', 
                    message: `لديك حجز قادم لـ "${b.customerName}" خلال ${settings.bookingReminderDays} يومًا.`, 
                    page: 'bookings', 
                    itemId: b.id 
                });
            }
        });

        // Product expiry notifications
        products.forEach(p => {
            if (p.expiryDate) {
                const expiryDate = new Date(p.expiryDate);
                const reminderLimit = new Date();
                reminderLimit.setDate(now.getDate() + (settings.expiryReminderDays || 30));
                if (expiryDate >= now && expiryDate <= reminderLimit) {
                    allNotifications.push({ 
                        id: `expiry-${p.id}`, 
                        type: 'product_expiry', 
                        message: `المنتج "${p.name}" ستنتهي صلاحيته في ${new Date(p.expiryDate).toLocaleDateString('ar-EG')}.`, 
                        page: 'inventory', 
                        itemId: p.id 
                    });
                }
            }
        });

        return allNotifications;
    }, [products, customers, suppliers, bookings, settings]);

    return notifications;
};