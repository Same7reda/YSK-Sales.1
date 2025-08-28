import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Product, Supplier } from '../types';
import { SearchIcon, PrinterIcon, EditIcon, Trash2Icon } from './icons';
import { CustomSelect } from './CustomSelect';
import { useToast } from './Toast';
import { useAuth, useSync } from '../contexts/AuthContext';
import { useAuditLog } from '../hooks/useAuditLog';

declare var JsBarcode: any;

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });

export const Products: React.FC = () => {
    const { products, setProducts, suppliers } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [productsToPrint, setProductsToPrint] = useState<Product[] | null>(null);
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { scannedCode, clearScannedCode } = useSync();
    const [scannedBarcodeForModal, setScannedBarcodeForModal] = useState<string | null>(null);
    const { logAction } = useAuditLog();

    useEffect(() => {
        if (scannedCode) {
            if (isModalOpen) {
                setScannedBarcodeForModal(scannedCode);
            } else {
                setSearchTerm(scannedCode);
            }
            clearScannedCode();
        }
    }, [scannedCode, clearScannedCode, isModalOpen]);

    useEffect(() => {
        const term = sessionStorage.getItem('globalSearchTerm');
        if (term) {
            setSearchTerm(term);
            sessionStorage.removeItem('globalSearchTerm');
        }
        
        const openModal = sessionStorage.getItem('openAddModal');
        if (openModal && hasPermission('inventory', 'edit')) {
            handleOpenModal();
            sessionStorage.removeItem('openAddModal');
        }
    }, [hasPermission]);

    const displayedProducts = useMemo(() => {
        let filtered = products;

        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.barcode.includes(searchTerm) ||
                p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filter === 'lowStock') {
            const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{"lowStockThreshold": 10}');
            filtered = filtered.filter(p => p.stock <= settings.lowStockThreshold);
        } else if (filter === 'nearingExpiry') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            filtered = filtered.filter(p => 
                p.expiryDate && new Date(p.expiryDate) <= thirtyDaysFromNow
            );
        }

        return filtered;
    }, [products, searchTerm, filter]);

    const handleOpenModal = (product: Product | null = null) => {
        setCurrentProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentProduct(null);
        setScannedBarcodeForModal(null);
    };

    const handleSaveProduct = (productData: Omit<Product, 'id'>) => {
        const productToSave = {
            ...productData,
            barcode: productData.barcode || String(Date.now()), // Auto-generate barcode
        };

        if (currentProduct) {
            const updatedProduct = { ...currentProduct, ...productToSave };
            setProducts(products.map(p => p.id === currentProduct.id ? updatedProduct : p));
            logAction('UPDATE', 'Product', updatedProduct.id, `تحديث المنتج: ${updatedProduct.name}`);
        } else {
            const newProduct = { ...productToSave, id: `p${Date.now()}` };
            setProducts([...products, newProduct]);
            logAction('CREATE', 'Product', newProduct.id, `إنشاء منتج جديد: ${newProduct.name}`);
        }
        addToast('تم حفظ المنتج بنجاح', 'success');
        handleCloseModal();
    };

    const handleDelete = (ids: string[]) => {
        if (!hasPermission('inventory', 'delete')) {
            addToast('ليس لديك صلاحية الحذف.', 'error');
            return;
        }
        if(window.confirm(`هل أنت متأكد من حذف ${ids.length} منتج؟`)) {
            const productsToDelete = products.filter(p => ids.includes(p.id));
            setProducts(products.filter(p => !ids.includes(p.id)));
            addToast(`تم حذف ${ids.length} منتج بنجاح`, 'success');
            productsToDelete.forEach(p => {
                logAction('DELETE', 'Product', p.id, `حذف المنتج: ${p.name}`);
            });
            setSelectedProducts(new Set());
        }
    }

    const handleSelect = (productId: string, checked: boolean) => {
        const newSelection = new Set(selectedProducts);
        if (checked) {
            newSelection.add(productId);
        } else {
            newSelection.delete(productId);
        }
        setSelectedProducts(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(new Set(displayedProducts.map(p => p.id)));
        } else {
            setSelectedProducts(new Set());
        }
    };
    
    const printBarcodes = (productsToPrint: Product[]) => {
        if (!hasPermission('inventory', 'print')) {
            addToast('ليس لديك صلاحية الطباعة.', 'error');
            return;
        }
        if (productsToPrint.length === 0) {
            addToast('يرجى تحديد منتجات لطباعة باركود لها.', 'error');
            return;
        }
        setProductsToPrint(productsToPrint);
    }

    const uniqueUnits = useMemo(() => [...new Set(products.map(p => p.unit).filter(Boolean))], [products]);

    const canEdit = hasPermission('inventory', 'edit');
    const canDelete = hasPermission('inventory', 'delete');
    const canPrint = hasPermission('inventory', 'print');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                {canEdit && (
                    <button
                        data-tour-id="add-product-button"
                        onClick={() => handleOpenModal()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold"
                    >
                        إضافة منتج جديد
                    </button>
                )}
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative col-span-1 md:col-span-2">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم, الباركود, المورد..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
                    />
                </div>
                <div>
                    <CustomSelect
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { value: "all", label: "كل المنتجات" },
                            { value: "lowStock", label: "منخفض المخزون" },
                            { value: "nearingExpiry", label: "قرب انتهاء الصلاحية" },
                        ]}
                    />
                </div>
            </div>

            {selectedProducts.size > 0 && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedProducts.size} منتجات محددة</p>
                    {canPrint && <button onClick={() => printBarcodes(products.filter(p => selectedProducts.has(p.id)))} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"><PrinterIcon className="w-4 h-4"/> طباعة الباركود</button>}
                    {canDelete && <button onClick={() => handleDelete(Array.from(selectedProducts))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>}
                </div>
            )}
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center min-w-[1000px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedProducts.size === displayedProducts.length && displayedProducts.length > 0} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></th>
                            <th className="p-4 text-sm font-semibold text-gray-600">اسم المنتج</th><th className="p-4 text-sm font-semibold text-gray-600">الباركود</th><th className="p-4 text-sm font-semibold text-gray-600">سعر البيع</th><th className="p-4 text-sm font-semibold text-gray-600">سعر التكلفة</th><th className="p-4 text-sm font-semibold text-gray-600">المخزون</th><th className="p-4 text-sm font-semibold text-gray-600">المورد</th><th className="p-4 text-sm font-semibold text-gray-600">تاريخ الانتهاء</th>
                            {(canEdit || canDelete || canPrint) && <th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedProducts.map(product => (
                            <tr key={product.id} className={`border-b border-gray-200 even:bg-gray-50/50 ${selectedProducts.has(product.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <td className="p-4"><input type="checkbox" onChange={(e) => handleSelect(product.id, e.target.checked)} checked={selectedProducts.has(product.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></td>
                                <td className="p-4 font-medium text-gray-800">{product.name}</td><td className="p-4 text-gray-600 font-mono">{product.barcode}</td><td className="p-4 text-gray-600">{product.price.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td><td className="p-4 text-gray-500">{product.cost.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td><td className="p-4 text-gray-600">{product.stock} {product.unit}</td><td className="p-4 text-gray-600">{product.supplier || '-'}</td><td className="p-4 text-gray-600">{product.expiryDate || '-'}</td>
                                {(canEdit || canDelete || canPrint) && <td className="p-4"><div className="flex justify-center items-center gap-2">
                                    {canPrint && <button onClick={() => printBarcodes([product])} title="طباعة الباركود" className="text-gray-500 hover:text-blue-600 p-1"><PrinterIcon className="w-5 h-5"/></button>}
                                    {canEdit && <button onClick={() => handleOpenModal(product)} title="تعديل" className="text-gray-500 hover:text-purple-600 p-1"><EditIcon className="w-5 h-5"/></button>}
                                    {canDelete && <button onClick={() => handleDelete([product.id])} title="حذف" className="text-gray-500 hover:text-red-600 p-1"><Trash2Icon className="w-5 h-5"/></button>}
                                </div></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ProductModal product={currentProduct} units={uniqueUnits} suppliers={suppliers} onClose={handleCloseModal} onSave={handleSaveProduct} scannedBarcode={scannedBarcodeForModal} onBarcodeScanned={() => setScannedBarcodeForModal(null)} />}
            {productsToPrint && <BarcodePrintPage products={productsToPrint} onClose={() => setProductsToPrint(null)} />}
        </div>
    );
};

interface ProductModalProps { product: Product | null; units: string[]; suppliers: Supplier[]; onClose: () => void; onSave: (productData: Omit<Product, 'id'>) => void; scannedBarcode: string | null; onBarcodeScanned: () => void; }
const ProductModal: React.FC<ProductModalProps> = ({ product, units, suppliers, onClose, onSave, scannedBarcode, onBarcodeScanned }) => {
    const [formData, setFormData] = useState({ name: product?.name || '', category: product?.category || '', price: product?.price || '', cost: product?.cost || '', stock: product?.stock || '', unit: product?.unit || 'قطعة', supplier: product?.supplier || '', productionDate: product?.productionDate || '', expiryDate: product?.expiryDate || '', barcode: product?.barcode || '', });
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<Supplier[]>([]);
    
    useEffect(() => {
        if (scannedBarcode) {
            setFormData(prev => ({ ...prev, barcode: scannedBarcode }));
            onBarcodeScanned();
        }
    }, [scannedBarcode, onBarcodeScanned]);

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => { const value = e.target.value; if (value === '' || /^\d*\.?\d*$/.test(value)) { setFormData(prev => ({...prev, [field]: value})); }};
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSupplierChange = (e: React.ChangeEvent<HTMLInputElement>) => { const value = e.target.value; setFormData(prev => ({ ...prev, supplier: value })); if (value) setSuggestions(suppliers.filter(s => s.name.toLowerCase().includes(value.toLowerCase()))); else setSuggestions([]); };
    const handleSuggestionClick = (supplierName: string) => { setFormData(prev => ({ ...prev, supplier: supplierName })); setSuggestions([]); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ ...formData, price: Number(formData.price) || 0, cost: Number(formData.cost) || 0, stock: Number(formData.stock) || 0 }); }
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"><div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl max-h-full overflow-y-auto modal-content-animate"><h3 className="text-xl font-bold mb-6">{product ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">اسم المنتج</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div><label className="block text-sm font-medium text-gray-700">الفئة</label><input type="text" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div><label className="block text-sm font-medium text-gray-700">سعر البيع</label><input type="text" inputMode="decimal" name="price" value={formData.price} onChange={e=>handleNumericChange(e, 'price')} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div><label className="block text-sm font-medium text-gray-700">سعر التكلفة</label><input type="text" inputMode="decimal" name="cost" value={formData.cost} onChange={e=>handleNumericChange(e, 'cost')} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div><label className="block text-sm font-medium text-gray-700">الكمية</label><input type="text" inputMode="numeric" name="stock" value={formData.stock} onChange={e=>handleNumericChange(e, 'stock')} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div className="relative"><label className="block text-sm font-medium text-gray-700">الوحدة</label><input type="text" name="unit" value={formData.unit} onChange={handleChange} onFocus={()=>setIsUnitDropdownOpen(true)} onBlur={()=>setTimeout(()=>setIsUnitDropdownOpen(false), 150)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>{isUnitDropdownOpen && (<div className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">{[...new Set(['قطعة', 'كرتونة', 'لتر', 'جرام', ...units])].map(u => (<div key={u} onMouseDown={() => {setFormData(p => ({...p, unit: u})); setIsUnitDropdownOpen(false); }} className="p-2 hover:bg-gray-100 cursor-pointer">{u}</div>))}</div>)}</div><div className="relative md:col-span-2"><label className="block text-sm font-medium text-gray-700">المورد</label><input type="text" name="supplier" value={formData.supplier} onChange={handleSupplierChange} autoComplete="off" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>{suggestions.length > 0 && (<div className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">{suggestions.map(s => (<div key={s.id} onClick={() => handleSuggestionClick(s.name)} className="p-2 hover:bg-gray-100 cursor-pointer">{s.name}</div>))}</div>)}</div><div><label className="block text-sm font-medium text-gray-700">تاريخ الإنتاج</label><input type="date" name="productionDate" value={formData.productionDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div><label className="block text-sm font-medium text-gray-700">تاريخ الانتهاء</label><input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/></div><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">الباركود (اتركه فارغًا للتوليد التلقائي)</label><input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-left" dir="ltr"/></div></div><div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button></div></form></div></div>);
}

const BarcodePrintPage: React.FC<{ products: Product[], onClose: () => void }> = ({ products, onClose }) => {
    useEffect(() => {
        try {
            JsBarcode(".barcode-svg").init();
            const timer = setTimeout(() => {
                window.print();
            }, 300);
            return () => clearTimeout(timer);
        } catch (e) {
            console.error("JsBarcode error:", e);
        }
    }, [products]);

    const renderBarcodeSheet = () => (
        <div className="barcode-sheet">
            {products.map(product => (
                <div key={product.id} className="barcode-label">
                    <p>{product.name}</p>
                    <p>{currencyFormat(product.price)}</p>
                    <svg className="barcode-svg"
                        data-jsbarcode-value={product.barcode}
                        data-jsbarcode-width="1.5"
                        data-jsbarcode-height="40"
                        data-jsbarcode-displayvalue="false"
                        data-jsbarcode-margin="0">
                    </svg>
                </div>
            ))}
        </div>
    );

    return (
        <>
            {/* Modal for display */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 no-print">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[95vh] flex flex-col mx-auto my-[2.5vh]">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="text-xl font-bold">طباعة الباركود</h3>
                        <div className="flex items-center">
                            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold mr-4"><PrinterIcon className="w-5 h-5"/> طباعة</button>
                            <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md font-semibold">إغلاق</button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 bg-gray-100">
                        <div className="bg-white p-4 shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
                            {renderBarcodeSheet()}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Hidden content for printing */}
            <div className="printable-section">
                <div className="p-4" style={{ width: '210mm' }}>
                    {renderBarcodeSheet()}
                </div>
            </div>
        </>
    );
};