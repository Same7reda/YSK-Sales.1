import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// --- Declare Globals from CDN ---
declare var firebase: any;
declare var ZXing: any;

// --- Types (Copied from main app) ---
interface Product { id: string; name: string; price: number; cost: number; stock: number; barcode: string; category: string; unit: string; supplier?: string; }
interface Customer { id:string; name: string; phone: string; debt: number; }
interface Supplier { id:string; name: string; phone: string; debt: number; }
interface Invoice { id: string; customerName: string; total: number; date: string; status: string; }
interface PurchaseInvoice { id: string; supplierName: string; total: number; date: string; }
interface Expense { id: string; type: string; amount: number; date: string; }
interface Booking { id: string; customerName: string; bookingDate: string; status: string; }
type FirebaseConfig = { apiKey: string; authDomain: string; databaseURL: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string; measurementId?: string };
type Page = 'scanner' | 'data_menu' | 'settings' | 'products' | 'customers' | 'suppliers' | 'invoices' | 'purchaseInvoices' | 'expenses' | 'bookings';
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'info' };

// --- Helper Functions ---
const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
const dateFormat = (dateString: string) => new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });

// --- Helper Hooks ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => { try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } catch (error) { return initialValue; } });
  useEffect(() => { try { window.localStorage.setItem(key, JSON.stringify(storedValue)); } catch (error) { console.error(error); } }, [key, storedValue]);
  return [storedValue, setStoredValue];
}

// --- Icons ---
const PackageIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.89 1.453a2.2 2.2 0 0 0-1.78 0l-6 3A2.2 2.2 0 0 0 4 6.425v11.15a2.2 2.2 0 0 0 1.11 1.972l6 3a2.2 2.2 0 0 0 1.78 0l6-3a2.2 2.2 0 0 0 1.11-1.972V6.425a2.2 2.2 0 0 0-1.11-1.972l-6-3Z"/><path d="m4.22 6.55 7.78 3.9 7.78-3.9"/><path d="M12 22.42V10.5"/></svg>;
const ScanLineIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>;
const SettingsIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const SearchIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const XIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const WifiOffIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c.18-.12.37-.24.57-.35a15 15 0 0 1 5.56-1.54"/><path d="M16.85 8.52a10.97 10.97 0 0 1 2.16-1.31"/><path d="M22 12.38A15 15 0 0 0 18.2 9.2c-.3-.18-.6-.35-.91-.5"/><path d="M5 12.82a10.97 10.97 0 0 0 2.18 1.35"/></svg>;
const CheckCircleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const AlertTriangleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const InfoIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const TruckIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><path d="M9 18h6"/><circle cx="17" cy="18" r="2"/></svg>;
const ReceiptIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h6"/><path d="M12 18a2 2 0 0 0 0-4h-2"/></svg>;
const WalletIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>;
const CalendarIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const DatabaseIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>;

// --- App Components ---

const LoadingScreen: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-white text-gray-800 p-4">
        <div className="text-center">
            <img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="YSK Sales Logo" className="w-24 h-24 mx-auto mb-6 animate-pulse-strong"/>
            <h1 className="text-3xl font-bold mb-4 text-blue-600">YSK Sales | الماسح الضوئي</h1>
            <p className="text-lg text-gray-500">{text}</p>
        </div>
    </div>
);

