import React, { useState, useMemo } from 'react';
import { useData, useAuth } from '../contexts/AuthContext';
import type { PurchaseOrder, Supplier, Product, InvoiceItem } from '../types';
import { SearchIcon, EditIcon, Trash2Icon, FileTextIcon, EyeIcon, ChevronDown } from './icons';
import { useToast } from './Toast';
import { useAuditLog } from '../hooks/useAuditLog';

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });

const statusMap: Record<PurchaseOrder['status'], { text: string; className: string }> = {
    pending: { text: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800' },
    partially_received: { text: 'تم الاستلام جزئياً', className: 'bg-blue-100 text-blue-800' },
    received: { text: 'تم الاستلام', className: 'bg-green-100 text-green-800' },
    canceled: { text: 'ملغي', className: 'bg-gray-100 text-gray-800' },
};

export const PurchaseOrders: React.FC = () => {
    const { purchaseOrders, setPurchaseOrders, suppliers, products, setProducts } = useData();
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const { logAction } = useAuditLog();

    const [modal, setModal] = useState<'closed' | 'add' | 'receive' | 'details'>('closed');
    const [currentOrder, setCurrentOrder] = useState<PurchaseOrder | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const displayedOrders = useMemo(() => {
        return purchaseOrders
            .filter(o => o.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm))
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }, [purchaseOrders, searchTerm]);

    const handleOpenModal = (type: 'add' | 'receive' | 'details', order: PurchaseOrder | null = null) => {
        setCurrentOrder(order);
        setModal(type);
    };
    
    const handleCloseModal = () => {
        setModal('closed');
        setCurrentOrder(null);
    };

    const handleSaveOrder = (orderData: Omit<PurchaseOrder, 'id'>) => {
        if (currentOrder && modal === 'add') {
            const updatedOrder = { ...currentOrder, ...orderData };
            setPurchaseOrders(purchaseOrders.map(o => o.id === currentOrder.id ? updatedOrder : o));
            logAction('UPDATE', 'PurchaseOrder', updatedOrder.id, `تحديث أمر شراء من ${updatedOrder.supplierName}`);
        } else {
            const newOrder = { ...orderData, id: `PO-${Date.now()}` };
            setPurchaseOrders([...purchaseOrders, newOrder]);
            logAction('CREATE', 'PurchaseOrder', newOrder.id, `إنشاء أمر شراء من ${newOrder.supplierName}`);
        }
        addToast('تم حفظ أمر الشراء بنجاح', 'success');
        handleCloseModal();
    };

    const handleReceiveItems = (order: PurchaseOrder, receivedQuantities: { [productId: string]: number }) => {
        let updatedProducts = [...products];
        Object.entries(receivedQuantities).forEach(([productId, qty]) => {
            if (qty > 0) {
                const productIndex = updatedProducts.findIndex(p => p.id === productId);
                if (productIndex !== -1) {
                    updatedProducts[productIndex].stock += qty;
                }
            }
        });
        setProducts(updatedProducts);

        const isFullyReceived = order.items.every(item => {
            const alreadyReceived = order.items.find(i => i.productId === item.productId)?.returnedQuantity || 0; // Using returnedQuantity to track received qty
            const nowReceiving = receivedQuantities[item.productId] || 0;
            return (alreadyReceived + nowReceiving) >= item.quantity;
        });

        const updatedOrder: PurchaseOrder = {
            ...order,
            status: isFullyReceived ? 'received' : 'partially_received',
            items: order.items.map(item => ({
                ...item,
                returnedQuantity: (item.returnedQuantity || 0) + (receivedQuantities[item.productId] || 0)
            }))
        };
        setPurchaseOrders(purchaseOrders.map(o => o.id === order.id ? updatedOrder : o));
        
        logAction('UPDATE', 'PurchaseOrder', order.id, `استلام بضاعة لأمر الشراء #${order.id}`);
        addToast('تم تحديث المخزون بنجاح', 'success');
        handleCloseModal();
    };

    const canEdit = hasPermission('purchase_orders', 'edit');

    return (
        <div className="p-8">
            {canEdit && <button onClick={() => handleOpenModal('add')} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold mb-6">إنشاء أمر شراء جديد</button>}
            
            <input type="text" placeholder="ابحث باسم المورد أو رقم الأمر..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-1/3 p-2 border rounded-md mb-4"/>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-4">رقم الأمر</th><th className="p-4">المورد</th><th className="p-4">تاريخ الطلب</th><th className="p-4">الإجمالي</th><th className="p-4">الحالة</th><th className="p-4">إجراءات</th></tr></thead>
                    <tbody>
                        {displayedOrders.map(order => (
                            <tr key={order.id} className="border-b">
                                <td className="p-4 font-mono">{order.id}</td><td className="p-4">{order.supplierName}</td><td className="p-4">{new Date(order.orderDate).toLocaleDateString('ar-EG')}</td><td className="p-4 font-semibold">{currencyFormat(order.total)}</td>
                                <td><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[order.status].className}`}>{statusMap[order.status].text}</span></td>
                                <td>
                                    <div className="flex justify-center items-center gap-2">
                                        <button onClick={() => handleOpenModal('details', order)} title="عرض التفاصيل" className="text-gray-500 hover:text-blue-600 p-1"><EyeIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleOpenModal('receive', order)} className="text-green-600 hover:underline disabled:opacity-50" disabled={order.status === 'received' || order.status === 'canceled'}>استلام</button>
                                        {canEdit && <button onClick={() => handleOpenModal('add', order)}><EditIcon className="w-5 h-5 text-gray-500 hover:text-blue-600"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal === 'add' && <PurchaseOrderModal order={currentOrder} suppliers={suppliers} products={products} onSave={handleSaveOrder} onClose={handleCloseModal} />}
            {modal === 'receive' && currentOrder && <ReceiveItemsModal order={currentOrder} onReceive={handleReceiveItems} onClose={handleCloseModal} />}
            {modal === 'details' && currentOrder && <PurchaseOrderDetailsModal order={currentOrder} onClose={handleCloseModal} />}
        </div>
    );
};

// --- Modals ---

interface PurchaseOrderModalProps { order: PurchaseOrder | null; suppliers: Supplier[]; products: Product[]; onClose: () => void; onSave: (data: Omit<PurchaseOrder, 'id'>) => void; }

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ order, suppliers, products, onClose, onSave }) => {
    const [supplierId, setSupplierId] = useState(order?.supplierId || '');
    const [expectedDate, setExpectedDate] = useState(order?.expectedDate || '');
    const [items, setItems] = useState<InvoiceItem[]>(order?.items || []);
    const [searchTerm, setSearchTerm] = useState('');

    const searchResults = useMemo(() => searchTerm ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())) : [], [searchTerm, products]);
    const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

    const addItem = (product: Product) => { if (!items.some(i => i.productId === product.id)) { setItems([...items, { productId: product.id, name: product.name, price: product.cost, quantity: 1 }]); } setSearchTerm(''); };
    const updateItem = (productId: string, quantity: number, price: number) => setItems(items.map(item => item.productId === productId ? { ...item, quantity, price } : item).filter(i => i.quantity > 0));
    
    const handleSubmit = () => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) { alert('الرجاء اختيار مورد'); return; }
        onSave({ supplierId, supplierName: supplier.name, items, total, status: order?.status || 'pending', orderDate: order?.orderDate || new Date().toISOString(), expectedDate, notes: '' });
    };

    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col"><h3 className="text-xl font-bold mb-4">{order ? 'تعديل أمر شراء' : 'إنشاء أمر شراء جديد'}</h3><div className="grid grid-cols-2 gap-4 mb-4"><select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="p-2 border rounded-md"><option value="" disabled>اختر مورد</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="p-2 border rounded-md"/></div><div className="relative mb-4"><input type="text" placeholder="ابحث عن منتج لإضافته..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md"/>{searchResults.length > 0 && <div className="absolute z-10 w-full bg-white border shadow-lg max-h-48 overflow-y-auto">{searchResults.map(p => <div key={p.id} onClick={() => addItem(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</div>)}</div>}</div><div className="flex-grow overflow-y-auto border rounded-md"><table className="w-full text-center"><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر التكلفة</th><th>الإجمالي</th></tr></thead><tbody>{items.map(item => <tr key={item.productId}><td>{item.name}</td><td><input type="number" value={item.quantity} onChange={e => updateItem(item.productId, +e.target.value, item.price)} className="w-20 p-1 border rounded-md"/></td><td><input type="number" value={item.price} onChange={e => updateItem(item.productId, item.quantity, +e.target.value)} className="w-24 p-1 border rounded-md"/></td><td>{currencyFormat(item.price * item.quantity)}</td></tr>)}</tbody></table></div><div className="pt-4 flex justify-between items-center"><span className="text-xl font-bold">الإجمالي: {currencyFormat(total)}</span><div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div></div></div></div>);
};

interface ReceiveItemsModalProps { order: PurchaseOrder; onClose: () => void; onReceive: (order: PurchaseOrder, receivedQuantities: { [productId: string]: number }) => void; }
const ReceiveItemsModal: React.FC<ReceiveItemsModalProps> = ({ order, onClose, onReceive }) => {
    const [receivedQuantities, setReceivedQuantities] = useState<{ [productId: string]: number }>({});
    const handleQtyChange = (productId: string, qty: number, maxQty: number) => setReceivedQuantities(prev => ({ ...prev, [productId]: Math.max(0, Math.min(qty, maxQty)) }));
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col"><h3 className="text-xl font-bold mb-4">استلام بضاعة لأمر الشراء: {order.id}</h3><div className="flex-grow overflow-y-auto"><table className="w-full text-center"><thead><tr><th>المنتج</th><th>الكمية المطلوبة</th><th>تم استلامه</th><th>الكمية المستلمة الآن</th></tr></thead><tbody>{order.items.map(item => { const alreadyReceived = item.returnedQuantity || 0; const maxReceivable = item.quantity - alreadyReceived; return (<tr key={item.productId} className={maxReceivable <= 0 ? 'opacity-50' : ''}><td>{item.name}</td><td>{item.quantity}</td><td>{alreadyReceived}</td><td><input type="number" value={receivedQuantities[item.productId] || ''} onChange={e => handleQtyChange(item.productId, +e.target.value, maxReceivable)} className="w-24 p-1 border rounded-md" max={maxReceivable} disabled={maxReceivable <= 0}/></td></tr>);})}</tbody></table></div><div className="pt-4 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button onClick={() => onReceive(order, receivedQuantities)} className="px-4 py-2 bg-green-600 text-white rounded-md">تأكيد الاستلام وتحديث المخزون</button></div></div></div>);
};

const PurchaseOrderDetailsModal: React.FC<{order: PurchaseOrder, onClose: () => void}> = ({order, onClose}) => {
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col modal-content-animate">
                <h3 className="text-xl font-bold mb-2">تفاصيل أمر الشراء: {order.id}</h3>
                <div className="text-sm text-gray-600 mb-4 grid grid-cols-2 gap-x-4">
                    <p><strong>المورد:</strong> {order.supplierName}</p>
                    <p><strong>تاريخ الطلب:</strong> {new Date(order.orderDate).toLocaleDateString('ar-EG')}</p>
                    <p><strong>الحالة:</strong> {statusMap[order.status].text}</p>
                    <p><strong>التاريخ المتوقع:</strong> {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('ar-EG') : '-'}</p>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2 border-t pt-4">
                    <h4 className="font-semibold mb-2">المنتجات المطلوبة</h4>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">المنتج</th><th className="p-2">الكمية المطلوبة</th><th className="p-2">تم استلامه</th><th className="p-2">السعر</th><th className="p-2">الإجمالي</th></tr></thead>
                        <tbody>
                            {order.items.map(item => (
                                <tr key={item.productId} className="border-b">
                                    <td className="p-2 text-right">{item.name}</td>
                                    <td className="p-2">{item.quantity}</td>
                                    <td className="p-2">{item.returnedQuantity || 0}</td>
                                    <td className="p-2">{currencyFormat(item.price)}</td>
                                    <td className="p-2 font-semibold">{currencyFormat(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center pt-4 mt-4 border-t">
                    <span className="text-xl font-bold">الإجمالي: {currencyFormat(order.total)}</span>
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md">إغلاق</button>
                </div>
            </div>
        </div>
    );
}