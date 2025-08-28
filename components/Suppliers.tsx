import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Supplier, SupplierTransaction, PurchaseInvoice, Product, InvoiceItem } from '../types';
import { SearchIcon, EditIcon, Trash2Icon, EyeIcon, WalletIcon, FileTextIcon, PlusCircleIcon, ChevronDown } from './icons';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from '../hooks/useAuditLog';

const currencyFormat = (amount: number) => {
    return amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

export const Suppliers: React.FC = () => {
    const { suppliers, setSuppliers, products, setProducts, purchaseInvoices, setPurchaseInvoices } = useData();
    
    const [modal, setModal] = useState<'closed' | 'add' | 'details' | 'payment' | 'purchase'>('closed');
    const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { logAction } = useAuditLog();

    useEffect(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            setSearchTerm(term);
            sessionStorage.removeItem('globalSearchTerm');
        }
    }, []);

    const displayedSuppliers = useMemo(() => {
        return suppliers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.phone.includes(searchTerm)
        );
    }, [suppliers, searchTerm]);

    const handleOpenModal = (type: 'add' | 'details' | 'payment' | 'purchase', supplier: Supplier | null = null) => {
        setCurrentSupplier(supplier);
        setModal(type);
    };

    const handleCloseModal = () => {
        setModal('closed');
        setCurrentSupplier(null);
    };

    const handleSaveSupplier = (supplierData: Omit<Supplier, 'id' | 'transactions' | 'debt'>, id?: string) => {
        if (id) {
            setSuppliers(suppliers.map(s => s.id === id ? { ...s, ...supplierData } : s));
            logAction('UPDATE', 'Supplier', id, `تحديث المورد: ${supplierData.name}`);
        } else {
            const newSupplier: Supplier = {
                id: `s-${Date.now()}`,
                debt: 0,
                transactions: [],
                ...supplierData
            };
            setSuppliers([...suppliers, newSupplier]);
            logAction('CREATE', 'Supplier', newSupplier.id, `إنشاء مورد جديد: ${newSupplier.name}`);
        }
        addToast('تم حفظ بيانات المورد بنجاح', 'success');
        handleCloseModal();
    };

    const handleMakePayment = (supplierId: string, amount: number) => {
        let supplierName = '';
        setSuppliers(suppliers.map(s => {
            if (s.id === supplierId) {
                supplierName = s.name;
                const newTransaction: SupplierTransaction = {
                    id: `stx-${Date.now()}`,
                    type: 'payment',
                    date: new Date().toISOString(),
                    amount: amount,
                    notes: 'دفعة سداد للمورد',
                };
                return { ...s, debt: s.debt - amount, transactions: [...s.transactions, newTransaction] };
            }
            return s;
        }));
        logAction('PAYMENT', 'Supplier', supplierId, `تسجيل دفعة بقيمة ${currencyFormat(amount)} للمورد: ${supplierName}`);
        addToast('تم تسجيل الدفعة بنجاح', 'success');
        handleCloseModal();
    };
    
    const handleSavePurchase = (invoiceData: Omit<PurchaseInvoice, 'id'>) => {
        let finalProducts = [...products];
        const newProductsToAdd: Product[] = [];

        const finalCartItems = invoiceData.items.map(item => {
            if (item.isNew) {
                const newProduct: Product = {
                    id: `p-${Date.now()}-${Math.random()}`, name: item.name, price: 0, // Selling price is set later
                    cost: item.price, // Purchase price from invoice is the cost
                    stock: 0,
                    category: 'غير مصنف', unit: 'قطعة', supplier: invoiceData.supplierName, barcode: `${Date.now()}`
                };
                newProductsToAdd.push(newProduct);
                return { ...item, productId: newProduct.id };
            }
            return item;
        });

        if (newProductsToAdd.length > 0) finalProducts = [...finalProducts, ...newProductsToAdd];

        const newInvoice: PurchaseInvoice = { ...invoiceData, items: finalCartItems, id: `P-INV-${Date.now()}`};
        
        setPurchaseInvoices(prev => [...prev, newInvoice]);
        logAction('CREATE', 'PurchaseInvoice', newInvoice.id, `إنشاء فاتورة شراء من ${newInvoice.supplierName} بقيمة ${currencyFormat(newInvoice.total)}`);
        
        setSuppliers(suppliers.map(s => {
            if (s.id === newInvoice.supplierId) {
                const newTransaction: SupplierTransaction = {
                    id: `stx-${Date.now()}`, type: 'purchase', date: newInvoice.date,
                    amount: newInvoice.total, notes: `فاتورة شراء #${newInvoice.id}`,
                };
                return { ...s, debt: s.debt + newInvoice.dueAmount, transactions: [...s.transactions, newTransaction]};
            }
            return s;
        }));
        
        const updatedProducts = [...finalProducts];
        newInvoice.items.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if (productIndex !== -1) {
                updatedProducts[productIndex].stock += item.quantity;
                updatedProducts[productIndex].cost = item.price; // Update product cost with purchase price
            }
        });
        setProducts(updatedProducts);

        addToast('تم حفظ فاتورة الشراء بنجاح', 'success');
        handleCloseModal();
    };

    const handleSelect = (id: string, checked: boolean) => {
        const newSelection = new Set(selectedSuppliers);
        if (checked) newSelection.add(id);
        else newSelection.delete(id);
        setSelectedSuppliers(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedSuppliers(new Set(displayedSuppliers.map(s => s.id)));
        else setSelectedSuppliers(new Set());
    };

    const handleDelete = (ids: string[]) => {
        const suppliersToDelete = suppliers.filter(s => ids.includes(s.id));
        const hasDebt = suppliersToDelete.some(s => s.debt > 0);

        if (hasDebt) {
            addToast('لا يمكن حذف موردين لهم مستحقات مالية.', 'error');
            return;
        }

        if (window.confirm(`هل أنت متأكد من حذف ${ids.length} مورد؟`)) {
            setSuppliers(suppliers.filter(s => !ids.includes(s.id)));
            suppliersToDelete.forEach(s => {
                logAction('DELETE', 'Supplier', s.id, `حذف المورد: ${s.name}`);
            });
            addToast(`تم حذف ${ids.length} مورد بنجاح`, 'success');
            setSelectedSuppliers(new Set());
        }
    };

    const canEdit = hasPermission('suppliers', 'edit');
    const canDelete = hasPermission('suppliers', 'delete');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                {canEdit && (
                    <button onClick={() => handleOpenModal('add')} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold">
                        إضافة مورد
                    </button>
                )}
            </div>

            <div className="mb-4 relative">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="ابحث بالاسم أو رقم الهاتف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full md:w-1/3 focus:ring-2 focus:ring-blue-400"/>
            </div>
            
             {selectedSuppliers.size > 0 && canDelete && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedSuppliers.size} موردون محددون</p>
                    <button onClick={() => handleDelete(Array.from(selectedSuppliers))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedSuppliers.size === displayedSuppliers.length && displayedSuppliers.length > 0} /></th>
                            <th className="p-4 text-sm font-semibold text-gray-600">الاسم</th><th className="p-4 text-sm font-semibold text-gray-600">الهاتف</th><th className="p-4 text-sm font-semibold text-gray-600">الرصيد الحالي (مستحقات)</th><th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th></tr>
                    </thead>
                    <tbody>
                        {displayedSuppliers.map(supplier => (
                            <tr key={supplier.id} className={`border-b even:bg-gray-50/50 hover:bg-gray-50 ${selectedSuppliers.has(supplier.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedSuppliers.has(supplier.id)} onChange={e => handleSelect(supplier.id, e.target.checked)} /></td>
                                <td className="p-4 font-medium text-gray-800">{supplier.name}</td>
                                <td className="p-4 text-gray-600">{supplier.phone}</td>
                                <td className={`p-4 font-semibold ${supplier.debt > 0 ? 'text-red-500' : 'text-green-600'}`}>{currencyFormat(supplier.debt)}</td>
                                <td className="p-4"><div className="flex justify-center items-center gap-2">
                                    {canEdit && <button onClick={() => handleOpenModal('purchase', supplier)} title="فاتورة شراء" className="text-gray-500 hover:text-blue-600 p-1"><FileTextIcon className="w-5 h-5"/></button>}
                                    {canEdit && <button onClick={() => handleOpenModal('payment', supplier)} title="سداد للمورد" className="text-gray-500 hover:text-green-600 p-1"><WalletIcon className="w-5 h-5"/></button>}
                                    <button onClick={() => handleOpenModal('details', supplier)} title="عرض التفاصيل" className="text-gray-500 hover:text-indigo-600 p-1"><EyeIcon className="w-5 h-5"/></button>
                                    {canEdit && <button onClick={() => handleOpenModal('add', supplier)} title="تعديل" className="text-gray-500 hover:text-blue-600 p-1"><EditIcon className="w-5 h-5"/></button>}
                                </div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {modal === 'add' && <SupplierModal supplier={currentSupplier} onClose={handleCloseModal} onSave={handleSaveSupplier} />}
            {modal === 'details' && currentSupplier && <SupplierDetailsModal supplier={currentSupplier} purchaseInvoices={purchaseInvoices} onClose={handleCloseModal} />}
            {modal === 'payment' && currentSupplier && <PaymentModal supplier={currentSupplier} onClose={handleCloseModal} onSave={handleMakePayment} />}
            {modal === 'purchase' && currentSupplier && <PurchaseInvoiceModal supplier={currentSupplier} allProducts={products} onClose={handleCloseModal} onSave={handleSavePurchase} />}
        </div>
    );
};

const SupplierModal: React.FC<{supplier: Supplier | null, onClose: () => void, onSave: (data: Omit<Supplier, 'id' | 'transactions' | 'debt'>, id?: string) => void}> = ({supplier, onClose, onSave}) => {
    const [formData, setFormData] = useState({ name: supplier?.name || '', phone: supplier?.phone || '', notes: supplier?.notes || '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData, supplier?.id); }
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg modal-content-animate"><h3 className="text-xl font-bold mb-6">{supplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3><form onSubmit={handleSubmit} className="space-y-4"><input name="name" value={formData.name} onChange={handleChange} placeholder="الاسم" required className="w-full p-2 border rounded-md"/><input name="phone" value={formData.phone} onChange={handleChange} placeholder="الهاتف" required className="w-full p-2 border rounded-md"/><textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="ملاحظات" className="w-full p-2 border rounded-md" rows={3}></textarea><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div></form></div></div>);
}

const SupplierDetailsModal: React.FC<{supplier: Supplier, purchaseInvoices: PurchaseInvoice[], onClose: () => void}> = ({supplier, purchaseInvoices, onClose}) => {
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl max-h-[90vh] flex flex-col modal-content-animate">
                <h3 className="text-xl font-bold mb-2">{supplier.name}</h3><p className="text-gray-500 mb-4">كشف حساب المورد</p>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">التاريخ</th><th className="p-2">النوع</th><th className="p-2">ملاحظات</th><th className="p-2">المبلغ</th><th className="p-2 w-10"></th></tr></thead>
                        <tbody>
                            {[...supplier.transactions].reverse().map(tx => {
                                const isPurchase = tx.type === 'purchase';
                                const invoiceId = isPurchase ? tx.notes.replace('فاتورة شراء #', '') : null;
                                const invoice = invoiceId ? purchaseInvoices.find(inv => inv.id === invoiceId) : null;
                                const isExpanded = expandedInvoiceId === invoiceId;
                                return (<React.Fragment key={tx.id}>
                                    <tr className={`border-b ${isPurchase && invoice ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={() => isPurchase && invoice && setExpandedInvoiceId(prev => prev === invoiceId ? null : invoiceId)}>
                                        <td className="p-2">{new Date(tx.date).toLocaleDateString('ar-EG')}</td><td className={`p-2 font-semibold ${isPurchase ? 'text-blue-600' : 'text-green-600'}`}>{isPurchase ? 'شراء' : 'سداد'}</td><td className="p-2">{tx.notes}</td><td className="p-2 font-mono">{currencyFormat(tx.amount)}</td><td>{isPurchase && invoice && (<ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />)}</td>
                                    </tr>
                                    {isPurchase && isExpanded && invoice && (<tr className="bg-gray-50"><td colSpan={5} className="p-3"><h5 className="font-bold text-sm mb-2 text-right">تفاصيل الفاتورة:</h5><table className="w-full text-xs text-center bg-white rounded shadow-inner"><thead className="bg-gray-200"><tr><th className="p-2 text-right">المنتج</th><th className="p-2">الكمية</th><th className="p-2">السعر</th><th className="p-2">الإجمالي</th></tr></thead><tbody>{invoice.items.map((item, index) => (<tr key={index} className="border-b"><td className="p-2 text-right">{item.name}</td><td className="p-2">{item.quantity}</td><td className="p-2">{currencyFormat(item.price)}</td><td className="p-2 font-mono">{currencyFormat(item.price * item.quantity)}</td></tr>))}</tbody></table></td></tr>)}
                                </React.Fragment>);
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-4 pt-6"><button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md">إغلاق</button></div>
            </div>
        </div>
    );
}

const PaymentModal: React.FC<{supplier: Supplier, onClose: () => void, onSave: (supplierId: string, amount: number) => void}> = ({supplier, onClose, onSave}) => {
    const [amount, setAmount] = useState<string>('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const numericAmount = Number(amount); if(numericAmount > 0) onSave(supplier.id, numericAmount); }
    const handleNumericChange = (value: string) => { if (value === '' || /^\d*\.?\d*$/.test(value)) { setAmount(value); } };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm modal-content-animate"><h3 className="text-xl font-bold mb-2">سداد للمورد: {supplier.name}</h3><p className="text-gray-600 mb-4">المبلغ المستحق: <span className="font-bold text-red-500">{currencyFormat(supplier.debt)}</span></p><form onSubmit={handleSubmit} className="space-y-4"><input type="text" inputMode="decimal" value={amount} onChange={e => handleNumericChange(e.target.value)} max={supplier.debt} placeholder="أدخل مبلغ السداد" required className="w-full p-2 border rounded-md"/><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">تأكيد السداد</button></div></form></div></div>);
}

const PurchaseInvoiceModal: React.FC<{supplier: Supplier, allProducts: Product[], onClose: () => void, onSave: (invoice: Omit<PurchaseInvoice, 'id'>) => void}> = ({supplier, allProducts, onClose, onSave}) => {
    const [cart, setCart] = useState<InvoiceItem[]>([]); const [searchTerm, setSearchTerm] = useState(''); const [searchResults, setSearchResults] = useState<Product[]>([]); const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'partial'>('credit'); const [paidAmount, setPaidAmount] = useState<string>('');
    useEffect(() => { if (searchTerm) setSearchResults(allProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))); else setSearchResults([]); }, [searchTerm, allProducts]);
    const addProductToCart = (product: Product | {name: string}) => { setCart(prev => { if ('id' in product) { const existing = prev.find(item => item.productId === product.id); if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item); return [...prev, { productId: product.id, name: product.name, price: product.cost, quantity: 1 }]; } else { return [...prev, { productId: `new_${Date.now()}`, name: product.name, price: 0, quantity: 1, isNew: true }]; }}); setSearchTerm(''); };
    const updateItem = (productId: string, price: number, quantity: number) => setCart(cart.map(item => item.productId === productId ? { ...item, price, quantity } : item).filter(item => item.quantity > 0));
    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const handleNumericChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => { if (value === '' || /^\d*\.?\d*$/.test(value)) { setter(value); } };
    const handleSubmit = () => { if (cart.length === 0) return alert('الفاتورة فارغة'); const finalPaidAmount = paymentMethod === 'cash' ? total : Number(paidAmount) || 0; const dueAmount = total - finalPaidAmount; onSave({ supplierId: supplier.id, supplierName: supplier.name, items: cart, total, paymentMethod, paidAmount: finalPaidAmount, dueAmount, date: new Date().toISOString(), }); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col modal-content-animate">
                <h3 className="text-xl font-bold mb-4">فاتورة شراء من: {supplier.name}</h3>
                <div className="grid grid-cols-3 gap-6 flex-grow overflow-hidden">
                    <div className="col-span-2 flex flex-col overflow-hidden">
                        <div className="relative mb-4">
                            <input type="text" placeholder="ابحث أو اكتب اسم منتج جديد..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md"/>
                            {(searchResults.length > 0 || searchTerm) && 
                                <div className="absolute z-10 w-full bg-white border shadow-lg max-h-48 overflow-y-auto">
                                    {searchResults.map(p => <div key={p.id} onClick={() => addProductToCart(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</div>)}
                                    {searchTerm && !searchResults.some(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (<div onClick={() => addProductToCart({ name: searchTerm })} className="p-2 hover:bg-green-100 cursor-pointer text-green-700 font-semibold">+ إضافة منتج جديد: "{searchTerm}"</div>)}
                                </div>
                            }
                        </div>
                        <div className="flex-grow overflow-y-auto border rounded-md">
                            <table className="w-full text-center">
                                <thead className="bg-gray-50"><tr><th className="p-2">المنتج</th><th className="p-2">سعر الشراء</th><th className="p-2">الكمية</th><th className="p-2">الإجمالي</th></tr></thead>
                                <tbody>{cart.map(item => <tr key={item.productId} className="border-b"><td className="p-2">{item.name}</td><td className="p-1"><input type="number" value={item.price} onChange={e => updateItem(item.productId, +e.target.value, item.quantity)} className="w-24 p-1 border rounded-md text-center"/></td><td className="p-1"><input type="number" value={item.quantity} onChange={e => updateItem(item.productId, item.price, +e.target.value)} className="w-20 p-1 border rounded-md text-center"/></td><td className="p-2 font-semibold">{currencyFormat(item.price * item.quantity)}</td></tr>)}</tbody>
                            </table>
                        </div>
                    </div>
                    <div className="col-span-1 flex flex-col">
                        <div className="border rounded-md p-4 flex-grow flex flex-col">
                            <h4 className="text-lg font-bold mb-4">ملخص الفاتورة</h4>
                            <div className="flex justify-between text-xl font-bold mb-4 border-y py-2"><span>الإجمالي:</span><span>{currencyFormat(total)}</span></div>
                            <h5 className="font-semibold mb-2">طريقة الدفع</h5>
                            <div className="grid grid-cols-3 gap-2 mb-4">{(['credit', 'cash', 'partial'] as const).map(m => <button key={m} onClick={() => setPaymentMethod(m)} className={`p-2 rounded-md border ${paymentMethod === m ? 'bg-blue-600 text-white' : ''}`}>{{'credit':'آجل', 'cash':'نقدي', 'partial':'جزئي'}[m]}</button>)}</div>
                            {paymentMethod === 'partial' && <input type="text" inputMode="decimal" placeholder="المبلغ المدفوع" value={paidAmount} onChange={e => handleNumericChange(e.target.value, setPaidAmount)} className="w-full p-2 border rounded-md"/>}
                            <div className="mt-auto flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ الفاتورة</button></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}