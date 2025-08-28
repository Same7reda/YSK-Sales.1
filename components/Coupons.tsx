import React, { useState, useMemo } from 'react';
import { useData, useAuth } from '../contexts/AuthContext';
import type { Coupon } from '../types';
import { useToast } from './Toast';
import { useAuditLog } from '../hooks/useAuditLog';
import { EditIcon, Trash2Icon, SearchIcon } from './icons';

export const Coupons: React.FC = () => {
    const { coupons, setCoupons } = useData();
    const { hasPermission } = useAuth();
    const { addToast } = useToast();
    const { logAction } = useAuditLog();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const displayedCoupons = useMemo(() => 
        coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    , [coupons, searchTerm]);

    const handleOpenModal = (coupon: Coupon | null = null) => {
        setCurrentCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleSaveCoupon = (couponData: Omit<Coupon, 'id'>) => {
        if (currentCoupon) {
            const updatedCoupon = { ...currentCoupon, ...couponData };
            setCoupons(coupons.map(c => c.id === currentCoupon.id ? updatedCoupon : c));
            logAction('UPDATE', 'Coupon', updatedCoupon.id, `تحديث كوبون: ${updatedCoupon.code}`);
        } else {
            const newCoupon = { ...couponData, id: `C-${Date.now()}` };
            setCoupons([...coupons, newCoupon]);
            logAction('CREATE', 'Coupon', newCoupon.id, `إنشاء كوبون جديد: ${newCoupon.code}`);
        }
        addToast('تم حفظ الكوبون بنجاح', 'success');
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الكوبون؟')) {
            const couponToDelete = coupons.find(c => c.id === id);
            setCoupons(coupons.filter(c => c.id !== id));
            if (couponToDelete) {
                logAction('DELETE', 'Coupon', id, `حذف كوبون: ${couponToDelete.code}`);
            }
            addToast('تم حذف الكوبون', 'success');
        }
    };
    
    const canEdit = hasPermission('coupons', 'edit');

    return (
        <div className="p-8">
            {canEdit && <button onClick={() => handleOpenModal()} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold mb-6">إنشاء كوبون جديد</button>}
            
            <div className="relative mb-4">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="ابحث بكود الكوبون..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-1/3 p-2 border rounded-md pr-10"/>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b"><tr><th className="p-4">الكود</th><th className="p-4">النوع</th><th className="p-4">القيمة</th><th className="p-4">تاريخ الانتهاء</th><th className="p-4">الحالة</th>{canEdit && <th className="p-4">إجراءات</th>}</tr></thead>
                    <tbody>
                        {displayedCoupons.map(coupon => (
                            <tr key={coupon.id} className="border-b">
                                <td className="p-4 font-mono">{coupon.code}</td>
                                <td>{coupon.type === 'percentage' ? 'نسبة مئوية' : 'قيمة ثابتة'}</td>
                                <td>{coupon.type === 'percentage' ? `${coupon.value}%` : coupon.value.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</td>
                                <td>{new Date(coupon.expiryDate).toLocaleDateString('ar-EG')}</td>
                                <td><span className={`px-2 py-1 text-xs rounded-full ${coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{coupon.isActive ? 'نشط' : 'غير نشط'}</span></td>
                                {canEdit && <td><div className="flex justify-center gap-2"><button onClick={() => handleOpenModal(coupon)}><EditIcon className="w-5 h-5 text-gray-500 hover:text-blue-600"/></button><button onClick={() => handleDelete(coupon.id)}><Trash2Icon className="w-5 h-5 text-gray-500 hover:text-red-600"/></button></div></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <CouponModal coupon={currentCoupon} onSave={handleSaveCoupon} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// --- Coupon Modal ---
interface CouponModalProps { coupon: Coupon | null; onSave: (data: Omit<Coupon, 'id'>) => void; onClose: () => void; }

const CouponModal: React.FC<CouponModalProps> = ({ coupon, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        code: coupon?.code || `YSK${Date.now().toString().slice(-6)}`,
        type: coupon?.type || 'percentage',
        value: coupon?.value || '',
        expiryDate: coupon?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: coupon ? coupon.isActive : true,
    });
    // FIX: A type guard has been added to check if the event target is an HTMLInputElement before accessing the 'checked' property, resolving a type error since 'checked' does not exist on HTMLSelectElement.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const target = e.target;
        if (target.type === 'checkbox' && target instanceof HTMLInputElement) {
            setFormData(prev => ({ ...prev, [target.name]: target.checked }));
        } else {
            setFormData(prev => ({ ...prev, [target.name]: target.value }));
        }
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, value: Number(formData.value) });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">{coupon ? 'تعديل كوبون' : 'إنشاء كوبون جديد'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label>الكود</label><input name="code" value={formData.code} onChange={handleChange} className="w-full p-2 border rounded-md" required/></div>
                        <div><label>النوع</label><select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded-md"><option value="percentage">نسبة مئوية</option><option value="fixed">قيمة ثابتة</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label>القيمة</label><input name="value" type="number" value={formData.value} onChange={handleChange} className="w-full p-2 border rounded-md" required/></div>
                        <div><label>تاريخ الانتهاء</label><input name="expiryDate" type="date" value={formData.expiryDate} onChange={handleChange} className="w-full p-2 border rounded-md" required/></div>
                    </div>
                    <div><label className="flex items-center gap-2"><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange}/> نشط</label></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">إلغاء</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};