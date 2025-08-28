import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/AuthContext';
import type { Expense } from '../types';
import { SearchIcon, EditIcon, Trash2Icon } from './icons';
import { CustomSelect } from './CustomSelect';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAuditLog } from '../hooks/useAuditLog';

const currencyFormat = (amount: number) => {
    return amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
}

export const Expenses: React.FC = () => {
    const { expenses, setExpenses } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
    const { addToast } = useToast();
    const { hasPermission } = useAuth();
    const { logAction } = useAuditLog();

    const expenseTypes = useMemo(() => [...new Set(expenses.map(e => e.type))], [expenses]);

    const { todayTotal, monthTotal } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = today.substring(0, 7);
        let todayTotal = 0;
        let monthTotal = 0;

        expenses.forEach(expense => {
            if (expense.date === today) {
                todayTotal += expense.amount;
            }
            if (expense.date.startsWith(currentMonth)) {
                monthTotal += expense.amount;
            }
        });

        return { todayTotal, monthTotal };
    }, [expenses]);

    const displayedExpenses = useMemo(() => {
        return expenses
            .filter(e => {
                const searchTermMatch = searchTerm === '' || 
                    e.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    e.notes?.toLowerCase().includes(searchTerm.toLowerCase());
                
                const filterTypeMatch = filterType === 'all' || e.type === filterType;

                return searchTermMatch && filterTypeMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, searchTerm, filterType]);

    const handleOpenModal = (expense: Expense | null = null) => {
        setCurrentExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentExpense(null);
    };

    const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
        if (currentExpense) {
            const updatedExpense = { ...currentExpense, ...expenseData };
            setExpenses(expenses.map(e => e.id === currentExpense.id ? updatedExpense : e));
            logAction('UPDATE', 'Expense', updatedExpense.id, `تحديث مصروف: ${updatedExpense.type} بقيمة ${currencyFormat(updatedExpense.amount)}`);
        } else {
            const newExpense = { ...expenseData, id: `e-${Date.now()}` };
            setExpenses([...expenses, newExpense]);
            logAction('CREATE', 'Expense', newExpense.id, `إنشاء مصروف جديد: ${newExpense.type} بقيمة ${currencyFormat(newExpense.amount)}`);
        }
        addToast('تم حفظ المصروف بنجاح', 'success');
        handleCloseModal();
    };

    const handleDelete = (ids: string[]) => {
        if(window.confirm(`هل أنت متأكد من حذف ${ids.length} مصروف؟`)) {
            const expensesToDelete = expenses.filter(e => ids.includes(e.id));
            setExpenses(expenses.filter(e => !ids.includes(e.id)));
            addToast(`تم حذف ${ids.length} مصروف بنجاح`, 'success');
            expensesToDelete.forEach(e => {
                logAction('DELETE', 'Expense', e.id, `حذف مصروف: ${e.type} بقيمة ${currencyFormat(e.amount)}`);
            });
            setSelectedExpenses(new Set());
        }
    };
    
    const handleSelect = (id: string, checked: boolean) => {
        const newSelection = new Set(selectedExpenses);
        if (checked) newSelection.add(id);
        else newSelection.delete(id);
        setSelectedExpenses(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedExpenses(new Set(displayedExpenses.map(e => e.id)));
        else setSelectedExpenses(new Set());
    };

    const filterOptions = useMemo(() => [
        { value: 'all', label: 'كل الأنواع' },
        ...expenseTypes.map(type => ({ value: type, label: type }))
    ], [expenseTypes]);

    const canEdit = hasPermission('expenses', 'edit');
    const canDelete = hasPermission('expenses', 'delete');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                {canEdit && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-5 py-2 bg-blue-600 text-white rounded-md shadow-md hover:opacity-90 font-semibold"
                    >
                        إضافة مصروف جديد
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-gray-500 font-medium">إجمالي مصروفات اليوم</h3>
                    <p className="text-3xl font-bold text-red-500 mt-1">{currencyFormat(todayTotal)}</p>
                </div>
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-gray-500 font-medium">إجمالي مصروفات الشهر</h3>
                    <p className="text-3xl font-bold text-red-500 mt-1">{currencyFormat(monthTotal)}</p>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="relative col-span-1 md:col-span-2">
                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="ابحث بالنوع أو الملاحظات..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:ring-2 focus:ring-blue-400"/>
                </div>
                <div>
                    <CustomSelect 
                        value={filterType}
                        onChange={setFilterType}
                        options={filterOptions}
                    />
                </div>
            </div>
            
            {selectedExpenses.size > 0 && canDelete && (
                <div className="bg-blue-100 border border-blue-200 rounded-md p-3 mb-4 flex items-center gap-4">
                    <p className="font-semibold text-blue-800">{selectedExpenses.size} مصروفات محددة</p>
                    <button onClick={() => handleDelete(Array.from(selectedExpenses))} className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"><Trash2Icon className="w-4 h-4"/> حذف المحدد</button>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-center">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedExpenses.size === displayedExpenses.length && displayedExpenses.length > 0} /></th>
                            <th className="p-4 text-sm font-semibold text-gray-600">النوع</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">المبلغ</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">التاريخ</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">ملاحظات</th>
                            {(canEdit || canDelete) && <th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedExpenses.map(expense => (
                            <tr key={expense.id} className={`border-b even:bg-gray-50/50 hover:bg-gray-50 ${selectedExpenses.has(expense.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedExpenses.has(expense.id)} onChange={e => handleSelect(expense.id, e.target.checked)} /></td>
                                <td className="p-4 font-medium text-gray-800">{expense.type}</td>
                                <td className="p-4 text-gray-600 font-semibold">{currencyFormat(expense.amount)}</td>
                                <td className="p-4 text-gray-600">{expense.date}</td>
                                <td className="p-4 text-gray-600">{expense.notes || '-'}</td>
                                {(canEdit || canDelete) && (
                                    <td className="p-4">
                                        <div className="flex justify-center items-center gap-2">
                                            {canEdit && <button onClick={() => handleOpenModal(expense)} title="تعديل" className="text-gray-500 hover:text-blue-600 p-1"><EditIcon className="w-5 h-5"/></button>}
                                            {canDelete && <button onClick={() => handleDelete([expense.id])} title="حذف" className="text-gray-500 hover:text-red-600 p-1"><Trash2Icon className="w-5 h-5"/></button>}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ExpenseModal expense={currentExpense} types={expenseTypes} onClose={handleCloseModal} onSave={handleSaveExpense} />}
        </div>
    );
};

// Expense Modal
interface ExpenseModalProps {
    expense: Expense | null;
    types: string[];
    onClose: () => void;
    onSave: (data: Omit<Expense, 'id'>) => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ expense, types, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        type: expense?.type || '',
        amount: expense?.amount || '',
        date: expense?.date || new Date().toISOString().split('T')[0],
        notes: expense?.notes || '',
    });

    const handleNumericChange = (value: string) => {
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData(prev => ({ ...prev, amount: value }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, amount: Number(formData.amount) });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg modal-content-animate">
                <h3 className="text-xl font-bold mb-6">{expense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">النوع</label>
                        <input list="expense-types" type="text" name="type" value={formData.type} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                        <datalist id="expense-types">
                            {types.map(t => <option key={t} value={t} />)}
                        </datalist>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">المبلغ</label>
                        <input type="text" inputMode="decimal" name="amount" value={formData.amount} onChange={e => handleNumericChange(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">التاريخ</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};