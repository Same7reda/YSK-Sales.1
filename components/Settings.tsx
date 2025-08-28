import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useToast } from './Toast';
// FIX: Imported `useData` and `useStorage` from AuthContext to make them available in the component.
import { useAuth, useSync, useStorage, useData } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { Page, UserPermissions, User, NotificationSettings, FirebaseConfig, InvoiceSettings, CustomerGroup, PrintSettings } from '../types';
import { UserPlusIcon, EditIcon, Trash2Icon, UserIcon, BellIcon, DatabaseIcon, UsersIcon, ChevronDown, CloudIcon, ReceiptIcon, PrinterIcon } from './icons';

declare var QRCode: any;

const pages: { id: Page; name: string }[] = [
    { id: 'dashboard', name: 'لوحة التحكم' }, { id: 'inventory', name: 'المخزون' },
    { id: 'pos', name: 'نقطة البيع' }, { id: 'invoices', name: 'الفواتير' },
    { id: 'customers', name: 'العملاء' }, { id: 'suppliers', name: 'الموردين' },
    { id: 'bookings', name: 'الحجوزات' }, { id: 'expenses', name: 'المصاريف' },
    { id: 'reports', name: 'التقارير' },
];

type SettingsTab = 'profile' | 'users' | 'invoice' | 'print' | 'notifications' | 'sync' | 'data';

