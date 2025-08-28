import React, { useEffect } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Invoice } from '../types';
import { PrinterIcon } from './icons';

interface InvoiceReceiptProps {
    invoice: Invoice;
    onClose: () => void;
    autoPrint?: boolean;
}

const ReceiptBody: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
    const { invoiceSettings } = useData();
    const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
    const discountAmount = invoice.discount.type === 'fixed' ? invoice.discount.value : invoice.subtotal * (invoice.discount.value / 100);
    const taxAmount = invoice.tax.type === 'fixed' ? invoice.tax.value : (invoice.subtotal - discountAmount) * (invoice.tax.value / 100);
    const paymentMethodText = {'cash': 'نقدي', 'credit': 'آجل', 'partial': 'جزئي'}[invoice.paymentMethod];
    
    return (
        <>
            {/* Header */}
            <div className="w-full mb-2">
                {invoiceSettings.logo && (
                    <img 
                        src={invoiceSettings.logo} 
                        alt="logo" 
                        className="mx-auto mb-2 object-contain"
                        style={{ maxWidth: `${invoiceSettings.logoSize}px`, maxHeight: `${invoiceSettings.logoSize}px` }}
                    />
                )}
                <h2 className="font-bold" style={{ fontSize: `${invoiceSettings.fontSizes.header}px` }}>{invoiceSettings.shopName}</h2>
                {invoiceSettings.phone && <p style={{ fontSize: `${invoiceSettings.fontSizes.header * 0.7}px` }}>{invoiceSettings.phone}</p>}
                {invoiceSettings.address && <p style={{ fontSize: `${invoiceSettings.fontSizes.header * 0.7}px` }}>{invoiceSettings.address}</p>}
            </div>

            {/* Details */}
            <div className="my-4 border-t border-b border-dashed py-2 w-full text-sm" style={{ fontSize: `${invoiceSettings.fontSizes.body}px` }}>
               <div className="flex justify-between"><span>رقم الفاتورة:</span><span className="font-mono">{invoice.id}</span></div>
               <div className="flex justify-between"><span>التاريخ:</span><span>{new Date(invoice.date).toLocaleString('ar-EG')}</span></div>
               <div className="flex justify-between"><span>العميل:</span><span>{invoice.customerName}</span></div>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm text-center" style={{ fontSize: `${invoiceSettings.fontSizes.body}px` }}>
                <thead className="text-center">
                    <tr className="border-b-2 border-black">
                        <th className="py-1 text-right">المنتج</th>
                        <th className="py-1 text-center">الكمية</th>
                        <th className="py-1 text-center">السعر</th>
                        <th className="py-1 text-left">الإجمالي</th>
                    </tr>
                </thead>
                <tbody className="text-center">
                    {invoice.items.map(item => (
                        <tr key={item.productId} className="border-b border-dashed">
                            <td className="py-2 text-right">{item.name}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-center">{item.price.toLocaleString()}</td>
                            <td className="py-2 text-left">{(item.quantity * item.price).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 w-full space-y-1 text-center totals-section" style={{ fontSize: `${invoiceSettings.fontSizes.totals}px` }}>
                <div className="flex justify-between"><span>المجموع الفرعي:</span><span className="font-semibold">{currencyFormat(invoice.subtotal)}</span></div>
                {discountAmount > 0 && <div className="flex justify-between"><span>الخصم:</span><span className="font-semibold">- {currencyFormat(discountAmount)}</span></div>}
                {taxAmount > 0 && <div className="flex justify-between"><span>الضريبة:</span><span className="font-semibold">+ {currencyFormat(taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t border-black pt-1 mt-1" style={{ fontSize: 'inherit' }}><span>الإجمالي:</span><span>{currencyFormat(invoice.total)}</span></div>
                <div className="flex justify-between"><span>المدفوع:</span><span className="font-semibold">{currencyFormat(invoice.paidAmount)}</span></div>
                {invoice.dueAmount > 0 && <div className="flex justify-between text-red-600"><span>المتبقي:</span><span className="font-semibold">{currencyFormat(invoice.dueAmount)}</span></div>}
                 <div className="flex justify-between"><span>طريقة الدفع:</span><span className="font-semibold">{paymentMethodText}</span></div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 w-full">
                <p className="text-sm" style={{ fontSize: `${invoiceSettings.fontSizes.body * 0.9}px` }}>{invoiceSettings.footerMessage}</p>
                {invoiceSettings.footerImage && (
                    <img 
                        src={invoiceSettings.footerImage} 
                        alt="footer" 
                        className="mx-auto mt-2 object-contain"
                        style={{ maxWidth: `${invoiceSettings.footerImageSize}px`, maxHeight: `${invoiceSettings.footerImageSize}px` }}
                    />
                )}
                {invoiceSettings.secondaryFooterMessage && (
                    <p className="text-xs mt-2" style={{ fontSize: `${invoiceSettings.fontSizes.body * 0.8}px` }}>
                        {invoiceSettings.secondaryFooterMessage}
                    </p>
                )}
            </div>
        </>
    );
};

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({ invoice, onClose, autoPrint = false }) => {
    const { printSettings } = useData();
    
    useEffect(() => {
        if (autoPrint) {
            const timer = setTimeout(() => {
                window.print();
            }, 500); // Delay to allow render before printing
            return () => clearTimeout(timer);
        }
    }, [autoPrint]);

    const formatClass = printSettings.defaultFormat === 'a4' 
        ? 'format-a4' 
        : `format-receipt-${printSettings.defaultFormat}`;

    return (
        <>
            {/* Modal for UI display */}
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-full flex flex-col modal-content-animate">
                    <div className="flex-grow overflow-y-auto">
                        <div className="p-6 text-black flex flex-col items-center text-center">
                           <ReceiptBody invoice={invoice} />
                        </div>
                    </div>
                    <div className="bg-gray-100 p-4 flex justify-end gap-3 no-print">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md font-semibold">إغلاق</button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 font-semibold"><PrinterIcon className="w-5 h-5"/> طباعة</button>
                    </div>
                </div>
            </div>
            {/* Div for printing only */}
            <div className={`printable-section ${formatClass}`}>
                 <div className="p-6 text-black flex flex-col items-center text-center">
                    <ReceiptBody invoice={invoice} />
                </div>
            </div>
        </>
    );
};