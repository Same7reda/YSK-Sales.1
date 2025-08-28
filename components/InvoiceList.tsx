import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Invoice, Customer, Product, Transaction, InvoiceItem } from '../types';
import { SearchIcon, PrinterIcon, Trash2Icon, EyeIcon, RotateCcwIcon } from './icons';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { InvoiceReceipt } from './InvoiceReceipt';
import { useAuditLog } from '../hooks/useAuditLog';


const currencyFormat = (amount: number) => {
    return amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
};

const statusMap: Record<Invoice['status'], { text: string; className: string }> = {
    paid: { text: 'مدفوعة', className: 'bg-green-100 text-green-800' },
    partial: { text: 'مدفوعة جزئياً', className: 'bg-yellow-100 text-yellow-800' },
    due: { text: 'مستحقة', className: 'bg-red-100 text-red-800' },
    returned: { text: 'مرتجعة', className: 'bg-gray-100 text-gray-800' },
    partially_returned: { text: 'مرتجعة جزئياً', className: 'bg-orange-100 text-orange-800' },
};

export const InvoiceList: React.FC = () => {
    const { invoices, setInvoices, customers, setCustomers, products, setProducts } = useData();
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { logAction } = useAuditLog();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
    const [returningInvoice, setReturningInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            setSearchTerm(term);
            sessionStorage.removeItem('globalSearchTerm');
        }
    }, []);

    const displayedInvoices = useMemo(() => {
        return invoices
            .filter(inv => {
                const searchMatch = inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
                
                const date = new Date(inv.date);
                const fromDate = dateRange.from ? new Date(dateRange.from) : null;
                const toDate = dateRange.to ? new Date(dateRange.to) : null;

                if(fromDate) fromDate.setHours(0,0,0,0);
                if(toDate) toDate.setHours(23,59,59,999);

                const dateMatch = (!fromDate || date >= fromDate) && (!toDate || date <= toDate);

                return searchMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, searchTerm, dateRange]);
    
    const handleSelect = (invoiceId: string, checked: boolean) => {
        const newSelection = new Set(selectedInvoices);
        if (checked) newSelection.add(invoiceId);
        else newSelection.delete(invoiceId);
        setSelectedInvoices(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedInvoices(new Set(displayedInvoices.map(inv => inv.id)));
        else setSelectedInvoices(new Set());
    };

    const handleDelete = (invoiceIds: string[]) => {
        if (!window.confirm(`هل أنت متأكد من حذف ${invoiceIds.length} فاتورة؟ لا يمكن التراجع عن هذا الإجراء.`)) return;

        let updatedInvoices = [...invoices];
        let updatedCustomers = [...customers];
        let updatedProducts = [...products];

        invoiceIds.forEach(id => {
            const invoice = updatedInvoices.find(inv => inv.id === id);
            if (!invoice) return;

            logAction('DELETE', 'Invoice', id, `حذف الفاتورة #${id} للعميل ${invoice.customerName}`);

            // 1. Restore product stock
            invoice.items.forEach(item => {
                const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    updatedProducts[productIndex].stock += item.quantity;
                }
            });

            // 2. Update customer debt and remove transaction
            if (invoice.customerId) {
                const customerIndex = updatedCustomers.findIndex(c => c.id === invoice.customerId);
                if (customerIndex !== -1) {
                    const customer = { ...updatedCustomers[customerIndex] };
                    customer.debt -= invoice.dueAmount;
                    customer.transactions = customer.transactions.filter(tx => tx.notes !== `فاتورة #${invoice.id}`);
                    updatedCustomers[customerIndex] = customer;
                }
            }
        });
        
        updatedInvoices = updatedInvoices.filter(inv => !invoiceIds.includes(inv.id));

        setInvoices(updatedInvoices);
        setCustomers(updatedCustomers);
        setProducts(updatedProducts);
        setSelectedInvoices(new Set());
        addToast(`تم حذف ${invoiceIds.length} فاتورة بنجاح`, 'success');
    };
    
    const handleSaveReturn = (
        invoice: Invoice, 
        returnedItemsQty: { [productId: string]: number },
        refundMethod?: 'cash' | 'balance'
    ) => {
        let updatedProducts = [...products];
        let updatedCustomers = [...customers];
        let updatedInvoices = [...invoices];

        const itemsToReturnForTx: InvoiceItem[] = [];
        let totalReturnValue = 0;

        // Calculate total return value and update stock
        Object.entries(returnedItemsQty).forEach(([productId, qty]) => {
            if (qty > 0) {
                const item = invoice.items.find(i => i.productId === productId);
                if(item) {
                     // Restore stock
                    const productIndex = updatedProducts.findIndex(p => p.id === productId);
                    if (productIndex !== -1) {
                        updatedProducts[productIndex].stock += qty;
                    }
                    totalReturnValue += item.price * qty;
                    itemsToReturnForTx.push({ ...item, quantity: qty });
                }
            }
        });
        
        if (totalReturnValue <= 0) {
            addToast("لم يتم تحديد كميات للإرجاع.", "error");
            return;
        }
        
        logAction('UPDATE', 'Invoice', invoice.id, `تسجيل مرتجع بقيمة ${currencyFormat(totalReturnValue)} من الفاتورة #${invoice.id}`);

        // Update customer debt and transaction
        if (invoice.customerId) {
            const customerIndex = updatedCustomers.findIndex(c => c.id === invoice.customerId);
            if (customerIndex !== -1) {
                const customer = { ...updatedCustomers[customerIndex] };
                if (refundMethod === 'balance' || invoice.paymentMethod !== 'cash') {
                    customer.debt -= totalReturnValue; 
                }
                const newTransaction: Transaction = {
                    id: `txn-ret-${Date.now()}`, type: 'return', date: new Date().toISOString(),
                    amount: totalReturnValue, notes: `مرتجع من فاتورة #${invoice.id}`, returnedItems: itemsToReturnForTx
                };
                customer.transactions = [...(customer.transactions || []), newTransaction];
                updatedCustomers[customerIndex] = customer;
            }
        }
        
        // Update invoice status and returned quantities
        const invoiceIndex = updatedInvoices.findIndex(inv => inv.id === invoice.id);
        if (invoiceIndex !== -1) {
            const originalInvoice = updatedInvoices[invoiceIndex];
            const updatedItems = originalInvoice.items.map(item => {
                const newlyReturnedQty = returnedItemsQty[item.productId] || 0;
                const previouslyReturnedQty = item.returnedQuantity || 0;
                return { ...item, returnedQuantity: previouslyReturnedQty + newlyReturnedQty };
            });

            const isFullReturn = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);
            
            updatedInvoices[invoiceIndex] = {
                ...originalInvoice,
                items: updatedItems,
                status: isFullReturn ? 'returned' : 'partially_returned',
                returnedAmount: (originalInvoice.returnedAmount || 0) + totalReturnValue,
            };
        }

        setProducts(updatedProducts);
        setCustomers(updatedCustomers);
        setInvoices(updatedInvoices);
        setReturningInvoice(null);
        addToast('تم تسجيل المرتجع بنجاح', 'success');
    };
    
    const canEdit = hasPermission('invoices', 'edit');
    const canDelete = hasPermission('invoices', 'delete');

    return (
        <div className="p-8">
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ابحث برقم الفاتورة أو اسم العميل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full"/>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                     <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({...r, from: e.target.value}))} className="bg-white border border-gray-300 rounded-md py-2 px-4 w-full"/>
                     <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({...r, to: e.target.value}))} className="bg-white border border-gray-300 rounded-md py-2 px-4 w-full"/>
                </div>
            </div>

             {selectedInvoices.size > 0 && canDelete && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedInvoices.size} فواتير محددة</p>
                    <button onClick={() => handleDelete(Array.from(selectedInvoices))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedInvoices.size === displayedInvoices.length && displayedInvoices.length > 0} /></th>
                            <th className="p-4 text-sm font-semibold text-gray-600">رقم الفاتورة</th><th className="p-4 text-sm font-semibold text-gray-600">العميل</th><th className="p-4 text-sm font-semibold text-gray-600">التاريخ</th><th className="p-4 text-sm font-semibold text-gray-600">الإجمالي</th><th className="p-4 text-sm font-semibold text-gray-600">الحالة</th><th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedInvoices.map(inv => (
                            <tr key={inv.id} className={`border-b even:bg-gray-50/50 ${selectedInvoices.has(inv.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <td className="p-4"><input type="checkbox" onChange={(e) => handleSelect(inv.id, e.target.checked)} checked={selectedInvoices.has(inv.id)}/></td>
                                <td className="p-4 font-mono text-gray-600">{inv.id}</td><td className="p-4 font-medium text-gray-800">{inv.customerName}</td><td className="p-4 text-gray-600">{new Date(inv.date).toLocaleDateString('ar-EG')}</td><td className="p-4 font-semibold">{currencyFormat(inv.total)}</td><td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[inv.status].className}`}>{statusMap[inv.status].text}</span></td>
                                <td className="p-4"><div className="flex justify-center items-center gap-2">
                                    <button onClick={() => setViewingInvoice(inv)} title="عرض" className="text-gray-500 hover:text-blue-600 p-1"><EyeIcon className="w-5 h-5"/></button>
                                    {canEdit && <button onClick={() => setReturningInvoice(inv)} title="مرتجع" disabled={inv.status === 'returned'} className="text-gray-500 hover:text-orange-600 p-1 disabled:opacity-30 disabled:cursor-not-allowed">
                                        <RotateCcwIcon className="w-5 h-5"/>
                                    </button>}
                                    {canDelete && <button onClick={() => handleDelete([inv.id])} title="حذف" className="text-gray-500 hover:text-red-600 p-1"><Trash2Icon className="w-5 h-5"/></button>}
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {viewingInvoice && <InvoiceReceipt invoice={viewingInvoice} autoPrint={false} onClose={() => setViewingInvoice(null)} />}
            {returningInvoice && <ReturnModal invoice={returningInvoice} onSave={handleSaveReturn} onClose={() => setReturningInvoice(null)} />}
        </div>
    );
};


