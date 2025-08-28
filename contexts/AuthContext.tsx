import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { User, Page, UserPermissions, FirebaseConfig, Product, Customer, Supplier, Invoice, PurchaseInvoice, Expense, Booking, NotificationSettings, InvoiceSettings, AuditLogEntry, CustomerGroup, Coupon, PurchaseOrder, StockTake, PrintSettings } from '../types';
import { useToast } from '../components/Toast';
import * as fileStorage from '../hooks/useFileStorage';

declare var firebase: any;

// --- Default Data & Types ---
const allPages: Page[] = ['dashboard', 'inventory', 'pos', 'invoices', 'customers', 'expenses', 'suppliers', 'bookings', 'reports', 'settings', 'audit_log', 'purchase_orders', 'stock_take', 'coupons'];

// FIX: Added missing permission properties to the initial admin user to align with the UserPermissions type.
const initialAdmin: User = {
    id: 'admin', username: 'admin', passwordHash: 'admin', fullName: 'مدير النظام', jobTitle: 'مدير',
    email: 'admin@example.com', phone: '0000000000', avatarUrl: 'https://i.pravatar.cc/40?u=admin',
    securityQuestion: 'ما هو اسم أول حيوان أليف لك؟', securityAnswer: 'cat', isAdmin: true,
    isActive: true,
    permissions: {
        visiblePages: allPages,
        canEditData: true,
        maxDiscountPercentage: 100,
        canUseAssistant: true
    }
};

// --- Storage Context ---
type StorageMode = 'pending' | 'fileSystem' | 'localStorage' | 'error';

interface StorageContextType {
    storageMode: StorageMode;
    isLoading: boolean;
    error: string | null;
    requestDirectory: () => Promise<void>;
    fallbackToLocalStorage: () => void;
    isApiSupported: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const useStorage = () => {
    const context = useContext(StorageContext);
    if (!context) throw new Error('useStorage must be used within a StorageProvider');
    return context;
};

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [storageMode, setStorageMode] = useState<StorageMode>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const isApiSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    useEffect(() => {
        const initStorage = async () => {
            if (!isApiSupported) {
                setStorageMode('pending');
                setIsLoading(false);
                return;
            }
            try {
                const handle = await fileStorage.loadDirectoryHandle();
                if (handle) {
                    const hasPermission = await fileStorage.verifyPermission(handle, true);
                    if (hasPermission) {
                        setStorageMode('fileSystem');
                    } else {
                        setStorageMode('pending');
                    }
                } else {
                    setStorageMode('pending');
                }
            } catch (e) {
                console.error("Error initializing storage:", e);
                setError("حدث خطأ أثناء إعداد التخزين.");
                setStorageMode('error');
            } finally {
                setIsLoading(false);
            }
        };
        initStorage();
    }, [isApiSupported]);

    const requestDirectory = async () => {
        if (!isApiSupported) return;
        setError(null);
        try {
            const handle = await (window as any).showDirectoryPicker();
            await fileStorage.saveDirectoryHandle(handle);
            setStorageMode('fileSystem');
            addToast("تم تحديد مجلد التخزين بنجاح. سيتم إعادة تحميل التطبيق.", "success");
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            if (e.name !== 'AbortError') {
                setError("لم يتم اختيار مجلد أو حدث خطأ.");
                addToast("فشل اختيار المجلد", "error");
            }
        }
    };

    const fallbackToLocalStorage = () => {
        setStorageMode('localStorage');
        addToast("سيتم استخدام تخزين المتصفح.", "info");
    };
    
    const value = { storageMode, isLoading, error, requestDirectory, fallbackToLocalStorage, isApiSupported };
    
