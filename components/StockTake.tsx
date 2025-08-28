import React, { useState, useMemo, useEffect } from 'react';
import { useData, useAuth, useSync } from '../contexts/AuthContext';
import type { StockTake as StockTakeType, StockTakeItem, Product } from '../types';
import { useToast } from './Toast';
import { useAuditLog } from '../hooks/useAuditLog';
import { SearchIcon, PlusIcon, MinusIcon, SaveIcon, CheckCircleIcon, PrinterIcon } from './icons';

const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
const statusMap: Record<StockTakeType['status'], { text: string; className: string }> = {
    in_progress: { text: 'قيد التنفيذ', className: 'bg-blue-100 text-blue-800' },
    completed: { text: 'مكتمل', className: 'bg-green-100 text-green-800' },
};

export const StockTake: React.FC = () => {
    const { stockTakes, setStockTakes, products, setProducts } = useData();
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const { logAction } = useAuditLog();
    
    const [activeStockTake, setActiveStockTake] = useState<StockTakeType | null>(null);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);

    useEffect(() => {
        const openModal = sessionStorage.getItem('openAddModal');
        if (openModal && hasPermission('stock_take', 'edit')) {
            setIsStartModalOpen(true);
            sessionStorage.removeItem('openAddModal');
        }
    }, [hasPermission]);

    const handleStartNew = ({ notes, isBlind }: { notes: string; isBlind: boolean }) => {
        const newStockTake: StockTakeType = {
            id: `ST-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'in_progress',
            notes,
            isBlind,
            items: products.map(p => ({
                productId: p.id,
                productName: p.name,
                expected: p.stock,
                counted: isBlind ? 0 : p.stock,
                difference: isBlind ? -p.stock : 0,
                costAtTime: p.cost,
                isCounted: false,
            })),
        };
        setActiveStockTake(newStockTake);
        setIsStartModalOpen(false);
        logAction('CREATE', 'StockTake', newStockTake.id, `بدء جرد جديد: ${notes || 'جرد عام'}`);
    };

    const handleContinue = (stockTake: StockTakeType) => {
        setActiveStockTake(stockTake);
    };

    const handleSaveAndExit = (updatedStockTake: StockTakeType) => {
        const existing = stockTakes.find(st => st.id === updatedStockTake.id);
        if (existing) {
            setStockTakes(stockTakes.map(st => st.id === updatedStockTake.id ? updatedStockTake : st));
        } else {
            setStockTakes([...stockTakes, updatedStockTake]);
        }
        addToast('تم حفظ تقدم الجرد بنجاح', 'success');
        setActiveStockTake(null);
    };

    const handleFinalize = (finalizedStockTake: StockTakeType) => {
        // First, create a new list of items where any uncounted item is considered "settled" or "matched".
        const settledItems = finalizedStockTake.items.map(item => {
            if (!item.isCounted) {
                return { ...item, counted: item.expected, difference: 0 };
            }
            return item;
        });
        
        const stockTakeToFinalize = { ...finalizedStockTake, items: settledItems };

        // Adjustments are now based only on items that actually had a discrepancy after settling uncounted ones.
        const adjustments = stockTakeToFinalize.items.filter(item => item.difference !== 0);

        if (adjustments.length > 0) {
            let updatedProducts = [...products];
            adjustments.forEach(item => {
                const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    updatedProducts[productIndex].stock = item.counted;
                    logAction('UPDATE', 'Product', item.productId, `تسوية المخزون بالجرد #${stockTakeToFinalize.id}: ${item.productName} من ${item.expected} إلى ${item.counted}`);
                }
            });
            setProducts(updatedProducts);
            addToast(`تم تسوية مخزون ${adjustments.length} منتج بنجاح.`, 'success');
        }
        
        const summary = calculateSummary(stockTakeToFinalize.items);
        const completedStockTake: StockTakeType = { 
            ...stockTakeToFinalize, 
            status: 'completed',
            discrepancyValue: { shortage: summary.shortageValue, overage: summary.overageValue }
        };

        const existing = stockTakes.find(st => st.id === completedStockTake.id);
        if (existing) {
            setStockTakes(stockTakes.map(st => st.id === completedStockTake.id ? completedStockTake : st));
        } else {
            setStockTakes([...stockTakes, completedStockTake]);
        }
        
        setActiveStockTake(null);
    };

    if (activeStockTake) {
        return <ActiveStockTake stockTake={activeStockTake} onSaveAndExit={handleSaveAndExit} onFinalize={handleFinalize} products={products} />;
    }

    return (
        <div className="p-8">
            {isStartModalOpen && <StartStockTakeModal onStart={handleStartNew} onClose={() => setIsStartModalOpen(false)} />}
            {hasPermission('stock_take', 'edit') && <button onClick={() => setIsStartModalOpen(true)} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold mb-6">بدء جرد جديد</button>}
            
            <h3 className="text-xl font-bold mb-4">سجل جرد المخزون</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-4">رقم الجرد</th><th className="p-4">التاريخ</th><th className="p-4">ملاحظات</th><th className="p-4">قيمة الفروقات</th><th className="p-4">الحالة</th><th className="p-4">إجراءات</th></tr></thead>
                    <tbody>
                        {stockTakes.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(st => (
                            <tr key={st.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-mono">{st.id}</td><td className="p-4">{new Date(st.date).toLocaleDateString('ar-EG')}</td><td className="p-4 text-sm text-gray-600">{st.notes || '-'}</td>
                                <td className="p-4 text-sm">
                                    {st.discrepancyValue ? (
                                        <>
                                            {st.discrepancyValue.overage > 0 && <span className="text-green-600 font-semibold block">زيادة: {currencyFormat(st.discrepancyValue.overage)}</span>}
                                            {st.discrepancyValue.shortage > 0 && <span className="text-red-600 font-semibold block">عجز: {currencyFormat(st.discrepancyValue.shortage)}</span>}
                                        </>
                                    ) : '-'}
                                </td>
                                <td><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusMap[st.status].className}`}>{statusMap[st.status].text}</span></td>
                                <td><button onClick={() => handleContinue(st)} className="text-blue-600 hover:underline">{st.status === 'in_progress' ? 'متابعة' : 'عرض التفاصيل'}</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Helper function for summary calculation ---
const calculateSummary = (items: StockTakeItem[]) => {
    let shortage = 0;
    let overage = 0;
    const countedItemsCount = items.filter(i => i.isCounted).length;

    items.forEach(item => {
        if (item.difference < 0) {
            shortage += Math.abs(item.difference) * item.costAtTime;
        } else if (item.difference > 0) {
            overage += item.difference * item.costAtTime;
        }
    });

    return {
        countedItemsCount,
        totalItems: items.length,
        shortageValue: shortage,
        overageValue: overage,
        netValue: overage - shortage,
    };
};

// --- Active Stock Take Component ---
interface ActiveStockTakeProps { stockTake: StockTakeType; onSaveAndExit: (st: StockTakeType) => void; onFinalize: (st: StockTakeType) => void; products: Product[] }

const ActiveStockTake: React.FC<ActiveStockTakeProps> = ({ stockTake, onSaveAndExit, onFinalize, products }) => {
    const [items, setItems] = useState<StockTakeItem[]>(stockTake.items);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'discrepancies' | 'uncounted'>('all');
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    const { scannedCode, clearScannedCode } = useSync();
    const { addToast } = useToast();
    const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const handleCountChange = (productId: string, newCount: number) => {
        setItems(items.map(item => {
            if (item.productId === productId) {
                const counted = Math.max(0, newCount);
                return { ...item, counted, difference: counted - item.expected, isCounted: true };
            }
            return item;
        }));
    };
    
    useEffect(() => {
        if (scannedCode) {
            const product = products.find(p => p.barcode === scannedCode);
            if (product) {
                const item = items.find(i => i.productId === product.id);
                if (item) {
                    setSearchTerm(item.productName);
                    handleCountChange(item.productId, item.counted + 1);
                    addToast(`+1 ${item.productName}`, 'info');
                }
            } else {
                addToast(`الباركود ${scannedCode} غير موجود.`, 'error');
            }
            clearScannedCode();
        }
    }, [scannedCode, clearScannedCode, items]);
    
    const summary = useMemo(() => calculateSummary(items), [items]);

    const displayedItems = useMemo(() => {
        let filtered = items.filter(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
        if (activeTab === 'discrepancies') {
            filtered = filtered.filter(item => item.difference !== 0);
        } else if (activeTab === 'uncounted') {
            filtered = filtered.filter(item => !item.isCounted);
        }
        return filtered;
    }, [items, searchTerm, activeTab]);

    const handleFinalizeClick = () => {
        if (summary.countedItemsCount < summary.totalItems) {
            if (!window.confirm(`لم يتم جرد كل الأصناف (${summary.countedItemsCount}/${summary.totalItems}). هل تريد المتابعة على أي حال؟ الأصناف التي لم يتم جردها ستعتبر مطابقة.`)) {
                return;
            }
        }
        setIsFinalizeModalOpen(true);
    };

    return (
        <div className="p-8">
            {isPrinting && <PrintableReport stockTake={{ ...stockTake, items }} onClose={() => setIsPrinting(false)} />}
            {isFinalizeModalOpen && <FinalizeConfirmationModal summary={summary} onConfirm={() => onFinalize({ ...stockTake, items })} onClose={() => setIsFinalizeModalOpen(false)} />}

            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">جرد المخزون: {stockTake.notes || stockTake.id}</h2>
                <p className="text-gray-500">التاريخ: {new Date(stockTake.date).toLocaleDateString('ar-EG')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center"><p className="text-sm text-gray-500">الأصناف التي تم جردها</p><p className="text-2xl font-bold">{summary.countedItemsCount} / {summary.totalItems}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center"><p className="text-sm text-gray-500">قيمة العجز</p><p className="text-2xl font-bold text-red-500">{currencyFormat(summary.shortageValue)}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center"><p className="text-sm text-gray-500">قيمة الزيادة</p><p className="text-2xl font-bold text-green-600">{currencyFormat(summary.overageValue)}</p></div>
                <div className="bg-white p-4 rounded-lg border shadow-sm text-center"><p className="text-sm text-gray-500">صافي الفرق</p><p className={`text-2xl font-bold ${summary.netValue > 0 ? 'text-green-600' : summary.netValue < 0 ? 'text-red-500' : ''}`}>{currencyFormat(summary.netValue)}</p></div>
            </div>

            {/* Controls */}
            <div className="sticky top-0 bg-gray-50/80 backdrop-blur-sm p-4 mb-4 z-10 rounded-lg border shadow-sm flex flex-wrap gap-4 items-center">
                <div className="relative flex-grow"><SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="ابحث بالاسم أو امسح الباركود..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md pr-10"/></div>
                {stockTake.status === 'in_progress' ? (
                    <>
                        <button onClick={() => onSaveAndExit({ ...stockTake, items })} className="px-4 py-2 bg-gray-600 text-white rounded-md flex items-center gap-2"><SaveIcon className="w-5 h-5"/> حفظ والعودة</button>
                        <button onClick={handleFinalizeClick} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2"><CheckCircleIcon className="w-5 h-5"/> إنهاء وتسوية</button>
                    </>
                ) : <button onClick={() => onSaveAndExit(stockTake)} className="px-4 py-2 bg-gray-600 text-white rounded-md">العودة للسجل</button>}
                <button onClick={() => setIsPrinting(true)} className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center gap-2"><PrinterIcon className="w-5 h-5"/> طباعة التقرير</button>
            </div>
            
            <div className="flex border-b mb-4">
                {(['all', 'discrepancies', 'uncounted'] as const).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-semibold ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>{{all: 'كل الأصناف', discrepancies: 'الفروقات فقط', uncounted: 'لم يتم جرده'}[tab]}</button>)}
            </div>

            {/* Items List */}
            <div className="space-y-2">
                {displayedItems.map(item => (
                    <div key={item.productId} className={`bg-white p-3 rounded-lg border grid grid-cols-12 gap-4 items-center ${!item.isCounted ? 'border-blue-200' : item.difference !== 0 ? 'border-red-200' : 'border-gray-200'}`}>
                        <div className="col-span-12 md:col-span-4 font-semibold">{item.productName}</div>
                        {!stockTake.isBlind && <div className="col-span-4 md:col-span-2 text-center text-gray-600">المسجل: <span className="font-bold">{item.expected}</span></div>}
                        <div className={`col-span-8 md:col-span-3 flex items-center justify-center gap-2 ${stockTake.isBlind ? 'md:col-start-5' : ''}`}>
                            <button onClick={() => handleCountChange(item.productId, item.counted - 1)} disabled={stockTake.status === 'completed'} className="p-1 bg-gray-200 rounded-full disabled:opacity-50"><MinusIcon className="w-4 h-4"/></button>
                            <input type="number" value={item.counted} onChange={e => handleCountChange(item.productId, parseInt(e.target.value) || 0)} className="w-20 p-1 border rounded-md text-center font-bold text-lg" disabled={stockTake.status === 'completed'} />
                            <button onClick={() => handleCountChange(item.productId, item.counted + 1)} disabled={stockTake.status === 'completed'} className="p-1 bg-gray-200 rounded-full disabled:opacity-50"><PlusIcon className="w-4 h-4"/></button>
                        </div>
                        <div className="col-span-6 md:col-span-2 text-center">الفرق: <span className={`font-bold text-xl ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : ''}`}>{item.difference > 0 ? `+${item.difference}` : item.difference}</span></div>
                        <div className="col-span-6 md:col-span-1 text-center">{item.isCounted && <span title="تم جرده"><CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto"/></span>}</div>
                    </div>
                ))}
                 {displayedItems.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد أصناف تطابق الفلتر الحالي.</p>}
            </div>
        </div>
    );
};

// --- Modals and Print Components ---
const StartStockTakeModal: React.FC<{ onStart: (d: {notes: string, isBlind: boolean}) => void, onClose: () => void }> = ({ onStart, onClose }) => {
    const [notes, setNotes] = useState('');
    const [isBlind, setIsBlind] = useState(false);
    return (<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-md"><h3 className="text-xl font-bold mb-4">بدء جرد جديد</h3><div className="space-y-4"><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="اسم أو ملاحظات الجرد (اختياري)" className="w-full p-2 border rounded-md" /><label className="flex items-center gap-3 p-3 rounded-md bg-gray-50 border"><input type="checkbox" checked={isBlind} onChange={e => setIsBlind(e.target.checked)} className="h-5 w-5"/><div><p className="font-semibold">جرد أعمى (Blind Count)</p><p className="text-xs text-gray-500">إخفاء الكميات المسجلة لضمان الدقة.</p></div></label></div><div className="flex justify-end gap-2 pt-6"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button onClick={() => onStart({ notes, isBlind })} className="px-4 py-2 bg-blue-600 text-white rounded-md">ابدأ الجرد</button></div></div></div>);
};

const FinalizeConfirmationModal: React.FC<{ summary: any, onConfirm: () => void, onClose: () => void }> = ({ summary, onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-lg"><h3 className="text-xl font-bold mb-4">تأكيد إنهاء الجرد</h3><p className="mb-4">سيتم تحديث كميات المخزون بناءً على الفروقات المسجلة. هل أنت متأكد؟</p><div className="bg-gray-50 p-4 rounded-md space-y-2 mb-6 border"><div className="flex justify-between"><span>قيمة العجز الإجمالية:</span><span className="font-bold text-red-500">{currencyFormat(summary.shortageValue)}</span></div><div className="flex justify-between"><span>قيمة الزيادة الإجمالية:</span><span className="font-bold text-green-600">{currencyFormat(summary.overageValue)}</span></div></div><div className="flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button onClick={onConfirm} className="px-4 py-2 bg-green-600 text-white rounded-md">نعم، قم بالإنهاء والتسوية</button></div></div></div>
);

const PrintableReport: React.FC<{ stockTake: StockTakeType, onClose: () => void }> = ({ stockTake, onClose }) => {
    useEffect(() => { const timer = setTimeout(() => window.print(), 500); return () => clearTimeout(timer); }, []);
    const summary = calculateSummary(stockTake.items);
    return (<div className="printable-section format-a4"><div className="p-4"><h1 className="text-2xl font-bold text-center">تقرير جرد المخزون</h1><div className="flex justify-between my-4 text-sm border-y py-2"><p><b>رقم الجرد:</b> {stockTake.id}</p><p><b>التاريخ:</b> {new Date(stockTake.date).toLocaleDateString('ar-EG')}</p><p><b>ملاحظات:</b> {stockTake.notes || '-'}</p></div><div className="grid grid-cols-3 gap-4 mb-4 text-center"><div className="bg-red-50 p-2 rounded"><b>إجمالي العجز:</b><p className="font-bold text-red-600">{currencyFormat(summary.shortageValue)}</p></div><div className="bg-green-50 p-2 rounded"><b>إجمالي الزيادة:</b><p className="font-bold text-green-600">{currencyFormat(summary.overageValue)}</p></div><div className="bg-blue-50 p-2 rounded"><b>صافي الفرق:</b><p className="font-bold">{currencyFormat(summary.netValue)}</p></div></div><table className="w-full text-sm text-center border-collapse border"><thead><tr className="bg-gray-100"><th className="border p-2">المنتج</th><th className="border p-2">المسجل</th><th className="border p-2">الفعلي</th><th className="border p-2">الفرق</th><th className="border p-2">التكلفة</th><th className="border p-2">قيمة الفرق</th></tr></thead><tbody>{stockTake.items.map(item => (<tr key={item.productId} className="border"><td className="border p-2 text-right">{item.productName}</td><td className="border p-2">{item.expected}</td><td className="border p-2">{item.counted}</td><td className={`border p-2 font-bold ${item.difference !== 0 ? 'bg-yellow-50' : ''}`}>{item.difference}</td><td className="border p-2">{currencyFormat(item.costAtTime)}</td><td className={`border p-2 font-bold ${item.difference < 0 ? 'text-red-600' : 'text-green-600'}`}>{currencyFormat(item.difference * item.costAtTime)}</td></tr>))}</tbody></table></div></div>);
};