export const Settings: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    if (!currentUser) return null;

    const tabs: {id: SettingsTab; label: string; icon: React.ReactNode; adminOnly: boolean}[] = [
        { id: 'profile', label: 'ملفي الشخصي', icon: <UserIcon className="w-5 h-5"/>, adminOnly: false },
        { id: 'users', label: 'إدارة المستخدمين', icon: <UsersIcon className="w-5 h-5"/>, adminOnly: true },
        { id: 'invoice', label: 'تخصيص الفاتورة', icon: <ReceiptIcon className="w-5 h-5"/>, adminOnly: true },
        { id: 'print', label: 'إعدادات الطباعة', icon: <PrinterIcon className="w-5 h-5"/>, adminOnly: true },
        { id: 'notifications', label: 'التنبيهات', icon: <BellIcon className="w-5 h-5"/>, adminOnly: true },
        { id: 'sync', label: 'المزامنة والربط', icon: <CloudIcon className="w-5 h-5"/>, adminOnly: true },
        { id: 'data', label: 'البيانات', icon: <DatabaseIcon className="w-5 h-5"/>, adminOnly: true },
    ];
    
    const visibleTabs = tabs.filter(tab => !tab.adminOnly || currentUser.isAdmin);

    const renderContent = () => {
        if (!currentUser.isAdmin && activeTab !== 'profile') {
             return <ProfileSettings />;
        }
        switch(activeTab) {
            case 'profile': return <ProfileSettings />;
            case 'users': return <UserSettings />;
            case 'invoice': return <InvoiceSettingsPanel />;
            case 'print': return <PrintSettingsPanel />;
            case 'notifications': return <NotificationSettingsPanel />;
            case 'sync': return <SyncSettings />;
            case 'data': return <DataSettings />;
            default: return <ProfileSettings />;
        }
    };
    
    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-64">
                    <nav className="space-y-1">
                        {visibleTabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right font-semibold transition-colors ${
                                    activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 min-w-0">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

const ProfileSettings: React.FC = () => {
    const { currentUser, updateUser } = useAuth();
    const [formData, setFormData] = useState({ fullName: currentUser?.fullName || '', email: currentUser?.email || '', phone: currentUser?.phone || '', currentPassword: '', newPassword: '', confirmPassword: ''});
    const { addToast } = useToast();
    const avatarInputRef = useRef<HTMLInputElement>(null);

    if (!currentUser) return null;

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        let passwordUpdated = false;
        if(formData.newPassword) {
            // In a real app, hash and compare. For this demo, direct compare is fine.
            if (formData.currentPassword !== currentUser.passwordHash) { return addToast('كلمة المرور الحالية غير صحيحة', 'error'); }
            if (formData.newPassword !== formData.confirmPassword) { return addToast('كلمتا المرور الجديدتان غير متطابقتين', 'error'); }
            passwordUpdated = true;
        }

        updateUser({
            ...currentUser,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            passwordHash: passwordUpdated ? formData.newPassword : currentUser.passwordHash
        });
        addToast('تم تحديث الملف الشخصي بنجاح', 'success');
        setFormData(f => ({...f, currentPassword: '', newPassword: '', confirmPassword: ''}));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                updateUser({ ...currentUser, avatarUrl: event.target?.result as string });
                addToast('تم تحديث الصورة الشخصية', 'success');
            };
            reader.readAsDataURL(file);
        }
    };

    return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">ملفي الشخصي</h2>
        </div>
        <div className="p-6">
            <div className="flex items-center gap-6 mb-8">
                <img src={currentUser.avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100"/>
                <div>
                    <h3 className="text-xl font-bold">{currentUser.fullName}</h3>
                    <p className="text-gray-500">{currentUser.jobTitle}</p>
                    <button onClick={() => avatarInputRef.current?.click()} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">تغيير الصورة</button>
                    <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />
                </div>
            </div>
            <form onSubmit={handleUpdate}>
                 <h3 className="text-lg font-semibold mb-4 border-t pt-6">المعلومات الشخصية</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input value={formData.fullName} onChange={e => setFormData(f=>({...f, fullName: e.target.value}))} placeholder="الاسم الكامل" className="p-2 border rounded-md bg-gray-50"/>
                    <input value={formData.email} onChange={e => setFormData(f=>({...f, email: e.target.value}))} placeholder="البريد الإلكتروني" className="p-2 border rounded-md bg-gray-50"/>
                    <input value={formData.phone} onChange={e => setFormData(f=>({...f, phone: e.target.value}))} placeholder="رقم الهاتف" className="p-2 border rounded-md bg-gray-50"/>
                </div>
                <h3 className="text-lg font-semibold mb-4 mt-6 border-t pt-6">تغيير كلمة المرور</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <input type="password" value={formData.currentPassword} onChange={e => setFormData(f=>({...f, currentPassword: e.target.value}))} placeholder="كلمة المرور الحالية" className="p-2 border rounded-md bg-gray-50"/>
                     <input type="password" value={formData.newPassword} onChange={e => setFormData(f=>({...f, newPassword: e.target.value}))} placeholder="كلمة المرور الجديدة" className="p-2 border rounded-md bg-gray-50"/>
                     <input type="password" value={formData.confirmPassword} onChange={e => setFormData(f=>({...f, confirmPassword: e.target.value}))} placeholder="تأكيد الجديدة" className="p-2 border rounded-md bg-gray-50"/>
                </div>
                <div className="mt-8 flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">حفظ التغييرات</button>
                </div>
            </form>
        </div>
    </div>
    );
}

const UserSettings: React.FC = () => {
    const { users, deleteUser } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleEdit = (user: User) => { setEditingUser(user); setModalOpen(true); };
    const handleAdd = () => { setEditingUser(null); setModalOpen(true); };
    const handleDelete = (userId: string) => { if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) deleteUser(userId); };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h2>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"><UserPlusIcon className="w-5 h-5"/> إضافة مستخدم</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {users.map(user => (
                    <div key={user.id} className="relative bg-white border border-gray-200 rounded-lg p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className={`absolute top-2 left-2 w-3 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} title={user.isActive ? 'نشط' : 'غير نشط'}></div>
                        {user.isAdmin && (
                            <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">مدير</div>
                        )}
                        <img src={user.avatarUrl} alt={user.fullName} className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-gray-100"/>
                        <h3 className="font-bold text-lg text-gray-800">{user.fullName}</h3>
                        <p className="text-gray-500 text-sm mb-3">{user.jobTitle}</p>
                        
                        <div className="flex justify-center gap-3 mt-auto pt-4 border-t border-gray-100 w-full">
                            <button onClick={() => handleEdit(user)} title="تعديل" className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors">
                                <EditIcon className="w-5 h-5"/>
                            </button>
                            {user.id !== 'admin' && (
                                <button onClick={() => handleDelete(user.id)} title="حذف" className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                                    <Trash2Icon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {modalOpen && <UserModal user={editingUser} onClose={() => setModalOpen(false)} />}
        </div>
    );
}

