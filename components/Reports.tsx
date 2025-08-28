import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Invoice, Product, Expense, Customer, Supplier, InvoiceItem } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSignIcon, TrendingUpIcon, TrendingDownIcon, PrinterIcon, PackageIcon, UsersIcon, FileTextIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
const numberFormat = (num: number) => num.toLocaleString('ar-EG');
type ReportTab = 'general_summary' | 'profit_loss' | 'sales' | 'inventory' | 'clients_suppliers';

// --- Helper Hooks ---
const useFilteredData = (dateRange: { from: string, to: string }) => {
    const { invoices, expenses, products, customers, suppliers } = useData();
    return useMemo(() => {
        const fromDate = new Date(dateRange.from); fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange.to); toDate.setHours(23, 59, 59, 999);
        const filterByDate = (item: { date: string }) => { const itemDate = new Date(item.date); return itemDate >= fromDate && itemDate <= toDate; };

        return {
            invoices: invoices.filter(filterByDate),
            expenses: expenses.filter(filterByDate),
            products, 
            customers, 
            suppliers
        };
    }, [dateRange, invoices, expenses, products, customers, suppliers]);
};

const useProfitLossCalculations = (filteredInvoices: Invoice[], filteredExpenses: Expense[], allProducts: Product[]) => {
    return useMemo(() => {
        const productMap = new Map(allProducts.map(p => [p.id, p]));
        
        const totalRevenue = filteredInvoices.reduce((acc, inv) => acc + inv.total - (inv.returnedAmount || 0), 0);
        
        const costOfGoodsSold = filteredInvoices.reduce((acc, inv) => {
            return acc + inv.items.reduce((itemAcc, item) => {
                const product = productMap.get(item.productId);
                const netQuantitySold = item.quantity - (item.returnedQuantity || 0);
                return itemAcc + (product?.cost || 0) * netQuantitySold;
            }, 0);
        }, 0);

        const grossProfit = totalRevenue - costOfGoodsSold;
        const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        const netProfit = grossProfit - totalExpenses;
        
        const expensesByType = filteredExpenses.reduce((acc, exp) => {
            acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        return { totalRevenue, costOfGoodsSold, grossProfit, totalExpenses, netProfit, expensesByType };
    }, [filteredInvoices, filteredExpenses, allProducts]);
};


// Main Component
export const Reports: React.FC = () => {
    const { hasPermission } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportTab>('general_summary');

    const [dateRange, setDateRange] = useState(() => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 29); // Default to last 30 days
        return {
            from: from.toISOString().split('T')[0],
            to: to.toISOString().split('T')[0]
        };
    });
    
    // Lift state and calculations to the parent component
    const filteredData = useFilteredData(dateRange);
    const profitLossData = useProfitLossCalculations(filteredData.invoices, filteredData.expenses, filteredData.products);


    const setDatePreset = (preset: 'today' | 'week' | 'month' | 'year') => {
        const to = new Date();
        let from = new Date();
        if (preset === 'today') { /* from is already today */ } 
        else if (preset === 'week') { from.setDate(to.getDate() - 6); }
        else if (preset === 'month') { from.setMonth(to.getMonth() - 1); }
        else if (preset === 'year') { from.setFullYear(to.getFullYear() - 1); }
        setDateRange({ from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] });
    };

    const handlePrint = () => window.print();

    const tabs: { id: ReportTab; label: string }[] = [
        { id: 'general_summary', label: 'ملخص عام' },
        { id: 'profit_loss', label: 'الأرباح والخسائر' },
        { id: 'sales', label: 'المبيعات' },
        { id: 'inventory', label: 'المخزون' },
        { id: 'clients_suppliers', label: 'العملاء والموردين' },
    ];
    
    const renderContent = () => {
        switch(activeTab) {
            case 'general_summary': return <GeneralSummary invoices={filteredData.invoices} profitLoss={profitLossData} />;
            case 'profit_loss': return <ProfitLossStatement dateRange={dateRange} profitLoss={profitLossData} />;
            case 'sales': return <SalesDetails invoices={filteredData.invoices} />;
            case 'inventory': return <InventoryReport products={filteredData.products} />;
            case 'clients_suppliers': return <ClientsSuppliersReport customers={filteredData.customers} suppliers={filteredData.suppliers} />;
            default: return null;
        }
    }

    return (
        <div className="p-8 bg-gray-50">
            <div className="print-only hidden my-4 text-center">
                <h1 className="text-2xl font-bold">تقرير شامل</h1>
                <p className="text-gray-600">من {dateRange.from} إلى {dateRange.to}</p>
            </div>
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap items-center gap-4 no-print">
                <span className="font-semibold">تصفية حسب التاريخ:</span>
                <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({...r, from: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-md py-2 px-4"/>
                <span>إلى</span>
                <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({...r, to: e.target.value}))} className="bg-gray-50 border border-gray-300 rounded-md py-2 px-4"/>
                <button onClick={() => setDatePreset('today')} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">اليوم</button>
                <button onClick={() => setDatePreset('week')} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">آخر 7 أيام</button>
                <button onClick={() => setDatePreset('month')} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">آخر شهر</button>
                <button onClick={() => setDatePreset('year')} className="px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">آخر سنة</button>
                 {hasPermission('reports', 'print') && (
                    <button onClick={handlePrint} className="mr-auto px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700"><PrinterIcon className="w-5 h-5"/> طباعة التقرير</button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 no-print">
                <div className="flex border-b">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 font-semibold transition-colors ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
                    ))}
                </div>
            </div>
            
            <div className="printable-section format-a4">
                {renderContent()}
            </div>
        </div>
    );
};

