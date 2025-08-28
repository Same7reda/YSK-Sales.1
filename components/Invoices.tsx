import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Product, Customer, Invoice, InvoiceItem, Transaction, Booking, Page, Coupon } from '../types';
import { SearchIcon, Trash2Icon, PlusCircleIcon, PrinterIcon, PackageIcon, TicketIcon } from './icons';
import { useToast } from './Toast';
import { useSync } from '../contexts/AuthContext';
import { InvoiceReceipt } from './InvoiceReceipt';
import { useAuditLog } from '../hooks/useAuditLog';

export const Invoices: React.FC = () => {
    const { products, setProducts, customers, setCustomers, invoices, setInvoices, bookings, setBookings, coupons, printSettings } = useData();
    const { addToast } = useToast();
    const { scannedCode, clearScannedCode } = useSync();
    const { logAction } = useAuditLog();

    const [cart, setCart] = useState<InvoiceItem[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
    
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'partial'>('cash');
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [paidAmount, setPaidAmount] = useState<string>('');
    
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [discount, setDiscount] = useState({ type: 'fixed' as 'percentage' | 'fixed', value: '' });
    const [tax, setTax] = useState({ type: 'fixed' as 'percentage' | 'fixed', value: '' });

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

    const productSearchInputRef = useRef<HTMLInputElement>(null);
    
    const bookedQuantities = useMemo(() => {
        const quantities: { [productId: string]: number } = {};
        bookings
            .filter(b => b.status === 'confirmed')
            .forEach(b => {
                b.items.forEach(item => {
                    quantities[item.productId] = (quantities[item.productId] || 0) + item.quantity;
                });
            });
        return quantities;
    }, [bookings]);

     useEffect(() => {
        const bookingId = sessionStorage.getItem('bookingToConvert');
        if (bookingId) {
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                const bookingCartItems: InvoiceItem[] = booking.items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    return { productId: item.productId, name: item.productName, price: product?.price || 0, quantity: item.quantity };
                });
                setCart(bookingCartItems);

                const customer = customers.find(c => c.id === booking.customerId);
                if (customer) {
                    setSelectedCustomer(customer);
                    setCustomerSearchTerm(customer.name);
                }

                if (booking.deposit > 0) {
                    setPaymentMethod('partial');
                    setPaidAmount(String(booking.deposit));
                }
            }
            // Do not remove from session storage until sale is complete
        }
    }, []); // Run only once on component mount

    useEffect(() => {
        if (scannedCode) {
            const product = products.find(p => p.barcode === scannedCode);
            if (product) {
                addProductToCart(product);
            } else {
                addToast(`لم يتم العثور على منتج بالباركود: ${scannedCode}`, 'error');
            }
            clearScannedCode();
        }
    }, [scannedCode, clearScannedCode, products]);


    useEffect(() => {
        if (productSearchTerm) {
            setProductSearchResults(
                products.filter(p =>
                    (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.barcode.includes(productSearchTerm))
                )
            );
        } else {
            setProductSearchResults([]);
        }
    }, [productSearchTerm, products]);
    
    useEffect(() => {
        if (customerSearchTerm && !selectedCustomer) {
            setCustomerSearchResults(
                customers.filter(c =>
                    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || c.phone.includes(customerSearchTerm)
                )
            );
        } else {
            setCustomerSearchResults([]);
        }
    }, [customerSearchTerm, customers, selectedCustomer]);


    const addProductToCart = (product: Product) => {
        const bookedQty = bookedQuantities[product.id] || 0;
        const availableStock = product.stock - bookedQty;

        if (availableStock <= 0) {
            addToast(`المنتج "${product.name}" غير متوفر حالياً.`, 'error');
            return;
        }

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productId === product.id);
            if (existingItem) {
                if (existingItem.quantity < availableStock) {
                    return prevCart.map(item =>
                        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    );
                }
                addToast(`الكمية المطلوبة غير متوفرة. المتاح للبيع: ${availableStock}`, 'error');
                return prevCart;
            } else {
                 return [...prevCart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
            }
        });
        setProductSearchTerm('');
        setProductSearchResults([]);
        productSearchInputRef.current?.focus();
    };
    
    const updateQuantity = (productId: string, quantity: number) => {
        const product = products.find(p => p.id === productId);
        const bookedQty = bookedQuantities[productId] || 0;
        
        if (product) {
            const availableStock = product.stock - bookedQty;
            if (quantity > availableStock) {
                addToast(`الكمية المطلوبة غير متوفرة. المتاح للبيع: ${availableStock}`, 'error');
                return;
            }
        }
        setCart(cart.map(item => item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item).filter(item => item.quantity > 0));
    };

    const handleApplyCoupon = () => {
        if (!couponCode) return;
        const coupon = coupons.find(c => c.code.toLowerCase() === couponCode.toLowerCase());
        if (!coupon) {
            addToast('كود الكوبون غير صحيح.', 'error');
            return;
        }
        if (!coupon.isActive) {
            addToast('هذا الكوبون غير نشط.', 'error');
            return;
        }
        if (new Date(coupon.expiryDate) < new Date()) {
            addToast('هذا الكوبون منتهي الصلاحية.', 'error');
            return;
        }
        setAppliedCoupon(coupon);
        addToast(`تم تطبيق كوبون: ${coupon.code}`, 'success');
    };

    const calculations = useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        let discountAmount = 0;
        if (appliedCoupon) {
            discountAmount = appliedCoupon.type === 'fixed' 
                ? appliedCoupon.value 
                : subtotal * (appliedCoupon.value / 100);
        } else {
            const discountValue = Number(discount.value) || 0;
            discountAmount = discount.type === 'fixed' ? discountValue : subtotal * (discountValue / 100);
        }

        const taxableAmount = subtotal - discountAmount;
        const taxValue = Number(tax.value) || 0;
        const taxAmount = tax.type === 'fixed' ? taxValue : taxableAmount * (taxValue / 100);
        const total = taxableAmount + taxAmount;
        const change = (paymentMethod === 'cash' && amountTendered) ? Number(amountTendered) - total : 0;
        return { subtotal, discountAmount, taxAmount, total, change };
    }, [cart, discount, tax, amountTendered, paymentMethod, appliedCoupon]);

    const resetSale = () => {
        setCart([]);
        setSelectedCustomer(null);
        setCustomerSearchTerm('');
        setPaymentMethod('cash');
        setPaidAmount('');
        setAmountTendered('');
        setDiscount({ type: 'fixed', value: '' });
        setTax({ type: 'fixed', value: '' });
        setCouponCode('');
        setAppliedCoupon(null);
        sessionStorage.removeItem('bookingToConvert');
    };

    const handleCompleteSale = () => {
        if (cart.length === 0) return addToast('الفاتورة فارغة!', 'error');
        if ((paymentMethod === 'credit' || paymentMethod === 'partial') && !selectedCustomer) return addToast('يرجى تحديد عميل للبيع الآجل أو الجزئي.', 'error');
        if (paymentMethod === 'cash' && calculations.total > (Number(amountTendered) || 0)) return addToast('المبلغ المدفوع أقل من الإجمالي.', 'error');

        const bookingId = sessionStorage.getItem('bookingToConvert');
        const { subtotal, total } = calculations;
        const finalPaidAmount = paymentMethod === 'cash' ? total : Number(paidAmount) || 0;
        const dueAmount = total - finalPaidAmount;
        
        let status: Invoice['status'] = 'paid';
        if (dueAmount > 0) status = finalPaidAmount > 0 ? 'partial' : 'due';

        const newInvoice: Invoice = {
            id: `INV-${Date.now()}`, date: new Date().toISOString(), customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name || 'عميل نقدي', items: cart, subtotal,
            discount: { type: discount.type, value: Number(discount.value) || 0 },
            tax: { type: tax.type, value: Number(tax.value) || 0 },
            total, paymentMethod, paidAmount: finalPaidAmount, dueAmount, status, bookingId: bookingId || undefined,
            couponCode: appliedCoupon?.code
        };

        const newProducts = [...products];
        cart.forEach(item => {
            const productIndex = newProducts.findIndex(p => p.id === item.productId);
            if(productIndex !== -1) newProducts[productIndex].stock -= item.quantity;
        });
        setProducts(newProducts);

        if (selectedCustomer) {
            const customerIndex = customers.findIndex(c => c.id === selectedCustomer.id);
            if (customerIndex !== -1) {
                const updatedCustomers = [...customers];
                const customer = { ...updatedCustomers[customerIndex] };
                const newTransaction: Transaction = {
                    id: `txn-${Date.now()}`, type: 'invoice', date: newInvoice.date,
                    amount: newInvoice.total, notes: `فاتورة #${newInvoice.id}`,
                };
                customer.transactions = [...(customer.transactions || []), newTransaction];
                customer.debt += dueAmount;
                updatedCustomers[customerIndex] = customer;
                setCustomers(updatedCustomers);
            }
        }
        
        if (bookingId) {
            setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
        }

        setInvoices([...invoices, newInvoice]);
        logAction('CREATE', 'Invoice', newInvoice.id, `إنشاء فاتورة لـ ${newInvoice.customerName} بقيمة ${currencyFormat(newInvoice.total)}`);
        addToast('تم إتمام عملية البيع بنجاح', 'success');
        
        if (printSettings.autoPrint) {
            setCompletedInvoice(newInvoice);
        }
        
        resetSale();
    };

    const handleNumericInputChange = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setter(value);
        }
    };

    const handleAddNewCustomer = (name: string, phone: string) => {
        const newCustomer: Customer = {
            id: `c-${Date.now()}`, name, phone, email: '', createdAt: new Date().toISOString(),
            debt: 0, address: '', notes: '', transactions: [],
        };
        setCustomers([...customers, newCustomer]);
        logAction('CREATE', 'Customer', newCustomer.id, `إنشاء عميل جديد من نقطة البيع: ${name}`);
        setSelectedCustomer(newCustomer);
        setCustomerSearchTerm(newCustomer.name);
        setIsCustomerModalOpen(false);
        addToast('تمت إضافة العميل بنجاح', 'success');
    };

    const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
    
    return (
        <div className="flex h-full bg-gray-100">
            {/* Main POS Area */}
            <div className="flex-1 p-6 flex flex-col">
                <div className="relative mb-4">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input data-tour-id="pos-search" ref={productSearchInputRef} type="text" placeholder="ابحث عن منتج بالاسم أو الباركود..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                     {productSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-b-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                           {productSearchResults.map(p => {
                                const bookedQty = bookedQuantities[p.id] || 0;
                                const availableStock = p.stock - bookedQty;
                                const isOutOfStock = availableStock <= 0;
                                return (
                                <div 
                                    key={p.id} 
                                    onClick={() => !isOutOfStock && addProductToCart(p)} 
                                    className={`p-3 hover:bg-blue-50 border-b ${isOutOfStock ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}>
                                   <div className="flex justify-between items-center">
                                       <p className="font-semibold">{p.name}</p>
                                       <p className={`text-sm font-bold ${isOutOfStock ? 'text-red-500' : 'text-gray-600'}`}>
                                            المتاح: {availableStock}
                                       </p>
                                   </div>
                                   <p className="text-sm text-gray-500">{currencyFormat(p.price)}</p>
                               </div>
                           )})}
                        </div>
                    )}
                </div>
               
                <div className="flex-grow bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-y-auto h-full">
                        <table className="w-full text-center">
                            <thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold text-gray-600 w-2/5">المنتج</th><th className="p-3 text-sm font-semibold text-gray-600">السعر</th><th className="p-3 text-sm font-semibold text-gray-600 w-24">الكمية</th><th className="p-3 text-sm font-semibold text-gray-600">الإجمالي</th><th className="p-3 text-sm font-semibold text-gray-600">إجراء</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">{cart.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center">
                                        <PackageIcon className="w-16 h-16 mx-auto text-gray-300" />
                                        <h3 className="mt-2 text-lg font-semibold text-gray-600">الفاتورة فارغة</h3>
                                        <p className="mt-1 text-sm text-gray-400">ابدأ بإضافة منتجات باستخدام حقل البحث أو الماسح الضوئي.</p>
                                    </td>
                                </tr>
                            ) : (cart.map(item => (<tr key={item.productId}><td className="p-3 font-medium">{item.name}</td><td className="p-3">{item.price.toLocaleString()}</td><td className="p-3"><input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)} className="w-20 text-center border border-gray-300 rounded-md py-1" /></td><td className="p-3 font-semibold">{(item.price * item.quantity).toLocaleString()}</td><td className="p-3"><button onClick={() => updateQuantity(item.productId, 0)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-5 h-5 mx-auto" /></button></td></tr>)))}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col shadow-lg">
                <h3 className="text-xl font-bold mb-4">تفاصيل الفاتورة</h3>
                
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex-grow relative">
                        <input type="text" placeholder="ابحث عن عميل أو اختر 'عميل نقدي'" value={customerSearchTerm} onChange={e => { setCustomerSearchTerm(e.target.value); if(selectedCustomer) setSelectedCustomer(null); }} className="w-full border border-gray-300 rounded-md py-2 px-3"/>
                        {customerSearchTerm && customerSearchResults.length > 0 && (
                             <div className="absolute top-full left-0 right-0 bg-white border rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                {customerSearchResults.map(c => (
                                    <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearchTerm(c.name); setCustomerSearchResults([]); }} className="p-2 hover:bg-gray-100 cursor-pointer">{c.name} ({c.phone})</div>
                                ))}
                             </div>
                        )}
                    </div>
                    <button onClick={() => setIsCustomerModalOpen(true)} className="p-2 text-blue-600 hover:text-blue-800"><PlusCircleIcon className="w-6 h-6"/></button>
                </div>

                <div className="space-y-3 text-sm mb-4 border-t pt-4">
                    <div className="flex justify-between"><span className="text-gray-600">المجموع الفرعي</span><span className="font-semibold">{currencyFormat(calculations.subtotal)}</span></div>
                    {appliedCoupon ? (
                         <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-green-700 flex items-center gap-1"><TicketIcon className="w-4 h-4" /> كوبون: {appliedCoupon.code}</span>
                                <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="text-red-500 font-bold text-xs hover:underline">إزالة</button>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                                <span className="text-gray-600">قيمة الخصم</span>
                                <span className="font-semibold text-red-500">- {currencyFormat(calculations.discountAmount)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <input type="text" inputMode="decimal" placeholder="خصم" value={discount.value} onChange={e => handleNumericInputChange(e.target.value, (val) => setDiscount(d => ({ ...d, value: val as string })))} className="w-20 border-b p-1 text-center"/>
                                <div className="flex border rounded-md overflow-hidden text-xs"><button type="button" onClick={() => setDiscount(d => ({...d, type: 'fixed'}))} className={`px-2 py-1 ${discount.type === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>ج.م</button><button type="button" onClick={() => setDiscount(d => ({...d, type: 'percentage'}))} className={`px-2 py-1 ${discount.type === 'percentage' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>%</button></div>
                            </div>
                            <span className="font-semibold text-red-500">- {currencyFormat(calculations.discountAmount)}</span>
                        </div>
                    )}
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                           <input type="text" inputMode="decimal" placeholder="ضريبة" value={tax.value} onChange={e => handleNumericInputChange(e.target.value, (val) => setTax(t => ({ ...t, value: val as string })))} className="w-20 border-b p-1 text-center"/>
                           <div className="flex border rounded-md overflow-hidden text-xs"><button type="button" onClick={() => setTax(t => ({...t, type: 'fixed'}))} className={`px-2 py-1 ${tax.type === 'fixed' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>ج.م</button><button type="button" onClick={() => setTax(t => ({...t, type: 'percentage'}))} className={`px-2 py-1 ${tax.type === 'percentage' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>%</button></div>
                        </div>
                        <span className="font-semibold text-green-500">+ {currencyFormat(calculations.taxAmount)}</span>
                    </div>
                </div>
                 <div className="flex items-center gap-2 mb-4">
                    <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="أدخل كود الكوبون" className="w-full border border-gray-300 rounded-md py-2 px-3" disabled={!!appliedCoupon}/>
                    <button onClick={handleApplyCoupon} disabled={!!appliedCoupon} className="p-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50">تطبيق</button>
                </div>

                <div className="border-t border-b py-3 mb-4"><div className="flex justify-between items-center text-xl font-bold"><span>الإجمالي</span><span>{currencyFormat(calculations.total)}</span></div></div>
                
                <div className="mb-4">
                    <h4 className="font-semibold mb-2">طريقة الدفع</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {(['cash', 'credit', 'partial'] as const).map(method => (<button key={method} onClick={() => setPaymentMethod(method)} className={`p-2 rounded-md border text-sm font-semibold ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>{{'cash': 'نقدي', 'credit': 'آجل', 'partial': 'جزئي'}[method]}</button>))}
                    </div>
                    {paymentMethod === 'partial' && (<input type="text" inputMode="decimal" placeholder="المبلغ المدفوع" value={paidAmount} onChange={e => handleNumericInputChange(e.target.value, setPaidAmount)} className="w-full mt-2 border border-gray-300 rounded-md p-2" />)}
                    {paymentMethod === 'cash' && cart.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <div><label className="text-sm font-medium text-gray-700">المبلغ المستلم</label><input type="text" inputMode="decimal" placeholder="" value={amountTendered} onChange={e => handleNumericInputChange(e.target.value, setAmountTendered)} className="w-full mt-1 border border-gray-300 rounded-md p-2 text-lg"/></div>
                            <div className={`text-lg font-bold flex justify-between p-2 rounded-md ${calculations.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><span>المتبقي للعميل:</span><span>{currencyFormat(calculations.change)}</span></div>
                        </div>
                    )}
                </div>

                <div className="mt-auto"><button data-tour-id="pos-complete-sale" onClick={handleCompleteSale} disabled={cart.length === 0} className="w-full py-3 bg-blue-600 text-white rounded-lg shadow-lg text-lg font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">إتمام البيع</button></div>
            </div>
            {isCustomerModalOpen && <AddCustomerModal onSave={handleAddNewCustomer} onClose={() => setIsCustomerModalOpen(false)} />}
            {completedInvoice && <InvoiceReceipt invoice={completedInvoice} autoPrint={printSettings.autoPrint} onClose={() => setCompletedInvoice(null)} />}
        </div>
    );
};

const AddCustomerModal: React.FC<{onClose: () => void, onSave: (name: string, phone: string) => void}> = ({onClose, onSave}) => {
    const [name, setName] = useState(''); const [phone, setPhone] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if(name && phone) onSave(name, phone); };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 w-96 modal-content-animate"><h3 className="text-lg font-bold mb-4">إضافة عميل جديد</h3><form onSubmit={handleSubmit} className="space-y-4"><input type="text" placeholder="اسم العميل" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-gray-300 rounded-md p-2"/><input type="text" placeholder="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full border border-gray-300 rounded-md p-2"/><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div></form></div></div>);
};