import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Settings } from './components/Settings';
import { Invoices } from './components/Invoices';
import { InvoiceList } from './components/InvoiceList';
import { Customers } from './components/Customers';
import { Expenses } from './components/Expenses';
import { Suppliers } from './components/Suppliers';
import { Bookings } from './components/Bookings';
import { Reports } from './components/Reports';
import { AuditLogPage } from './components/AuditLogPage';
import { PurchaseOrders } from './components/PurchaseOrders';
import { StockTake } from './components/StockTake';
import { Coupons } from './components/Coupons';
import { YSKAssistantModal } from './components/YSKAssistantModal';
import type { Page } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { AuthProvider, useAuth, StorageProvider, useStorage, DataProvider, SyncProvider, useData } from './contexts/AuthContext';
import { Login } from './components/Login';
import { SplashScreen } from './components/SplashScreen';
import { StorageSetup } from './components/StorageSetup';
import { ActivationProvider, useActivation } from './contexts/ActivationContext';
import { ActivationScreen } from './components/ActivationScreen';
import { LockedScreen } from './components/LockedScreen';
import { GuidedTour, TourStep } from './components/GuidedTour';
import { useLocalStorage } from './hooks/useLocalStorage';


const AppContent: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { addToast } = useToast();
  
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useLocalStorage('hasCompletedTour', false);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Start the tour for new users automatically
    if (!hasCompletedTour) {
      // Use a timeout to ensure the main UI has rendered
      const timer = setTimeout(() => setIsTourActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedTour]);

  const handleTourFinish = (dontShowAgain: boolean) => {
    setIsTourActive(false);
    if (dontShowAgain) {
        setHasCompletedTour(true);
    }
  };


  const handlePageChange = (page: Page) => {
    if (activePage === page) return;
    if (hasPermission(page, 'view')) {
      setIsPageLoading(true);
      // Use a timeout to allow the loading spinner to appear before the page component starts rendering
      setTimeout(() => setActivePage(page), 50);
    } else {
      addToast('ليس لديك صلاحية لعرض هذه الصفحة.', 'error');
    }
  };

  useEffect(() => {
    if (isPageLoading) {
        // After activePage has changed, turn off the loading indicator after a short delay
        const timer = setTimeout(() => setIsPageLoading(false), 300); 
        return () => clearTimeout(timer);
    }
  }, [activePage, isPageLoading]);
  
  const tourSteps: TourStep[] = [
    { selector: '[data-tour-id="sidebar-nav"]', title: 'قائمة التنقل', content: 'من هنا يمكنك التنقل بين جميع أقسام النظام الرئيسية مثل المخزون، الفواتير، والعملاء.' },
    { selector: '[data-tour-id="quick-actions"]', title: 'إجراءات سريعة', content: 'توفر لك هذه الأيقونة وصولاً سريعاً لإنشاء الفواتير والمنتجات والعملاء دون مغادرة صفحتك الحالية.' },
    { selector: '[data-tour-id="ai-assistant"]', title: 'المساعد الذكي YSK', content: 'اسألني أي شيء! يمكنني مساعدتك في إضافة بيانات، الاستعلام عن معلومات، أو حتى إنشاء فواتير بالأوامر الصوتية أو النصية.' },
    { selector: '[data-tour-id="dashboard-stats"]', title: 'إحصائيات الأداء', content: 'هنا تجد ملخصاً سريعاً لأداء عملك، بما في ذلك الإيرادات، الأرباح، وعدد العملاء الجدد.' },
    { selector: '[data-tour-id="quick-invoice"]', title: 'فاتورة سريعة', content: 'أنشئ فاتورة نقدية ببضع نقرات فقط دون مغادرة لوحة التحكم.' },
    { selector: '[data-tour-id="pos-search"]', title: 'نقطة البيع (POS)', content: 'هذه هي واجهة البيع الرئيسية. ابدأ بالبحث عن منتج هنا لإضافته إلى الفاتورة.', before: () => handlePageChange('pos') },
    { selector: '[data-tour-id="pos-complete-sale"]', title: 'إتمام البيع', content: 'بعد إضافة المنتجات وتحديد العميل وطريقة الدفع، اضغط هنا لإتمام عملية البيع وطباعة الفاتورة.' },
    { selector: '[data-tour-id="add-product-button"]', title: 'إدارة المخزون', content: 'من هنا يمكنك إضافة منتجات جديدة إلى مخزونك وتعديل بيانات المنتجات الحالية.', before: () => handlePageChange('inventory') },
];


  const renderPage = () => {
    if (!hasPermission(activePage, 'view')) {
      return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-500">وصول مرفوض</h2>
            <p className="text-gray-600 mt-2">ليس لديك الصلاحية الكافية لعرض هذه الصفحة.</p>
        </div>
      );
    }
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={handlePageChange} />;
      case 'inventory': return <Products />;
      case 'settings': return <Settings />;
      case 'pos': return <Invoices />;
      case 'invoices': return <InvoiceList />;
      case 'customers': return <Customers />;
      case 'expenses': return <Expenses />;
      case 'suppliers': return <Suppliers />;
      case 'bookings': return <Bookings onNavigate={handlePageChange} />;
      case 'reports': return <Reports />;
      case 'audit_log': return <AuditLogPage />;
      case 'purchase_orders': return <PurchaseOrders />;
      case 'stock_take': return <StockTake />;
      case 'coupons': return <Coupons />;
      default: return <Dashboard onNavigate={handlePageChange} />;
    }
  };

  const handleToggleAssistant = () => {
      if (currentUser?.permissions.canUseAssistant) {
          setIsAssistantOpen(true);
      } else {
          addToast('ليس لديك صلاحية لاستخدام المساعد الذكي.', 'error');
      }
  }

  return (
      <>
        {isTourActive && <GuidedTour steps={tourSteps} onFinish={handleTourFinish} />}
        <div className="flex min-h-screen bg-gray-50 text-gray-800">
          <Sidebar activePage={activePage} onPageChange={handlePageChange} />
          <main className="flex-1 relative">
            <Header onNavigate={handlePageChange} activePage={activePage} onToggleAssistant={handleToggleAssistant} />
             <div className="relative h-[calc(100vh-73px)]">
                 <div className={`h-full overflow-y-auto transition-opacity duration-300 ${isPageLoading ? 'opacity-0' : 'opacity-100'}`}>
                    {renderPage()}
                </div>
                {isPageLoading && (
                    <div className="absolute inset-0 bg-gray-50/70 backdrop-blur-sm flex items-center justify-center z-20">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
          </main>
        </div>
        <YSKAssistantModal 
            isOpen={isAssistantOpen} 
            onClose={() => setIsAssistantOpen(false)} 
            onNavigate={handlePageChange} 
        />
      </>
  );
};

const AppCore: React.FC = () => {
    const { currentUser } = useAuth();
    if (!currentUser) {
        return <Login />;
    }
    return <AppContent />;
};

const AppRouter: React.FC = () => {
    const { storageMode, isLoading: isStorageLoading } = useStorage();
    const { activationStatus, isLoading: isActivationLoading } = useActivation();
    const { isDataLoading } = useData();

    // 1. Check Storage Loading
    if (isStorageLoading) {
        return <SplashScreen message="جاري إعداد التخزين..." />;
    }
    
    // 2. Check if storage needs to be set up
    if (storageMode === 'pending' || storageMode === 'error') {
        return <StorageSetup />;
    }
    // Storage is now ready ('fileSystem' or 'localStorage')

    // 3. Check Activation Loading
    if (isActivationLoading) {
        return <SplashScreen message="جاري التحقق من التفعيل..." />;
    }
    
    // 4. Handle Activation Status
    switch (activationStatus) {
        case 'active':
            // Activation is good, now check if data is loaded
            if (isDataLoading) {
                return <SplashScreen message="جاري تحميل بياناتك..." />;
            }
            // Everything is ready, show the main app with its providers
            return (
                 <AuthProvider>
                    <SyncProvider>
                        <AppCore />
                    </SyncProvider>
                </AuthProvider>
            );
        case 'expired':
            return <LockedScreen message="انتهت صلاحية التفعيل. يرجى إدخال كود جديد." />;
        case 'tampered':
            return <LockedScreen message="تم اكتشاف تلاعب في وقت النظام. تم قفل التطبيق." />;
        case 'inactive':
        default:
            return <ActivationScreen />;
    }
};

const AppWrapper: React.FC = () => {
    return (
        <ToastProvider>
            <StorageProvider>
                <DataProvider>
                    <ActivationProvider>
                        <AppRouter />
                    </ActivationProvider>
                </DataProvider>
            </StorageProvider>
        </ToastProvider>
    );
};

export default AppWrapper;
