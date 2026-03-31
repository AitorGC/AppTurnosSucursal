import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Clock, Search } from 'lucide-react';
import API_URL from '../apiConfig';

const SwapSelectorModal = ({ isOpen, onClose, onPropose, ownShift, userZoneId, userBranchId, currentUserId }) => {
    const [availableShifts, setAvailableShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && ownShift) {
            fetchAvailableShifts();
        }
    }, [isOpen, ownShift]);

    // Keyboard: Esc closes modal
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const fetchAvailableShifts = async () => {
        setLoading(true);
        try {
            // Rango: desde mañana hasta dentro de 30 días
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const endDate = new Date(tomorrow);
            endDate.setDate(tomorrow.getDate() + 30);

            // Buscar turnos en la misma zona
            const res = await fetch(`${API_URL}/shifts?start=${tomorrow.toISOString()}&end=${endDate.toISOString()}&zoneId=${userZoneId}&userId=${currentUserId}`);
            const data = await res.json();
            const shiftsData = Array.isArray(data) ? data : [];

            // Filtrar: no mi turno, solo WORK
            const filtered = shiftsData.filter(s =>
                s.userId !== currentUserId &&
                s.type === 'WORK'
            );

            setAvailableShifts(filtered);
        } catch (e) {
            console.error('Error fetching peer shifts:', e);
        } finally {
            setLoading(false);
        }
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePropose = async (shift) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onPropose(shift);
        } catch (error) {
            console.error('Error proposing swap:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredShifts = availableShifts.filter(s =>
        s.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="bg-companyBlue dark:bg-blue-700 px-6 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ArrowRightLeft className="text-white" size={24} />
                        <h3 className="text-white font-bold text-xl uppercase tracking-tight">Seleccionar turno para intercambio</h3>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors" disabled={isSubmitting}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Resumen del turno propio */}
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/40 rounded-xl">
                        <p className="text-xs font-bold text-companyBlue dark:text-blue-200 uppercase tracking-wider mb-2">Tu turno seleccionado</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white text-lg">
                                    {new Date(ownShift.startDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(ownShift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ownShift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-bold border border-gray-200 dark:border-gray-700 dark:text-gray-200">
                                    {ownShift.zone.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Buscador */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por compañero..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 dark:text-gray-200"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Lista de turnos disponibles */}
                    <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                        {loading ? (
                            <div className="text-center py-12 text-gray-400">Cargando turnos de compañeros...</div>
                        ) : filteredShifts.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 dark:bg-slate-950/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400">No se encontraron turnos de compañeros en esta zona y semana.</p>
                            </div>
                        ) : (
                            filteredShifts.map(shift => (
                                <div
                                    key={shift.id}
                                    className={`flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl transition-all group ${isSubmitting ? 'opacity-50' : 'hover:border-companyBlue dark:hover:border-blue-400 hover:shadow-md'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 dark:text-gray-400">
                                            {shift.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white">{shift.user.name}</p>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="font-medium">
                                                    {new Date(shift.startDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePropose(shift)}
                                        disabled={isSubmitting}
                                        className={`px-4 py-2 bg-companyBlue dark:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all ${isSubmitting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    >
                                        {isSubmitting ? '...' : 'Proponer'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SwapSelectorModal;
