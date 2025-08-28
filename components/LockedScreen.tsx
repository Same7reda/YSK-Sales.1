import React from 'react';
import { useActivation } from '../contexts/ActivationContext';
import { AlertTriangleIcon } from './icons';

interface LockedScreenProps {
    message: string;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({ message }) => {
    const { resetActivation } = useActivation();

    return (
        <div className="min-h-screen bg-red-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 text-center border-t-8 border-red-500">
                <AlertTriangleIcon className="w-20 h-20 mx-auto text-red-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">تم قفل النظام</h1>
                <p className="text-gray-600 mb-6">
                    {message}
                </p>

                <button
                    onClick={resetActivation}
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    إدخال كود جديد
                </button>
            </div>
        </div>
    );
};
