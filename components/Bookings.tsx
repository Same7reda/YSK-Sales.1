import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Booking, BookingItem, Customer, Product, Page } from '../types';
import { SearchIcon, EditIcon, Trash2Icon, CheckCircleIcon, WhatsAppIcon } from './icons';
import { CustomSelect } from './CustomSelect';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from '../hooks/useAuditLog';

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
const statusMap: Record<Booking['status'], { text: string; className: string }> = {
    confirmed: { text: 'مؤكد', className: 'bg-blue-100 text-blue-800' },
    completed: { text: 'مكتمل', className: 'bg-green-100 text-green-800' },
    canceled: { text: 'ملغي', className: 'bg-gray-100 text-gray-800' },
};

interface BookingsProps {
    onNavigate: (page: Page) => void;
}

export const Bookings: React.FC<BookingsProps> = ({ onNavigate }) => {
    const { bookings, setBookings, customers, products } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { logAction } = useAuditLog();
    
    useEffect(() => {
        const openModal = sessionStorage.getItem('openAddModal');
        if (openModal && hasPermission('bookings', 'edit')) {
            handleOpenModal();
            sessionStorage.removeItem('openAddModal');
        }
    }, []);

    const getBookingTotal = (bookingItems: BookingItem[]): number => {
        return bookingItems.reduce((total, item) => {
            const product = products.find(p => p.id === item.productId);
            return total + (product ? product.price * item.quantity : 0);
        }, 0);
    };

    const displayedBookings = useMemo(() => {
        return bookings
            .filter(b => 
                (filterStatus === 'all' || b.status === filterStatus) &&
                (b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 b.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase())))
            )
            .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
    }, [bookings, searchTerm, filterStatus]);
    
    const handleOpenModal = (booking: Booking | null = null) => {
        setCurrentBooking(booking);
        setIsModalOpen(true);
    };

    const handleSaveBooking = (bookingData: Omit<Booking, 'id'>) => {
        if (currentBooking) {
            const updatedBooking = { ...currentBooking, ...bookingData };
            setBookings(bookings.map(b => b.id === currentBooking.id ? updatedBooking : b));
            logAction('UPDATE', 'Booking', updatedBooking.id, `تحديث حجز للعميل: ${updatedBooking.customerName}`);
        } else {
            const newBooking = { ...bookingData, id: `B-${Date.now()}` };
            setBookings([...bookings, newBooking]);
            logAction('CREATE', 'Booking', newBooking.id, `إنشاء حجز جديد للعميل: ${newBooking.customerName}`);
        }
        addToast('تم حفظ الحجز بنجاح', 'success');
        setIsModalOpen(false);
        setCurrentBooking(null);
    };

    const handleDelete = (ids: string[]) => {
        if(window.confirm(`هل أنت متأكد من حذف ${ids.length} حجز؟`)) {
            const bookingsToDelete = bookings.filter(b => ids.includes(b.id));
            setBookings(bookings.filter(b => !ids.includes(b.id)));
            bookingsToDelete.forEach(b => {
                logAction('DELETE', 'Booking', b.id, `حذف حجز للعميل: ${b.customerName}`);
            });
            addToast(`تم حذف ${ids.length} حجز بنجاح`, 'success');
            setSelectedBookings(new Set());
        }
    };

    const handleConvertToInvoice = (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            logAction('UPDATE', 'Booking', bookingId, `تحويل الحجز #${bookingId} إلى فاتورة.`);
        }
        sessionStorage.setItem('bookingToConvert', bookingId);
        onNavigate('pos');
    };

    const handleSendWhatsApp = (booking: Booking) => {
        const customer = customers.find(c => c.id === booking.customerId);
        if (!customer || !customer.phone) {
            addToast('لا يوجد رقم هاتف مسجل لهذا العميل.', 'error');
            return;
        }

        const itemsList = booking.items.map(item => `- ${item.productName} (الكمية: ${item.quantity})`).join('\n');
        const totalValue = getBookingTotal(booking.items);
        const bookingDate = new Date(booking.bookingDate).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' });

        const message = `
مرحباً ${customer.name}،

هذا تأكيد على حجزكم:
*المنتجات:*
${itemsList}

*تاريخ الحجز:*
${bookingDate}

*القيمة الإجمالية:* ${currencyFormat(totalValue)}
*العربون المدفوع:* ${currencyFormat(booking.deposit)}
*المتبقي:* ${currencyFormat(totalValue - booking.deposit)}

شكراً لتعاملكم معنا!
        `;
        
        const rawPhone = customer.phone.replace(/[^0-9]/g, '');
        const internationalPhone = rawPhone.startsWith('20') ? rawPhone : `20${rawPhone}`;
        
        const whatsappUrl = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message.trim())}`;
        window.open(whatsappUrl, '_blank');
    };


    const handleSelect = (id: string, checked: boolean) => {
        const newSelection = new Set(selectedBookings);
        if (checked) newSelection.add(id);
        else newSelection.delete(id);
        setSelectedBookings(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedBookings(new Set(displayedBookings.map(b => b.id)));
        else setSelectedBookings(new Set());
    };

    const canEdit = hasPermission('bookings', 'edit');
    const canDelete = hasPermission('bookings', 'delete');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                {canEdit && <button onClick={() => handleOpenModal()} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold">إضافة حجز جديد</button>}
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-2">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ابحث باسم العميل أو المنتج..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full"/>
                </div>
                <CustomSelect value={filterStatus} onChange={setFilterStatus} options={[{ value: 'all', label: 'كل الحالات' }, ...Object.entries(statusMap).map(([val, {text}]) => ({value: val, label: text}))]}/>
            </div>

            {selectedBookings.size > 0 && canDelete && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedBookings.size} حجوزات محددة</p>
                    <button onClick={() => handleDelete(Array.from(selectedBookings))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>
                </div>
            )}
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedBookings.size === displayedBookings.length && displayedBookings.length > 0} /></th>
                            <th className="p-4">العميل</th><th className="p-4">المنتجات</th><th className="p-4">تاريخ الحجز</th><th className="p-4">الإجمالي</th><th className="p-4">الحالة</th>
                            {(canEdit || canDelete) && <th className="p-4">إجراءات</th>}
                        </tr></thead>
                    <tbody>
                        {displayedBookings.map(b => (
                            <tr key={b.id} className={`border-b even:bg-gray-50/50 hover:bg-gray-50 ${selectedBookings.has(b.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedBookings.has(b.id)} onChange={e => handleSelect(b.id, e.target.checked)} /></td>
                                <td className="p-4 font-medium">{b.customerName}</td><td className="p-4 text-sm">{b.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}</td><td className="p-4">{new Date(b.bookingDate).toLocaleString('ar-EG')}</td><td className="p-4 font-semibold">{currencyFormat(getBookingTotal(b.items))}</td><td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[b.status].className}`}>{statusMap[b.status].text}</span></td>
                                {(canEdit || canDelete) && <td className="p-4"><div className="flex justify-center items-center gap-2">
                                    <button onClick={() => handleSendWhatsApp(b)} title="إرسال عبر واتساب" className="text-gray-500 hover:text-green-600 p-1"><WhatsAppIcon className="w-5 h-5"/></button>
                                    {canEdit && b.status === 'confirmed' && (
                                        <button onClick={() => handleConvertToInvoice(b.id)} title="تحويل إلى فاتورة" className="text-gray-500 hover:text-green-600 p-1"><CheckCircleIcon className="w-5 h-5"/></button>
                                    )}
                                    {canEdit && <button onClick={() => handleOpenModal(b)} title="تعديل" className="text-gray-500 hover:text-blue-600 p-1"><EditIcon className="w-5 h-5"/></button>}
                                    {canDelete && <button onClick={() => handleDelete([b.id])} title="حذف" className="text-gray-500 hover:text-red-600 p-1"><Trash2Icon className="w-5 h-5"/></button>}
                                </div></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <BookingModal booking={currentBooking} customers={customers} products={products} onSave={handleSaveBooking} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// Booking Modal
interface BookingModalProps { booking: Booking | null; customers: Customer[]; products: Product[]; onClose: () => void; onSave: (data: Omit<Booking, 'id'>) => void; }
const BookingModal: React.FC<BookingModalProps> = ({ booking, customers, products, onClose, onSave }) => {
    const [formData, setFormData] = useState({ customerId: booking?.customerId || '', bookingDate: booking?.bookingDate ? booking.bookingDate.slice(0, 16) : new Date().toISOString().slice(0, 16), status: booking?.status || 'confirmed', deposit: booking?.deposit || '', notes: booking?.notes || '' });
    const [items, setItems] = useState<BookingItem[]>(booking?.items || []);
    const [productSearch, setProductSearch] = useState('');

    const productSearchResults = useMemo(() => productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && !items.find(i => i.productId === p.id)) : [], [productSearch, products, items]);
    
    const addProductToBooking = (product: Product) => { setItems([...items, { productId: product.id, productName: product.name, quantity: 1 }]); setProductSearch(''); };
    const updateItemQuantity = (productId: string, quantity: number) => setItems(items.map(i => i.productId === productId ? {...i, quantity} : i).filter(i => i.quantity > 0));
    
    const handleNumericChange = (value: string) => { if (value === '' || /^\d*\.?\d*$/.test(value)) { setFormData(f => ({...f, deposit: value})); } };
    
    const totalValue = useMemo(() => items.reduce((total, item) => {
        const product = products.find(p => p.id === item.productId);
        return total + (product ? product.price * item.quantity : 0);
    }, 0), [items, products]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === formData.customerId);
        if (!customer || items.length === 0) return alert('يرجى اختيار عميل وإضافة منتجات.');
        onSave({ customerId: formData.customerId, customerName: customer.name, items, bookingDate: new Date(formData.bookingDate).toISOString(), status: formData.status as any, deposit: Number(formData.deposit) || 0, notes: formData.notes });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col modal-content-animate"><h3 className="text-xl font-bold mb-6">{booking ? 'تعديل الحجز' : 'إضافة حجز جديد'}</h3><form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2 -mr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">العميل</label><CustomSelect value={formData.customerId} onChange={v => setFormData(f => ({...f, customerId: v}))} options={customers.map(c => ({value: c.id, label: c.name}))} /></div>
                <div><label className="block text-sm font-medium">تاريخ ووقت الحجز</label><input type="datetime-local" value={formData.bookingDate} onChange={e => setFormData(f => ({...f, bookingDate: e.target.value}))} className="mt-1 w-full p-2 border rounded-md"/></div>
            </div>
            <div className="border p-4 rounded-md">
                <h4 className="font-semibold mb-2">المنتجات المحجوزة</h4>
                <div className="relative"><input type="text" placeholder="ابحث لإضافة منتج..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full p-2 border rounded-md"/>{productSearchResults.length > 0 && <div className="absolute z-20 w-full bg-white border shadow-lg max-h-40 overflow-y-auto">{productSearchResults.map(p => <div key={p.id} onClick={() => addProductToBooking(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</div>)}</div>}</div>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">{items.map(item => <div key={item.productId} className="flex items-center gap-2"><p className="flex-grow">{item.productName}</p><input type="number" value={item.quantity} onChange={e => updateItemQuantity(item.productId, +e.target.value)} className="w-20 p-1 border rounded-md text-center"/></div>)}</div>
            </div>
             <div className="bg-blue-50 p-3 rounded-md text-center font-bold text-blue-800">
                إجمالي قيمة الحجز: {currencyFormat(totalValue)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">العربون</label><input type="text" inputMode="decimal" value={formData.deposit} onChange={e => handleNumericChange(e.target.value)} className="mt-1 w-full p-2 border rounded-md"/></div>
                <div><label className="block text-sm font-medium">الحالة</label><CustomSelect value={formData.status} onChange={v => setFormData(f => ({...f, status: v as any}))} options={Object.entries(statusMap).map(([val, {text}]) => ({value: val, label: text}))}/></div>
            </div>
            <div><label className="block text-sm font-medium">ملاحظات</label><textarea value={formData.notes} onChange={e => setFormData(f => ({...f, notes: e.target.value}))} rows={2} className="mt-1 w-full p-2 border rounded-md"></textarea></div>
            <div className="flex justify-end gap-4 pt-4 mt-auto"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div>
        </form></div></div>
    );
}