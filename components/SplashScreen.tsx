import React, { useState, useEffect } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';

interface SplashScreenProps {
    message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message }) => {
    const welcomeText = useTypewriter("مرحباً بك في نظام YSK Sales", 80);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(oldProgress => {
                if (oldProgress >= 100) {
                    return 100;
                }
                const diff = Math.random() * 10;
                return Math.min(oldProgress + diff, 100);
            });
        }, 400);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-white text-gray-800">
            <div className="text-center w-full max-w-md px-4">
                <img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="YSK Sales Logo" className="w-32 h-32 mx-auto mb-6 splash-icon-animation"/>
                <h1 className="text-4xl font-bold mb-4 h-12 typewriter-cursor text-blue-600">
                    {welcomeText}
                </h1>
                <p className="text-lg text-gray-500 mb-6">{message || "جاري تجهيز بيئة العمل الخاصة بك..."}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progress}%`,
                            backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, .15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .15) 50%, rgba(255, 255, 255, .15) 75%, transparent 75%, transparent)',
                            backgroundSize: '1rem 1rem',
                            animation: 'progress-bar-stripes 1s linear infinite'
                        }}
                    ></div>
                </div>
            </div>
        </div>
    );
};