    return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

// --- Auth Context ---
interface AuthContextType {
    currentUser: User | null;
    users: User[];
    login: (username: string, password: string) => boolean;
    logout: () => void;
    updateUser: (userData: User) => void;
    addUser: (userData: Omit<User, 'id'>) => void;
    deleteUser: (userId: string) => void;
    recoverPassword: (username: string, answer: string, newPass: string) => boolean;
    getUserByUsername: (username: string) => User | undefined;
    hasPermission: (page: Page, action: 'view' | 'edit' | 'delete' | 'print') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

// --- Data Context (New) ---
interface DataContextType {
    products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    customers: Customer[]; setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    suppliers: Supplier[]; setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
    invoices: Invoice[]; setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
    purchaseInvoices: PurchaseInvoice[]; setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
    expenses: Expense[]; setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
    bookings: Booking[]; setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
    customerGroups: CustomerGroup[]; setCustomerGroups: React.Dispatch<React.SetStateAction<CustomerGroup[]>>;
    coupons: Coupon[]; setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;
    purchaseOrders: PurchaseOrder[]; setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    stockTakes: StockTake[]; setStockTakes: React.Dispatch<React.SetStateAction<StockTake[]>>;
    auditLog: AuditLogEntry[]; setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
    notificationSettings: NotificationSettings;
    setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
    invoiceSettings: InvoiceSettings;
    setInvoiceSettings: React.Dispatch<React.SetStateAction<InvoiceSettings>>;
    printSettings: PrintSettings;
    setPrintSettings: React.Dispatch<React.SetStateAction<PrintSettings>>;
    users: User[]; setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    currentUser: User | null; setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    backupData: (key?: string) => void;
    restoreData: (file: File, key?: string) => void;
    isDataLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};

// --- Sync & Scanner Context ---
interface SyncConfig {
    autoSync: boolean;
    dataToSync: { [key: string]: boolean };
}

interface SyncContextType {
    scannedCode: string | null;
    clearScannedCode: () => void;
    firebaseConfig: FirebaseConfig | null;
    setFirebaseConfig: (config: FirebaseConfig | null) => void;
    syncConfig: SyncConfig;
    setSyncConfig: React.Dispatch<React.SetStateAction<SyncConfig>>;
    manualSync: () => Promise<boolean>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error('useSync must be used within a SyncProvider');
    return context;
};

// --- Data Provider (New) ---
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { storageMode } = useStorage();
    const [isDataLoading, setIsDataLoading] = useState(true);

    const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
        const [state, setState] = useState<T>(initialValue);

        useEffect(() => {
            let isMounted = true;
            const loadData = async () => {
                if (storageMode === 'pending' || storageMode === 'error') return;
                
                let data: T | null = null;
                try {
                    if (storageMode === 'fileSystem') {
                        const handle = await fileStorage.loadDirectoryHandle();
                        if (handle) data = await fileStorage.readFile(handle, `${key}.json`);
                    } else {
                        const item = localStorage.getItem(key);
                        if (item) data = JSON.parse(item);
                    }
                } catch (e) {
                    console.error(`Error loading data for key "${key}":`, e);
                    data = null; 
                }
                
                if (isMounted) {
                    if (data !== null && data !== undefined) {
                        setState(data);
                    } else {
                        setState(initialValue);
                    }
                }
            };
            loadData();
            return () => { isMounted = false; };
        }, [key, storageMode]);

        const updateState: React.Dispatch<React.SetStateAction<T>> = (newState) => {
            const valueToStore = newState instanceof Function ? newState(state) : newState;
            setState(valueToStore);

            const saveData = async () => {
                if (storageMode === 'fileSystem') {
                    const handle = await fileStorage.loadDirectoryHandle();
                    if (handle) await fileStorage.writeFile(handle, `${key}.json`, valueToStore);
                } else if (storageMode === 'localStorage') {
                    localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            };
            saveData();
        };

        return [state, updateState];
    };