const SwitchControl: React.FC<{ label: string; enabled: boolean; setEnabled: (e: boolean) => void; disabled?: boolean }> = ({ label, enabled, setEnabled, disabled }) => (
    <div className={`flex items-center justify-between p-3 rounded-md bg-gray-50 ${disabled ? 'opacity-50' : ''}`}>
        <span className="font-semibold text-gray-700">{label}</span>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => !disabled && setEnabled(e.target.checked)} className="sr-only peer" disabled={disabled}/>
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
    </div>
);

const CheckboxControl: React.FC<{ label: string, checked: boolean, onChange: (c: boolean) => void, disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
    <label className={`flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" disabled={disabled} />
        <span className="font-medium text-gray-800">{label}</span>
    </label>
);

const UserModal: React.FC<{ user: User | null, onClose: () => void }> = ({ user, onClose }) => {
    const { addUser, updateUser } = useAuth();
    const [formData, setFormData] = useState({ 
        username: user?.username || '', password: '', fullName: user?.fullName || '', jobTitle: user?.jobTitle || '', 
        phone: user?.phone || '', email: user?.email || '', securityQuestion: user?.securityQuestion || '', 
        securityAnswer: user?.securityAnswer || '', avatarUrl: user?.avatarUrl || `https://i.pravatar.cc/100?u=${Date.now()}`
    });
    const [isActive, setIsActive] = useState(user ? user.isActive : true);
    // FIX: Corrected access to permissions properties that caused type errors.
    const [canEditData, setCanEditData] = useState(user ? user.permissions.canEditData : false);
    const [visiblePages, setVisiblePages] = useState<Set<Page>>(new Set(user ? user.permissions.visiblePages : []));

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const isEditingAdmin = user?.isAdmin || false;
    
    const handlePageToggle = (page: Page, checked: boolean) => {
        setVisiblePages(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(page);
            else newSet.delete(page);
            return newSet;
        });
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setFormData(f => ({ ...f, avatarUrl: event.target?.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { password, ...userData } = formData;
        
        // FIX: The permissions object now includes all required properties to conform to the UserPermissions type.
        const permissions: UserPermissions = {
            visiblePages: Array.from(visiblePages),
            canEditData,
            maxDiscountPercentage: user?.permissions.maxDiscountPercentage || 0,
            canUseAssistant: user?.permissions.canUseAssistant || false
        };

        if (user) {
            updateUser({ ...user, ...userData, permissions, isActive, passwordHash: password || user.passwordHash });
        } else {
            if (!password) return alert('كلمة المرور مطلوبة للمستخدم الجديد');
            addUser({ ...userData, passwordHash: password, isAdmin: false, permissions, isActive });
        }
        onClose();
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col modal-content-animate">
                <h3 className="text-xl font-bold mb-4">{user ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
                <form id="user-modal-form" onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col lg:flex-row gap-6">
                    {/* --- User Details --- */}
                    <div className="lg:w-1/3 space-y-4 overflow-y-auto pr-2 -mr-2 pb-4">
                        <fieldset className="border p-4 rounded-md flex flex-col items-center"><legend className="px-2 font-semibold">الصورة الرمزية</legend><img src={formData.avatarUrl} className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-blue-100"/><button type="button" onClick={() => avatarInputRef.current?.click()} className="text-sm text-blue-600 font-semibold hover:underline">تغيير الصورة</button><input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" /></fieldset>
                        <fieldset className="border p-4 rounded-md"><legend className="px-2 font-semibold">المعلومات الشخصية</legend><div className="space-y-3"><input name="fullName" value={formData.fullName} onChange={e=>setFormData(f=>({...f, fullName:e.target.value}))} placeholder="الاسم الكامل" required className="p-2 border rounded-md w-full"/><input name="jobTitle" value={formData.jobTitle} onChange={e=>setFormData(f=>({...f, jobTitle:e.target.value}))} placeholder="الوظيفة" className="p-2 border rounded-md w-full"/><input name="phone" value={formData.phone} onChange={e=>setFormData(f=>({...f, phone:e.target.value}))} placeholder="الهاتف" className="p-2 border rounded-md w-full"/><input name="email" value={formData.email} onChange={e=>setFormData(f=>({...f, email:e.target.value}))} placeholder="البريد" type="email" className="p-2 border rounded-md w-full"/></div></fieldset>
                        <fieldset className="border p-4 rounded-md"><legend className="px-2 font-semibold">معلومات الحساب</legend><div className="space-y-3"><input name="username" value={formData.username} onChange={e=>setFormData(f=>({...f, username:e.target.value}))} placeholder="اسم المستخدم" required className="p-2 border rounded-md w-full" autoComplete="off"/><input name="password" type="password" value={formData.password} onChange={e=>setFormData(f=>({...f, password:e.target.value}))} placeholder={user ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"} className="p-2 border rounded-md w-full" autoComplete="new-password"/><input name="securityQuestion" value={formData.securityQuestion} onChange={e=>setFormData(f=>({...f, securityQuestion:e.target.value}))} placeholder="سؤال الأمان" required className="p-2 border rounded-md w-full"/><input name="securityAnswer" value={formData.securityAnswer} onChange={e=>setFormData(f=>({...f, securityAnswer:e.target.value}))} placeholder="إجابة سؤال الأمان" required className="p-2 border rounded-md w-full"/></div></fieldset>
                    </div>
                     {/* --- Permissions --- */}
                     <div className="lg:w-2/3 overflow-y-auto pr-2 -mr-2 pb-4">
                        {isEditingAdmin ? (
                            <div className="border p-4 rounded-md h-full flex items-center justify-center bg-gray-50">
                                <p className="text-gray-600 font-semibold text-lg">صلاحيات المدير كاملة ولا يمكن تعديلها.</p>
                            </div>
                        ) : (
                            <fieldset className="border p-4 rounded-md h-full space-y-4"><legend className="px-2 font-semibold">الصلاحيات</legend>
                                <div className="space-y-2">
                                    <SwitchControl label="الحساب نشط" enabled={isActive} setEnabled={setIsActive} disabled={isEditingAdmin} />
                                    <SwitchControl label="السماح بتعديل البيانات (إضافة/تعديل/حذف/طباعة)" enabled={canEditData} setEnabled={setCanEditData} disabled={isEditingAdmin} />
                                </div>
                                <div className="border p-3 rounded-md">
                                    <h4 className="font-semibold text-gray-800 mb-2">عرض الصفحات</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {pages.map(page => (
                                            <CheckboxControl key={page.id} label={page.name} checked={visiblePages.has(page.id)} onChange={(checked) => handlePageToggle(page.id, checked)} disabled={isEditingAdmin} />
                                        ))}
                                    </div>
                                </div>
                            </fieldset>
                        )}
                    </div>
                </form>
                <div className="flex justify-end gap-3 pt-4 mt-auto border-t"><button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button><button type="submit" form="user-modal-form" className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button></div>
            </div>
        </div>
    );
}


const NotificationSettingsPanel: React.FC = () => {
    const { notificationSettings, setNotificationSettings } = useData();
    const { addToast } = useToast();

    const handleSave = () => {
        // The setter from useData will handle persistence
        addToast('تم حفظ إعدادات التنبيهات', 'success');
    };
    
    const handleChange = (field: keyof NotificationSettings, value: string) => {
        setNotificationSettings(s => ({ ...s, [field]: Number(value) >= 0 ? Number(value) : 0 }));
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">إعدادات التنبيهات</h2>
            </div>
            <div className="p-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">حد المخزون المنخفض</label>
                        <input type="number" value={notificationSettings.lowStockThreshold} onChange={e => handleChange('lowStockThreshold', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه عندما تصل كمية المنتج إلى هذا الحد.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">تذكير الحجوزات (بالأيام)</label>
                        <input type="number" value={notificationSettings.bookingReminderDays} onChange={e => handleChange('bookingReminderDays', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه قبل هذا العدد من الأيام من موعد الحجز.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">تذكير انتهاء الصلاحية (بالأيام)</label>
                        <input type="number" value={notificationSettings.expiryReminderDays || 30} onChange={e => handleChange('expiryReminderDays', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه قبل هذا العدد من الأيام من تاريخ انتهاء صلاحية المنتج.</p>
                    </div>
                    <hr/>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">حد تنبيه ديون العملاء</label>
                        <input type="number" value={notificationSettings.customerDebtThreshold} onChange={e => handleChange('customerDebtThreshold', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه عندما يتجاوز دين العميل هذا الحد. أدخل 0 لإظهار تنبيه لجميع الديون.</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">حد تنبيه مستحقات الموردين</label>
                        <input type="number" value={notificationSettings.supplierDueThreshold} onChange={e => handleChange('supplierDueThreshold', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        <p className="text-xs text-gray-500 mt-1">سيتم إرسال تنبيه عندما تتجاوز مستحقات المورد هذا الحد. أدخل 0 لإظهار جميع المستحقات.</p>
                    </div>
                </div>
                 <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">حفظ الإعدادات</button>
                </div>
            </div>
        </div>
    );
}

const dataToSyncOptions = [
    { key: 'products', label: 'المنتجات' },
    { key: 'customers', label: 'العملاء' },
    { key: 'suppliers', label: 'الموردين' },
    { key: 'invoices', label: 'فواتير البيع' },
    { key: 'purchaseInvoices', label: 'فواتير الشراء' },
    { key: 'expenses', label: 'المصاريف' },
    { key: 'bookings', label: 'الحجوزات' },
];

const SyncSettings: React.FC = () => {
    const { firebaseConfig, setFirebaseConfig, syncConfig, setSyncConfig, manualSync } = useSync();
    const { addToast } = useToast();
    const [localFbConfig, setLocalFbConfig] = useState<FirebaseConfig>(firebaseConfig || { apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '', measurementId: '' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [configPaste, setConfigPaste] = useState('');

    const handleParseAndFill = () => {
        const config: Partial<FirebaseConfig> = {};
        const keys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

        keys.forEach(key => {
            const regex = new RegExp(`${key}:\\s*"([^"]*)"`);
            const match = configPaste.match(regex);
            if (match && match[1]) {
                config[key] = match[1];
            }
        });

        if (Object.keys(config).length > 0) {
            setLocalFbConfig(prev => ({ ...prev, ...config }));
            addToast('تم تحليل الإعدادات وملء الحقول بنجاح!', 'success');
            setConfigPaste('');
        } else {
            addToast('لم يتم العثور على إعدادات صالحة في النص الذي تم لصقه.', 'error');
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        addToast('بدء المزامنة اليدوية...', 'info');
        const success = await manualSync();
        if (success) {
            addToast('تمت المزامنة بنجاح!', 'success');
        } else {
            addToast('فشلت المزامنة. تحقق من إعدادات Firebase.', 'error');
        }
        setIsSyncing(false);
    };

    const handleSaveFbConfig = () => {
        let configToSave = { ...localFbConfig };

        if (!configToSave.databaseURL || !configToSave.projectId) {
            addToast('حقلي databaseURL و projectId مطلوبان.', 'error');
            return;
        }

        // Auto-correct common mistakes
        if (!configToSave.databaseURL.startsWith('https://')) {
            configToSave.databaseURL = 'https://' + configToSave.databaseURL;
        }

        // If databaseURL does not contain a valid Firebase domain, reconstruct it from projectId.
        if (!/firebaseio\.com|firebasedatabase\.app/.test(configToSave.databaseURL)) {
            configToSave.databaseURL = `https://${configToSave.projectId}.firebaseio.com`;
            addToast('تم تصحيح databaseURL تلقائياً بناءً على projectId.', 'info');
            setLocalFbConfig(configToSave); // Update UI to show the correction
        }

        try {
            new URL(configToSave.databaseURL);
        } catch (e) {
            addToast('رابط قاعدة البيانات (databaseURL) يبدو غير صالح.', 'error');
            return;
        }
        
        setFirebaseConfig(configToSave);
        addToast('تم حفظ إعدادات Firebase.', 'success');
    };
    
    const toggleDataToSync = (key: string) => {
        setSyncConfig(prev => ({ ...prev, dataToSync: { ...prev.dataToSync, [key]: !prev.dataToSync[key] } }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">إعدادات المزامنة</h2></div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700">المزامنة التلقائية</h3>
                            <p className="text-sm text-gray-500">مزامنة البيانات تلقائيًا عند حدوث أي تغيير.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={syncConfig.autoSync}
                                onChange={() => setSyncConfig(p => ({ ...p, autoSync: !p.autoSync }))} 
                                className="sr-only peer"
                            />
                            <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors"></div>
                            <div className="absolute top-1 left-1 bg-white border-gray-300 border rounded-full h-6 w-6 transition-transform peer-checked:translate-x-6"></div>
                        </label>
                    </div>
                    <hr className="my-6" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">البيانات المراد مزامنتها</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {dataToSyncOptions.map(opt => (
                                <label key={opt.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                                    <input type="checkbox" checked={syncConfig.dataToSync[opt.key] || false} onChange={() => toggleDataToSync(opt.key)} className="rounded text-blue-600 focus:ring-blue-500" />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleManualSync} disabled={isSyncing} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold disabled:opacity-50 disabled:cursor-wait">
                            {isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">إعدادات الربط</h2></div>
                <div className="p-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-4">أدخل بيانات مشروع Firebase للربط مع التطبيقات الخارجية مثل الماسح الضوئي.</p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">لصق إعدادات Firebase هنا للملء التلقائي</label>
                            <textarea
                                value={configPaste}
                                onChange={e => setConfigPaste(e.target.value)}
                                placeholder="const firebaseConfig = { ... };"
                                className="w-full p-2 border rounded-md mt-1 text-sm font-mono bg-gray-50 h-28"
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={handleParseAndFill}
                                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-bold"
                            >
                                تحليل وملء الحقول
                            </button>
                        </div>
                        <hr className="my-6" />
                        <div className="space-y-3">
                            {Object.keys(localFbConfig).map(k => {
                                const key = k as keyof FirebaseConfig;
                                return (
                                <div key={key}>
                                    <label className="text-xs font-medium text-gray-600">{key} {key !== 'measurementId' ? '' : '(اختياري)'}</label>
                                    <input value={localFbConfig[key] || ''} onChange={e => setLocalFbConfig(p => ({ ...p, [key]: e.target.value }))} className="w-full p-2 border rounded-md mt-1 text-sm font-mono bg-gray-50" dir="ltr" />
                                </div>
                                )
                            })}
                        </div>
                        <div className="mt-6 flex justify-end"><button onClick={handleSaveFbConfig} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">حفظ الإعدادات</button></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataSettings: React.FC = () => {
    const { storageMode, requestDirectory, isApiSupported } = useStorage();
    const { addToast } = useToast();
    const { backupData, restoreData } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restoreTargetKey, setRestoreTargetKey] = useState<string | null>(null);

    const dataKeys = [
        { key: 'products', label: 'المنتجات' }, { key: 'customers', label: 'العملاء' },
        { key: 'suppliers', label: 'الموردين' }, { key: 'invoices', label: 'فواتير البيع' },
        { key: 'purchaseInvoices', label: 'فواتير الشراء' }, { key: 'expenses', label: 'المصاريف' },
        { key: 'bookings', label: 'الحجوزات' }, { key: 'users', label: 'المستخدمين' },
        { key: 'settings', label: 'الإعدادات العامة' },
        { key: 'invoiceSettings', label: 'إعدادات الفاتورة'},
    ];

    const handleBackup = (key?: string) => {
        backupData(key);
        addToast(`تم تصدير ${key ? 'البيانات المحددة' : 'البيانات الكاملة'} بنجاح`, 'success');
    };

    const handleRestoreClick = (key?: string) => {
        setRestoreTargetKey(key || null); // null for full restore
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
            fileInputRef.current.click();
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        restoreData(file, restoreTargetKey || undefined);
    };

    return (
        <div className="space-y-6">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">إدارة التخزين</h2></div>
                <div className="p-6">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="font-semibold">وضع التخزين الحالي:</p>
                        {storageMode === 'fileSystem' && <p className="text-green-600 font-bold">نظام الملفات المحلي (آمن ومستحسن)</p>}
                        {storageMode === 'localStorage' && <p className="text-orange-600 font-bold">تخزين المتصفح (أقل أمانًا)</p>}
                    </div>
                    {isApiSupported && (
                         <div className="mt-4">
                            <button onClick={requestDirectory} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 font-semibold">
                                تغيير مجلد التخزين
                            </button>
                             <p className="text-xs text-gray-500 mt-2">سيؤدي هذا إلى إعادة تحميل التطبيق لنقل بياناتك.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">النسخ الاحتياطي والاستعادة الكاملة</h2></div>
                <div className="p-6">
                    <p className="text-gray-500 mb-4">احفظ جميع بياناتك في ملف واحد أو استعد منها.</p>
                    <div className="flex gap-4">
                        <button onClick={() => handleBackup()} className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 font-semibold">تصدير الكل</button>
                        <button onClick={() => handleRestoreClick()} className="px-5 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 font-semibold">استيراد الكل</button>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">النسخ الاحتياطي والاستعادة الجزئية</h2></div>
                <div className="p-6">
                    <p className="text-gray-500 mb-4">قم بتصدير أو استيراد بيانات محددة من النظام.</p>
                    <div className="space-y-3">
                        {dataKeys.map(({ key, label }) => (
                            <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                                <span className="font-semibold text-gray-700">{label}</span>
                                <div className="flex gap-3">
                                    <button onClick={() => handleBackup(key)} className="text-sm font-semibold text-blue-600 hover:underline">تصدير</button>
                                    <button onClick={() => handleRestoreClick(key)} className="text-sm font-semibold text-green-600 hover:underline">استيراد</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InvoiceSettingsPanel: React.FC = () => {
    const { invoiceSettings, setInvoiceSettings } = useData();
    const { addToast } = useToast();
    const [localSettings, setLocalSettings] = useState(invoiceSettings);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'footerImage') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setLocalSettings(s => ({ ...s, [field]: event.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNumberChange = (field: keyof InvoiceSettings | `fontSizes.${keyof InvoiceSettings['fontSizes']}`, value: string) => {
        const size = parseInt(value, 10);
        if (!isNaN(size)) {
            if (field.startsWith('fontSizes.')) {
                const subField = field.split('.')[1] as keyof InvoiceSettings['fontSizes'];
                setLocalSettings(s => ({ ...s, fontSizes: { ...s.fontSizes, [subField]: size }}));
            } else {
                 setLocalSettings(s => ({ ...s, [field]: size }));
            }
        }
    };
    
    const handleSave = () => {
        setInvoiceSettings(localSettings);
        addToast('تم حفظ إعدادات الفاتورة بنجاح', 'success');
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">تخصيص الفاتورة</h2>
            </div>
            <div className="p-6 space-y-8">
                {/* Shop Details */}
                <fieldset className="border p-4 rounded-md">
                    <legend className="px-2 font-semibold text-gray-700">بيانات المحل</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">اسم المحل</label>
                                <input value={localSettings.shopName} onChange={e => setLocalSettings(s => ({...s, shopName: e.target.value}))} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
                                <input value={localSettings.phone} onChange={e => setLocalSettings(s => ({...s, phone: e.target.value}))} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">العنوان</label>
                                <input value={localSettings.address} onChange={e => setLocalSettings(s => ({...s, address: e.target.value}))} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">شعار المحل (اللوجو)</label>
                             <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center border-2 border-dashed">
                                {localSettings.logo ? <img src={localSettings.logo} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-gray-400">لا يوجد شعار</span>}
                             </div>
                             <input type="file" onChange={e => handleFileChange(e, 'logo')} accept="image/*" className="mt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                             <label className="block text-sm font-medium text-gray-700 mt-2">حجم الشعار (بكسل)</label>
                             <input type="number" value={localSettings.logoSize} onChange={e => handleNumberChange('logoSize', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        </div>
                    </div>
                </fieldset>

                {/* Footer Details */}
                <fieldset className="border p-4 rounded-md">
                     <legend className="px-2 font-semibold text-gray-700">تذييل الفاتورة</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">رسالة الشكر</label>
                                <textarea value={localSettings.footerMessage} onChange={e => setLocalSettings(s => ({...s, footerMessage: e.target.value}))} rows={3} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">رسالة تذييل إضافية</label>
                                <textarea value={localSettings.secondaryFooterMessage} onChange={e => setLocalSettings(s => ({...s, secondaryFooterMessage: e.target.value}))} rows={3} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                            </div>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-2">صورة التذييل (مثل QR Code)</label>
                             <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center border-2 border-dashed">
                                {localSettings.footerImage ? <img src={localSettings.footerImage} alt="Footer Image" className="max-h-full max-w-full object-contain" /> : <span className="text-gray-400">لا توجد صورة</span>}
                             </div>
                             <input type="file" onChange={e => handleFileChange(e, 'footerImage')} accept="image/*" className="mt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                             <label className="block text-sm font-medium text-gray-700 mt-2">حجم صورة التذييل (بكسل)</label>
                             <input type="number" value={localSettings.footerImageSize} onChange={e => handleNumberChange('footerImageSize', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        </div>
                    </div>
                </fieldset>

                 {/* Font Sizes */}
                <fieldset className="border p-4 rounded-md">
                     <legend className="px-2 font-semibold text-gray-700">أحجام الخطوط (بكسل)</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700">العنوان الرئيسي</label>
                             <input type="number" value={localSettings.fontSizes.header} onChange={e => handleNumberChange('fontSizes.header', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">جدول المنتجات</label>
                             <input type="number" value={localSettings.fontSizes.body} onChange={e => handleNumberChange('fontSizes.body', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">الإجماليات</label>
                             <input type="number" value={localSettings.fontSizes.totals} onChange={e => handleNumberChange('fontSizes.totals', e.target.value)} className="mt-1 p-2 border rounded-md w-full bg-gray-50"/>
                        </div>
                    </div>
                </fieldset>

                <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">حفظ الإعدادات</button>
                </div>
            </div>
        </div>
    );
};

const PrintSettingsPanel: React.FC = () => {
    const { printSettings, setPrintSettings } = useData();
    const { addToast } = useToast();

    const handleSave = () => {
        // The setter from useData already persists it.
        addToast('تم حفظ إعدادات الطباعة', 'success');
    };
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">إعدادات الطباعة</h2>
            </div>
            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تنسيق الطباعة الافتراضي للفواتير</label>
                    <select 
                        value={printSettings.defaultFormat} 
                        onChange={e => setPrintSettings(s => ({ ...s, defaultFormat: e.target.value as any }))}
                        className="w-full p-2 border rounded-md bg-gray-50"
                    >
                        <option value="a4">ورق A4</option>
                        <option value="80mm">إيصال حراري 80mm</option>
                        <option value="58mm">إيصال حراري 58mm</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">اختر التنسيق المناسب للطابعة التي تستخدمها لإصدار الفواتير.</p>
                </div>
                <hr />
                <div>
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <p className="font-medium text-gray-700">الطباعة التلقائية بعد البيع</p>
                            <p className="text-xs text-gray-500">طباعة الفاتورة تلقائياً بعد إتمام كل عملية بيع في نقطة البيع.</p>
                        </div>
                        <div className="relative inline-flex items-center">
                            <input 
                                type="checkbox" 
                                checked={printSettings.autoPrint}
                                onChange={e => setPrintSettings(s => ({ ...s, autoPrint: e.target.checked }))} 
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </div>
                    </label>
                </div>

                <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">حفظ الإعدادات</button>
                </div>
            </div>
        </div>
    );
};