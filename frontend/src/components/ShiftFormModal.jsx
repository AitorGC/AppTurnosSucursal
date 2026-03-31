import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, List, Calendar as CalendarIcon, CheckSquare, Square, ArrowRightLeft } from 'lucide-react';
import API_URL from '../apiConfig';

const toLocalISOString = (date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
};

const ShiftFormModal = ({ isOpen, onClose, onSave, users, shiftToEdit, readOnly }) => {
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [formData, setFormData] = useState({
        userId: '',
        zoneId: '',
        type: 'WORK',
        startDate: '',
        endDate: '',
        isOvertime: false,
        // Campos para modo masivo
        startTime: '08:00',
        endTime: '16:00',
        bulkStart: new Date().toISOString().split('T')[0],
        bulkEnd: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        weekDays: [1, 2, 3, 4, 5], // Lun-Vie por defecto
        subZone: ''
    });

    const [zones, setZones] = useState([]);
    const [availableSubZones, setAvailableSubZones] = useState([]);
    const [warning, setWarning] = useState('');

    useEffect(() => {
        if (shiftToEdit) {
            setIsBulkMode(false);
            setFormData({
                ...formData,
                userId: shiftToEdit.userId,
                zoneId: shiftToEdit.zoneId,
                type: shiftToEdit.type,
                startDate: toLocalISOString(new Date(shiftToEdit.startDate)),
                endDate: toLocalISOString(new Date(shiftToEdit.endDate)),
                isOvertime: shiftToEdit.isOvertime,
                subZone: shiftToEdit.subZone || ''
            });
        } else {
            setFormData({
                ...formData,
                userId: (Array.isArray(users) && users.length > 0) ? users[0].id : '',
                zoneId: '',
                type: 'WORK',
                startDate: toLocalISOString(new Date()),
                endDate: toLocalISOString(new Date(new Date().getTime() + 8 * 60 * 60 * 1000)),
                isOvertime: false,
                subZone: ''
            });
        }
    }, [shiftToEdit, users, isOpen]);

    useEffect(() => {
        if (!Array.isArray(users)) return;
        const user = users.find(u => u.id === parseInt(formData.userId));
        if (user && user.branchId) {
            fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`)
                .then(res => res.json())
                .then(branches => {
                    if (!Array.isArray(branches)) return;
                    const branch = branches.find(b => b.id === user.branchId);
                    if (branch) {
                        setZones(branch.zones || []);
                        if (!formData.zoneId || !branch.zones?.find(z => z.id === parseInt(formData.zoneId))) {
                            setFormData(prev => ({ ...prev, zoneId: branch.zones?.[0]?.id || '' }));
                        }
                    }
                })
                .catch(err => {
                    console.error('Error fetching branches/zones:', err);
                    alert('Error de conexión al cargar zonas.');
                });
        }
    }, [formData.userId, users]);

    useEffect(() => {
        if (formData.zoneId && formData.userId && Array.isArray(zones) && Array.isArray(users)) {
            const selectedZone = zones.find(z => z.id === parseInt(formData.zoneId));
            const user = users.find(u => u.id === parseInt(formData.userId));
            
            if (selectedZone?.definitionId && user?.branchId) {
                // Usamos el rol y ID del administrador logueado para la petición, no del empleado objetivo
                const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
                fetch(`${API_URL}/subzones?definitionId=${selectedZone.definitionId}&branchId=${user.branchId}&userId=${loggedInUser.id}&role=${loggedInUser.role}`)
                    .then(res => res.json())
                    .then(data => setAvailableSubZones(Array.isArray(data) ? data : []))
                    .catch(err => {
                        console.error('Error fetching subzones:', err);
                        setAvailableSubZones([]);
                        alert('Error de conexión al cargar subzonas.');
                    });
            } else {
                setAvailableSubZones([]);
            }
        } else {
            setAvailableSubZones([]);
        }
    }, [formData.zoneId, formData.userId, zones, users]);

    useEffect(() => {
        if (isBulkMode || readOnly) {
            setWarning('');
            return;
        }
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const hours = (end - start) / (1000 * 60 * 60);

        if (hours > 8 && hours <= 16 && !formData.isOvertime && formData.type === 'WORK') {
            setWarning('Este turno supera las 8h estándar. ¿Son horas extra?');
        } else {
            setWarning('');
        }
    }, [formData.startDate, formData.endDate, formData.isOvertime, formData.type, isBulkMode, readOnly]);

    const handleChange = (e) => {
        if (readOnly) return;
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const toggleDay = (day) => {
        if (readOnly) return;
        setFormData(prev => {
            const days = prev.weekDays.includes(day)
                ? prev.weekDays.filter(d => d !== day)
                : [...prev.weekDays, day];
            return { ...prev, weekDays: days };
        });
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly || isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (isBulkMode) {
                // Generar lista de fechas
                const start = new Date(formData.bulkStart);
                const end = new Date(formData.bulkEnd);
                const dates = [];
                let current = new Date(start);

                while (current <= end) {
                    const day = current.getDay();
                    if (formData.weekDays.includes(day)) {
                        const dateStr = current.toISOString().split('T')[0];
                        let startISO, endISO;
                        
                        if (formData.type === 'VACATION') {
                            startISO = new Date(`${dateStr}T00:00:00`).toISOString();
                            endISO = new Date(`${dateStr}T23:59:59`).toISOString();
                        } else {
                            startISO = new Date(`${dateStr}T${formData.startTime}`).toISOString();
                            endISO = new Date(`${dateStr}T${formData.endTime}`).toISOString();
                        }
                        dates.push({ startDate: startISO, endDate: endISO });
                    }
                    current.setDate(current.getDate() + 1);
                }

                if (dates.length === 0) {
                    alert('Selecciona al menos un día de la semana dentro del rango.');
                    setIsSubmitting(false);
                    return;
                }

                await onSave({
                    userId: formData.userId,
                    zoneId: formData.zoneId,
                    type: formData.type,
                    subZone: formData.subZone,
                    dates
                });
            } else {
                let payload = { ...formData };
                if (payload.type === 'VACATION') {
                    payload.startDate = new Date((payload.startDate.includes('T') ? payload.startDate.split('T')[0] : payload.startDate) + 'T00:00').toISOString();
                    payload.endDate = new Date((payload.endDate.includes('T') ? payload.endDate.split('T')[0] : payload.endDate) + 'T23:59').toISOString();
                } else {
                    payload.startDate = new Date(payload.startDate).toISOString();
                    payload.endDate = new Date(payload.endDate).toISOString();
                }
                await onSave(payload);
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard: Esc closes modal
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const daysList = [
        { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
        { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 0, label: 'D' }
    ];


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
                <div className="bg-companyBlue dark:bg-blue-700 px-6 py-5 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-white font-bold text-xl">
                        {readOnly ? 'Consultar Turno' : (shiftToEdit ? 'Editar Turno' : isBulkMode ? 'Asignación Masiva' : 'Asignar Turno')}
                    </h3>
                    <button type="button" onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {!shiftToEdit && !readOnly && (
                    <div className="flex border-b dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => setIsBulkMode(false)}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center border-b-2 transition ${!isBulkMode ? 'border-companyBlue dark:border-blue-400 text-companyBlue dark:text-blue-200 bg-blue-50 dark:bg-blue-50/5' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <CalendarIcon size={18} className="mr-2" />
                            Individual
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsBulkMode(true)}
                            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center border-b-2 transition ${isBulkMode ? 'border-companyBlue dark:border-blue-400 text-companyBlue dark:text-blue-200 bg-blue-50 dark:bg-blue-50/5' : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <List size={18} className="mr-2" />
                            Masivo
                        </button>
                    </div>
                )}

                <form id="shift-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 dark:bg-gray-900">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Empleado</label>
                        <select
                            name="userId"
                            value={formData.userId}
                            onChange={handleChange}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            required
                            disabled={readOnly || isSubmitting}
                        >
                            {Array.isArray(users) && users
                                .filter(u => u.isActive || (shiftToEdit && u.id === shiftToEdit.userId))
                                .map(u => (
                                    <option key={u.id} value={u.id} className="dark:bg-gray-900">
                                        {u.employeeNumber} - {u.name} {!u.isActive ? '(Inactivo)' : ''}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none"
                                disabled={readOnly || isSubmitting}
                            >
                                <option value="WORK" className="dark:bg-gray-900">Trabajo</option>
                                <option value="MEDICAL" className="dark:bg-gray-900">Visita Médica</option>
                                <option value="SICK_LEAVE" className="dark:bg-gray-900">Baja Médica</option>
                                <option value="VACATION" className="dark:bg-gray-900">Vacaciones</option>
                                <option value="OFF" className="dark:bg-gray-900">Libranza</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Zona</label>
                            <select
                                name="zoneId"
                                value={formData.zoneId}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                required
                                disabled={readOnly || formData.type !== 'WORK' || isSubmitting}
                            >
                                {Array.isArray(zones) && zones.map(z => (
                                    <option key={z.id} value={z.id} className="dark:bg-gray-900">{z.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.type === 'WORK' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Labor/Subzona (Opcional)
                            </label>
                            <select
                                name="subZone"
                                value={formData.subZone}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                disabled={readOnly || !formData.zoneId || isSubmitting}
                            >
                                <option value="" className="dark:bg-gray-900">
                                    {Array.isArray(availableSubZones) && availableSubZones.length > 0 ? 'Selecciona labor...' : 'N/A o Escribe manualmente en notas...'}
                                </option>
                                {Array.isArray(availableSubZones) && availableSubZones.map(sz => (
                                    <option key={sz.id} value={sz.name} className="dark:bg-gray-900">{sz.name}</option>
                                ))}
                                {Array.isArray(availableSubZones) && availableSubZones.length === 0 && formData.subZone && (
                                    <option value={formData.subZone} className="dark:bg-gray-900">{formData.subZone}</option>
                                )}
                            </select>
                        </div>
                    )}

                    {!isBulkMode ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Inicio</label>
                                <input
                                    type={formData.type === 'VACATION' ? "date" : "datetime-local"}
                                    name="startDate"
                                    value={formData.type === 'VACATION' ? formData.startDate.split('T')[0] : (formData.startDate.includes('T') ? formData.startDate : `${formData.startDate}T00:00`)}
                                    onChange={handleChange}
                                    className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    required
                                    disabled={readOnly || isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Fin</label>
                                <input
                                    type={formData.type === 'VACATION' ? "date" : "datetime-local"}
                                    name="endDate"
                                    value={formData.type === 'VACATION' ? formData.endDate.split('T')[0] : (formData.endDate.includes('T') ? formData.endDate : `${formData.endDate}T23:59`)}
                                    onChange={handleChange}
                                    className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                    required
                                    disabled={readOnly || isSubmitting}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 pt-6 border-t dark:border-gray-800">
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Rango de Fechas</label>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <input
                                            type="date"
                                            name="bulkStart"
                                            value={formData.bulkStart}
                                            onChange={handleChange}
                                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 dark:text-gray-200"
                                            required
                                            disabled={readOnly || isSubmitting}
                                        />
                                        <span className="text-gray-400 font-bold hidden sm:inline">a</span>
                                        <input
                                            type="date"
                                            name="bulkEnd"
                                            value={formData.bulkEnd}
                                            onChange={handleChange}
                                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 dark:text-gray-200"
                                            required
                                            disabled={readOnly || isSubmitting}
                                        />
                                    </div>
                                </div>
                                {formData.type !== 'VACATION' && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Horario Diario</label>
                                        <div className="flex flex-col sm:flex-row items-center gap-3">
                                            <input
                                                type="time"
                                                name="startTime"
                                                value={formData.startTime}
                                                onChange={handleChange}
                                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 dark:text-gray-200"
                                                required
                                                disabled={readOnly || isSubmitting}
                                            />
                                            <span className="text-gray-400 font-bold hidden sm:inline">a</span>
                                            <input
                                                type="time"
                                                name="endTime"
                                                value={formData.endTime}
                                                onChange={handleChange}
                                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 dark:text-gray-200"
                                                required
                                                disabled={readOnly || isSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Días de la Semana</label>
                                <div className="flex justify-between bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    {daysList.map(day => (
                                        <button
                                            key={day.id}
                                            type="button"
                                            onClick={() => toggleDay(day.id)}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${formData.weekDays.includes(day.id) ? 'bg-companyBlue dark:bg-blue-50 text-white dark:shadow-soft-sm scale-110' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                                            disabled={readOnly || isSubmitting}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {warning && (
                        <div className="bg-yellow-50 dark:bg-slate-800/60 border-l-4 border-yellow-400 p-3 flex items-center rounded-r-xl">
                            <AlertTriangle className="text-yellow-400 mr-2" size={20} />
                            <p className="text-xs text-yellow-700 dark:text-yellow-200 font-bold uppercase tracking-tight">{warning}</p>
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 dark:border-blue-400 p-4 flex items-start space-x-3 rounded-r-xl">
                        <AlertTriangle className="text-blue-400 dark:text-blue-200 flex-shrink-0" size={20} />
                        <div className="text-sm text-blue-700 dark:text-blue-600">
                            <p className="font-bold underline mb-1">Información de Horas Extra:</p>
                            <ul className="list-disc ml-4 space-y-1 text-xs opacity-90">
                                <li><strong>Descanso:</strong> Mínimo 12h entre jornadas.</li>
                                <li><strong>Máximo:</strong> 12h totales por día (Normal + Extra).</li>
                                <li><strong>Fines de semana:</strong> 100% horas extra.</li>
                            </ul>
                        </div>
                    </div>

                </form>
                
                <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-x-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-6 py-2.5 min-w-[120px] text-sm font-bold rounded-xl transition-all ${readOnly ? 'w-full bg-companyBlue dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-950 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    >
                        {readOnly ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {readOnly && shiftToEdit && shiftToEdit.userId === JSON.parse(localStorage.getItem('user') || '{}').id && (
                        (() => {
                            const now = new Date();
                            const tomorrow = new Date(now);
                            tomorrow.setDate(now.getDate() + 1);
                            tomorrow.setHours(0, 0, 0, 0);
                            const isFuture = new Date(shiftToEdit.startDate) >= tomorrow;

                            return isFuture ? (
                                <button
                                    type="button"
                                    onClick={() => onSave({ ...shiftToEdit, isSwapProposal: true })}
                                    className="w-full flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-xl shadow-lg transition-all active:scale-95"
                                >
                                    <ArrowRightLeft size={18} className="mr-2" />
                                    Proponer Intercambio
                                </button>
                            ) : null;
                        })()
                    )}
                    {!readOnly && (
                        <button
                            type="submit"
                            form="shift-form"
                            disabled={isSubmitting}
                            className={`flex items-center justify-center px-6 py-2.5 min-w-[120px] text-sm font-bold text-white bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-xl shadow-lg dark:shadow-soft-sm transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} className="mr-2" />
                            {isSubmitting ? 'Guardando...' : (shiftToEdit ? 'Actualizar' : isBulkMode ? 'Crear Múltiples' : 'Guardar')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShiftFormModal;