    const [products, setProducts] = usePersistentState<Product[]>('products', []);
    const [customers, setCustomers] = usePersistentState<Customer[]>('customers', []);
    const [suppliers, setSuppliers] = usePersistentState<Supplier[]>('suppliers', []);
    const [invoices, setInvoices] = usePersistentState<Invoice[]>('invoices', []);
    const [purchaseInvoices, setPurchaseInvoices] = usePersistentState<PurchaseInvoice[]>('purchaseInvoices', []);
    const [expenses, setExpenses] = usePersistentState<Expense[]>('expenses', []);
    const [bookings, setBookings] = usePersistentState<Booking[]>('bookings', []);
    const [customerGroups, setCustomerGroups] = usePersistentState<CustomerGroup[]>('customerGroups', [{id: 'group1', name: 'VIP', discountPercentage: 10}]);
    const [coupons, setCoupons] = usePersistentState<Coupon[]>('coupons', []);
    const [purchaseOrders, setPurchaseOrders] = usePersistentState<PurchaseOrder[]>('purchaseOrders', []);
    const [stockTakes, setStockTakes] = usePersistentState<StockTake[]>('stockTakes', []);
    const [auditLog, setAuditLog] = usePersistentState<AuditLogEntry[]>('auditLog', []);
    const [notificationSettings, setNotificationSettings] = usePersistentState<NotificationSettings>('notificationSettings', { lowStockThreshold: 10, bookingReminderDays: 2, customerDebtThreshold: 0, supplierDueThreshold: 0, expiryReminderDays: 30 });
    const [invoiceSettings, setInvoiceSettings] = usePersistentState<InvoiceSettings>('invoiceSettings', {
        logo: '',
        shopName: 'اسم المحل',
        phone: 'رقم الهاتف',
        address: 'العنوان',
        footerMessage: 'شكراً لتعاملكم معنا!',
        footerImage: '',
        secondaryFooterMessage: '',
        fontSizes: { header: 20, body: 14, totals: 16 },
        logoSize: 150,
        footerImageSize: 120,
    });
    const [printSettings, setPrintSettings] = usePersistentState<PrintSettings>('printSettings', {
        defaultFormat: 'a4',
        autoPrint: false,
    });
    const [users, setUsers] = usePersistentState<User[]>('users', []);
    const [currentUser, setCurrentUser] = usePersistentState<User | null>('currentUser', null);
    
    const { addToast } = useToast();
    
    useEffect(() => {
        if (storageMode !== 'pending' && !users.find(u => u.id === 'admin')) {
             setUsers(prev => [...prev.filter(u => u.id !== 'admin'), initialAdmin]);
        }
    }, [users, setUsers, storageMode]);

    useEffect(() => {
        if (storageMode === 'fileSystem' || storageMode === 'localStorage') {
             setTimeout(() => setIsDataLoading(false), 800);
        } else {
            setIsDataLoading(true);
        }
    }, [storageMode]);


    const dataMap = { products, customers, suppliers, invoices, purchaseInvoices, expenses, bookings, users, notificationSettings, invoiceSettings, printSettings, auditLog, customerGroups, coupons, purchaseOrders, stockTakes };
    const settersMap: { [key: string]: Function } = { setProducts, setCustomers, setSuppliers, setInvoices, setPurchaseInvoices, setExpenses, setBookings, setUsers, setNotificationSettings, setInvoiceSettings, setPrintSettings, setAuditLog, setCustomerGroups, setCoupons, setPurchaseOrders, setStockTakes };


