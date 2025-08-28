import React from 'react';
import { useStorage } from '../contexts/AuthContext';
import { FolderIcon } from './icons';

export const StorageSetup: React.FC = () => {
    const { storageMode, error, requestDirectory, fallbackToLocalStorage, isApiSupported } = useStorage();

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-6 text-center">
            <div className="max-w-2xl w-full bg-white p-10 rounded-2xl shadow-xl border border-gray-200">
                <FolderIcon className="w-20 h-20 mx-auto text-blue-500 mb-6" />
                <h1 className="text-3xl font-bold text-gray-800 mb-4">إعداد تخزين البيانات</h1>
                
                {isApiSupported ? (
                    <>
                        <p className="text-gray-600 mb-8">
                            لأمان وخصوصية أفضل، يرجى اختيار مجلد على جهازك لحفظ جميع بيانات التطبيق.
                            سيتم حفظ البيانات كملفات داخل هذا المجلد، مما يمنحك تحكمًا كاملاً.
                        </p>
                        <button
                            onClick={requestDirectory}
                            className="w-full px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            اختيار مجلد التخزين
                        </button>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                        <p className="text-sm text-gray-400 mt-2">
                           (مستحسن) يستخدم تقنية File System Access API للوصول المباشر والآمن للملفات.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={fallbackToLocalStorage}
                                className="text-sm font-semibold text-gray-500 hover:text-gray-700 hover:underline"
                            >
                                المتابعة باستخدام تخزين المتصفح (أقل أمانًا)
                            </button>
                        </div>
                    </>
                ) : (
                     <>
                        <p className="text-gray-600 mb-2">
                           متصفحك الحالي لا يدعم ميزة حفظ الملفات مباشرة على جهازك.
                        </p>
                         <p className="text-orange-600 bg-orange-50 border border-orange-200 rounded-md p-3 mb-8">
                           <b>تحذير:</b> سيتم حفظ البيانات داخل المتصفح، وقد يتم حذفها إذا قمت بمسح بيانات المتصفح أو في حالة امتلاء مساحة التخزين.
                        </p>
                        <button
                            onClick={fallbackToLocalStorage}
                            className="w-full px-6 py-4 bg-gray-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-transform hover:scale-105"
                        >
                            المتابعة باستخدام تخزين المتصفح
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
