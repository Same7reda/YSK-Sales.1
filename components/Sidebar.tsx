import React from 'react';
import type { Page } from '../types';
import { HomeIcon, PackageIcon, FileTextIcon, UsersIcon, BarChartIcon, SettingsIcon, ReceiptIcon, TruckIcon, WalletIcon, CalendarIcon, LogOutIcon, PhoneIcon, MailIcon, MessageSquareIcon, HistoryIcon, ClipboardListIcon, ClipboardCheckIcon, TicketIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
}

// FIX: Specified the icon prop type to include SVGProps, allowing `className` to be passed via `React.cloneElement` and resolving the type error.
const navItemsList: { page: Page; label: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; adminOnly?: boolean }[] = [
  { page: 'dashboard', label: 'لوحة التحكم', icon: <HomeIcon /> },
  { page: 'inventory', label: 'المخزون', icon: <PackageIcon /> },
  { page: 'pos', label: 'نقطة البيع', icon: <FileTextIcon /> },
  { page: 'invoices', label: 'الفواتير', icon: <ReceiptIcon /> },
  { page: 'purchase_orders', label: 'أوامر الشراء', icon: <ClipboardListIcon /> },
  { page: 'stock_take', label: 'جرد المخزون', icon: <ClipboardCheckIcon /> },
  { page: 'customers', label: 'العملاء', icon: <UsersIcon /> },
  { page: 'suppliers', label: 'الموردين', icon: <TruckIcon /> },
  { page: 'bookings', label: 'الحجوزات', icon: <CalendarIcon /> },
  { page: 'expenses', label: 'المصاريف', icon: <WalletIcon /> },
  { page: 'coupons', label: 'الكوبونات', icon: <TicketIcon /> },
  { page: 'reports', label: 'التقارير', icon: <BarChartIcon /> },
  { page: 'audit_log', label: 'سجل النشاطات', icon: <HistoryIcon />, adminOnly: true },
  { page: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const { currentUser, logout, hasPermission } = useAuth();

  const visibleNavItems = navItemsList.filter(item => {
    return hasPermission(item.page, 'view');
  });

  if (!currentUser) return null;

  return (
    <aside className="w-64 bg-white text-gray-700 flex flex-col min-h-screen no-print border-l border-gray-200 shadow-md">
      <div className="p-4 flex items-center justify-center h-[73px] border-b border-gray-200">
        <img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="YSK Sales Logo" className="h-16"/>
      </div>
      <nav data-tour-id="sidebar-nav" className="flex-grow p-2">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <li key={item.page}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(item.page);
                }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activePage === item.page
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {React.cloneElement(item.icon, { className: "w-6 h-6" })}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="flex items-center gap-3">
            <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.id}`} alt="User Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"/>
            <div>
                <h3 className="font-semibold text-gray-800 text-sm">{currentUser.fullName}</h3>
                <p className="text-gray-500 text-xs">{currentUser.jobTitle}</p>
            </div>
            <button onClick={logout} title="تسجيل الخروج" className="mr-auto text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100">
                <LogOutIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
      <div className="p-4 text-center border-t border-gray-200 text-xs">
          <p className="font-bold text-gray-700 mb-1">Developed by: Sameh reda</p>
          <p className="text-gray-500 mb-3">للدعم الفني والمبيعات</p>
          <div className="space-y-2">
              <a href="tel:01023160657" className="flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 py-2 rounded-md transition-colors">
                  <PhoneIcon className="w-4 h-4" />
                  <span>01023160657</span>
              </a>
              <a href="https://wa.me/201023160657" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-gray-600 hover:text-green-600 bg-gray-50 hover:bg-gray-100 py-2 rounded-md transition-colors">
                  <MessageSquareIcon className="w-4 h-4" />
                  <span>Whatsapp</span>
              </a>
              <a href="mailto:same7redaa@gmail.com" className="flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-gray-100 py-2 rounded-md transition-colors">
                  <MailIcon className="w-4 h-4" />
                  <span>Email</span>
              </a>
          </div>
      </div>
    </aside>
  );
};