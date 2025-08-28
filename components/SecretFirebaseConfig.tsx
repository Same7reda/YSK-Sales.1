import React, { useState, useEffect } from 'react';
import type { FirebaseActivationConfig } from '../types';
import * as idb from '../hooks/idb';
import { useToast } from './Toast';

interface SecretFirebaseConfigProps {
    onClose: () => void;
}

const CONFIG_KEY = 'activationFirebaseConfig';

export const SecretFirebaseConfig: React.FC<SecretFirebaseConfigProps> = ({ onClose }) => {
    const [config, setConfig] = useState<FirebaseActivationConfig>({
        apiKey: '',
        authDomain: '',
        databaseURL: '',
        projectId: '',
    });
    const { addToast } = useToast();

    useEffect(() => {
        const loadConfig = async () => {
            const savedConfig = await idb.get<FirebaseActivationConfig>(CONFIG_KEY);
            if (savedConfig) {
                setConfig(savedConfig);
            }
        };
        loadConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!config.apiKey || !config.databaseURL || !config.projectId) {
            addToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
            return;
        }
        await idb.set(CONFIG_KEY, config);
        addToast('تم حفظ إعدادات Firebase للتفعيل بنجاح.', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg modal-content-animate">
                <h3 className="text-xl font-bold mb-4">إعدادات Firebase السرية للتفعيل</h3>
                <p className="text-sm text-gray-500 mb-6">
                    هذه البيانات تستخدم فقط لنظام التفعيل ويتم تخزينها بأمان على هذا الجهاز فقط.
                </p>
                <div className="space-y-4">
                    {Object.keys(config).map(key => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 font-mono">{key}</label>
                            <input
                                type="text"
                                name={key}
                                value={config[key as keyof FirebaseActivationConfig]}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                                dir="ltr"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        إلغاء
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        حفظ الإعدادات
                    </button>
                </div>
            </div>
        </div>
    );
};
