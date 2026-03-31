import React, { useEffect } from 'react';
import { X, Clock, User, Trash2, Edit2 } from 'lucide-react';
import { getShiftColors } from '../utils/colors';

const ZoneSummaryModal = ({ isOpen, onClose, zoneName, date, shifts, onEditShift, onDeleteShift, readOnly }) => {
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formattedDate = new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-[#001D3D] dark:bg-blue-700 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">{zoneName}</h3>
                        <p className="text-blue-200 dark:text-blue-600 text-sm capitalize">{formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 dark:hover:bg-black/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto dark:bg-gray-900">
                    <div className="space-y-4">
                        {shifts.map((shift) => {
                            const colors = getShiftColors(zoneName, shift.isOvertime, shift.type);
                            return (
                                <div key={shift.id} className={`group relative border-l-4 p-4 rounded-xl transition-all ${colors.border} ${colors.bg} hover:shadow-md`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700">
                                                <User size={18} className={`${colors.text}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-200">{shift.user.name}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-300">
                                                        <Clock size={12} className="mr-1" />
                                                        <span>
                                                            {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {shift.subZone && (
                                                        <span className={`text-[10px] tracking-wider font-bold uppercase font-black uppercase px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>
                                                            {shift.subZone}
                                                        </span>
                                                    )}
                                                    {shift.isOvertime && (
                                                        <span className="px-1.5 py-0.5 bg-status-overtime/20 text-status-overtime rounded-md font-bold text-[10px] tracking-wider font-bold uppercase uppercase">
                                                            EXTRA
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {!readOnly && (
                                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onEditShift(shift)}
                                                    className="p-2 text-gray-400 dark:text-gray-300 hover:text-companyBlue dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-50/20 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteShift(shift.id)}
                                                    className="p-2 text-gray-400 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-slate-950 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ZoneSummaryModal;