    const backupData = (key?: string) => {
        const dataToBackup = key ? { [key]: (dataMap as any)[key] } : dataMap;
        const blob = new Blob([JSON.stringify(dataToBackup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = key ? `ysk-backup-${key}-${new Date().toISOString().split('T')[0]}.json` : `ysk-backup-full-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const restoreData = (file: File, key?: string) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const restoredData = JSON.parse(event.target?.result as string);
                const restoreKey = (k: string, v: any) => {
                     const setterKey = `set${k.charAt(0).toUpperCase() + k.slice(1)}`;
                     const setter = (settersMap as any)[setterKey];
                     if(setter) setter(v as any);
                };

                if (key) {
                    if (restoredData[key]) {
                        restoreKey(key, restoredData[key]);
                        addToast(`تم استعادة ${key} بنجاح`, 'success');
                    } else {
                        addToast(`ملف النسخ الاحتياطي لا يحتوي على بيانات لـ ${key}`, 'error');
                    }
                } else {
                    Object.entries(restoredData).forEach(([k, v]) => {
                        restoreKey(k, v);
                    });
                    addToast('تمت استعادة البيانات الكاملة بنجاح', 'success');
                }
            } catch (e) {
                addToast('ملف النسخ الاحتياطي غير صالح', 'error');
            }
        };
        reader.readAsText(file);
    };

    const value = {
        products, setProducts, customers, setCustomers, suppliers, setSuppliers,
        invoices, setInvoices, purchaseInvoices, setPurchaseInvoices, expenses, setExpenses,
        bookings, setBookings, auditLog, setAuditLog, users, setUsers, currentUser, setCurrentUser,
        backupData, restoreData, notificationSettings, setNotificationSettings,
        invoiceSettings, setInvoiceSettings, printSettings, setPrintSettings, customerGroups, setCustomerGroups,
        coupons, setCoupons, purchaseOrders, setPurchaseOrders, stockTakes, setStockTakes,
        isDataLoading
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// --- Sync Provider (Refactored) ---
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [firebaseConfig, setFirebaseConfig] = useLocalStorage<FirebaseConfig | null>('firebaseConfig', null);
    const [syncConfig, setSyncConfig] = useLocalStorage<SyncConfig>('syncConfig', {
        autoSync: false,
        dataToSync: { products: true },
    });

    const allData = useData();

    const isFirebaseReady = useMemo(() => {
        if (!firebaseConfig) return false;
        try {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            return true;
        } catch (e) {
            console.error("Firebase init failed in provider", e);
            setFirebaseConfig(null);
            return false;
        }
    }, [firebaseConfig, setFirebaseConfig]);

    useEffect(() => {
        if (isFirebaseReady && syncConfig.autoSync && allData) {
            const dataToSyncNow = {
                products: allData.products, customers: allData.customers, suppliers: allData.suppliers,
                invoices: allData.invoices, purchaseInvoices: allData.purchaseInvoices,
                expenses: allData.expenses, bookings: allData.bookings,
            };
            Object.entries(dataToSyncNow).forEach(([key, value]) => {
                const dataKey = key as keyof typeof syncConfig.dataToSync;
                if (syncConfig.dataToSync[dataKey]) {
                    try {
                       firebase.database().ref(`syncedData/${key}`).set(value);
                    } catch (error) {
                       console.error(`Failed to auto-sync ${key}:`, error);
                    }
                }
            });
        }
    }, [allData, syncConfig, isFirebaseReady]);

    useEffect(() => {
        if (isFirebaseReady) {
            const db = firebase.database();
            const scannerRef = db.ref('barcodeScanner/scannedCode');
            const listener = scannerRef.on('value', (snapshot: any) => {
                const data = snapshot.val();
                if (data && data.code) setScannedCode(data.code);
            });
            return () => scannerRef.off('value', listener);
        }
    }, [isFirebaseReady]);

    const manualSync = async (): Promise<boolean> => {
        if (!isFirebaseReady || !allData) return false;
        try {
            const db = firebase.database();
            const updates: { [key: string]: any } = {};
            Object.entries(syncConfig.dataToSync).forEach(([key, shouldSync]) => {
                 if (shouldSync) {
                    const dataKey = key as keyof Omit<DataContextType, 'setProducts' | 'setCustomers' | 'setSuppliers' | 'setInvoices' | 'setPurchaseInvoices' | 'setExpenses' | 'setBookings' | 'setAuditLog' | 'backupData' | 'restoreData' | 'notificationSettings' | 'setNotificationSettings' | 'invoiceSettings' | 'setInvoiceSettings' | 'printSettings' | 'setPrintSettings' | 'isDataLoading' | 'auditLog' | 'users' | 'setUsers' | 'currentUser' | 'setCurrentUser' | 'customerGroups' | 'setCustomerGroups' | 'coupons' | 'setCoupons' | 'purchaseOrders' | 'setPurchaseOrders' | 'stockTakes' | 'setStockTakes'>;
                    updates[`syncedData/${key}`] = allData[dataKey];
                }
            });
            await db.ref().update(updates);
            return true;
        } catch (error) {
            console.error("Manual sync failed:", error);
            return false;
        }
    };

    const clearScannedCode = () => {
        setScannedCode(null);
        if (isFirebaseReady) {
            firebase.database().ref('barcodeScanner/scannedCode').set(null);
        }
    };

    const value = { scannedCode, clearScannedCode, firebaseConfig, setFirebaseConfig, syncConfig, setSyncConfig, manualSync };

    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// --- Auth Provider (Main Wrapper) ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { users, setUsers, currentUser, setCurrentUser, setAuditLog } = useData();
    const { addToast } = useToast();
    
    const logAction = useCallback((actionType: AuditLogEntry['actionType'], entityType: string, details: string, user: User, entityId?: string) => {
        const newLogEntry: AuditLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            username: user.fullName,
            actionType,
            entityType,
            entityId,
            details
        };
        setAuditLog(prev => [newLogEntry, ...prev]);
    }, [setAuditLog]);

    const login = (username: string, password: string): boolean => {
        const user = users.find(u => u.username === username && u.passwordHash === password);
        if (user && user.isActive) {
            setCurrentUser(user);
            addToast(`مرحباً بعودتك، ${user.fullName}`, 'success');
            logAction('LOGIN', 'Session', `User ${user.fullName} logged in.`, user, user.id);
            return true;
        }
        if (user && !user.isActive) {
            addToast('هذا الحساب غير نشط. يرجى مراجعة المدير.', 'error');
        } else {
            addToast('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
        }
        return false;
    };

    const logout = () => { 
        if (currentUser) {
            logAction('LOGOUT', 'Session', `User ${currentUser.fullName} logged out.`, currentUser, currentUser.id);
        }
        setCurrentUser(null); 
        addToast('تم تسجيل الخروج بنجاح.', 'info'); 
    };
    
    const addUser = (userData: Omit<User, 'id'>) => { 
        const newUser = { ...userData, id: `user-${Date.now()}`}; 
        setUsers(prev => [...prev, newUser]); 
        addToast(`تم إنشاء حساب المستخدم ${newUser.username} بنجاح`, 'success'); 
        if (currentUser) {
            logAction('CREATE', 'User', `Created user: ${newUser.fullName} (ID: ${newUser.id})`, currentUser, newUser.id);
        }
    };
    
    const updateUser = (userData: User) => { 
        setUsers(prev => prev.map(u => u.id === userData.id ? userData : u)); 
        if (currentUser?.id === userData.id) {
            setCurrentUser(userData);
        }
        addToast('تم تحديث بيانات المستخدم بنجاح', 'success'); 
        if (currentUser) {
            const details = currentUser.id === userData.id ? `User updated their own profile.` : `Updated user: ${userData.fullName} (ID: ${userData.id})`;
            logAction('UPDATE', 'User', details, currentUser, userData.id);
        }
    };
    
    const deleteUser = (userId: string) => { 
        if(userId === 'admin') return addToast('لا يمكن حذف حساب المدير.', 'error'); 
        const userToDelete = users.find(u => u.id === userId);
        setUsers(prev => prev.filter(u => u.id !== userId)); 
        addToast('تم حذف المستخدم بنجاح', 'success'); 
        if (currentUser && userToDelete) {
             logAction('DELETE', 'User', `Deleted user: ${userToDelete.fullName} (ID: ${userToDelete.id})`, currentUser, userToDelete.id);
        }
    };
    
    const getUserByUsername = (username: string) => users.find(u => u.username.toLowerCase() === username.toLowerCase());

    const recoverPassword = (username: string, answer: string, newPass: string): boolean => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.securityAnswer.toLowerCase() === answer.toLowerCase()) {
            updateUser({ ...user, passwordHash: newPass });
            addToast('تم تغيير كلمة المرور بنجاح!', 'success');
            return true;
        }
        addToast('إجابة سؤال الأمان غير صحيحة.', 'error');
        return false;
    };

    const hasPermission = (page: Page, action: 'view' | 'edit' | 'delete' | 'print'): boolean => {
        if (!currentUser) return false;
        if (currentUser.isAdmin) return true;
        
        const userPermissions = currentUser.permissions;

        if (action === 'view') {
            if (page === 'settings' || page === 'audit_log') {
                return currentUser.isAdmin;
            }
            // FIX: Corrected access to permissions property.
            return userPermissions.visiblePages.includes(page);
        }
        
        // FIX: Corrected access to permissions property.
        return userPermissions.canEditData;
    };

    const authValue = { currentUser, users, login, logout, updateUser, addUser, deleteUser, hasPermission, getUserByUsername, recoverPassword };

    return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
};
