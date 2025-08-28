import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/AuthContext';
import { useToast } from './Toast';
import type { Product, Customer, InvoiceItem, Invoice, Transaction } from '../types';
import { SearchIcon, Trash2Icon } from './icons';

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });

export const QuickInvoice: React.FC = () => {
    const { products, setProducts, customers, setCustomers, invoices, setInvoices } = useData();
    const { addToast } = useToast();

    const [cart, setCart] = useState<InvoiceItem[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const productSearchResults = useMemo(() => 
        productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())) : [],
    [productSearch, products]);
    
    const customerSearchResults = useMemo(() => 
        customerSearch ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())) : [],
    [customerSearch, customers]);

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            addToast(`المنتج "${product.name}" غير متوفر.`, 'error');
            return;
        }
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id && item.quantity < product.stock ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
        });
        setProductSearch('');
    };
    
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const resetForm = () => {
        setCart([]);
        setCustomerSearch('');
        setProductSearch('');
        setSelectedCustomer(null);
    };

    const handleCompleteSale = () => {
        if (cart.length === 0) {
            addToast('الفاتورة فارغة!', 'error');
            return;
        }

        const newInvoice: Invoice = {
            id: `INV-${Date.now()}`,
            date: new Date().toISOString(),
            customerId: selectedCustomer?.id,
            customerName: selectedCustomer?.name || 'عميل نقدي',
            items: cart,
            subtotal: total,
            discount: { type: 'fixed', value: 0 },
            tax: { type: 'fixed', value: 0 },
            total: total,
            paymentMethod: 'cash',
            paidAmount: total,
            dueAmount: 0,
            status: 'paid',
        };

        // Update product stock
        const newProducts = [...products];
        cart.forEach(item => {
            const productIndex = newProducts.findIndex(p => p.id === item.productId);
            if(productIndex !== -1) newProducts[productIndex].stock -= item.quantity;
        });
        setProducts(newProducts);
        
        // Update customer transaction if customer is selected
        if (selectedCustomer) {
             const customerIndex = customers.findIndex(c => c.id === selectedCustomer.id);
            if (customerIndex !== -1) {
                const updatedCustomers = [...customers];
                const customer = { ...updatedCustomers[customerIndex] };
                const newTransaction: Transaction = {
                    id: `txn-${Date.now()}`, type: 'invoice', date: newInvoice.date,
                    amount: newInvoice.total, notes: `فاتورة سريعة #${newInvoice.id}`,
                };
                customer.transactions = [...(customer.transactions || []), newTransaction];
                updatedCustomers[customerIndex] = customer;
                setCustomers(updatedCustomers);
            }
        }
        
        setInvoices([...invoices, newInvoice]);
        addToast(`تم إنشاء فاتورة بقيمة ${currencyFormat(total)}`, 'success');
        resetForm();
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4">فاتورة سريعة</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="relative">
                    <input type="text" placeholder="عميل نقدي (اختياري)" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3"/>
                     {customerSearchResults.length > 0 && (
                         <div className="absolute top-full left-0 right-0 bg-white border rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                            {customerSearchResults.map(c => <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); }} className="p-2 hover:bg-gray-100 cursor-pointer">{c.name}</div>)}
                         </div>
                     )}
                </div>
                <div className="relative">
                    <input type="text" placeholder="ابحث عن منتج..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3"/>
                     {productSearchResults.length > 0 && (
                         <div className="absolute top-full left-0 right-0 bg-white border rounded-b-md shadow-lg z-10 max-h-40 overflow-y-auto">
                            {productSearchResults.map(p => <div key={p.id} onClick={() => addToCart(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name} ({currencyFormat(p.price)})</div>)}
                         </div>
                     )}
                </div>
            </div>

            <div className="flex-grow space-y-2 overflow-y-auto border-y py-2 pr-2 -mr-2">
                {cart.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">لم تتم إضافة منتجات</p>
                ) : (
                    cart.map(item => (
                        <div key={item.productId} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.quantity} x {currencyFormat(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="font-bold">{currencyFormat(item.quantity * item.price)}</p>
                                <button onClick={() => removeFromCart(item.productId)} className="text-red-500 hover:text-red-700"><Trash2Icon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-auto pt-4">
                <div className="flex justify-between items-center text-xl font-bold mb-4">
                    <span>الإجمالي:</span>
                    <span>{currencyFormat(total)}</span>
                </div>
                <button 
                    onClick={handleCompleteSale}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    إنشاء فاتورة نقدية
                </button>
            </div>
        </div>
    );
};