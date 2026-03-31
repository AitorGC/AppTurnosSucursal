import React, { useState, useEffect } from 'react';
import { Umbrella, Users, Calendar, Search, AlertCircle, ChevronDown, Clock, CheckCircle2, Info } from 'lucide-react';
import VacationAdjustmentsTab from '../components/VacationAdjustmentsTab';
import API_URL from '../apiConfig';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const Vacaciones = () => {
    const { hasPermission, user } = usePermissions();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [data, setData] = useState({ ranking: [], currentAbsences: [] });
    const [weeklyData, setWeeklyData] = useState({ weekStart: '', weekEnd: '', absences: {} });
    const [personalStats, setPersonalStats] = useState(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingWeekly, setLoadingWeekly] = useState(true);
    const [loadingPersonal, setLoadingPersonal] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

    useEffect(() => {
        fetchBranches();
        fetchVacations();
        fetchWeeklyAbsences();
        fetchPersonalStats();
    }, [year, selectedBranchId]);

    useEffect(() => {
        fetchWeeklyAbsences();
    }, [weekOffset]);

    const fetchPersonalStats = async () => {
        setLoadingPersonal(true);
        try {
            const res = await fetch(`${API_URL}/dashboard/stats?userId=${user.id}&year=${year}`);
            if (res.ok) {
                const result = await res.json();
                setPersonalStats(result.personal);
            }
        } catch (error) {
            console.error('Error fetching personal stats:', error);
        } finally {
            setLoadingPersonal(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setBranches(data);
        } catch (e) { console.error('Error fetching branches:', e); }
    };

    const fetchVacations = async () => {
        setLoading(true);
        try {
            const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
            const query = bId ? `&branchId=${bId}` : '';
            const res = await fetch(`${API_URL}/stats/vacations?year=${year}${query}&userId=${user.id}&role=${user.role}`);
            const result = await res.json();
            setData(result || { ranking: [], currentAbsences: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWeeklyAbsences = async () => {
        setLoadingWeekly(true);
        try {
            const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
            const query = bId ? `&branchId=${bId}` : '';
            const res = await fetch(`${API_URL}/stats/vacations/weekly?weekOffset=${weekOffset}${query}&userId=${user.id}&role=${user.role}`);
            const result = await res.json();
            setWeeklyData(result || { weekStart: '', weekEnd: '', absences: {} });
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingWeekly(false);
        }
    };

    const filteredRanking = (Array.isArray(data?.ranking) ? data.ranking : []).filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.employeeNumber.toString().includes(search)
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#001D3D] dark:text-white tracking-tight flex items-center">
                        <Umbrella className="mr-3 text-green-500 dark:text-slate-300 " size={32} />
                        Gestión de Vacaciones
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Control de saldos anuales y disponibilidad de plantilla.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                        {(hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) || (hasPermission(PERMISSIONS.STATS_VIEW_BRANCH) && branches.length > 1)) && (
                            <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800">
                                <Users size={18} className="text-companyBlue dark:text-blue-200 mr-2" />
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none appearance-none pr-6"
                                >
                                    <option value="">{hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? 'Todas las Sucursales' : 'Mi Sucursal (Base)'}</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="text-gray-400 -ml-4 pointer-events-none" />
                            </div>
                        )}
                    
                    <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800">
                        <Calendar size={18} className="text-companyBlue dark:text-blue-200 mr-2" />
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none appearance-none pr-6"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="dark:bg-gray-900">{y}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-gray-400 -ml-4 pointer-events-none" />
                    </div>
                </div>
            </div>

            {hasPermission(PERMISSIONS.STATS_VIEW_BRANCH) && (
                <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`text-lg font-black uppercase tracking-tighter transition-all ${activeTab === 'overview' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 pb-1'}`}
                    >
                        Resumen General
                    </button>
                    <button
                        onClick={() => setActiveTab('employees')}
                        className={`text-lg font-black uppercase tracking-tighter transition-all ${activeTab === 'employees' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 pb-1'}`}
                    >
                        Empleados
                    </button>
                    <button
                        onClick={() => setActiveTab('adjustments')}
                        className={`text-lg font-black uppercase tracking-tighter transition-all ${activeTab === 'adjustments' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 pb-1'}`}
                    >
                        Ajustes Vacaciones
                    </button>
                </div>
            )}

            {activeTab === 'overview' ? (
                <>
                    {/* Mi Desglose Anual (Para todos) */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
                        <h3 className="font-bold text-lg text-[#001D3D] dark:text-gray-100 mb-6 flex items-center">
                            <Umbrella className="mr-2 text-companyBlue dark:text-blue-400" size={24} /> Mi Desglose ({year})
                        </h3>
                        {loadingPersonal ? (
                            <div className="text-center py-8">
                                <div className="text-gray-400 text-sm animate-pulse">Cargando tu desglose...</div>
                            </div>
                        ) : personalStats ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-5 bg-gray-50/50 dark:bg-slate-950/50 rounded-2xl border border-gray-200 dark:border-gray-800 transition hover:bg-gray-50 dark:hover:bg-slate-950">
                                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Días Convenio</p>
                                    <p className="text-2xl font-black text-gray-800 dark:text-gray-200">22</p>
                                </div>
                                <div className="p-5 bg-[#EFF6FF]/60 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20 group relative transition hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <p className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                                        Extra / Ajustes
                                        {personalStats.adjustmentDetails?.length > 0 && <Info size={14} className="text-blue-400 cursor-help" />}
                                    </p>
                                    <p className={`text-2xl font-black ${personalStats.adjustmentDays >= 0 ? 'text-companyBlue dark:text-blue-300' : 'text-red-500 dark:text-red-400'}`}>
                                        {personalStats.adjustmentDays > 0 ? '+' : ''}{personalStats.adjustmentDays}
                                    </p>

                                    {/* Tooltip */}
                                    {personalStats.adjustmentDetails?.length > 0 && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-4 bg-[#001D3D] dark:bg-slate-800 text-gray-200 text-xs rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none border border-slate-700">
                                            <div className="flex items-center gap-2 font-bold mb-3 text-white border-b border-gray-700 pb-2">
                                                <Clock size={14} className="text-blue-400" />
                                                <span>Historial de Ajustes en {year}</span>
                                            </div>
                                            <ul className="space-y-2">
                                                {personalStats.adjustmentDetails.map((adj, idx) => (
                                                    <li key={idx} className="flex flex-col gap-1 border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-medium text-gray-300 line-clamp-2 pr-4">{adj.reason}</span>
                                                            <span className={`font-black shrink-0 px-2 py-0.5 rounded-md ${adj.days > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {adj.days > 0 ? '+' : ''}{adj.days}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] tracking-wider font-bold uppercase text-gray-500 font-bold uppercase tracking-widest">{new Date(adj.date).toLocaleDateString()}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 bg-[#F0FDF4]/60 dark:bg-slate-800/40 rounded-2xl border border-green-100/50 dark:border-slate-600/30 transition hover:bg-green-50 dark:hover:bg-slate-800/60">
                                    <p className="text-xs font-black text-green-600 dark:text-slate-400 uppercase tracking-widest mb-1">Días Consumidos</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-2xl font-black text-green-700 dark:text-slate-200">{personalStats.vacationsConsumed}</p>
                                        <span className="text-xs font-bold text-green-600/60 dark:text-slate-500">laborales</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-gradient-to-br from-companyBlue to-blue-800 dark:from-blue-600 dark:to-blue-900 text-white rounded-2xl shadow-xl shadow-blue-500/20 dark:shadow-blue-900/20 border border-blue-600/50 dark:border-blue-500/30 transform transition hover:-translate-y-1">
                                    <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-1 opacity-90">Saldo Restante</p>
                                    <p className="text-4xl font-black text-white">{personalStats.vacationsRemaining}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm">No se pudieron cargar tus datos.</div>
                        )}
                    </div>

                    {/* Current Vacations Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-[#F0FDF4]/50 dark:bg-slate-800/60 flex items-center space-x-3">
                            <div className="p-2 bg-green-100 dark:bg-slate-800/60 rounded-lg text-green-600 dark:text-slate-300">
                                <Users size={20} />
                            </div>
                            <h3 className="font-bold text-lg text-[#001D3D] dark:text-gray-100">Ausencias Hoy</h3>
                        </div>
                        <div className="p-6">
                            {data.currentAbsences && data.currentAbsences.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {data.currentAbsences.map(emp => {
                                        const styles = {
                                            VACATION: {
                                                bg: 'bg-green-50 border-green-100 dark:bg-slate-800/60 dark:border-slate-600',
                                                text: 'text-green-600 dark:text-slate-300',
                                                dot: 'bg-green-600 dark:bg-slate-800',
                                                label: 'Vacaciones'
                                            },
                                            OFF: {
                                                bg: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-700/40',
                                                text: 'text-blue-600 dark:text-blue-200',
                                                dot: 'bg-blue-600 dark:bg-blue-50',
                                                label: 'Día libre'
                                            },
                                            MEDICAL: {
                                                bg: 'bg-purple-50 border-purple-100 dark:bg-slate-800/60 dark:border-slate-600',
                                                text: 'text-purple-600 dark:text-purple-200',
                                                dot: 'bg-purple-600 dark:bg-slate-700',
                                                label: 'Visita Médica'
                                            },
                                            SICK_LEAVE: {
                                                bg: 'bg-red-50 border-red-100 dark:bg-slate-800/60 dark:border-slate-600',
                                                text: 'text-red-600 dark:text-red-300',
                                                dot: 'bg-red-600 dark:bg-red-400',
                                                label: 'Baja Médica'
                                            }
                                        };

                                        const style = styles[emp.type] || styles.OFF;

                                        // Formatear horario para MEDICAL
                                        let schedule = '';
                                        if (emp.type === 'MEDICAL' && emp.startDate && emp.endDate) {
                                            const start = new Date(emp.startDate);
                                            const end = new Date(emp.endDate);
                                            const startTime = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                            const endTime = end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                            schedule = `${startTime} - ${endTime}`;
                                        }

                                        return (
                                            <div
                                                key={emp.id}
                                                className={`flex items-center p-4 rounded-xl border transition-all hover:scale-[1.02] ${style.bg}`}
                                            >
                                                <div className={`w-10 h-10 bg-white dark:bg-slate-950 border border-current/10 rounded-full flex items-center justify-center font-bold shadow-sm mr-3 ${style.text}`}>
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{emp.name}</p>
                                                    <p className={`text-xs font-medium ${style.text}`}>
                                                        {style.label}
                                                    </p>
                                                    {schedule && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-medium">
                                                            {schedule}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Umbrella className="mx-auto text-gray-200 mb-2" size={40} />
                                    <p className="text-gray-400 italic text-sm">No hay empleados de vacaciones en el día de hoy.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weekly Absences Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-[#EFF6FF]/50 dark:bg-blue-900/30 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-200">
                                    <Calendar size={20} />
                                </div>
                                <h3 className="font-bold text-lg text-[#001D3D] dark:text-gray-100">Ausencias de la Semana</h3>
                            </div>
                            <select
                                value={weekOffset}
                                onChange={(e) => setWeekOffset(parseInt(e.target.value))}
                                className="px-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value={0} className="dark:bg-gray-900">Esta semana</option>
                                <option value={1} className="dark:bg-gray-900">Próxima semana</option>
                            </select>
                        </div>
                        <div className="p-6">
                            {loadingWeekly ? (
                                <div className="text-center py-8 text-gray-400">Cargando...</div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(weeklyData.absences || {}).map(([date, employees]) => {
                                        const dateObj = new Date(date + 'T12:00:00');
                                        const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                                        const dayNumber = dateObj.getDate();
                                        const monthName = dateObj.toLocaleDateString('es-ES', { month: 'short' });

                                        return (
                                            <div key={date} className="border-b border-gray-200 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
                                                <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                                    {dayName} {dayNumber} {monthName}
                                                </h4>
                                                {employees.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {employees.map(emp => {
                                                            const styles = {
                                                                VACATION: { bg: 'bg-green-50 border-green-100 dark:bg-slate-800/60 dark:border-slate-600', text: 'text-green-600 dark:text-slate-300', label: 'Vacaciones' },
                                                                OFF: { bg: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-700/40', text: 'text-blue-600 dark:text-blue-200', label: 'Día libre' },
                                                                MEDICAL: { bg: 'bg-purple-50 border-purple-100 dark:bg-slate-800/60 dark:border-slate-600', text: 'text-purple-600 dark:text-purple-200', label: 'Visita Médica' },
                                                                SICK_LEAVE: { bg: 'bg-red-50 border-red-100 dark:bg-slate-800/60 dark:border-slate-600', text: 'text-red-600 dark:text-red-300', label: 'Baja Médica' }
                                                            };
                                                            const style = styles[emp.type] || styles.OFF;

                                                            let schedule = '';
                                                            if (emp.type === 'MEDICAL' && emp.startDate && emp.endDate) {
                                                                const start = new Date(emp.startDate);
                                                                const end = new Date(emp.endDate);
                                                                const startTime = start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                                const endTime = end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                                                schedule = `${startTime} - ${endTime}`;
                                                            }

                                                            return (
                                                                <div key={`${emp.id}-${date}`} className={`flex items-center p-3 rounded-xl border transition-all hover:scale-[1.02] ${style.bg}`}>
                                                                    <div className={`w-8 h-8 bg-white dark:bg-slate-950 border border-current/10 rounded-full flex items-center justify-center font-bold shadow-sm mr-2 text-xs ${style.text}`}>
                                                                        {emp.name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">{emp.name}</p>
                                                                        <p className={`text-[10px] font-medium ${style.text}`}>{style.label}</p>
                                                                        {schedule && <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">{schedule}</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">No hay ausencias este día</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Info Alerts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-700/40 text-blue-800 dark:text-blue-600">
                            <AlertCircle className="mr-3 flex-shrink-0 text-blue-600 dark:text-blue-200" size={20} />
                            <div className="text-xs">
                                <p className="font-bold mb-1 uppercase tracking-tight">Cálculo de Días Naturales</p>
                                <p className="opacity-80">Se contabilizan todos los días consecutivos o sueltos marcados como vacaciones en el cuadrante, incluyendo fines de semana.</p>
                            </div>
                        </div>
                        <div className="flex items-start p-4 bg-green-50 dark:bg-slate-800/60 rounded-2xl border border-green-100 dark:border-slate-600 text-green-800 dark:text-slate-300">
                            <CheckCircle2 className="mr-3 flex-shrink-0 text-green-600 dark:text-slate-300" size={20} />
                            <div className="text-xs">
                                <p className="font-bold mb-1 uppercase tracking-tight">Cálculo de Días Laborales</p>
                                <p className="opacity-80">Solo se contabilizan los días de Lunes a Viernes. El saldo restante se calcula sobre la base estándar de 22 días hábiles.</p>
                            </div>
                        </div>
                    </div>
                </>
            ) : activeTab === 'employees' ? (
                <div className="space-y-8">
                    {/* Balance Table Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-companyBlue dark:text-blue-200">
                                    <Clock size={20} />
                                </div>
                                <h3 className="font-bold text-lg text-[#001D3D] dark:text-gray-100">Saldos y Días Restantes</h3>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar empleado..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm dark:text-gray-200 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 outline-none w-full md:w-64 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFC] dark:bg-slate-950">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Empleado</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Naturales (Base 30)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">Laborales (Base 22)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {filteredRanking.map((row) => (
                                        <tr key={row.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-50/5 transition-colors">
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{row.name}</p>
                                                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tight">ID: {row.employeeNumber}</p>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-gray-700 dark:text-gray-300">{row.naturalDays} / {30 + (row.adjustedDays || 0)}</span>
                                                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 dark:bg-blue-50 rounded-full shadow-neon-cyan/50"
                                                            style={{ width: `${Math.min(100, (row.naturalDays / (30 + (row.adjustedDays || 0))) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-200 mt-1">{row.remainingNatural} restantes</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-gray-700 dark:text-gray-300">{row.workingDays} / {22 + (row.adjustedDays || 0)}</span>
                                                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 dark:bg-slate-800 rounded-full "
                                                            style={{ width: `${Math.min(100, (row.workingDays / (22 + (row.adjustedDays || 0))) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-green-600 dark:text-slate-300 mt-1">{row.remainingWorking} restantes</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {row.remainingWorking <= 0 ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 dark:bg-slate-800/60 text-red-700 dark:text-red-300 text-[10px] font-black uppercase border border-red-200 dark:border-slate-600">
                                                        Agotadas
                                                    </span>
                                                ) : row.remainingWorking < 5 ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 dark:bg-slate-800/60 text-yellow-700 dark:text-yellow-200 text-[10px] font-black uppercase border border-yellow-200 dark:border-slate-600">
                                                        Límite próximo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-slate-800/60 text-green-700 dark:text-slate-300 text-[10px] font-black uppercase border border-green-200 dark:border-slate-600">
                                                        Disponible
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRanking.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                                {loading ? 'Cargando datos...' : 'No se encontraron empleados con vacaciones este año.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'adjustments' ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="mb-6">
                        <h3 className="text-2xl font-extrabold text-[#001D3D] dark:text-white tracking-tight flex items-center">
                            Gestión de Ajustes Extraordinarios
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Concede o retira días de vacaciones adicionales a los empleados de tu área.</p>
                    </div>
                    <VacationAdjustmentsTab externalBranchId={selectedBranchId} />
                </div>
            ) : null}
        </div>
    );
};

export default Vacaciones;