// --- Sub-Components for Tabs ---

interface GeneralSummaryProps {
    invoices: Invoice[];
    profitLoss: ReturnType<typeof useProfitLossCalculations>;
}

const GeneralSummary: React.FC<GeneralSummaryProps> = ({ invoices, profitLoss }) => {
    const { totalRevenue, netProfit, totalExpenses, expensesByType } = profitLoss;
    
    const expenseChartData = Object.entries(expensesByType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCardReport title="صافي الإيرادات" value={currencyFormat(totalRevenue)} icon={<DollarSignIcon />} />
                <StatCardReport title="إجمالي المصاريف" value={currencyFormat(totalExpenses)} icon={<TrendingDownIcon />} />
                <StatCardReport title="صافي الربح" value={currencyFormat(netProfit)} icon={<TrendingUpIcon />} positive={netProfit >= 0} />
                <StatCardReport title="عدد الفواتير" value={numberFormat(invoices.length)} icon={<FileTextIcon />} />
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">توزيع المصروفات</h3>
                {expenseChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={expenseChartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={120} fill="#8884d8" dataKey="value">
                                {expenseChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip formatter={(value) => currencyFormat(value as number)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <p className="text-center text-gray-500 py-10">لا توجد بيانات مصروفات لهذه الفترة.</p>}
            </div>
        </div>
    );
};

interface ProfitLossStatementProps {
    dateRange: { from: string, to: string };
    profitLoss: ReturnType<typeof useProfitLossCalculations>;
}

const ProfitLossStatement: React.FC<ProfitLossStatementProps> = ({ dateRange, profitLoss }) => {
    const { totalRevenue, costOfGoodsSold, grossProfit, totalExpenses, netProfit, expensesByType } = profitLoss;
    
    return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">كشف الأرباح والخسائر</h2>
            <p className="text-center text-gray-500 mb-8">للفترة من {dateRange.from} إلى {dateRange.to}</p>
            <div className="space-y-4 text-lg">
                <div className="flex justify-between items-center py-2"><span className="font-semibold text-gray-700">صافي الإيرادات (بعد المرتجعات)</span><span className="font-bold text-green-600">{currencyFormat(totalRevenue)}</span></div>
                <div className="flex justify-between items-center py-2 border-b"><span className="font-semibold text-gray-700">تكلفة البضاعة المباعة (COGS)</span><span className="font-bold text-red-600">({currencyFormat(costOfGoodsSold)})</span></div>
                <div className="flex justify-between items-center py-3 bg-gray-50 rounded-md px-4"><span className="font-bold text-xl">هامش الربح الإجمالي</span><span className="font-extrabold text-xl text-blue-700">{currencyFormat(grossProfit)}</span></div>
                <div className="py-2"><h3 className="font-semibold text-gray-800 my-3">المصروفات التشغيلية:</h3><div className="space-y-2 pr-6 text-base border-r-2">
                    {Object.entries(expensesByType).map(([type, amount]) => (
                        <div key={type} className="flex justify-between text-gray-600"><span>{type}</span><span>({currencyFormat(amount)})</span></div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t"><span className="text-gray-700">إجمالي المصروفات</span><span className="text-red-600">({currencyFormat(totalExpenses)})</span></div>
                </div></div>
                <div className={`flex justify-between items-center py-4 px-4 rounded-md text-white ${netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}><span className="font-bold text-2xl">صافي الربح / الخسارة</span><span className="font-extrabold text-2xl">{currencyFormat(netProfit)}</span></div>
            </div>
        </div>
    );
};

const SalesDetails: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
    return (
         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-center">
                <thead className="bg-gray-50 border-b"><tr><th className="p-3">رقم الفاتورة</th><th className="p-3">العميل</th><th className="p-3">التاريخ</th><th className="p-3">الإجمالي</th><th className="p-3">المدفوع</th><th className="p-3">الحالة</th></tr></thead>
                <tbody>{invoices.map(inv => (<tr key={inv.id} className="border-b hover:bg-gray-50"><td className="p-3 font-mono">{inv.id}</td><td className="p-3">{inv.customerName}</td><td className="p-3">{new Date(inv.date).toLocaleDateString('ar-EG')}</td><td className="p-3 font-semibold">{currencyFormat(inv.total)}</td><td className="p-3">{currencyFormat(inv.paidAmount)}</td><td className="p-3">{inv.status}</td></tr>))}</tbody>
            </table>
        </div>
    );
};

const InventoryReport: React.FC<{ products: Product[] }> = ({ products }) => {
    const inventoryValueCost = products.reduce((acc, p) => acc + p.cost * p.stock, 0);
    const inventoryValueSale = products.reduce((acc, p) => acc + p.price * p.stock, 0);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCardReport title="القيمة الإجمالية للمخزون (بسعر التكلفة)" value={currencyFormat(inventoryValueCost)} icon={<PackageIcon />} />
                <StatCardReport title="القيمة الإجمالية للمخزون (بسعر البيع)" value={currencyFormat(inventoryValueSale)} icon={<DollarSignIcon />} />
            </div>
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-3">المنتج</th><th className="p-3">الكمية الحالية</th><th className="p-3">سعر التكلفة</th><th className="p-3">إجمالي التكلفة</th><th className="p-3">سعر البيع</th><th className="p-3">إجمالي البيع</th></tr></thead>
                    <tbody>{products.map(p => (<tr key={p.id} className="border-b hover:bg-gray-50"><td className="p-3">{p.name}</td><td className="p-3">{p.stock}</td><td className="p-3">{currencyFormat(p.cost)}</td><td className="p-3 font-semibold">{currencyFormat(p.cost * p.stock)}</td><td className="p-3">{currencyFormat(p.price)}</td><td className="p-3 font-semibold">{currencyFormat(p.price * p.stock)}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

const ClientsSuppliersReport: React.FC<{ customers: Customer[], suppliers: Supplier[] }> = ({ customers, suppliers }) => {
    const totalCustomerDebt = customers.reduce((acc, c) => acc + c.debt, 0);
    const totalSupplierDebt = suppliers.reduce((acc, s) => acc + s.debt, 0);
    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCardReport title="إجمالي ديون العملاء (مستحقات لك)" value={currencyFormat(totalCustomerDebt)} icon={<UsersIcon />} positive={false} />
                <StatCardReport title="إجمالي مستحقات الموردين (ديون عليك)" value={currencyFormat(totalSupplierDebt)} icon={<PackageIcon />} positive={false} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <h3 className="p-4 font-bold text-lg border-b">كشف ديون العملاء</h3>
                    <table className="w-full text-center">
                        <thead className="bg-gray-50"><tr><th className="p-3">العميل</th><th className="p-3">الهاتف</th><th className="p-3">مبلغ الدين</th></tr></thead>
                        <tbody>{customers.filter(c => c.debt > 0).map(c => (<tr key={c.id} className="border-b hover:bg-gray-50"><td className="p-3">{c.name}</td><td className="p-3">{c.phone}</td><td className="p-3 font-bold text-red-600">{currencyFormat(c.debt)}</td></tr>))}</tbody>
                    </table>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                     <h3 className="p-4 font-bold text-lg border-b">كشف مستحقات الموردين</h3>
                     <table className="w-full text-center">
                        <thead className="bg-gray-50"><tr><th className="p-3">المورد</th><th className="p-3">الهاتف</th><th className="p-3">المبلغ المستحق</th></tr></thead>
                        <tbody>{suppliers.filter(s => s.debt > 0).map(s => (<tr key={s.id} className="border-b hover:bg-gray-50"><td className="p-3">{s.name}</td><td className="p-3">{s.phone}</td><td className="p-3 font-bold text-red-600">{currencyFormat(s.debt)}</td></tr>))}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// FIX: Changed icon type from React.ReactElement to React.ReactElement<React.SVGProps<SVGSVGElement>> to allow passing className via React.cloneElement.
const StatCardReport: React.FC<{ title: string; value: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; positive?: boolean }> = ({ title, value, icon, positive }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <span className="text-gray-500 font-medium">{title}</span>
                <span className={`block text-3xl font-bold mt-1 ${positive === false ? 'text-red-500' : 'text-gray-800'}`}>
                    {value}
                </span>
            </div>
            <div className={`p-3 rounded-full ${positive === false ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {React.cloneElement(icon, { className: 'w-6 h-6' })}
            </div>
        </div>
    </div>
);