const Toast: React.FC<{ message: ToastMessage, onDismiss: () => void }> = ({ message, onDismiss }) => {
    useEffect(() => { const timer = setTimeout(onDismiss, 4000); return () => clearTimeout(timer); }, [onDismiss]);
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const Icon = { success: CheckCircleIcon, error: AlertTriangleIcon, info: InfoIcon }[message.type];
    return (<div className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 p-4 rounded-lg shadow-2xl flex items-center gap-4 text-white z-50 fade-in ${colors[message.type]}`}><Icon className="w-6 h-6 flex-shrink-0" /><p className="font-semibold">{message.message}</p></div>);
};

const ConfigScreen: React.FC<{ onSave: (config: FirebaseConfig) => void; error?: string; initialConfig?: FirebaseConfig | null }> = ({ onSave, error, initialConfig }) => {
    const [config, setConfig] = useState<Partial<FirebaseConfig>>(initialConfig || { apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
    const [pasteArea, setPasteArea] = useState('');
    const [localError, setLocalError] = useState('');
    const handlePasteAndParse = () => { setLocalError(''); const parsed: Partial<FirebaseConfig> = {}; const keys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId']; keys.forEach(key => { const match = pasteArea.match(new RegExp(`${key}:\\s*"([^"]*)"`)); if (match && match[1]) { (parsed as any)[key] = match[1]; } }); if (Object.keys(parsed).length > 0) { setConfig(p => ({ ...p, ...parsed })); } else { setLocalError('لم يتم العثور على إعدادات صالحة.'); } };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setLocalError(''); let configToSave = { ...config }; if (!configToSave.databaseURL || !configToSave.projectId) { setLocalError('حقلي databaseURL و projectId مطلوبان.'); return; } if (!configToSave.databaseURL.startsWith('https://')) { configToSave.databaseURL = 'https://' + configToSave.databaseURL; } if (!/firebaseio\.com|firebasedatabase\.app/.test(configToSave.databaseURL)) { configToSave.databaseURL = `https://${configToSave.projectId}.firebaseio.com`; setConfig(configToSave); } try { new URL(configToSave.databaseURL); } catch (e) { setLocalError('رابط قاعدة البيانات (databaseURL) يبدو غير صالح.'); return; } onSave(configToSave as FirebaseConfig); };
    const configKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
    return (<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-6 fade-in"><div className="text-center"><ScanLineIcon className="w-16 h-16 mx-auto text-blue-600" /><h1 className="text-2xl font-bold mt-4">إعدادات الاتصال</h1><p className="text-gray-500">أدخل بيانات مشروع Firebase للربط مع النظام الرئيسي.</p></div>{(error || localError) && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md text-sm">{error || localError}</div>}<textarea value={pasteArea} onChange={e => setPasteArea(e.target.value)} placeholder="أو الصق كائن إعدادات Firebase هنا..." className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md h-24 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" dir="ltr"></textarea><button onClick={handlePasteAndParse} className="w-full py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold text-white">تحليل ولصق</button><form onSubmit={handleSubmit} className="space-y-4">{configKeys.map(key => (<input key={key} value={(config as any)[key] || ''} onChange={e => { setConfig(p => ({...p, [key]: e.target.value})); setLocalError(''); }} placeholder={key} className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" dir="ltr" required={key !== 'measurementId'} />))}<button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg text-white">حفظ والاتصال</button></form></div></div>);
};

