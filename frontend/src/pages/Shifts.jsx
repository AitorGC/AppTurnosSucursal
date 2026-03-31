import React, { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Clock, Trash2 } from 'lucide-react';
import ShiftFormModal from '../components/ShiftFormModal';
import ZoneSummaryModal from '../components/ZoneSummaryModal';
import SwapSelectorModal from '../components/SwapSelectorModal';
import API_URL from '../apiConfig';
import { getShiftColors } from '../utils/colors';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const QuickZoneView = ({ shifts, zones }) => {
    const now = new Date();
    // Only WORK shifts
    const workShifts = shifts.filter(s => s.type === 'WORK');

    const hasAnyActiveOrUpcoming = zones.some(zone => {
        const zoneShifts = workShifts.filter(s => s.zone.id === zone.id);
        const active = zoneShifts.filter(s => { const start = new Date(s.startDate); const end = new Date(s.endDate); return now >= start && now <= end; });
        const upcoming = zoneShifts.filter(s => { const start = new Date(s.startDate); return start > now && start.getDate() === now.getDate() && start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear(); });
        return active.length > 0 || upcoming.length > 0;
    });

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-950">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.map(zone => {
                    const zoneShifts = workShifts.filter(s => s.zone.id === zone.id);
                    if (zoneShifts.length === 0) return null;

                    const activeShifts = zoneShifts.filter(s => {
                        const start = new Date(s.startDate);
                        const end = new Date(s.endDate);
                        return now >= start && now <= end;
                    });

                    const upcomingShifts = zoneShifts.filter(s => {
                        const start = new Date(s.startDate);
                        return start > now && start.getDate() === now.getDate() && start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
                    });

                    if (activeShifts.length === 0 && upcomingShifts.length === 0) return null;

                    const colors = getShiftColors(zone.name, false, 'WORK');

                    return (
                        <div key={zone.id} className={`rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${colors.border} bg-white dark:bg-gray-900 group`}>
                            <div className={`px-4 py-3 border-b border-current/10 ${colors.bg}`}>
                                <h3 className={`font-bold text-lg ${colors.text}`}>{zone.name}</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                                        Activos Ahora ({activeShifts.length})
                                    </h4>
                                    {activeShifts.length > 0 ? (
                                        <ul className="space-y-2">
                                            {activeShifts.map(shift => (
                                                <li key={shift.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{shift.user.name}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                                        {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-400 dark:text-gray-500 italic px-2">Nadie activo en este momento</p>
                                    )}
                                </div>
                                {upcomingShifts.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                            Entran Más Tarde ({upcomingShifts.length})
                                        </h4>
                                        <ul className="space-y-2">
                                            {upcomingShifts.map(shift => (
                                                <li key={shift.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{shift.user.name}</span>
                                                    <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                                        {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {!hasAnyActiveOrUpcoming && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No hay turnos activos ni próximos para hoy en estas zonas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Legend = () => {
    const items = [
        { label: 'Almacén', color: 'bg-zone-warehouse' },
        { label: 'Mostrador', color: 'bg-zone-counter' },
        { label: 'Oficina', color: 'bg-zone-office' },
        { label: 'Neumáticos', color: 'bg-zone-tire' },
        { label: 'Reparto', color: 'bg-zone-logistics' },
        { label: 'Call Center', color: 'bg-zone-call' },
        { label: 'Comercial', color: 'bg-zone-sales' },
        { label: 'Extra', color: 'bg-status-overtime' },
        { label: 'Médico', color: 'bg-status-medical' },
        { label: 'Vacaciones', color: 'bg-status-off' },
    ];

    return (
        <div className="flex flex-wrap gap-3 mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {items.map(item => (
                <div key={item.label} className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

const Shifts = () => {
    const { hasPermission, hasAnyPermission, user } = usePermissions();
    
    const isAdmin = user.role === 'admin'; // Still useful for some broad filtering logic
    const isResponsable = user.role === 'responsable';
    const isEmployee = !hasPermission(PERMISSIONS.SHIFTS_CREATE);

    const [shifts, setShifts] = useState([]);
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [zones, setZones] = useState([]);

    // Inicializar filtros según rol
    const [selectedBranchId, setSelectedBranchId] = useState(isAdmin ? '' : (user.branchId?.toString() || ''));
    // El empleado ve todas las zonas de su sucursal por defecto
    const [selectedZoneId, setSelectedZoneId] = useState('');

    const [viewType, setViewType] = useState('week'); // 'day', '3days', 'week', 'month'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shiftToEdit, setShiftToEdit] = useState(null);

    // Estado para el modal de resumen por zona
    const [zoneModalOpen, setZoneModalOpen] = useState(false);
    const [selectedZoneShifts, setSelectedZoneShifts] = useState([]);
    const [selectedZoneName, setSelectedZoneName] = useState('');
    const [selectedZoneDate, setSelectedZoneDate] = useState(null);

    // Estado para el intercambio
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [ownShiftForSwap, setOwnShiftForSwap] = useState(null);

    // Estado para carga en borrado
    const [isDeletingId, setIsDeletingId] = useState(null);

    // Color system handled by getShiftColors utility

    const fetchShifts = async () => {
        let start = new Date(currentDate);
        let end = new Date(currentDate);

        if (viewType === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - (day === 0 ? 6 : day - 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 7);
        } else if (viewType === 'day' || viewType === 'quick') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (viewType === '3days') {
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 2);
            end.setHours(23, 59, 59, 999);
        } else if (viewType === 'month') {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        try {
            let url = `${API_URL}/shifts?start=${start.toISOString()}&end=${end.toISOString()}&userId=${user.id}`;
            const branchQuery = selectedBranchId || (!isAdmin ? user.branchId : '');
            if (branchQuery) url += `&branchId=${branchQuery}`;
            if (selectedZoneId) url += `&zoneId=${selectedZoneId}`;

            const res = await fetch(url);
            const data = await res.json();
            setShifts(data);
        } catch (e) { 
            console.error('Error fetching shifts:', e);
            alert('Error de conexión con el servidor al cargar turnos. Por favor, revisa tu red e inténtalo de nuevo.');
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setBranches(data);
        } catch (e) { 
            console.error('Error fetching branches:', e);
            alert('Error de conexión con el servidor al cargar sucursales.');
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users?userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) { 
            console.error('Error fetching users:', e); 
            setUsers([]);
            alert('Error de conexión con el servidor al cargar usuarios.');
        }
    };

    // Carga inicial y datos estáticos
    useEffect(() => {
        fetchBranches();
        fetchUsers();
    }, []);

    // Carga de turnos según navegación
    useEffect(() => {
        fetchShifts();
    }, [currentDate, viewType, selectedBranchId, selectedZoneId]);

    // Gestión del selector de zonas basándose en la sucursal seleccionada
    useEffect(() => {
        if (selectedBranchId || (!isAdmin && user.branchId)) {
            const bId = parseInt(selectedBranchId) || user.branchId;
            const branch = branches.find(b => b.id === bId);
            setZones(branch ? branch.zones : []);
        } else {
            setZones([]);
        }
    }, [selectedBranchId, branches, isAdmin, user.branchId]);

    const handleSave = async (formData) => {
        if (formData.isSwapProposal) {
            setOwnShiftForSwap(formData);
            setIsModalOpen(false);
            setIsSwapModalOpen(true);
            return;
        }

        const url = shiftToEdit ? `${API_URL}/shifts/${shiftToEdit.id}` : `${API_URL}/shifts`;
        const method = shiftToEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchShifts();
            } else {
                const error = await res.json();
                alert(error.message);
            }
        } catch (e) { 
            console.error(e);
            alert('Error de conexión al guardar el turno. Revisa tu red.');
        }
    };

    const handleProposeSwap = async (peerShift) => {
        try {
            const res = await fetch(`${API_URL}/swaps/propose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    peerId: peerShift.userId,
                    shiftAId: ownShiftForSwap.id,
                    shiftBId: peerShift.id
                })
            });

            if (res.ok) {
                alert('Propuesta de intercambio enviada con éxito');
                setIsSwapModalOpen(false);
                fetchShifts();
            } else {
                const error = await res.json();
                alert(error.message);
            }
        } catch (e) {
            console.error('Error proposing swap:', e);
            alert('Error al enviar la propuesta');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar este turno?')) {
            setIsDeletingId(id);
            try {
                // Pasar el rol para la validación de 48h (legacy logic, but keeping for compatibility)
                const res = await fetch(`${API_URL}/shifts/${id}?role=${user.role}`, { method: 'DELETE' });
                if (res.ok) {
                    await fetchShifts();
                } else {
                    const error = await res.json();
                    alert(error.message);
                }
            } catch (e) {
                console.error('Error deleting shift:', e);
                alert('Error de conexión al intentar eliminar el turno.');
            } finally {
                setIsDeletingId(null);
            }
        }
    };

    const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const getVisibleDates = () => {
        const dates = [];
        let start = new Date(currentDate);

        if (viewType === 'week') {
            start.setDate(start.getDate() - (start.getDay() === 0 ? 6 : start.getDay() - 1));
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                dates.push(d);
            }
        } else if (viewType === 'day' || viewType === 'quick') {
            dates.push(new Date(currentDate));
        } else if (viewType === '3days') {
            for (let i = 0; i < 3; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                dates.push(d);
            }
        } else if (viewType === 'month') {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startOffset);

            for (let i = 0; i < 42; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                dates.push(d);
            }
        }
        return dates;
    };

    const visibleDates = getVisibleDates();

    const canDeleteShift = (shift) => {
        if (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE)) return true; // Full Admin
        if (!hasPermission(PERMISSIONS.SHIFTS_DELETE)) return false;

        const now = new Date();
        const shiftDate = new Date(shift.startDate);
        const diff = (now - shiftDate) / (1000 * 60 * 60);
        return diff <= 48;
    };

    const getTypeStyles = (type, isOvertime) => {
        switch (type) {
            case 'MEDICAL': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-slate-800/60 dark:text-purple-200 dark:border-slate-600';
            case 'SICK_LEAVE': return 'bg-red-100 text-red-700 border-red-300 dark:bg-slate-800/60 dark:text-red-300 dark:border-slate-600 dark:shadow-soft-sm';
            case 'VACATION': return 'bg-green-100 text-green-700 border-green-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600 dark:shadow-soft-sm';
            case 'OFF': return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
            default: return isOvertime
                ? 'bg-blue-50 text-companyBlue border-yellow-400 border-2 dark:bg-blue-900/20 dark:text-blue-200 dark:border-yellow-400/50 shadow-sm'
                : 'bg-blue-50 text-companyBlue border-blue-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800';
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Calendario de Turnos</h2>
                    {(hasAnyPermission([PERMISSIONS.SHIFTS_VIEW, PERMISSIONS.SHIFTS_CREATE])) && (
                        <div className="flex gap-4 mt-2">
                            {(hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) || (hasPermission(PERMISSIONS.SHIFTS_CREATE) && branches.length > 1)) && (
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => {
                                        setSelectedBranchId(e.target.value);
                                        setSelectedZoneId('');
                                    }}
                                    className="text-sm border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-800 dark:text-gray-100 shadow-sm outline-none transition-all"
                                >
                                    <option value="">{hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? 'Todas las Sucursales' : 'Mi Sucursal (Base)'}</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            )}

                            {(hasPermission(PERMISSIONS.SHIFTS_CREATE) && branches.length <= 1) && (
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 py-1 bg-gray-50 dark:bg-gray-800/50 px-3 rounded-md border border-gray-200 dark:border-gray-700">
                                    Sucursal: {user.branch?.name || 'Cargando...'}
                                </div>
                            )}

                            {isEmployee && (
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 py-1 bg-gray-50 dark:bg-gray-800/50 px-3 rounded-md border border-gray-200 dark:border-gray-700">
                                    Sucursal: {user.branch?.name || 'Cargando...'}
                                </div>
                            )}

                            <select
                                value={selectedZoneId}
                                onChange={(e) => setSelectedZoneId(e.target.value)}
                                className="text-sm border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-slate-800 dark:text-gray-100 shadow-sm outline-none transition-all"
                                disabled={hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) && !selectedBranchId}
                            >
                                <option value="">Todas las Zonas</option>
                                {zones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Selector de Vista */}
                    <div className="flex bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-1">
                        {[
                            { id: 'quick', label: 'Vista Rápida' },
                            { id: 'day', label: 'Día' },
                            { id: '3days', label: '3 Días' },
                            { id: 'week', label: 'Semana' },
                            { id: 'month', label: 'Mes' }
                        ].map(view => (
                            <button
                                key={view.id}
                                onClick={() => {
                                    setViewType(view.id);
                                    if (view.id === 'quick') setCurrentDate(new Date());
                                }}
                                className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewType === view.id ? 'bg-companyBlue dark:bg-blue-700 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                {view.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-1">
                        <button
                            onClick={() => {
                                if (viewType === 'quick') return;
                                const d = new Date(currentDate);
                                if (viewType === 'week') d.setDate(d.getDate() - 7);
                                else if (viewType === 'day') d.setDate(d.getDate() - 1);
                                else if (viewType === '3days') d.setDate(d.getDate() - 3);
                                else if (viewType === 'month') d.setMonth(d.getMonth() - 1);
                                setCurrentDate(d);
                            }}
                            disabled={viewType === 'quick'}
                            className={`p-1 rounded ${viewType === 'quick' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 py-1 text-sm font-medium min-w-[140px] text-center dark:text-gray-200">
                            {viewType === 'month'
                                ? currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
                                : viewType === 'week'
                                    ? `Semana del ${visibleDates[0].toLocaleDateString()}`
                                    : viewType === 'quick'
                                        ? `Hoy (${visibleDates[0].toLocaleDateString()})`
                                        : visibleDates[0].toLocaleDateString()
                            }
                        </span>
                        <button
                            onClick={() => {
                                if (viewType === 'quick') return;
                                const d = new Date(currentDate);
                                if (viewType === 'week') d.setDate(d.getDate() + 7);
                                else if (viewType === 'day') d.setDate(d.getDate() + 1);
                                else if (viewType === '3days') d.setDate(d.getDate() + 3);
                                else if (viewType === 'month') d.setMonth(d.getMonth() + 1);
                                setCurrentDate(d);
                            }}
                            disabled={viewType === 'quick'}
                            className={`p-1 rounded ${viewType === 'quick' ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    {hasPermission(PERMISSIONS.SHIFTS_CREATE) && (
                        <button
                            onClick={() => { setShiftToEdit(null); setIsModalOpen(true); }}
                            className="flex items-center px-4 py-2 bg-companyBlue dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-sm dark:shadow-soft-sm font-medium"
                        >
                            <Plus size={20} className="mr-2" />
                            Asignar Turno
                        </button>
                    )}
                </div>
            </div>

            {/* Contenedor del Calendario */}
            <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col ${viewType === 'month' ? '' : 'h-[calc(100vh-220px)] min-h-[500px]'}`}>
                {viewType === 'quick' ? (
                    <QuickZoneView shifts={shifts} zones={zones} />
                ) : viewType === 'month' ? (
                    // VISTA MENSUAL
                    <div className="flex flex-col h-full">
                        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                            {daysOfWeek.map(day => (
                                <div key={day} className="py-2 text-center text-xs font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-800 last:border-0">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-white dark:bg-slate-950">
                            {visibleDates.map((date, idx) => {
                                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                                const dayShifts = shifts.filter(s => new Date(s.startDate).toDateString() === date.toDateString());

                                return (
                                    <div key={idx} className={`min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-800 last:border-r-0 ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : 'dark:bg-slate-950'}`}>
                                        <div className={`text-right text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {date.getDate()}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {(() => {
                                                // Agrupar por zona (Trabajo) y tipo (Ausencias)
                                                const groups = dayShifts.reduce((acc, shift) => {
                                                    if (shift.type === 'WORK') {
                                                        const zId = shift.zone.id;
                                                        if (!acc.zones[zId]) acc.zones[zId] = { name: shift.zone.name, shifts: [], userIds: new Set() };
                                                        acc.zones[zId].shifts.push(shift);
                                                        acc.zones[zId].userIds.add(shift.userId);
                                                    } else {
                                                        const type = shift.type;
                                                        if (!acc.status[type]) acc.status[type] = { shifts: [], userIds: new Set() };
                                                        acc.status[type].shifts.push(shift);
                                                        acc.status[type].userIds.add(shift.userId);
                                                    }
                                                    return acc;
                                                }, { zones: {}, status: {} });

                                                const statusLabels = {
                                                    'VACATION': 'Vacaciones',
                                                    'MEDICAL': 'V. Médica',
                                                    'SICK_LEAVE': 'Baja Médica',
                                                    'OFF': 'Libre'
                                                };
                                                const statusColors = {
                                                    'VACATION': 'text-green-600 border-green-200 dark:text-slate-300 dark:border-slate-600',
                                                    'MEDICAL': 'text-purple-600 border-purple-200 dark:text-purple-200 dark:border-slate-600',
                                                    'SICK_LEAVE': 'text-red-600 border-red-200 dark:text-red-300 dark:border-slate-600',
                                                    'OFF': 'text-gray-600 border-gray-200 dark:text-gray-400 dark:border-gray-700'
                                                };

                                                return (
                                                    <>
                                                        {/* Renderizar Zonas de Trabajo */}
                                                        {Object.entries(groups.zones).map(([zId, group]) => {
                                                            const colorProps = getShiftColors(group.name, false, 'WORK');
                                                            return (
                                                                <div
                                                                    key={`zone-${zId}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedZoneShifts(group.shifts);
                                                                        setSelectedZoneName(group.name);
                                                                        setSelectedZoneDate(date);
                                                                        setZoneModalOpen(true);
                                                                    }}
                                                                    className={`flex items-center justify-between px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-sm border ${colorProps.border} ${colorProps.text} border-current/20 bg-white dark:bg-gray-800`}
                                                                >
                                                                    <span className="truncate">{group.name}</span>
                                                                    <span className="ml-1 bg-current/10 px-1 rounded-sm">{group.userIds.size}</span>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Renderizar Estados de Ausencia */}
                                                        {Object.entries(groups.status).map(([type, group]) => (
                                                            <div
                                                                key={`status-${type}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedZoneShifts(group.shifts);
                                                                    setSelectedZoneName(statusLabels[type] || type);
                                                                    setSelectedZoneDate(date);
                                                                    setZoneModalOpen(true);
                                                                }}
                                                                className={`flex items-center justify-between px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-sm border ${statusColors[type] || 'text-gray-400 border-gray-200 dark:text-gray-500 dark:border-gray-800'} border-current/20 bg-white dark:bg-gray-800`}
                                                            >
                                                                <span className="truncate">{statusLabels[type] || type}</span>
                                                                <span className="ml-1 bg-current/10 px-1 rounded-sm">{group.userIds.size}</span>
                                                            </div>
                                                        ))}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    // VISTA DE TARJETAS APILADAS (Día, 3 Días, Semana)
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Cabecera de Días */}
                        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20 overflow-x-hidden">
                            <div className={`grid flex-1 ${viewType === 'day' ? 'grid-cols-1' : viewType === '3days' ? 'grid-cols-3' : 'grid-cols-7'}`}>
                                {visibleDates.map((date, idx) => (
                                    <div key={idx} className="py-3 text-center border-r border-gray-200 dark:border-gray-800 last:border-0">
                                        <span className="block text-[10px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                                            {daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                                        </span>
                                        <span className={`inline-block w-8 h-8 leading-8 rounded-full text-lg font-bold mt-1 ${date.toDateString() === new Date().toDateString() ? 'bg-companyBlue dark:bg-blue-700 text-white shadow-sm dark:shadow-soft-sm' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {date.getDate()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cuerpo con Scroll */}
                        <div className="flex-1 overflow-auto relative bg-gray-50 dark:bg-slate-950">
                            <div className={`grid h-full ${viewType === 'day' ? 'grid-cols-1' : viewType === '3days' ? 'grid-cols-3' : 'grid-cols-7'}`}>
                                {visibleDates.map((date, colIdx) => {
                                    const dayShifts = shifts.filter(s => new Date(s.startDate).toDateString() === date.toDateString());

                                    return (
                                        <div key={colIdx} className="relative h-full border-r border-gray-200 dark:border-gray-800 last:border-0 min-w-[150px] p-2 space-y-2">
                                            {dayShifts.map(shift => {
                                                const colors = getShiftColors(shift.zone.name, shift.isOvertime, shift.type);
                                                return (
                                                    <div
                                                        key={shift.id}
                                                        onClick={() => { setShiftToEdit(shift); setIsModalOpen(true); }}
                                                        className={`relative p-3 rounded-xl border-l-4 transition-all group shadow-sm flex flex-col space-y-2 ${colors.border} ${colors.bg} cursor-pointer hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-neon-cyan/10`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-tight">
                                                                {shift.user.name}
                                                            </p>
                                                            {canDeleteShift(shift) && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(shift.id); }}
                                                                    disabled={isDeletingId === shift.id}
                                                                    className={`p-1 rounded transition-all ${isDeletingId === shift.id ? 'text-gray-400 cursor-not-allowed' : 'opacity-100 md:opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                                                >
                                                                    {isDeletingId === shift.id ? (
                                                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                                    ) : (
                                                                        <Trash2 size={14} />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center text-xs font-semibold py-1 px-2 bg-white/50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-200 rounded inline-flex w-fit">
                                                            <Clock size={12} className="mr-1.5 opacity-70" />
                                                            {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1 border-t border-black/5 dark:border-white/5">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                                                                {shift.zone.name}
                                                            </span>
                                                            {shift.subZone && (
                                                                <span className={`text-[10px] tracking-wider font-bold uppercase font-black uppercase px-2 py-0.5 rounded-full ${colors.badgeBg} ${colors.badgeText}`}>
                                                                    {shift.subZone}
                                                                </span>
                                                            )}
                                                            {shift.isOvertime && shift.type === 'WORK' && (
                                                                <span className="flex items-center px-1.5 py-0.5 bg-status-overtime/20 text-status-overtime rounded text-[10px] tracking-wider font-bold uppercase font-bold uppercase">
                                                                    EXTRA
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Hover Tooltip */}
                                                        <div className="shift-tooltip absolute z-30 bottom-full left-0 mb-2 w-52 bg-gray-900 dark:bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-3 border border-gray-700 dark:border-gray-600 pointer-events-none">
                                                            <p className="font-bold text-sm mb-1 text-white">{shift.user.name}</p>
                                                            <p className="text-gray-300 mb-1">
                                                                <span className="text-gray-400">Zona: </span>{shift.zone.name}
                                                            </p>
                                                            {shift.subZone && (
                                                                <p className="text-gray-300 mb-1">
                                                                    <span className="text-gray-400">Labor: </span>{shift.subZone}
                                                                </p>
                                                            )}
                                                            <p className="text-gray-300 mb-1">
                                                                <span className="text-gray-400">Horario: </span>
                                                                {new Date(shift.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(shift.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                            {shift.isOvertime && (
                                                                <p className="text-yellow-400 font-bold text-[10px] uppercase">⚡ Horas Extra</p>
                                                            )}
                                                            {shift.type !== 'WORK' && (
                                                                <p className="text-purple-300 font-bold text-[10px] uppercase">{shift.type}</p>
                                                            )}
                                                            {/* Arrow */}
                                                            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 dark:bg-slate-900 rotate-45 border-r border-b border-gray-700 dark:border-gray-600" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {dayShifts.length === 0 && (
                                                <div className="flex items-center justify-center p-8 opacity-25 dark:opacity-60">
                                                    <p className="text-xs italic dark:text-gray-400">Sin turnos</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                <Legend />
            </div>

            <ShiftFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                users={isAdmin ? users : users.filter(u => u.branchId === user.branchId)}
                shiftToEdit={shiftToEdit}
                readOnly={isEmployee}
            />

            <ZoneSummaryModal
                isOpen={zoneModalOpen}
                onClose={() => setZoneModalOpen(false)}
                zoneName={selectedZoneName}
                date={selectedZoneDate}
                shifts={selectedZoneShifts}
                onEditShift={(shift) => {
                    setZoneModalOpen(false);
                    setShiftToEdit(shift);
                    setIsModalOpen(true);
                }}
                onDeleteShift={(id) => {
                    handleDelete(id);
                    // No cerramos el modal si quedan turnos, pero necesitamos refrescar
                    const updated = selectedZoneShifts.filter(s => s.id !== id);
                    if (updated.length === 0) setZoneModalOpen(false);
                    else setSelectedZoneShifts(updated);
                }}
                readOnly={isEmployee}
            />

            <SwapSelectorModal
                isOpen={isSwapModalOpen}
                onClose={() => setIsSwapModalOpen(false)}
                onPropose={handleProposeSwap}
                ownShift={ownShiftForSwap}
                userZoneId={user.zoneId}
                userBranchId={user.branchId}
                currentUserId={user.id}
            />
        </div>
    );
};

export default Shifts;
