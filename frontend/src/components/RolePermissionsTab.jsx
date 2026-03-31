import React, { useState, useEffect } from 'react';
import { Save, Shield, Info } from 'lucide-react';
import API_URL from '../apiConfig';
import { PERMISSIONS } from '../constants/permissions';

const RolePermissionsTab = () => {
    const [rolesPerms, setRolesPerms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modified, setModified] = useState({}); // Tracking changes per role

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/role-permissions?userId=${currentUser.id}`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
            }
            const data = await res.json();
            setRolesPerms(data);
        } catch (error) {
            console.error('Error fetching role permissions:', error);
            alert('Error al cargar permisos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, []);

    const handleTogglePermission = (roleName, permission) => {
        setRolesPerms(prev => prev.map(rp => {
            if (rp.role === roleName) {
                const hasPerm = rp.permissions.includes(permission);
                const newPermissions = hasPerm 
                    ? rp.permissions.filter(p => p !== permission)
                    : [...rp.permissions, permission];
                
                setModified(m => ({ ...m, [roleName]: true }));
                return { ...rp, permissions: newPermissions };
            }
            return rp;
        }));
    };

    const handleSave = async (roleName) => {
        const rp = rolesPerms.find(r => r.role === roleName);
        if (!rp) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/role-permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: rp.role,
                    permissions: rp.permissions,
                    adminId: currentUser.id
                })
            });

            if (res.ok) {
                setModified(m => ({ ...m, [roleName]: false }));
                alert(`Permisos para ${roleName} actualizados correctamente.`);
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setSaving(false);
        }
    };

    const permissionGroups = {
        'Páginas del Sistema': [
            'DASHBOARD_VIEW', 'SHIFTS_VIEW', 'CALCULO_VIEW', 'VACACIONES_VIEW', 
            'REQUESTS_VIEW', 'ANNOUNCEMENTS_VIEW', 'USERS_VIEW', 'AUDIT_LOGS_VIEW', 
            'MAINTENANCE_VIEW', 'TECH_DOC_VIEW', 'MANUAL_VIEW'
        ],
        'Usuarios (Acciones)': ['USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_CHANGE_PASSWORD'],
        'Turnos (Acciones)': ['SHIFTS_CREATE', 'SHIFTS_EDIT', 'SHIFTS_DELETE'],
        'Solicitudes (Acciones)': ['REQUESTS_CREATE', 'REQUESTS_APPROVE', 'REQUESTS_DELETE'],
        'Intercambios': ['SWAPS_PROPOSE', 'SWAPS_RESPOND', 'SWAPS_APPROVE'],
        'Zonas': ['ZONES_VIEW', 'ZONES_MANAGE'],
        'Tablón (Acciones)': ['ANNOUNCEMENTS_CREATE', 'ANNOUNCEMENTS_EDIT', 'ANNOUNCEMENTS_DELETE', 'GLOBAL_NOTICES_MANAGE'],
        'Admin': ['AUTH_ROLES_MANAGE', 'BACKUPS_MANAGE'],
        'Estadísticas': ['STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'STATS_VIEW_GLOBAL'],
        'Otros': ['VACATION_ADJUSTMENTS_MANAGE']
    };

    if (loading) return <div className="p-12 text-center text-gray-500 italic">Cargando matriz de permisos...</div>;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-companyBlue/10 text-companyBlue rounded-xl">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="font-black text-gray-800 dark:text-white uppercase tracking-tight">Matriz de Configuración RBAC</h2>
                        <p className="text-xs text-gray-500 font-medium">Gestiona qué puede hacer cada rol de forma dinámica</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-2xl border border-amber-100 dark:border-amber-800/30 text-xs font-bold">
                    <Info size={16} />
                    <span>Los cambios se aplican al siguiente inicio de sesión</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800">
                            <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500">Módulo / Permiso</th>
                            {rolesPerms.map(rp => (
                                <th key={rp.role} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span>{rp.role}</span>
                                        {modified[rp.role] && (
                                            <button 
                                                onClick={() => handleSave(rp.role)}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-[10px] tracking-wider font-bold uppercase animate-pulse"
                                            >
                                                <Save size={10} /> GUARDAR
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Object.entries(permissionGroups).map(([group, perms]) => (
                            <React.Fragment key={group}>
                                <tr className="bg-gray-100/30 dark:bg-gray-800/20">
                                    <td colSpan={rolesPerms.length + 1} className="px-6 py-2 font-black text-[10px] tracking-wider font-bold uppercase uppercase tracking-wider text-companyBlue dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10">
                                        {group}
                                    </td>
                                </tr>
                                {perms.map(p => (
                                    <tr key={p} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 dark:text-gray-300 text-xs">{p}</span>
                                                <span className="text-[10px] text-gray-400 italic">Permiso de {group.toLowerCase()}</span>
                                            </div>
                                        </td>
                                        {rolesPerms.map(rp => (
                                            <td key={`${rp.role}-${p}`} className="px-6 py-3 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={rp.permissions.includes(p)}
                                                        onChange={() => handleTogglePermission(rp.role, p)}
                                                        disabled={rp.role === 'admin'} // Admin siempre tiene todo
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-companyBlue shadow-inner transition-colors duration-300"></div>
                                                </label>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RolePermissionsTab;
