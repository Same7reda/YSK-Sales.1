import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Customer, Transaction, Invoice, CustomerGroup } from '../types';
import { SearchIcon, EditIcon, Trash2Icon, EyeIcon, WalletIcon, ChevronDown, UsersCogIcon } from './icons';
import { CustomSelect } from './CustomSelect';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from '../hooks/useAuditLog';

const currencyFormat = (amount: number) => {
    return amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

export const Customers: React.FC = () => {
    const { customers, setCustomers, invoices, customerGroups } = useData();
    const [modal, setModal] = useState<'closed' | 'add' | 'details' | 'payment' | 'assignGroup'>('closed');
    const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { logAction } = useAuditLog();

    useEffect(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            setSearchTerm(term);
            sessionStorage.removeItem('globalSearchTerm');
        }

        const openModal = sessionStorage.getItem('openAddModal');
        if (openModal && hasPermission('customers', 'edit')) {
            handleOpenModal('add');
            sessionStorage.removeItem('openAddModal');
        }
    }, [hasPermission]);

    const displayedCustomers = useMemo(() => {
        let filtered = customers.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.phone.includes(searchTerm)
        );

        if (filter === 'highestDebt') {
            filtered.sort((a, b) => b.debt - a.debt);
        } else if (filter === 'mostFrequent') {
            filtered.sort((a, b) => (b.transactions?.length || 0) - (a.transactions?.length || 0));
        }

        return filtered;
    }, [customers, searchTerm, filter]);

    const handleOpenModal = (type: 'add' | 'details' | 'payment' | 'assignGroup', customer: Customer | null = null) => {
        setCurrentCustomer(customer);
        setModal(type);
    };

    const handleCloseModal = () => {
        setModal('closed');
        setCurrentCustomer(null);
    };

    const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'debt'>, id?: string) => {
        const group = customerGroups.find(g => g.id === customerData.groupId);
        const customerToSave = { ...customerData, groupName: group?.name || '' };

        if (id) {
            setCustomers(customers.map(c => c.id === id ? { ...c, ...customerToSave } : c));
            logAction('UPDATE', 'Customer', id, `تحديث العميل: ${customerToSave.name}`);
        } else {
            const newCustomer: Customer = {
                id: `c-${Date.now()}`,
                createdAt: new Date().toISOString(),
                debt: 0,
                transactions: [],
                ...customerToSave
            };
            setCustomers([...customers, newCustomer]);
            logAction('CREATE', 'Customer', newCustomer.id, `إنشاء عميل جديد: ${newCustomer.name}`);
        }
        addToast('تم حفظ بيانات العميل بنجاح', 'success');
        handleCloseModal();
    };

    const handleMakePayment = (customerId: string, amount: number) => {
        let customerName = '';
        setCustomers(customers.map(c => {
            if (c.id === customerId) {
                customerName = c.name;
                const newTransaction: Transaction = {
                    id: `txn-${Date.now()}`,
                    type: 'payment',
                    date: new Date().toISOString(),
                    amount: amount,
                    notes: 'دفعة سداد',
                };
                return {
                    ...c,
                    debt: c.debt - amount,
                    transactions: [...(c.transactions || []), newTransaction]
                };
            }
            return c;
        }));
        logAction('PAYMENT', 'Customer', customerId, `تسجيل دفعة بقيمة ${currencyFormat(amount)} للعميل: ${customerName}`);
        addToast('تم تسجيل الدفعة بنجاح', 'success');
        handleCloseModal();
    };
    
    const handleSelect = (id: string, checked: boolean) => {
        const newSelection = new Set(selectedCustomers);
        if (checked) newSelection.add(id);
        else newSelection.delete(id);
        setSelectedCustomers(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)));
        else setSelectedCustomers(new Set());
    };

    const handleDelete = (ids: string[]) => {
        const customersToDelete = customers.filter(c => ids.includes(c.id));
        const hasDebt = customersToDelete.some(c => c.debt > 0);

        if (hasDebt) {
            addToast('لا يمكن حذف عملاء عليهم ديون مستحقة.', 'error');
            return;
        }

        if (window.confirm(`هل أنت متأكد من حذف ${ids.length} عميل؟`)) {
            setCustomers(customers.filter(c => !ids.includes(c.id)));
            customersToDelete.forEach(c => {
                logAction('DELETE', 'Customer', c.id, `حذف العميل: ${c.name}`);
            });
            addToast(`تم حذف ${ids.length} عميل بنجاح`, 'success');
            setSelectedCustomers(new Set());
        }
    };

    const handleAssignGroup = (groupId: string) => {
        const group = customerGroups.find(g => g.id === groupId);
        setCustomers(customers.map(c => {
            if (selectedCustomers.has(c.id)) {
                logAction('UPDATE', 'Customer', c.id, `تعيين مجموعة "${group?.name || 'بدون'}" للعميل: ${c.name}`);
                return { ...c, groupId: group?.id, groupName: group?.name };
            }
            return c;
        }));
        addToast(`تم تعيين المجموعة لـ ${selectedCustomers.size} عميل.`, 'success');
        setSelectedCustomers(new Set());
        handleCloseModal();
    };

    const canEdit = hasPermission('customers', 'edit');
    const canDelete = hasPermission('customers', 'delete');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                {canEdit && (
                    <button onClick={() => handleOpenModal('add')} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold">
                        إضافة عميل
                    </button>
                )}
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-1 md:col-span-2">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ابحث بالاسم أو رقم الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:ring-2 focus:ring-blue-400"/>
                </div>
                <div>
                     <CustomSelect
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { value: 'all', label: 'كل العملاء' },
                            { value: 'highestDebt', label: 'الأعلى دينًا' },
                            { value: 'mostFrequent', label: 'الأكثر تكرارًا' },
                        ]}
                    />
                </div>
            </div>

            {selectedCustomers.size > 0 && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedCustomers.size} عملاء محددون</p>
                    {canEdit && <button onClick={() => handleOpenModal('assignGroup')} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"><UsersCogIcon className="w-4 h-4"/> تعيين مجموعة</button>}
                    {canDelete && <button onClick={() => handleDelete(Array.from(selectedCustomers))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>}
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0} /></th>
                            <th className="p-4 text-sm font-semibold text-gray-600">الاسم</th><th className="p-4 text-sm font-semibold text-gray-600">الهاتف</th><th className="p-4 text-sm font-semibold text-gray-600">المجموعة</th><th className="p-4 text-sm font-semibold text-gray-600">الرصيد الحالي (الدين)</th><th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedCustomers.map(customer => (
                            <tr key={customer.id} className={`border-b even:bg-gray-50/50 hover:bg-gray-50 ${selectedCustomers.has(customer.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedCustomers.has(customer.id)} onChange={e => handleSelect(customer.id, e.target.checked)} /></td>
                                <td className="p-4 font-medium text-gray-800">{customer.name}</td><td className="p-4 text-gray-600">{customer.phone}</td><td className="p-4 text-gray-600">{customer.groupName || '-'}</td>
                                <td className={`p-4 font-semibold ${customer.debt > 0 ? 'text-red-500' : 'text-green-600'}`}>{currencyFormat(customer.debt)}</td>
                                <td className="p-4"><div className="flex justify-center items-center gap-2">
                                    <button onClick={() => handleOpenModal('details', customer)} title="عرض التفاصيل" className="text-gray-500 hover:text-blue-600 p-1"><EyeIcon className="w-5 h-5"/></button>
                                    {canEdit && <button onClick={() => handleOpenModal('payment', customer)} title="سداد دين" className="text-gray-500 hover:text-green-600 p-1"><WalletIcon className="w-5 h-5"/></button>}
                                    {canEdit && <button onClick={() => handleOpenModal('add', customer)} title="تعديل" className="text-gray-500 hover:text-blue-600 p-1"><EditIcon className="w-5 h-5"/></button>}
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal === 'add' && <CustomerModal customer={currentCustomer} groups={customerGroups} onClose={handleCloseModal} onSave={handleSaveCustomer} />}
            {modal === 'details' && currentCustomer && <CustomerDetailsModal customer={currentCustomer} invoices={invoices} onClose={handleCloseModal} />}
            {modal === 'payment' && currentCustomer && <PaymentModal customer={currentCustomer} onClose={handleCloseModal} onSave={handleMakePayment} />}
            {modal === 'assignGroup' && <AssignGroupModal groups={customerGroups} onClose={handleCloseModal} onSave={handleAssignGroup} />}
        </div>
    );
};

const CustomerModal: React.FC<{customer: Customer | null, groups: CustomerGroup[], onClose: () => void, onSave: (data: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'debt'>, id?: string) => void}> = ({customer, groups, onClose, onSave}) => {
    const [formData, setFormData] = useState({ name: customer?.name || '', phone: customer?.phone || '', email: customer?.email || '', address: customer?.address || '', notes: customer?.notes || '', groupId: customer?.groupId || '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData, customer?.id); }
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg modal-content-animate"><h3 className="text-xl font-bold mb-6">{customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input name="name" value={formData.name} onChange={handleChange} placeholder="الاسم" required className="p-2 border rounded-md"/><input name="phone" value={formData.phone} onChange={handleChange} placeholder="الهاتف" required className="p-2 border rounded-md"/></div><input name="email" value={formData.email} onChange={handleChange} placeholder="البريد الإلكتروني" type="email" className="w-full p-2 border rounded-md"/><input name="address" value={formData.address} onChange={handleChange} placeholder="العنوان" className="w-full p-2 border rounded-md"/><div><label className="block text-sm font-medium text-gray-700">مجموعة العميل</label><select name="groupId" value={formData.groupId} onChange={handleChange} className="w-full p-2 border rounded-md mt-1"><option value="">بدون مجموعة</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div><textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="ملاحظات" className="w-full p-2 border rounded-md" rows={3}></textarea><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div></form></div></div>);
}

const CustomerDetailsModal: React.FC<{customer: Customer, invoices: Invoice[], onClose: () => void}> = ({customer, invoices, onClose}) => {
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
    const toggleInvoiceDetails = (invoiceId: string) => setExpandedInvoiceId(prevId => (prevId === invoiceId ? null : invoiceId));
    const renderTransactionType = (type: Transaction['type']) => { switch(type) { case 'invoice': return <span className="text-blue-600">فاتورة</span>; case 'payment': return <span className="text-green-600">سداد</span>; case 'return': return <span className="text-orange-600">مرتجع</span>; default: return <span>{type}</span>; } }
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] flex flex-col modal-content-animate"><h3 className="text-xl font-bold mb-2">{customer.name}</h3><p className="text-gray-500 mb-4">{customer.phone} | {customer.email}</p><div className="flex-grow overflow-y-auto pr-2 -mr-2"><h4 className="font-semibold mt-4 mb-2">كشف الحساب</h4><table className="w-full text-sm text-center"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">التاريخ</th><th className="p-2">النوع</th><th className="p-2">ملاحظات</th><th className="p-2">المبلغ</th><th className="p-2 w-10"></th></tr></thead><tbody>{[...(customer.transactions || [])].reverse().map(tx => { const isInvoice = tx.type === 'invoice'; const invoiceId = isInvoice ? tx.notes.split('#')[1] : null; const invoice = invoiceId ? invoices.find(inv => inv.id === invoiceId) : null; const isExpanded = expandedInvoiceId === invoiceId; return (<React.Fragment key={tx.id}><tr className={`border-b ${isInvoice && invoice ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={() => isInvoice && invoice && toggleInvoiceDetails(invoice.id)}><td className="p-2 text-gray-600">{new Date(tx.date).toLocaleDateString('ar-EG')}</td><td className="p-2 font-semibold">{renderTransactionType(tx.type)}</td><td className="p-2">{tx.notes}</td><td className={`p-2 font-mono ${tx.type === 'payment' ? 'text-green-600' : tx.type === 'return' ? 'text-orange-600' : ''}`}>{currencyFormat(tx.amount)}</td><td>{isInvoice && invoice && (<ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />)}</td></tr>{isInvoice && isExpanded && invoice && (<tr className="bg-gray-50"><td colSpan={5} className="p-3"><h5 className="font-bold text-sm mb-2 text-right">تفاصيل الفاتورة:</h5><table className="w-full text-xs text-center bg-white rounded shadow-inner"><thead className="bg-gray-200"><tr><th className="p-2 text-right">المنتج</th><th className="p-2">الكمية</th><th className="p-2">السعر</th><th className="p-2">الإجمالي</th></tr></thead><tbody>{invoice.items.map((item, index) => (<tr key={index} className="border-b"><td className="p-2 text-right">{item.name}</td><td className="p-2">{item.quantity}</td><td className="p-2">{currencyFormat(item.price)}</td><td className="p-2 font-mono">{currencyFormat(item.price * item.quantity)}</td></tr>))}</tbody></table></td></tr>)}{(customer.transactions || []).length === 0 && (<tr><td colSpan={5} className="p-4 text-gray-400">لا توجد معاملات</td></tr>)}</React.Fragment>);})}</tbody></table></div><div className="flex justify-end gap-4 pt-6"><button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md">إغلاق</button></div></div></div>);
}