const ScannerView: React.FC<{ onScan: (code: string) => void }> = ({ onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null); const codeReaderRef = useRef<any>(null); const [error, setError] = useState(''); const [isScanning, setIsScanning] = useState(false); const [scanSuccess, setScanSuccess] = useState(false); const scanSoundRef = useRef<HTMLAudioElement | null>(null);
    const startCamera = useCallback(async () => { setError(''); setIsScanning(true); try { await codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result: any, err: any) => { if (result) { setScanSuccess(alreadyScanned => { if (!alreadyScanned) { scanSoundRef.current?.play(); onScan(result.getText()); setTimeout(() => setScanSuccess(false), 1500); return true; } return alreadyScanned; }); } }); } catch (err: any) { setError('فشل تشغيل الكاميرا. تأكد من وجود كاميرا وتفعيل الأذونات.'); setIsScanning(false); console.error(err); } }, [onScan]);
    useEffect(() => { scanSoundRef.current = new Audio("https://cdn.jsdelivr.net/gh/pixel-guy/pixel-assets/scan.mp3"); codeReaderRef.current = new ZXing.BrowserMultiFormatReader(); startCamera(); return () => codeReaderRef.current?.reset(); }, [startCamera]);
    return (<div className="p-4"><div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg"><video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline /><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-3/4 max-w-sm h-1/2 relative"><div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-gray-200/50 rounded-tl-lg"></div><div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-gray-200/50 rounded-tr-lg"></div><div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-gray-200/50 rounded-bl-lg"></div><div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-gray-200/50 rounded-br-lg"></div>{isScanning && !scanSuccess && (<div className="absolute top-1/2 left-2 right-2 h-1 bg-red-500/70 rounded-full shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] animate-pulse"></div>)}</div></div>{scanSuccess && (<div className="absolute inset-0 bg-green-500/50 flex items-center justify-center"><CheckCircleIcon className="w-20 h-20 text-white" /></div>)}{error && (<div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4"><AlertTriangleIcon className="w-12 h-12 text-red-400 mb-3" /><p className="text-white text-lg mb-4">{error}</p><button onClick={startCamera} className="px-5 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">أعد المحاولة</button></div>)}{!isScanning && !error && (<div className="absolute inset-0 bg-black/70 flex items-center justify-center"><p className="text-white text-lg animate-pulse">جاري بدء الكاميرا...</p></div>)}</div></div>);
};

const DataMenuItem: React.FC<{ icon: React.ReactNode; label: string; count: number; onClick: () => void }> = ({ icon, label, count, onClick }) => (
    <button onClick={onClick} className="text-center p-4 bg-white rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm"><div className="p-3 bg-blue-100 text-blue-600 rounded-full w-fit mx-auto mb-2">{icon}</div><span className="font-semibold text-sm">{label}</span><p className="text-xs text-gray-500">({count} سجلات)</p></button>
);

const DataMenuScreen: React.FC<{ onSelect: (page: Page) => void; data: Record<string, any[]> }> = ({ onSelect, data }) => {
    const menuItems: { page: Page; label: string; icon: React.ReactNode; dataKey: string }[] = [
        { page: 'products', label: 'المنتجات', icon: <PackageIcon className="w-8 h-8" />, dataKey: 'products'},
        { page: 'customers', label: 'العملاء', icon: <UsersIcon className="w-8 h-8" />, dataKey: 'customers' },
        { page: 'suppliers', label: 'الموردين', icon: <TruckIcon className="w-8 h-8" />, dataKey: 'suppliers' },
        { page: 'invoices', label: 'فواتير البيع', icon: <ReceiptIcon className="w-8 h-8" />, dataKey: 'invoices' },
        { page: 'purchaseInvoices', label: 'فواتير الشراء', icon: <ReceiptIcon className="w-8 h-8" />, dataKey: 'purchaseInvoices' },
        { page: 'expenses', label: 'المصاريف', icon: <WalletIcon className="w-8 h-8" />, dataKey: 'expenses' },
        { page: 'bookings', label: 'الحجوزات', icon: <CalendarIcon className="w-8 h-8" />, dataKey: 'bookings' },
    ];
    return (<div className="p-4"><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{menuItems.map(item => <DataMenuItem key={item.page} onClick={() => onSelect(item.page)} icon={item.icon} label={item.label} count={data[item.dataKey]?.length || 0} />)}</div></div>);
};

const DataListScreen: React.FC<{ title: string; items: any[]; onBack: () => void; renderItem: (item: any, index: number) => React.ReactNode; searchKeys: string[]; }> = ({ title, items, onBack, renderItem, searchKeys }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredItems = useMemo(() => items.filter(item => searchTerm === '' || searchKeys.some(key => String(item[key] || '').toLowerCase().includes(searchTerm.toLowerCase()))), [items, searchTerm, searchKeys]);
    return (<div className="p-4 flex flex-col h-full"><div className="flex-shrink-0 mb-4"><button onClick={onBack} className="font-semibold text-blue-600 hover:underline mb-2">← العودة إلى القائمة</button><div className="relative"><SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder={`ابحث في ${title}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 focus:ring-2 focus:ring-blue-500"/></div></div><div className="flex-grow overflow-y-auto -mx-4 px-4"><div className="space-y-3">{filteredItems.map((item, index) => renderItem(item, index))}</div></div></div>);
};

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('scanner');
    const [syncedData, setSyncedData] = useState<Record<string, any[]>>({});
    const [firebaseConfig, setFirebaseConfig] = useLocalStorage<FirebaseConfig | null>('scannerFirebaseConfig', null);
    const [firebaseError, setFirebaseError] = useState(''); const [isFirebaseReady, setIsFirebaseReady] = useState(false); const [isLoading, setIsLoading] = useState(true); const [loadingText, setLoadingText] = useState('جاري التحقق من الإعدادات...');
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [scannedProductResult, setScannedProductResult] = useState<Product | { notFound: boolean, code: string } | null>(null);


    const showToast = useCallback((message: string, type: ToastMessage['type']) => { setToast({ id: Date.now(), message, type }); }, []);
    const initializeFirebase = useCallback((config: FirebaseConfig) => { setLoadingText('جاري الاتصال بقاعدة البيانات...'); try { if (!firebase.apps.length) firebase.initializeApp(config); setFirebaseError(''); setIsFirebaseReady(true); } catch (e: any) { console.error("Firebase init failed", e); setFirebaseError(`فشل الاتصال: ${e.message}`); setIsFirebaseReady(false); setFirebaseConfig(null); setIsLoading(false); } }, [setFirebaseConfig]);
    useEffect(() => { if (firebaseConfig) initializeFirebase(firebaseConfig); else setIsLoading(false); }, [firebaseConfig, initializeFirebase]);

    useEffect(() => {
        if (!isFirebaseReady) return;
        const dataToSync = ['products', 'customers', 'suppliers', 'invoices', 'purchaseInvoices', 'expenses', 'bookings'];
        const db = firebase.database();
        setLoadingText('جاري مزامنة البيانات...');
        let loadedCount = 0;

        dataToSync.forEach(key => {
            const ref = db.ref(`syncedData/${key}`);
            ref.on('value', (snapshot: any) => {
                const data = snapshot.val();
                setSyncedData(prev => ({ ...prev, [key]: Array.isArray(data) ? data : [] }));
                if (isLoading) {
                    loadedCount++;
                    if(loadedCount === dataToSync.length) {
                        showToast('تمت مزامنة جميع البيانات بنجاح!', 'success');
                        setIsLoading(false);
                    }
                }
            }, (error: any) => { console.error(`Firebase read failed for ${key}`, error); setFirebaseError(`فشل في قراءة بيانات ${key}.`); setIsLoading(false); });
        });
    }, [isFirebaseReady, isLoading, showToast]);
    
    const handleScanResult = (code: string) => {
        firebase.database().ref('barcodeScanner/scannedCode').set({ code: code, timestamp: firebase.database.ServerValue.TIMESTAMP });
        const product = syncedData.products?.find(p => p.barcode === code);
        if(product) { 
            setScannedProductResult(product);
            showToast(`تم العثور على: ${product.name}`, 'success'); 
        } else { 
            setScannedProductResult({ notFound: true, code });
            showToast(`تم إرسال الكود: ${code}`, 'info'); 
        }
    };

    if (isLoading) return <LoadingScreen text={loadingText} />;
    if (!firebaseConfig || !isFirebaseReady) return <ConfigScreen onSave={setFirebaseConfig} error={firebaseError} initialConfig={firebaseConfig} />;
    
    const renderPage = () => {
        const commonListProps = { onBack: () => setPage('data_menu'), items: [], searchKeys: [] };
        switch (page) {
            case 'scanner': return (
                <div>
                    <ScannerView onScan={handleScanResult} />
                    {scannedProductResult && (
                        <div className="p-4">
                        <div className="p-4 bg-white rounded-lg shadow-md border fade-in relative">
                            <button onClick={() => setScannedProductResult(null)} className="absolute top-2 left-2 text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5"/></button>
                            {'notFound' in scannedProductResult ? (
                                <div>
                                    <h3 className="font-bold text-lg text-red-600">منتج غير موجود</h3>
                                    <p className="text-gray-600">لم يتم العثور على منتج بالباركود:</p>
                                    <p className="font-mono text-center bg-gray-100 p-2 rounded-md mt-2">{scannedProductResult.code}</p>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-bold text-lg text-blue-700">{scannedProductResult.name}</h3>
                                    <div className="mt-2 pt-2 border-t flex justify-between items-center">
                                        <p className="text-xl font-extrabold text-green-600">{currencyFormat(scannedProductResult.price)}</p>
                                        <p className="text-md font-semibold text-gray-700">المخزون المتاح: <span className="font-bold">{scannedProductResult.stock}</span></p>
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>
                    )}
                </div>
            );
            case 'data_menu': return <DataMenuScreen onSelect={setPage} data={syncedData} />;
            case 'settings': return <ConfigScreen onSave={setFirebaseConfig} initialConfig={firebaseConfig} />;
            case 'products': return <DataListScreen {...commonListProps} title="المنتجات" items={syncedData.products || []} searchKeys={['name', 'barcode']} renderItem={(p: Product) => <div className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm"><div><h3 className="font-semibold text-gray-800">{p.name}</h3><p className="text-sm text-gray-500 font-mono">{p.barcode}</p></div><div className="text-right flex-shrink-0 ml-4"><p className="font-bold text-lg text-blue-600">{currencyFormat(p.price)}</p><p className="text-sm text-gray-600">المخزون: {p.stock}</p></div></div>} />;
            case 'customers': return <DataListScreen {...commonListProps} title="العملاء" items={syncedData.customers || []} searchKeys={['name', 'phone']} renderItem={(c: Customer) => <div className="bg-white p-3 rounded-lg border shadow-sm"> <h3 className="font-semibold text-gray-800">{c.name}</h3><div className="flex justify-between items-center mt-1"><p className="text-sm text-gray-500">{c.phone}</p><p className={`font-bold text-sm ${c.debt > 0 ? 'text-red-500' : 'text-green-600'}`}>الدين: {currencyFormat(c.debt)}</p></div></div>} />;
            case 'suppliers': return <DataListScreen {...commonListProps} title="الموردين" items={syncedData.suppliers || []} searchKeys={['name', 'phone']} renderItem={(s: Supplier) => <div className="bg-white p-3 rounded-lg border shadow-sm"> <h3 className="font-semibold text-gray-800">{s.name}</h3><div className="flex justify-between items-center mt-1"><p className="text-sm text-gray-500">{s.phone}</p><p className={`font-bold text-sm ${s.debt > 0 ? 'text-red-500' : 'text-green-600'}`}>المستحقات: {currencyFormat(s.debt)}</p></div></div>} />;
            case 'invoices': return <DataListScreen {...commonListProps} title="فواتير البيع" items={syncedData.invoices || []} searchKeys={['id', 'customerName']} renderItem={(i: Invoice) => <div className="bg-white p-3 rounded-lg border shadow-sm"> <div className="flex justify-between items-start"><div className="font-mono text-xs text-gray-500">{i.id}</div><div className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">{i.status}</div></div><h3 className="font-semibold text-gray-800">{i.customerName}</h3><div className="flex justify-between items-center mt-1"><p className="text-sm text-gray-500">{dateFormat(i.date)}</p><p className="font-bold text-blue-600">{currencyFormat(i.total)}</p></div></div>} />;
            default: return <div>صفحة غير موجودة</div>;
        }
    };
    
    return (<div className="max-w-xl mx-auto bg-gray-100 min-h-screen"><header className="bg-blue-600 text-white shadow-lg p-4 flex items-center gap-4 sticky top-0 z-10"><img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="Logo" className="h-10 w-10"/><div><h1 className="text-xl font-bold">الماسح الضوئي</h1><p className="text-xs opacity-80">متصل بنظام YSK Sales</p></div></header><main className="pb-20">{renderPage()}</main><footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-t-lg max-w-xl mx-auto"><nav className="flex justify-around items-center h-16">{[{p: 'scanner', i: <ScanLineIcon className="w-7 h-7"/>}, {p: 'data_menu', i: <DatabaseIcon className="w-7 h-7"/>}, {p: 'settings', i: <SettingsIcon className="w-7 h-7"/>}].map(({p, i}) => <button key={p} onClick={() => setPage(p as Page)} className={`p-2 rounded-full transition-colors ${page === p ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}>{i}</button>)}</nav></footer>{toast && <Toast message={toast} onDismiss={() => setToast(null)} />}</div>);
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);