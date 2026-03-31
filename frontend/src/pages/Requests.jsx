import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Users, ArrowRightLeft, UserSearch } from 'lucide-react';
import API_URL from '../apiConfig';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const Requests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewComment, setReviewComment] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');

    const { hasPermission, user } = usePermissions();

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
            const res = await fetch(`${API_URL}/requests?role=${user.role}&branchId=${bId}&userId=${user.id}&status=${filter !== 'ALL' ? filter : ''}`);
            const data = await res.json();
            setRequests(data);
        } catch (e) {
            console.error('Error fetching requests:', e);
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

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [filter, selectedBranchId]);

    const handleReview = async (requestId, status) => {
        setProcessingId(requestId);

        // Determinar endpoint según tipo
        const isSwap = requests.find(r => r.id === requestId)?.type === 'SWAP';
        const url = isSwap && (status === 'APPROVED' || status === 'REJECTED')
            ? `${API_URL}/swaps/${requestId}/approve`
            : `${API_URL}/requests/${requestId}/status`;

        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, managerComment: reviewComment, adminId: user.id })
            });

            if (res.ok) {
                fetchRequests();
                setSelectedRequest(null);
                setReviewComment('');
            }
        } catch (e) {
            console.error('Error reviewing request:', e);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePeerRespond = async (requestId, accept) => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`${API_URL}/swaps/${requestId}/peer-respond`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accept, userId: user.id })
            });

            if (res.ok) {
                fetchRequests();
            }
        } catch (e) {
            console.error('Error in peer response:', e);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { bg: 'bg-yellow-100 dark:bg-slate-800/60', text: 'text-yellow-800 dark:text-yellow-300', icon: Clock, label: 'Pendiente' },
            APPROVED: { bg: 'bg-green-100 dark:bg-slate-800/60', text: 'text-green-800 dark:text-slate-300', icon: CheckCircle, label: 'Aprobado' },
            REJECTED: { bg: 'bg-red-100 dark:bg-slate-800/60', text: 'text-red-800 dark:text-red-300', icon: XCircle, label: 'Rechazado' },
            EXPIRED: { bg: 'bg-gray-100 dark:bg-gray-500/20', text: 'text-gray-800 dark:text-gray-400', icon: AlertCircle, label: 'Caducado' }
        };
        const config = badges[status];
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const getTypeLabel = (type) => {
        const labels = {
            WORK: 'Turno de Trabajo',
            VACATION: 'Vacaciones',
            OFF: 'Día Libre',
            MEDICAL: 'Visita Médica',
            SWAP: 'Intercambio de Turno'
        };
        return labels[type] || type;
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-black text-gray-800 dark:text-white uppercase tracking-tight">
                    Solicitudes
                </h1>
                
                {(hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) || (hasPermission(PERMISSIONS.REQUESTS_APPROVE) && branches.length > 1)) && (
                    <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="text-sm border border-gray-300 dark:border-gray-700 rounded-xl py-2 px-4 focus:ring-2 focus:ring-companyBlue focus:border-transparent bg-white dark:bg-gray-900 dark:text-gray-100 shadow-sm outline-none transition-all"
                    >
                        <option value="">{hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? 'Todas las Sucursales' : 'Mi Sucursal (Base)'}</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${filter === tab
                            ? 'bg-companyBlue dark:bg-blue-700 text-white shadow-lg shadow-blue-500/20 dark:shadow-soft-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {tab === 'PENDING' ? 'Pendientes' : tab === 'APPROVED' ? 'Aprobadas' : tab === 'REJECTED' ? 'Rechazadas' : 'Todas'}
                        {tab === 'PENDING' && pendingCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/30 rounded-full text-xs">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista de Solicitudes */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando solicitudes...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 font-semibold">No hay solicitudes</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(request => (
                        <div
                            key={request.id}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-lg dark:shadow-soft-sm transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{request.user.name}</h3>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">#{request.user.employeeNumber}</span>
                                        {getStatusBadge(request.status)}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-semibold">{getTypeLabel(request.type)}</span> en {request.zone.name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-slate-950/30 rounded-xl">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Inicio</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                        {new Date(request.startDate).toLocaleDateString('es-ES')} <span className="text-xs font-bold opacity-50">({new Date(request.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Fin</p>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                        {new Date(request.endDate).toLocaleDateString('es-ES')} <span className="text-xs font-bold opacity-50">({new Date(request.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                                    </p>
                                </div>
                            </div>

                            {request.type === 'SWAP' && request.shiftA && request.shiftB && (
                                <div className="mb-4 flex items-center justify-center gap-4 p-4 bg-gray-100 dark:bg-slate-950/40 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">{request.user.name}</p>
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">
                                                {new Date(request.shiftA.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {new Date(request.shiftA.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRightLeft className="text-companyBlue dark:text-blue-200 animate-pulse" size={24} />
                                    <div className="flex-1 text-center">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">{request.peer ? request.peer.name : 'Compañero'}</p>
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">
                                                {new Date(request.shiftB.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {new Date(request.shiftB.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {request.type === 'SWAP' && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 border ${request.peerAccepted ? 'bg-green-50 text-green-700 border-green-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-green-800' : 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-slate-800/60 dark:text-orange-200 dark:border-orange-800'}`}>
                                    <CheckCircle size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        {request.peerAccepted ? 'Compañero ha aceptado' : 'Esperando aceptación del compañero'}
                                    </span>
                                </div>
                            )}

                            {request.userReason && (
                                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700/40 rounded-xl">
                                    <p className="text-xs text-blue-700 dark:text-blue-200 uppercase font-bold mb-1">Motivo del empleado</p>
                                    <p className="text-sm text-blue-900 dark:text-blue-600">{request.userReason}</p>
                                </div>
                            )}

                            {request.managerComment && (
                                <div className="mb-4 p-4 bg-purple-50 dark:bg-slate-800/60 border border-purple-200 dark:border-slate-600 rounded-xl">
                                    <p className="text-xs text-purple-700 dark:text-purple-200 uppercase font-bold mb-1">Comentario del responsable</p>
                                    <p className="text-sm text-purple-900 dark:text-purple-100">{request.managerComment}</p>
                                </div>
                            )}

                            {/* Acciones para solicitudes pendientes */}
                            {request.status === 'PENDING' && (
                                <div className="space-y-3">
                                    {/* Caso 1: Soy el compañero del SWAP y no he aceptado */}
                                    {request.type === 'SWAP' && request.peerId === user.id && !request.peerAccepted && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handlePeerRespond(request.id, true)}
                                                disabled={processingId === request.id}
                                                className="flex-1 py-3 bg-companyBlue dark:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle size={20} />
                                                Aceptar Intercambio
                                            </button>
                                            <button
                                                onClick={() => handlePeerRespond(request.id, false)}
                                                disabled={processingId === request.id}
                                                className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <XCircle size={20} />
                                                Rechazar
                                            </button>
                                        </div>
                                    )}

                                    {/* Caso 2: Soy el responsable y puedo aprobar (si es swap, el compañero debe haber aceptado) */}
                                    {hasPermission(PERMISSIONS.REQUESTS_APPROVE) && (request.type !== 'SWAP' || request.peerAccepted) && (
                                        <>
                                            {selectedRequest === request.id && (
                                                <textarea
                                                    value={reviewComment}
                                                    onChange={(e) => setReviewComment(e.target.value)}
                                                    placeholder="Comentario opcional (visible para el empleado)"
                                                    rows="2"
                                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-950 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 resize-none"
                                                />
                                            )}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(request.id);
                                                        handleReview(request.id, 'APPROVED');
                                                    }}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={20} />
                                                    {processingId === request.id ? 'Procesando...' : 'Aprobar'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (selectedRequest === request.id) {
                                                            handleReview(request.id, 'REJECTED');
                                                        } else {
                                                            setSelectedRequest(request.id);
                                                        }
                                                    }}
                                                    disabled={processingId === request.id}
                                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={20} />
                                                    {selectedRequest === request.id ? 'Confirmar Rechazo' : 'Rechazar'}
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* Caso 3: Soy el proponente y estoy esperando */}
                                    {request.userId === user.id && request.status === 'PENDING' && (
                                        <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400 italic">
                                            {request.type === 'SWAP' && !request.peerAccepted
                                                ? 'Esperando respuesta de tu compañero...'
                                                : 'Esperando revisión del responsable...'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Requests;
