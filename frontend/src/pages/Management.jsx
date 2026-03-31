import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import UserFormModal from '../components/UserFormModal';
import GlobalNoticeModal from '../components/GlobalNoticeModal';
import API_URL from '../apiConfig';
import { Megaphone, MessageSquare, Info, AlertTriangle, MapPin, Shield } from 'lucide-react';
import ZoneManagementTab from '../components/ZoneManagementTab';
import RolePermissionsTab from '../components/RolePermissionsTab';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const Management = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [zones, setZones] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'employeeNumber', direction: 'asc' });
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'notices'
    const [notices, setNotices] = useState([]);
    const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
    const [currentNotice, setCurrentNotice] = useState(null);
    const [loadingNotices, setLoadingNotices] = useState(false);

    const { hasPermission, user: currentUserData } = usePermissions();
    const navigate = useNavigate();

    useEffect(() => {
        if (!hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE)) {
            // Si no tiene permiso de gestión total, pero quizá tiene permisos parciales (ej. oficina)
            // Solo dejamos entrar si tiene al menos USERS_VIEW
            if (!hasPermission(PERMISSIONS.USERS_VIEW)) {
                navigate('/dashboard');
            }
        }
    }, [hasPermission, navigate]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users?userId=${currentUserData.id}&role=${currentUserData.role}`);
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch(`${API_URL}/branches?userId=${currentUserData.id}&role=${currentUserData.role}`);
            const data = await res.json();
            setBranches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        }
    };

    const fetchNotices = async () => {
        setLoadingNotices(true);
        try {
            const res = await fetch(`${API_URL}/global-notices?userId=${currentUserData.id}&role=${currentUserData.role}`);
            const data = await res.json();
            setNotices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching notices:', error);
            setNotices([]);
        } finally {
            setLoadingNotices(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchBranches();
        if (hasPermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE)) {
            fetchNotices();
        }
    }, [hasPermission]);

    useEffect(() => {
        if (selectedBranchId) {
            const branch = branches.find(b => b.id === parseInt(selectedBranchId));
            setZones(branch ? branch.zones : []);
            setSelectedZoneId(''); // Reset zone when branch changes
        } else {
            setZones([]);
            setSelectedZoneId('');
        }
    }, [selectedBranchId, branches]);

    const handleCreate = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user) => {
        setCurrentUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            try {
                await fetch(`${API_URL}/users/${id}?adminId=${currentUserData.id}`, { method: 'DELETE' });
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const handleSave = async (userData) => {
        const url = currentUser
            ? `${API_URL}/users/${currentUser.id}`
            : `${API_URL}/users`;

        const method = currentUser ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...userData, adminId: currentUserData.id })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    const handleSaveNotice = async (noticeData) => {
        const url = currentNotice
            ? `${API_URL}/global-notices/${currentNotice.id}`
            : `${API_URL}/global-notices`;

        const method = currentNotice ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...noticeData, adminId: currentUserData.id })
            });

            if (res.ok) {
                setIsNoticeModalOpen(false);
                fetchNotices();
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar comunicado');
            }
        } catch (error) {
            console.error('Error saving notice:', error);
        }
    };

    const handleDeleteNotice = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este comunicado?')) {
            try {
                await fetch(`${API_URL}/global-notices/${id}?adminId=${currentUserData.id}`, { method: 'DELETE' });
                fetchNotices();
            } catch (error) {
                console.error('Error deleting notice:', error);
            }
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="ml-1 text-companyBlue dark:text-blue-200" />
            : <ArrowDown size={14} className="ml-1 text-companyBlue dark:text-blue-200" />;
    };

    const roleLabels = {
        'admin': 'Administrador',
        'responsable': 'Responsable',
        'administracion': 'Oficina',
        'employee': 'Empleado'
    };

    let filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.employeeNumber.toString().includes(searchTerm);
        
        // Logical branch filter
        // If responsabilie and has multiple branches, and one is selected, use it.
        // If none selected, and is responsable, we show all users from ALL their managed branches? 
        // Actually, the backend /users returns ALL users for admins, but for responsables it might be limited.
        // Let's assume the manager wants to see users of the selected branch.
        
        const matchesBranch = !selectedBranchId || u.branchId === parseInt(selectedBranchId);
        const matchesZone = !selectedZoneId || u.zoneId === parseInt(selectedZoneId);

        // Security check for Responsable: only show users in their managed branches
        if (currentUserData.role === 'responsable') {
            const managedIds = [currentUserData.branchId, ...(currentUserData.managedBranches?.map(b => b.id) || [])];
            if (!managedIds.includes(u.branchId)) return false;
        }

        return matchesSearch && matchesBranch && matchesZone;
    });

    // Aplicar ordenación
    filteredUsers.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
            case 'employeeNumber':
                aValue = a.employeeNumber;
                bValue = b.employeeNumber;
                break;
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'role':
                aValue = roleLabels[a.role] || a.role;
                bValue = roleLabels[b.role] || b.role;
                break;
            case 'branch':
                aValue = (a.branch?.name || '').toLowerCase();
                bValue = (b.branch?.name || '').toLowerCase();
                break;
            case 'zone':
                aValue = (a.zone?.name || '').toLowerCase();
                bValue = (b.zone?.name || '').toLowerCase();
                break;
            case 'status':
                aValue = a.isActive ? 1 : 0;
                bValue = b.isActive ? 1 : 0;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`text-2xl font-black uppercase tracking-tighter transition-all ${activeTab === 'users' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                    >
                        Usuarios
                    </button>
                    {hasPermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE) && (
                        <button
                            onClick={() => setActiveTab('notices')}
                            className={`text-2xl font-black uppercase tracking-tighter transition-all ${activeTab === 'notices' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                        >
                            Comunicados Globales
                        </button>
                    )}
                    {hasPermission(PERMISSIONS.ZONES_VIEW) && (
                        <button
                            onClick={() => setActiveTab('zones')}
                            className={`text-2xl font-black uppercase tracking-tighter transition-all ${activeTab === 'zones' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                        >
                            Zonas
                        </button>
                    )}
                    {hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) && (
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`text-2xl font-black uppercase tracking-tighter transition-all ${activeTab === 'roles' ? 'text-gray-800 dark:text-white border-b-4 border-companyBlue dark:border-blue-400' : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
                        >
                            Roles y Permisos
                        </button>
                    )}
                </div>

                {activeTab === 'users' && hasPermission(PERMISSIONS.USERS_CREATE) ? (
                    <button
                        onClick={handleCreate}
                        className="flex items-center px-6 py-3 bg-companyBlue dark:bg-blue-700 text-white rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-lg dark:shadow-soft-sm font-bold uppercase tracking-widest text-xs"
                    >
                        <Plus size={20} className="mr-2" />
                        Nuevo Usuario
                    </button>
                ) : activeTab === 'notices' && hasPermission(PERMISSIONS.ANNOUNCEMENTS_CREATE) ? (
                    <button
                        onClick={() => { setCurrentNotice(null); setIsNoticeModalOpen(true); }}
                        className="flex items-center px-6 py-3 bg-companyBlue dark:bg-blue-700 text-white rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-800 transition shadow-lg dark:shadow-soft-sm font-bold uppercase tracking-widest text-xs"
                    >
                        <Megaphone size={20} className="mr-2" />
                        Nuevo Comunicado
                    </button>
                ) : null}
            </div>

            {activeTab === 'users' ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={18} className="text-gray-400 dark:text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre o número..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <div className="relative">
                                    <select
                                        value={selectedBranchId}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        className="pl-10 pr-8 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none font-medium"
                                    >
                                        <option value="">{currentUserData.role === 'admin' ? 'Todas las Sucursales' : 'Mis Sucursales'}</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>

                                <div className="relative">
                                    <select
                                        value={selectedZoneId}
                                        onChange={(e) => setSelectedZoneId(e.target.value)}
                                        className="pl-10 pr-8 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none font-medium disabled:opacity-50"
                                        disabled={!selectedBranchId}
                                    >
                                        <option value="">Todas las Zonas</option>
                                        {zones.map(z => (
                                            <option key={z.id} value={z.id}>{z.name}</option>
                                        ))}
                                    </select>
                                    <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <thead className="bg-gray-50/50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th onClick={() => handleSort('employeeNumber')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Nº Empleado {getSortIcon('employeeNumber')}</div>
                                    </th>
                                    <th onClick={() => handleSort('name')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Nombre {getSortIcon('name')}</div>
                                    </th>
                                    <th onClick={() => handleSort('role')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Rol {getSortIcon('role')}</div>
                                    </th>
                                    <th onClick={() => handleSort('branch')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Sucursal {getSortIcon('branch')}</div>
                                    </th>
                                    <th onClick={() => handleSort('zone')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Zona {getSortIcon('zone')}</div>
                                    </th>
                                    <th onClick={() => handleSort('status')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center">Estado {getSortIcon('status')}</div>
                                    </th>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-right text-gray-500 dark:text-gray-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">Cargando usuarios...</td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">No se encontraron usuarios</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-50/5 transition group">
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-200">{user.employeeNumber}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-companyBlue/10 to-blue-600/10 dark:from-blue-500/10 dark:to-blue-400/5 text-companyBlue dark:text-blue-200 flex items-center justify-center mr-3 font-black text-sm border border-companyBlue/10 dark:border-blue-700/40 group-hover:scale-110 transition-transform">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-companyBlue dark:group-hover:text-blue-600 transition-colors">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 dark:bg-slate-800/60 text-purple-700 dark:text-purple-200' :
                                                    user.role === 'responsable' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200' :
                                                        user.role === 'administracion' ? 'bg-blue-100 dark:bg-blue-900/30 text-companyBlue dark:text-blue-200' :
                                                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {roleLabels[user.role] || user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium dark:text-gray-400">{user.branch?.name || '-'}</td>
                                            <td className="px-6 py-4 font-medium dark:text-gray-400">{user.zone?.name || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${(user.isActive ?? true) ? 'bg-green-100 dark:bg-slate-800/60 text-green-700 dark:text-slate-300' : 'bg-red-100 dark:bg-slate-800/60 text-red-700 dark:text-red-300'
                                                    }`}>
                                                    {(user.isActive ?? true) ? 'Activo' : 'Baja'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-1">
                                                {hasPermission(PERMISSIONS.USERS_EDIT) && (
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="p-2 text-blue-600 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-50/20 rounded-xl transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                                {hasPermission(PERMISSIONS.USERS_DELETE) && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="p-2 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'notices' ? (
                <div className="grid gap-6">
                    {loadingNotices ? (
                        <div className="text-center py-12 text-gray-400 italic">Cargando comunicados...</div>
                    ) : notices.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-800 shadow-xl">
                            <Megaphone size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-bold">No hay comunicados globales registrados</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {notices.map(notice => (
                                <div key={notice.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col justify-between group hover:border-companyBlue transition-colors relative">
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button onClick={() => { setCurrentNotice(notice); setIsNoticeModalOpen(true); }} className="p-2 text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-50/10 rounded-xl transition-all">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteNotice(notice.id)} className="p-2 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-3 rounded-2xl ${notice.type === 'URGENT' ? 'bg-red-100 text-red-600 dark:bg-slate-800/60' : notice.type === 'CHANGELOG' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' : 'bg-companyBlue/10 text-companyBlue dark:bg-blue-900/30 dark:text-blue-200'}`}>
                                                {notice.type === 'URGENT' ? <AlertTriangle size={24} /> : notice.type === 'CHANGELOG' ? <MessageSquare size={24} /> : <Info size={24} />}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight line-clamp-1 pr-16">{notice.title}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] tracking-wider font-bold uppercase font-black uppercase tracking-widest ${notice.isActive ? 'bg-green-100 text-green-700 dark:bg-slate-800/60 dark:text-slate-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                                                        {notice.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    <span className="text-[10px] tracking-wider font-bold uppercase font-bold text-gray-400 uppercase">{new Date(notice.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed mb-6 italic">
                                            "{notice.message}"
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : activeTab === 'zones' ? (
                <ZoneManagementTab branches={branches} />
            ) : activeTab === 'roles' ? (
                <RolePermissionsTab />
            ) : null}

            <UserFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                userToEdit={currentUser}
            />

            <GlobalNoticeModal
                isOpen={isNoticeModalOpen}
                onClose={() => setIsNoticeModalOpen(false)}
                onSave={handleSaveNotice}
                noticeToEdit={currentNotice}
            />
        </div>
    );
};

export default Management;
