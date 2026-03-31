import React, { useState, useEffect } from 'react';
import { Users, Clock, AlertCircle, Calendar as CalendarIcon, HeartPulse, Stethoscope, Briefcase, Plus, FileText, Umbrella, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import API_URL from '../apiConfig';
import RequestShiftModal from '../components/RequestShiftModal';
import NoticeBoard from '../components/NoticeBoard';
import GlobalBroadcastModal from '../components/GlobalBroadcastModal';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const Dashboard = () => {
    const { hasPermission, user } = usePermissions();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [activeNotices, setActiveNotices] = useState([]);
    const [showGlobalModal, setShowGlobalModal] = useState(false);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const fetchStats = async () => {
        setLoading(true);
        try {
            const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
            const res = await fetch(`${API_URL}/dashboard/stats?userId=${user.id}&role=${user.role}&branchId=${bId || ''}`);
            const data = await res.json();
            setStats(data);
        } catch (e) {
            console.error('Error fetching dashboard stats:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setBranches(data);
        } catch (e) { console.error('Error fetching branches:', e); }
    };

    const fetchMyRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/requests?userId=${user.id}&role=${user.role}&branchId=${user.branchId || ''}`);
            const data = await res.json();
            setMyRequests(data.slice(0, 5)); // Solo las últimas 5
        } catch (e) {
            console.error('Error fetching requests:', e);
        }
    };

    const fetchActiveNotices = async () => {
        try {
            const res = await fetch(`${API_URL}/global-notices/active`);
            const data = await res.json();

            // Filtrar las que ya han sido descartadas
            const dismissedNotices = JSON.parse(localStorage.getItem('dismissedNotices') || '[]');
            const filtered = data.filter(n => !dismissedNotices.includes(n.id));

            if (filtered.length > 0) {
                setActiveNotices(filtered);
                setShowGlobalModal(true);
            }
        } catch (e) {
            console.error('Error fetching global notices:', e);
        }
    };

    const [processingId, setProcessingId] = useState(null);

    const handlePeerRespond = async (requestId, accept) => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`${API_URL}/swaps/${requestId}/peer-respond`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accept, userId: user.id })
            });

            if (res.ok) {
                fetchMyRequests();
            }
        } catch (e) {
            console.error('Error in peer response:', e);
        } finally {
            setProcessingId(null);
        }
    };

    const handleManagerApprove = async (requestId) => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`${API_URL}/swaps/${requestId}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'APPROVED', adminId: user.id })
            });

            if (res.ok) {
                fetchMyRequests();
                fetchStats();
            }
        } catch (e) {
            console.error('Error in manager approval:', e);
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        fetchBranches();
        fetchActiveNotices();
    }, []);

    useEffect(() => {
        fetchStats();
        fetchMyRequests();
    }, [selectedBranchId]);

    if (loading) return <div className="text-center py-10 dark:text-gray-400">Cargando Dashboard...</div>;

    const mustChange = user.mustChangePassword;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-8">
            {/* Aviso Imperativo de Cambio de Contraseña */}
            {mustChange && (
                <div className="bg-red-500/10 border-2 border-red-500/20 rounded-3xl p-8 flex flex-col items-center text-center gap-6 shadow-2xl shadow-red-500/5">
                    <div className="p-4 bg-companyRed dark:bg-red-600 rounded-full text-white animate-bounce">
                        <AlertCircle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-800 dark:text-red-300">Cambio Obligatorio de Contraseña</h2>
                        <p className="text-lg font-medium text-gray-600 dark:text-red-200/70">Por seguridad, es imperativo cambiar tu contraseña en este primer inicio de sesión antes de continuar.</p>
                    </div>
                    <a href="/settings" className="px-10 py-4 bg-companyRed dark:bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all uppercase text-sm tracking-widest shadow-xl shadow-red-500/20 active:scale-95">
                        Completar Cambio Ahora
                    </a>
                </div>
            )}

            {/* Estadísticas de Sucursal / Globales (Solo si tiene permiso) */}
            {hasPermission(PERMISSIONS.STATS_VIEW_BRANCH) && stats?.branch && (
                <section className={mustChange ? 'opacity-50 pointer-events-none' : ''}>
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-8 bg-companyBlue rounded-full"></div>
                            <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">
                                {user.role === 'admin' ? (selectedBranchId ? `Sucursal: ${branches.find(b => b.id.toString() === selectedBranchId.toString())?.name}` : 'Resumen Global') : `Sucursal: ${selectedBranchId ? branches.find(b => b.id.toString() === selectedBranchId.toString())?.name : user.branch?.name}`}
                            </h2>
                        </div>
                        
                        {(hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) || (hasPermission(PERMISSIONS.STATS_VIEW_BRANCH) && branches.length > 1)) && (
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                className="ml-5 text-sm border border-gray-300 dark:border-gray-700 rounded-xl py-2 px-4 focus:ring-2 focus:ring-companyBlue focus:border-transparent bg-white dark:bg-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all cursor-pointer"
                            >
                                <option value="">{hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? 'Todas las Sucursales' : 'Mi Sucursal (Base)'}</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <StatsCard
                            icon={<Users size={20} />}
                            label="Total Plantilla"
                            value={stats.branch.totalUsers}
                            color="cyan"
                        />
                        <StatsCard
                            icon={<CalendarIcon size={20} />}
                            label="Operativos"
                            value={stats.branch.activeToday}
                            color="lime"
                        />
                        <StatsCard
                            icon={<Clock size={20} />}
                            label="Horas Extra"
                            value={stats.branch.overtimeToday}
                            color="amber"
                        />
                        <StatsCard
                            icon={<Umbrella size={20} />}
                            label="Vacaciones"
                            value={stats.branch.vacationToday ?? 0}
                            color="teal"
                        />
                        <StatsCard
                            icon={<Stethoscope size={20} />}
                            label="Visitas Hoy"
                            value={stats.branch.medicalToday}
                            color="purple"
                        />
                        <StatsCard
                            icon={<HeartPulse size={20} />}
                            label="Bajas Médicas"
                            value={stats.branch.sickLeaveToday}
                            color="rose"
                        />
                    </div>
                </section>
            )}

            {/* Estadísticas Personales (Para Todos) */}
            {stats?.personal && (
                <section className={mustChange ? 'opacity-50 pointer-events-none' : ''}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-8 bg-zone-office rounded-full"></div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200 uppercase tracking-tighter">Mis Estadísticas {year()}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatsCard
                            icon={<Briefcase size={22} />}
                            label="Vacaciones Consumidas"
                            value={`${stats.personal.vacationsConsumed} d`}
                            color="indigo"
                        />
                        <StatsCard
                            icon={<CalendarIcon size={22} />}
                            label="Vacaciones Pendientes"
                            value={`${stats.personal.vacationsRemaining} d`}
                            color="lime"
                        />
                        <StatsCard
                            icon={<Stethoscope size={22} />}
                            label="Visitas Médicas"
                            value={stats.personal.medicalVisits}
                            color="purple"
                        />
                        <StatsCard
                            icon={<HeartPulse size={22} />}
                            label="Bajas Médicas"
                            value={stats.personal.sickLeaveCount}
                            color="rose"
                        />
                    </div>
                </section>
            )}

            {/* Sección de Solicitudes (Para Empleados) */}
            <section className={mustChange ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-companyBlue dark:bg-slate-700 rounded-full"></div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Mis Solicitudes</h2>
                    </div>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-companyBlue dark:bg-slate-700 hover:bg-blue-700 dark:hover:bg-slate-600 text-white font-bold rounded-2xl shadow-lg  transition-all transform active:scale-95"
                    >
                        <Plus size={20} />
                        Nueva Solicitud
                    </button>
                </div>

                {myRequests.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
                        <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-semibold">No tienes solicitudes recientes</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea una nueva solicitud para pedir turnos, vacaciones, o días libres</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {myRequests.map(req => (
                            <div
                                key={req.id}
                                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:shadow-lg  transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {req.type === 'WORK' ? 'Trabajo' :
                                                req.type === 'VACATION' ? 'Vacaciones' :
                                                    req.type === 'MEDICAL' ? 'Visita Médica' :
                                                        req.type === 'SICK_LEAVE' ? 'Baja Médica' :
                                                            req.type === 'OFF' ? 'Día Libre' :
                                                                req.type === 'SWAP' ? 'Intercambio' : req.type}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${req.status === 'PENDING' ? 'bg-yellow-100 dark:bg-slate-800/60 text-yellow-800 dark:text-yellow-300' :
                                            req.status === 'APPROVED' ? 'bg-green-100 dark:bg-slate-800/60 text-green-800 dark:text-slate-300' :
                                                req.status === 'REJECTED' ? 'bg-red-100 dark:bg-slate-800/60 text-red-800 dark:text-red-300' :
                                                    'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-400'
                                            }`}>
                                            {req.status === 'PENDING' ? 'Pendiente' :
                                                req.status === 'APPROVED' ? 'Aprobada' :
                                                    req.status === 'REJECTED' ? 'Rechazada' : req.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {new Date(req.startDate).toLocaleDateString('es-ES')} <span className="text-xs font-bold opacity-50">({new Date(req.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                                    </p>
                                </div>

                                {/* Acciones rápidas en Dashboard */}
                                {req.status === 'PENDING' && (
                                    <div className="flex gap-2">
                                        {/* Compañero aceptando swap */}
                                        {req.type === 'SWAP' && req.peerId === user.id && !req.peerAccepted && (
                                            <>
                                                <button
                                                    onClick={() => handlePeerRespond(req.id, true)}
                                                    disabled={processingId === req.id}
                                                    className="p-2 bg-green-100 dark:bg-slate-800/60 text-green-700 dark:text-slate-300 rounded-lg hover:bg-green-200 dark:hover:bg-slate-700 transition-all shadow-sm"
                                                    title="Aceptar Intercambio"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handlePeerRespond(req.id, false)}
                                                    disabled={processingId === req.id}
                                                    className="p-2 bg-red-100 dark:bg-slate-800/60 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-all shadow-sm"
                                                    title="Rechazar"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </>
                                        )}

                                        {/* Responsable aprobando swap ya aceptado por el compañero */}
                                        {hasPermission(PERMISSIONS.REQUESTS_APPROVE) && (req.type !== 'SWAP' || req.peerAccepted) && (
                                            <button
                                                onClick={() => handleManagerApprove(req.id)}
                                                disabled={processingId === req.id}
                                                className="px-4 py-2 bg-green-600 dark:bg-slate-700 text-white font-bold text-xs rounded-xl hover:bg-green-700 dark:hover:bg-slate-600 transition-all shadow-md"
                                            >
                                                {processingId === req.id ? '...' : 'Aprobar'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {req.managerComment && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate ml-4">
                                        💬 {req.managerComment}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Tablón de Anuncios */}
            <section className={mustChange ? 'opacity-50 pointer-events-none' : ''}>
                <NoticeBoard user={user} />
            </section>

            {/* Modal de Solicitud */}
            <RequestShiftModal
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                userId={user.id}
                branchId={user.branchId}
                role={user.role}
                onSuccess={() => {
                    fetchMyRequests();
                    setShowRequestModal(false);
                }}
            />

            {/* Modal de Comunicados Globales */}
            {showGlobalModal && (
                <GlobalBroadcastModal
                    notices={activeNotices}
                    onDismiss={() => setShowGlobalModal(false)}
                />
            )}
        </div>
    );
};

const StatsCard = ({ icon, label, value, color }) => {
    const colors = {
        cyan: "text-companyBlue bg-blue-50 dark:text-blue-200 dark:bg-slate-800/60",
        lime: "text-zone-office bg-green-50 dark:text-slate-300 dark:bg-slate-800/60",
        amber: "text-status-overtime bg-amber-50 dark:text-amber-200 dark:bg-slate-800/60",
        purple: "text-status-medical bg-purple-50 dark:text-purple-200 dark:bg-slate-800/60",
        teal: "text-teal-600 bg-teal-50 dark:text-slate-300 dark:bg-slate-800/60",
        rose: "text-companyRed bg-red-50 dark:text-red-200 dark:bg-slate-800/60",
        indigo: "text-zone-call bg-indigo-50 dark:text-slate-300 dark:bg-slate-800/60"
    };

    const styles = colors[color] || colors.cyan;
    const [textColor, bgColor] = styles.split(' ');

    return (
        <div className={`p-6 rounded-3xl shadow-xl border border-gray-200 dark:border-transparent flex items-center space-x-5 bg-white dark:bg-gray-900 transition-all duration-300 hover:scale-[1.02] ${styles}`}>
            <div className={`p-4 rounded-2xl ${bgColor} dark:bg-slate-950/40`}>
                <div className={`${textColor} dark:text-inherit`}>
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-gray-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

const year = () => new Date().getFullYear();

export default Dashboard;
