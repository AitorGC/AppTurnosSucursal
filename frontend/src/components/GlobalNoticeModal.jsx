import React, { useState, useEffect } from 'react';
import { X, Save, Info, AlertTriangle, MessageSquare } from 'lucide-react';

const GlobalNoticeModal = ({ isOpen, onClose, onSave, noticeToEdit }) => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        type: 'INFO',
        isActive: true
    });

    useEffect(() => {
        if (noticeToEdit) {
            setFormData({
                title: noticeToEdit.title,
                message: noticeToEdit.message,
                type: noticeToEdit.type,
                isActive: noticeToEdit.isActive
            });
        } else {
            setFormData({
                title: '',
                message: '',
                type: 'INFO',
                isActive: true
            });
        }
    }, [noticeToEdit, isOpen]);

    // Keyboard: Esc closes modal
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="bg-companyBlue dark:bg-blue-700 px-6 py-5 flex justify-between items-center">
                    <h3 className="text-white font-bold text-xl">
                        {noticeToEdit ? 'Editar Comunicado' : 'Nuevo Comunicado Global'}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 dark:bg-gray-900">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 text-center uppercase tracking-widest text-[10px]">Título del Comunicado</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-3 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none"
                            placeholder="Ej: Mantenimiento del Sistema"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 text-center uppercase tracking-widest text-[10px]">Tipo de Alerta</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-3 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none"
                            >
                                <option value="INFO">Información</option>
                                <option value="URGENT">Urgente / Alerta</option>
                                <option value="CHANGELOG">Cambios / Novedades</option>
                            </select>
                        </div>
                        <div className="flex flex-col items-center justify-end">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-widest text-[10px]">Activo</label>
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 text-center uppercase tracking-widest text-[10px]">Mensaje Detallado</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            rows="5"
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-3 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none resize-none"
                            placeholder="Describe el comunicado aquí..."
                            required
                        ></textarea>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">
                            Este comunicado aparecerá a todos los usuarios en su Dashboard la próxima vez que accedan o refresquen.
                        </p>
                    </div>

                    <div className="flex justify-end pt-5 border-t border-gray-200 dark:border-gray-800 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-950 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex items-center px-10 py-2.5 text-sm font-bold text-white bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-xl shadow-lg dark:shadow-soft-sm transition-all active:scale-95"
                        >
                            <Save size={18} className="mr-2" />
                            {noticeToEdit ? 'Actualizar' : 'Publicar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GlobalNoticeModal;
