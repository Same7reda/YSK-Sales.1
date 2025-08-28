import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { FirebaseActivationConfig, ActivationData } from '../types';
import * as idb from '../hooks/idb';
import { getDeviceId } from '../utils/deviceId';

declare var firebase: any;

type ActivationStatus = 'pending' | 'inactive' | 'active' | 'expired' | 'tampered';

interface ActivationContextType {
    activationStatus: ActivationStatus;
    isLoading: boolean;
    error: string | null;
    activate: (key: string) => Promise<boolean>;
    resetActivation: () => Promise<void>;
}

const ActivationContext = createContext<ActivationContextType | undefined>(undefined);

export const useActivation = () => {
    const context = useContext(ActivationContext);
    if (!context) throw new Error('useActivation must be used within an ActivationProvider');
    return context;
};

// Hardcoded Firebase configuration for the activation system.
const firebaseConfig = {
  apiKey: "AIzaSyCfyM5MDpcS33KqtKVT7U7AFnmflSB0tU0",
  authDomain: "ysk-active-64860.firebaseapp.com",
  databaseURL: "https://ysk-active-64860-default-rtdb.firebaseio.com/",
  projectId: "ysk-active-64860",
  storageBucket: "ysk-active-64860.firebasestorage.app",
  messagingSenderId: "592299818494",
  appId: "1:592299818494:web:6710d728a4f8e5e041d4af",
  measurementId: "G-FL7VH6S4JM"
};


const DATA_KEY = 'activationData';

export const ActivationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activationStatus, setActivationStatus] = useState<ActivationStatus>('pending');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await idb.get<ActivationData>(DATA_KEY);
            if (!data) {
                setActivationStatus('inactive');
                return;
            }

            const now = Date.now();
            if (now < data.lastUsedDate) {
                setActivationStatus('tampered');
                return;
            }

            if (now > data.expiryDate) {
                setActivationStatus('expired');
                return;
            }

            // Update last used date
            await idb.set(DATA_KEY, { ...data, lastUsedDate: now });
            setActivationStatus('active');
        } catch (e) {
            setError('حدث خطأ أثناء التحقق من حالة التفعيل.');
            setActivationStatus('inactive');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const activate = async (key: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            } else if (firebase.apps[0].options.projectId !== firebaseConfig.projectId) {
                await firebase.apps[0].delete();
                firebase.initializeApp(firebaseConfig);
            }
        } catch (e: any) {
            setError(`فشل الاتصال بـ Firebase: ${e.message}`);
            setIsLoading(false);
            return false;
        }
        
        const db = firebase.database();
        const keyRef = db.ref(`activation_keys/${key}`);
        
        try {
            const snapshot = await keyRef.once('value');
            const keyData = snapshot.val();
            const deviceId = await getDeviceId();

            if (!keyData) {
                setError('كود التفعيل غير صحيح.');
                return false;
            }
            if (keyData.status === 'activated' && keyData.deviceId !== deviceId) {
                setError('هذا الكود مستخدم بالفعل على جهاز آخر.');
                return false;
            }
            if (keyData.status === 'expired') {
                setError('هذا الكود منتهي الصلاحية.');
                return false;
            }

            const now = Date.now();
            const serverTimeOffset = (await db.ref('/.info/serverTimeOffset').once('value')).val();
            const serverNow = now + serverTimeOffset;
            const expiryDate = serverNow + (keyData.durationDays * 24 * 60 * 60 * 1000);

            const newActivationData: ActivationData = {
                key,
                deviceId,
                activatedAt: serverNow,
                lastUsedDate: serverNow,
                expiryDate,
            };

            await idb.set(DATA_KEY, newActivationData);
            
            await keyRef.update({
                status: 'activated',
                deviceId: deviceId,
                activatedAt: serverNow,
                expiresAt: expiryDate,
            });

            setActivationStatus('active');
            return true;
        } catch (e: any) {
            setError(`حدث خطأ أثناء التفعيل: ${e.message}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetActivation = async () => {
        await idb.del(DATA_KEY);
        setActivationStatus('inactive');
    };

    const value = { activationStatus, isLoading, error, activate, resetActivation };

    return <ActivationContext.Provider value={value}>{children}</ActivationContext.Provider>;
};