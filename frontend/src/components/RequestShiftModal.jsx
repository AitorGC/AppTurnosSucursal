import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, FileText } from 'lucide-react';
import API_URL from '../apiConfig';

const RequestShiftModal = ({ isOpen, onClose, userId, branchId, role, onSuccess }) => {
    const [zones, setZones] = useState([]);
    const [formData, setFormData] = useState({
        type: 'WORK',
        zoneId: '',
        startDate: '',
        endDate: '',
        userReason: '',
        subZone: ''
    });
    const [subZones, setSubZones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const fetchZones = async () => {
            try {
                const res = await fetch(`${API_URL}/branches?userId=${userId}&role=${role}`);
                const data = await res.json();
                const branches = Array.isArray(data) ? data : [];
                const myBranch = branches.find(b => b.id === branchId);
                if (myBranch) {
                    setZones(myBranch.zones || []);
                }
            } catch (e) {
                console.error('Error fetching zones via branches:', e);
            }
        };
        fetchZones();
    }, [isOpen, branchId]);

    useEffect(() => {
        if (formData.zoneId && formData.type === 'WORK') {
            const selectedZone = zones.find(z => z.id === parseInt(formData.zoneId));
            if (selectedZone?.definitionId) {
                fetch(`${API_URL}/subzones?definitionId=${selectedZone.definitionId}&branchId=${branchId}&userId=${userId}&role=${role}`)
                    .then(res => res.json())
                    .then(data => setSubZones(Array.isArray(data) ? data : []))
                    .catch(err => {
                        console.error('Error fetching subzones:', err);
                        setSubZones([]);
                    });
            } else {
                setSubZones([]);
            }
        } else {
            setSubZones([]);
        }
    }, [formData.zoneId, formData.type, zones, branchId]);

    // Keyboard: Esc closes modal
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const body = {
                userId,
                ...formData,
                zoneId: formData.type === 'WORK' ? parseInt(formData.zoneId) : null
            };

            const res = await fetch(`${API_URL}/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess();
                onClose();
                setFormData({ type: 'WORK', zoneId: '', startDate: '', endDate: '', userReason: '', subZone: '' });
            } else {
                setError(data.message || 'Error al crear solicitud');
            }
        } catch (e) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-companyBlue to-blue-600 dark:from-gray-800 dark:to-gray-900 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white dark:text-blue-200 uppercase tracking-tight">Nueva Solicitud</h2>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-slate-800/60 border border-red-200 dark:border-slate-600 rounded-2xl text-red-600 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Tipo de Solicitud</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500"
                            required
                        >
                            <option value="WORK">Turno de Trabajo</option>
                            <option value="VACATION">Vacaciones</option>
                            <option value="OFF">Día Libre</option>
                            <option value="MEDICAL">Visita Médica</option>
                        </select>
                    </div>

                    {formData.type === 'WORK' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Zona</label>
                            <select
                                value={formData.zoneId}
                                onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500"
                                required={formData.type === 'WORK'}
                            >
                                <option value="">Selecciona una zona</option>
                                {zones.map(zone => (
                                    <option key={zone.id} value={zone.id}>{zone.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {formData.type === 'WORK' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Labor/Subzona (Opcional)</label>
                            <select
                                value={formData.subZone}
                                onChange={(e) => setFormData({ ...formData, subZone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500"
                                disabled={!formData.zoneId}
                            >
                                <option value="">
                                    {subZones.length > 0 ? 'Selecciona labor...' : 'N/A o Escribe manualmente en notas...'}
                                </option>
                                {subZones.map(sz => (
                                    <option key={sz.id} value={sz.name}>{sz.name}</option>
                                ))}
                                {subZones.length === 0 && formData.subZone && (
                                    <option value={formData.subZone}>{formData.subZone}</option>
                                )}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Fecha/Hora Inicio</label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Fecha/Hora Fin</label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Motivo (Opcional)</label>
                        <textarea
                            value={formData.userReason}
                            onChange={(e) => setFormData({ ...formData, userReason: e.target.value })}
                            placeholder="Explica brevemente por qué solicitas esto..."
                            rows="3"
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white font-black rounded-2xl shadow-lg dark:shadow-soft-sm transition-all uppercase tracking-widest text-sm transform active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RequestShiftModal;
