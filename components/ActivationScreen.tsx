import React, { useState } from 'react';
import { useActivation } from '../contexts/ActivationContext';
import { PhoneIcon, WhatsAppIcon, MailIcon } from './icons';

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const ActivationScreen: React.FC = () => {
    const { activate, isLoading: isActivating, error: activationError } = useActivation();
    const [keyCode, setKeyCode] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (keyCode.trim() && !isActivating) {
            await activate(keyCode.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-lg">
                 <div className="text-center mb-6">
                    <img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="YSK Sales Logo" className="h-24 w-24 mx-auto mb-4"/>
                    <h1 className="text-3xl font-bold text-gray-800">تفعيل نظام YSK Sales</h1>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 p-8">
                    <p className="text-gray-500 mb-6 text-center">
                        يرجى إدخال كود التفعيل الذي حصلت عليه لتشغيل التطبيق.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={keyCode}
                            onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
                            placeholder="YSK-XXXX-XXXX-XXXX"
                            className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-inner text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            dir="ltr"
                            required
                        />
                        {activationError && <p className="text-red-500 text-sm font-semibold text-center">{activationError}</p>}
                        <button
                            type="submit"
                            disabled={isActivating}
                            className="w-full py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait flex justify-center items-center transition-opacity"
                        >
                            {isActivating ? <LoadingSpinner /> : 'تـفـعـيـل'}
                        </button>
                    </form>
                </div>

                 <div className="mt-8">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200/80 p-6">
                        <h3 className="font-bold text-center text-gray-800 mb-1">تحتاج إلى مساعدة؟</h3>
                        <p className="text-sm text-gray-500 text-center mb-4">للحصول على كود تفعيل أو للدعم الفني، تواصل معنا.</p>
                        <div className="space-y-3">
                            <a href="https://wa.me/201023160657" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border hover:bg-green-50 hover:border-green-300 transition-all">
                                <WhatsAppIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-gray-800">WhatsApp</p>
                                    <p className="text-sm text-gray-600" dir="ltr">+20 102 316 0657</p>
                                </div>
                            </a>
                             <a href="tel:01023160657" className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-all">
                                <PhoneIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-gray-800">اتصال مباشر</p>
                                    <p className="text-sm text-gray-600">01023160657</p>
                                </div>
                            </a>
                            <a href="mailto:same7redaa@gmail.com" className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border hover:bg-red-50 hover:border-red-300 transition-all">
                                <MailIcon className="w-8 h-8 text-gray-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-gray-800">البريد الإلكتروني</p>
                                    <p className="text-sm text-gray-600">same7redaa@gmail.com</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