const ReturnModal: React.FC<{invoice: Invoice, onClose: () => void, onSave: (invoice: Invoice, returnedItems: {[key: string]: number}, refundMethod?: 'cash' | 'balance') => void}> = ({invoice, onClose, onSave}) => {
    const [returnedItems, setReturnedItems] = useState<{[key: string]: number}>({});
    const [refundMethod, setRefundMethod] = useState<'cash' | 'balance'>(invoice.customerId ? 'cash' : 'cash');
    
    const handleQtyChange = (productId: string, qty: number, maxQty: number) => setReturnedItems(prev => ({ ...prev, [productId]: Math.max(0, Math.min(qty, maxQty)) }));
    const totalReturnValue = useMemo(() => invoice.items.reduce((total, item) => total + (item.price * (returnedItems[item.productId] || 0)), 0), [returnedItems, invoice.items]);
    const handleSubmit = () => { if(totalReturnValue <= 0) return alert('لم يتم تحديد أي منتجات للإرجاع.'); onSave(invoice, returnedItems, refundMethod); };
    
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col modal-content-animate"><h3 className="text-xl font-bold mb-4">مرتجع من الفاتورة: {invoice.id}</h3><div className="flex-grow overflow-y-auto border-y py-4"><table className="w-full text-center"><thead className="bg-gray-50"><tr><th className="p-2">المنتج</th><th className="p-2">الكمية المباعة</th><th className="p-2">المرتجع سابقاً</th><th className="p-2">الكمية المرتجعة</th></tr></thead><tbody>{invoice.items.map(item => { const maxQty = item.quantity - (item.returnedQuantity || 0); return (<tr key={item.productId} className="border-b"><td className="p-2 text-right">{item.name}</td><td className="p-2">{item.quantity}</td><td className="p-2">{item.returnedQuantity || 0}</td><td className="p-2"><input type="number" max={maxQty} value={returnedItems[item.productId] || 0} onChange={e => handleQtyChange(item.productId, parseInt(e.target.value) || 0, maxQty)} className="w-24 text-center border rounded-md p-1" disabled={maxQty <= 0}/></td></tr>);})}</tbody></table></div><div className="pt-4"><div className="flex justify-between items-center text-lg font-bold mb-4"><span>إجمالي قيمة المرتجع:</span><span className="text-orange-600">{currencyFormat(totalReturnValue)}</span></div>
            {invoice.customerId && totalReturnValue > 0 && (
                <div className="bg-gray-100 p-3 rounded-md mb-4">
                    <h4 className="font-semibold mb-2">طريقة رد المبلغ</h4>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="refundMethod" value="cash" checked={refundMethod === 'cash'} onChange={() => setRefundMethod('cash')} /> رد المبلغ نقداً
                        </label>
                         <label className="flex items-center gap-2">
                            <input type="radio" name="refundMethod" value="balance" checked={refundMethod === 'balance'} onChange={() => setRefundMethod('balance')} /> إضافة للرصيد
                        </label>
                    </div>
                </div>
            )}
            <div className="flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button onClick={handleSubmit} className="px-4 py-2 bg-orange-600 text-white rounded-md">تأكيد المرتجع</button></div></div></div></div>)
}