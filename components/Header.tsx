import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BellIcon, PackageIcon, UsersIcon, TruckIcon, CalendarIcon, AlertTriangleIcon, PlusCircleIcon, FileTextIcon, ClipboardCheckIcon } from './icons';
import { useNotifications, Notification, NotificationType } from '../hooks/useNotifications';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    onNavigate: (page: Page) => void;
    activePage: Page;
    onToggleAssistant: () => void;
}

const NotificationIcon: React.FC<{type: NotificationType}> = ({type}) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
        low_stock: <PackageIcon className="w-5 h-5 text-orange-500" />,
        customer_debt: <UsersIcon className="w-5 h-5 text-red-500" />,
        supplier_due: <TruckIcon className="w-5 h-5 text-yellow-600" />,
        booking_reminder: <CalendarIcon className="w-5 h-5 text-blue-500" />,
        product_expiry: <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />,
    }
    return <div className="bg-gray-100 p-2 rounded-full">{iconMap[type]}</div>
}

const pageTitles: Record<Page, string> = {
    dashboard: 'لوحة التحكم',
    inventory: 'المخزون',
    pos: 'نقطة البيع',
    invoices: 'الفواتير',
    customers: 'العملاء',
    suppliers: 'الموردين',
    bookings: 'الحجوزات',
    expenses: 'المصاريف',
    reports: 'التقارير',
    settings: 'الإعدادات',
    audit_log: 'سجل النشاطات',
    purchase_orders: 'أوامر الشراء',
    stock_take: 'جرد المخزون',
    coupons: 'الكوبونات',
};

export const Header: React.FC<HeaderProps> = ({ onNavigate, activePage, onToggleAssistant }) => {
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notifications = useNotifications();
    const [readNotificationIds, setReadNotificationIds] = useLocalStorage<string[]>('readNotificationIds', []);
    const [snapshotUnreadIds, setSnapshotUnreadIds] = useState<Set<string>>(new Set());
    const notificationRef = useRef<HTMLDivElement>(null);
    const { currentUser, hasPermission } = useAuth();

    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    const unreadNotifications = useMemo(() => 
        notifications.filter(n => !readNotificationIds.includes(n.id))
    , [notifications, readNotificationIds]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const handleToggleNotifications = () => {
        if (!isNotificationsOpen) {
            setSnapshotUnreadIds(new Set(unreadNotifications.map(n => n.id)));
            const currentIds = notifications.map(n => n.id);
            setReadNotificationIds(prev => [...new Set([...prev, ...currentIds])]);
        }
        setIsNotificationsOpen(prev => !prev);
    };

    const handleNotificationClick = (notification: Notification) => {
        if(notification.itemId) {
            sessionStorage.setItem('globalSearchTerm', notification.itemId);
        }
        onNavigate(notification.page);
        setIsNotificationsOpen(false);
    }
    
    const handleActionClick = (page: Page) => {
        const permissionPage = page === 'pos' ? 'invoices' : page;
        if (hasPermission(permissionPage as Page, 'edit')) {
            sessionStorage.setItem('openAddModal', 'true');
            onNavigate(page);
            setIsActionsOpen(false);
        } else {
            alert('ليس لديك صلاحية لهذا الإجراء.');
        }
    };

    // FIX: Explicitly typed the `quickActions` array to ensure `action.page` is of type `Page`, resolving the type error on `handleActionClick`.
    const quickActions: { page: Page; label: string; icon: React.ReactElement }[] = [
        { page: 'pos', label: 'فاتورة جديدة', icon: <FileTextIcon className="w-5 h-5 text-gray-500" /> },
        { page: 'inventory', label: 'إضافة منتج', icon: <PackageIcon className="w-5 h-5 text-gray-500" /> },
        { page: 'customers', label: 'إضافة عميل', icon: <UsersIcon className="w-5 h-5 text-gray-500" /> },
        { page: 'stock_take', label: 'بدء جرد جديد', icon: <ClipboardCheckIcon className="w-5 h-5 text-gray-500" /> },
    ];


    return (
        <header className="bg-gray-50/80 backdrop-blur-sm w-full py-4 px-8 flex items-center justify-between sticky top-0 z-30 border-b border-gray-200">
            <div><h1 className="text-2xl font-bold text-gray-800">{pageTitles[activePage] || 'لوحة التحكم'}</h1></div>
            <div className="flex items-center gap-6">
                 {currentUser?.permissions.canUseAssistant && (
                    <button data-tour-id="ai-assistant" onClick={onToggleAssistant} title="مساعد YSK" className="relative text-gray-500 hover:text-gray-800">
                        <img src="https://i.postimg.cc/fLTxbbTt/512-x-512-3.png" alt="YSK Assistant" className="w-9 h-9 assistant-icon-animation"/>
                    </button>
                 )}

                <div data-tour-id="quick-actions" className="relative" ref={actionsRef}>
                    <button onClick={() => setIsActionsOpen(prev => !prev)} className="relative text-gray-500 hover:text-gray-800" title="إجراءات سريعة">
                        <PlusCircleIcon className="w-6 h-6" />
                    </button>
                    {isActionsOpen && (
                        <div className="absolute top-full mt-2 left-0 w-60 bg-white rounded-lg shadow-xl border z-40 flex flex-col">
                            <div className="p-3 font-bold border-b">إجراءات سريعة</div>
                            <div className="p-2 space-y-1">
                                {quickActions.map(action => {
                                    const permissionPage = action.page === 'pos' ? 'invoices' : action.page;
                                    const canPerformAction = hasPermission(permissionPage as Page, 'edit');
                                    return (
                                        <button 
                                            key={action.page}
                                            onClick={() => handleActionClick(action.page)}
                                            disabled={!canPerformAction}
                                            className="w-full text-right flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                        >
                                            {action.icon}
                                            <span className="font-semibold text-gray-700">{action.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                <div data-tour-id="notifications" className="relative" ref={notificationRef}>
                    <button onClick={handleToggleNotifications} className="relative text-gray-500 hover:text-gray-800">
                        <BellIcon className="w-6 h-6" />
                        {unreadNotifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadNotifications.length}</span>
                        )}
                    </button>
                    {isNotificationsOpen && (
                         <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-lg shadow-xl border z-40 flex flex-col max-h-[70vh]">
                            <div className="p-3 font-bold border-b">التنبيهات</div>
                            <div className="flex-grow overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notif => {
                                        const isUnread = snapshotUnreadIds.has(notif.id);
                                        return (
                                            <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-3 cursor-pointer border-b flex items-start gap-3 ${isUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-100'}`}>
                                               <NotificationIcon type={notif.type} />
                                                <p className="text-sm text-gray-700">{notif.message}</p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="p-4 text-gray-500">لا توجد تنبيهات جديدة.</p>
                                )}
                            </div>
                             {notifications.length > 0 && (
                                <div className="p-2 border-t bg-gray-50 text-center">
                                    <button onClick={() => setReadNotificationIds(notifications.map(n => n.id))} className="text-sm text-blue-600 font-semibold hover:underline">مسح الكل</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};