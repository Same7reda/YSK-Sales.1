import React, { useMemo } from 'react';
import { StatCard } from './StatCard';
import { SalesChart } from './SalesChart';
import { RecentActivity } from './RecentActivity';
import { QuickInvoice } from './QuickInvoice';
import { DashboardAlerts } from './DashboardAlerts';
import { DollarSignIcon, UsersIcon, CreditCardIcon, FileTextIcon, BarChartIcon } from './icons';
import { useData } from '../contexts/AuthContext';
import type { Invoice, Customer, Page, Product, Expense } from '../types';

interface DashboardProps {
    onNavigate: (page: Page) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { invoices, customers, products, expenses } = useData();

    const stats = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        const sixtyDaysAgo = new Date(new Date().setDate(now.getDate() - 60));

        const currentPeriodInvoices = invoices.filter(i => new Date(i.date) >= thirtyDaysAgo);
        const previousPeriodInvoices = invoices.filter(i => new Date(i.date) >= sixtyDaysAgo && new Date(i.date) < thirtyDaysAgo);

        const currentPeriodCustomers = customers.filter(c => new Date(c.createdAt) >= thirtyDaysAgo);
        const previousPeriodCustomers = customers.filter(c => new Date(c.createdAt) >= sixtyDaysAgo && new Date(c.createdAt) < thirtyDaysAgo);
        
        const currentPeriodExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
        
        // Total Revenue
        const currentRevenue = currentPeriodInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const previousRevenue = previousPeriodInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;
        
        // Late Invoices
        const lateInvoicesValue = invoices.filter(i => i.status === 'due' || i.status === 'partial').reduce((sum, inv) => sum + inv.dueAmount, 0);
        const lateInvoicesCountChange = 0; // Simplified for now

        // New Customers
        const newCustomersCount = currentPeriodCustomers.length;
        const previousNewCustomersCount = previousPeriodCustomers.length;
        const customerChange = previousNewCustomersCount > 0 ? ((newCustomersCount - previousNewCustomersCount) / previousNewCustomersCount) * 100 : newCustomersCount > 0 ? 100 : 0;

        // Pending Invoices
        const pendingInvoicesCount = invoices.filter(i => i.status === 'due' || i.status === 'partial').length;
        const pendingInvoicesCountChange = 0; // Simplified for now

        // Net Profit Calculation
        const costOfGoodsSold = currentPeriodInvoices.reduce((acc, inv) => {
            return acc + inv.items.reduce((itemAcc, item) => {
                const product = products.find(p => p.id === item.productId);
                return itemAcc + (product?.cost || 0) * item.quantity;
            }, 0);
        }, 0);
        const totalExpenses = currentPeriodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = currentRevenue - costOfGoodsSold - totalExpenses;
        const netProfitChange = 0; // Simplified for now

        const currencyFormat = (val: number) => val.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 });

        return {
            totalRevenue: currencyFormat(currentRevenue),
            revenueChange: parseFloat(revenueChange.toFixed(1)),
            lateInvoices: currencyFormat(lateInvoicesValue),
            lateInvoicesChange: lateInvoicesCountChange,
            newCustomers: `+${newCustomersCount}`,
            customerChange: parseFloat(customerChange.toFixed(1)),
            pendingInvoices: pendingInvoicesCount.toString(),
            pendingInvoicesChange: pendingInvoicesCountChange,
            netProfit: currencyFormat(netProfit),
            netProfitChange: parseFloat(netProfitChange.toFixed(1)),
        };
    }, [invoices, customers, products, expenses]);
    
    const handleAlertNavigate = (page: Page, itemId?: string) => {
        if (itemId) {
            sessionStorage.setItem('globalSearchTerm', itemId);
        }
        onNavigate(page);
    };

  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid */}
      <div data-tour-id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="إيرادات آخر 30 يوم" value={stats.totalRevenue} change={stats.revenueChange} icon={<DollarSignIcon />} />
        <StatCard title="صافي الربح (آخر 30 يوم)" value={stats.netProfit} change={stats.netProfitChange} icon={<BarChartIcon />} />
        <StatCard title="فواتير متأخرة" value={stats.lateInvoices} change={stats.lateInvoicesChange} icon={<CreditCardIcon />} />
        <StatCard title="عملاء جدد (آخر 30 يوم)" value={stats.newCustomers} change={stats.customerChange} icon={<UsersIcon />} />
        <StatCard title="فواتير قيد الانتظار" value={stats.pendingInvoices} change={stats.pendingInvoicesChange} icon={<FileTextIcon />} />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <SalesChart />
        </div>
        <div className="lg:col-span-1">
            <RecentActivity />
        </div>
        <div data-tour-id="quick-invoice" className="lg:col-span-2">
            <QuickInvoice />
        </div>
        <div className="lg:col-span-1">
            <DashboardAlerts onNavigate={handleAlertNavigate} />
        </div>
      </div>
    </div>
  );
};