const PaymentModal: React.FC<{customer: Customer, onClose: () => void, onSave: (customerId: string, amount: number) => void}> = ({customer, onClose, onSave}) => {
    const [amount, setAmount] = useState<string>('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const numericAmount = Number(amount); if(numericAmount > 0) onSave(customer.id, numericAmount); }
    const handleNumericChange = (value: string) => { if (value === '' || /^\d*\.?\d*$/.test(value)) { setAmount(value); } };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm modal-content-animate"><h3 className="text-xl font-bold mb-2">سداد دين لـ {customer.name}</h3><p className="text-gray-600 mb-4">الدين الحالي: <span className="font-bold text-red-500">{currencyFormat(customer.debt)}</span></p><form onSubmit={handleSubmit} className="space-y-4"><input type="text" inputMode="decimal" value={amount} onChange={e => handleNumericChange(e.target.value)} max={customer.debt} placeholder="أدخل مبلغ السداد" required className="w-full p-2 border rounded-md"/><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">تأكيد السداد</button></div></form></div></div>);
}

const AssignGroupModal: React.FC<{groups: CustomerGroup[], onClose: () => void, onSave: (groupId: string) => void}> = ({groups, onClose, onSave}) => {
    const [selectedGroup, setSelectedGroup] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(selectedGroup); };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm modal-content-animate"><h3 className="text-xl font-bold mb-4">تعيين مجموعة للعملاء</h3><form onSubmit={handleSubmit} className="space-y-4"><select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full p-2 border rounded-md" required><option value="" disabled>اختر مجموعة...</option><option value="none">بدون مجموعة</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div></form></div></div>);
}