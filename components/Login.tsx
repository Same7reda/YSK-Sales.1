import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { UserIcon, MailIcon } from './icons'; // Assuming you have these icons

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);

const HelpCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
);

type Mode = 'login' | 'recover_user' | 'recover_question' | 'recover_reset';

export const Login: React.FC = () => {
    const [mode, setMode] = useState<Mode>('login');
    const { login, getUserByUsername, recoverPassword } = useAuth();
    const { addToast } = useToast();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useLocalStorage('rememberMe', false);
    
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userToRecover, setUserToRecover] = useState<{username: string; question: string} | null>(null);

    useEffect(() => {
        const savedUsername = localStorage.getItem('rememberedUsername');
        if (rememberMe && savedUsername) {
            setUsername(savedUsername);
        }
    }, [rememberMe]);


    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(username, password)) {
            if (rememberMe) {
                localStorage.setItem('rememberedUsername', username);
            } else {
                localStorage.removeItem('rememberedUsername');
            }
        }
    };
    
    const handleRecoverUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = getUserByUsername(username);
        if (user) {
            setUserToRecover({ username: user.username, question: user.securityQuestion });
            setMode('recover_question');
        } else {
            addToast('اسم المستخدم غير موجود', 'error');
        }
    };
    
    const handleRecoverQuestionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userToRecover) {
             if(securityAnswer) {
                 setMode('recover_reset');
             } else {
                 addToast('يرجى إدخال إجابة', 'error');
             }
        }
    };
    
    const handleRecoverResetSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast('كلمتا المرور غير متطابقتين', 'error');
            return;
        }
        if (userToRecover && recoverPassword(userToRecover.username, securityAnswer, newPassword)) {
            setMode('login');
            setUsername(userToRecover.username);
            setPassword('');
        }
    };

    const renderForm = () => {
        switch (mode) {
            case 'login':
                return (
                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div className="relative">
                            <UserIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder="اسم المستخدم" type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="relative">
                            <LockIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder="كلمة المرور" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-600 cursor-pointer"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/> تذكرني</label>
                            <button type="button" onClick={() => setMode('recover_user')} className="font-semibold text-blue-600 hover:underline">نسيت كلمة المرور؟</button>
                        </div>
                        <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:opacity-90 transition-opacity">تسجيل الدخول</button>
                    </form>
                );
            case 'recover_user':
                 return (
                    <form onSubmit={handleRecoverUserSubmit} className="space-y-6">
                         <p className="text-sm text-gray-600">أدخل اسم المستخدم الخاص بك للعثور على حسابك.</p>
                        <div className="relative">
                            <UserIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder="اسم المستخدم" type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setMode('login')} className="w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                            <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">بحث</button>
                        </div>
                    </form>
                );
             case 'recover_question':
                return (
                    <form onSubmit={handleRecoverQuestionSubmit} className="space-y-6">
                        <p className="text-sm text-gray-600">للأمان، يرجى الإجابة على سؤال الأمان الخاص بك.</p>
                        <div className="relative">
                            <HelpCircleIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder={userToRecover?.question} type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                         <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setMode('login')} className="w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                            <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">متابعة</button>
                        </div>
                    </form>
                );
            case 'recover_reset':
                 return (
                     <form onSubmit={handleRecoverResetSubmit} className="space-y-6">
                         <p className="text-sm text-gray-600">أدخل كلمة مرور جديدة لحسابك.</p>
                        <div className="relative">
                            <LockIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder="كلمة المرور الجديدة" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                        <div className="relative">
                            <LockIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input placeholder="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-blue-400"/>
                        </div>
                         <div className="flex items-center gap-4">
                             <button type="button" onClick={() => setMode('login')} className="w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">إلغاء</button>
                            <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">تغيير كلمة المرور</button>
                        </div>
                    </form>
                 );
        }
    };

    const titleMap: Record<Mode, string> = {
        login: 'أهلاً بعودتك!',
        recover_user: 'استعادة الحساب',
        recover_question: 'سؤال الأمان',
        recover_reset: 'إعادة تعيين كلمة المرور'
    };

    const subtitleMap: Record<Mode, string> = {
        login: 'سجل الدخول للمتابعة إلى لوحة التحكم.',
        recover_user: 'لا تقلق، سنساعدك على استعادة حسابك.',
        recover_question: 'خطوة واحدة تفصلك عن إعادة تعيين كلمة المرور.',
        recover_reset: 'اختر كلمة مرور قوية وجديدة.'
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lg:p-0">
            <div className="flex w-full max-w-5xl h-screen lg:h-auto lg:max-h-[700px] bg-white rounded-none lg:rounded-2xl shadow-2xl overflow-hidden">
                {/* Form Side */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                     <div className="max-w-md mx-auto w-full">
                        <img src="https://i.postimg.cc/D0cf0y0m/512-x-512-1.png" alt="YSK Sales Logo" className="h-16 w-16 mb-4 lg:hidden"/>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{titleMap[mode]}</h1>
                        <p className="text-gray-500 mb-8">{subtitleMap[mode]}</p>
                        {renderForm()}
                    </div>
                </div>

                {/* Branding Side */}
                <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-12 flex-col justify-between">
                     <div>
                        <img src="https://i.postimg.cc/fLTxbbTt/512-x-512-3.png" alt="YSK Sales Logo" className="h-20 w-20 mb-4"/>
                        <h2 className="text-4xl font-bold leading-tight">نظام YSK Sales</h2>
                        <p className="text-blue-200 mt-2 text-lg">حلول متكاملة لإدارة مبيعاتك بكفاءة وسهولة.</p>
                    </div>
                    <div className="mt-auto">
                        <p className="text-blue-100 text-sm">"أفضل طريقة للتنبؤ بالمستقبل هي أن تصنعه."</p>
                        <p className="text-blue-200 font-semibold mt-1">- بيتر دراكر</p>
                    </div>
                </div>
            </div>
        </div>
    );
};