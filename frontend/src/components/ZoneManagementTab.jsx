import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Layers, Building2, Globe } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';
import API_URL from '../apiConfig';

const ZoneManagementTab = ({ branches }) => {
    const { hasPermission } = usePermissions();
    const [definitions, setDefinitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddingZone, setIsAddingZone] = useState(false);
    const [newZoneName, setNewZoneName] = useState('');
    const [isAddingSubZone, setIsAddingSubZone] = useState(null); // definitionId
    const [newSubZoneName, setNewSubZoneName] = useState('');
    const [newSubZoneBranchId, setNewSubZoneBranchId] = useState('');

    const fetchDefinitions = async () => {
        setLoading(true);
        try {
            const admin = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch(`${API_URL}/zone-definitions?userId=${admin.id}&role=${admin.role}`);
            const data = await res.json();
            setDefinitions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching zone definitions:', error);
            setDefinitions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDefinitions();
    }, []);

    const handleCreateZone = async () => {
        if (!newZoneName) return;
        try {
            const admin = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch(`${API_URL}/zone-definitions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newZoneName, userId: admin.id })
            });
            if (res.ok) {
                setNewZoneName('');
                setIsAddingZone(false);
                fetchDefinitions();
            }
        } catch (error) {
            console.error('Error creating zone definition:', error);
        }
    };

    const handleDeleteZone = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta definición de zona? Esto NO borrará las zonas ya creadas en sucursales, pero sí la relación.')) {
            try {
                const admin = JSON.parse(localStorage.getItem('user') || '{}');
                await fetch(`${API_URL}/zone-definitions/${id}?adminId=${admin.id}`, { method: 'DELETE' });
                fetchDefinitions();
            } catch (error) {
                console.error('Error deleting zone definition:', error);
            }
        }
    };

    const handleCreateSubZone = async (definitionId) => {
        if (!newSubZoneName) return;
        try {
            const admin = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch(`${API_URL}/subzones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newSubZoneName,
                    definitionId,
                    branchId: newSubZoneBranchId || null,
                    userId: admin.id
                })
            });
            if (res.ok) {
                setNewSubZoneName('');
                setNewSubZoneBranchId('');
                setIsAddingSubZone(null);
                fetchDefinitions();
            }
        } catch (error) {
            console.error('Error creating subzone:', error);
        }
    };

    const handleDeleteSubZone = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta subzona?')) {
            try {
                const admin = JSON.parse(localStorage.getItem('user') || '{}');
                await fetch(`${API_URL}/subzones/${id}?adminId=${admin.id}`, { method: 'DELETE' });
                fetchDefinitions();
            } catch (error) {
                console.error('Error deleting subzone:', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-white flex items-center gap-2">
                        <MapPin size={20} className="text-companyBlue" />
                        Definiciones de Zona
                    </h3>
                    {hasPermission(PERMISSIONS.ZONES_MANAGE) && (
                        <button
                            onClick={() => setIsAddingZone(true)}
                            className="p-2 bg-companyBlue/10 text-companyBlue rounded-xl hover:bg-companyBlue/20 transition"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>

                {hasPermission(PERMISSIONS.ZONES_MANAGE) && isAddingZone && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Nombre de la zona (ej. Almacén)"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-companyBlue"
                        />
                        <button
                            onClick={handleCreateZone}
                            className="px-4 py-2 bg-companyBlue text-white rounded-xl font-bold text-sm"
                        >
                            Crear
                        </button>
                        <button
                            onClick={() => setIsAddingZone(false)}
                            className="px-4 py-2 text-gray-500 text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-full py-12 text-center text-gray-400 italic">Cargando zonas...</div>
                    ) : definitions.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-400 italic">No hay zonas definidas</div>
                    ) : (
                        definitions.map(def => (
                            <div key={def.id} className="border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-companyAlpha transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{def.name}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            Presente en {def.zones?.length || 0} sucursales
                                        </p>
                                    </div>
                                    {hasPermission(PERMISSIONS.ZONES_MANAGE) && (
                                        <button
                                            onClick={() => handleDeleteZone(def.id)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-950 px-3 py-2 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <Layers size={14} /> Subzonas
                                        </span>
                                        {hasPermission(PERMISSIONS.ZONES_MANAGE) && (
                                            <button
                                                onClick={() => setIsAddingSubZone(def.id)}
                                                className="text-companyBlue hover:bg-white dark:hover:bg-blue-900/40 p-1 rounded-lg transition"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {hasPermission(PERMISSIONS.ZONES_MANAGE) && isAddingSubZone === def.id && (
                                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Nombre subzona (ej. Rutas)"
                                                value={newSubZoneName}
                                                onChange={(e) => setNewSubZoneName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 text-xs outline-none focus:ring-2 focus:ring-companyBlue"
                                            />
                                            <select
                                                value={newSubZoneBranchId}
                                                onChange={(e) => setNewSubZoneBranchId(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900 text-xs outline-none"
                                            >
                                                <option value="">Global (Todas las sucursales)</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleCreateSubZone(def.id)}
                                                    className="flex-1 py-2 bg-companyBlue text-white rounded-lg font-bold text-[10px] uppercase tracking-wider"
                                                >
                                                    Agregar
                                                </button>
                                                <button
                                                    onClick={() => setIsAddingSubZone(null)}
                                                    className="px-3 py-2 text-gray-500 text-[10px] font-bold"
                                                >
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                        {def.subZones?.map(sz => (
                                            <div key={sz.id} className="flex justify-between items-center px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl group/sz">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{sz.name}</span>
                                                    {sz.branchId ? (
                                                        <span className="flex items-center gap-1 text-[10px] tracking-wider font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-0.5 rounded-full">
                                                            <Building2 size={8} /> {sz.branch.name}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] tracking-wider font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 px-2 py-0.5 rounded-full">
                                                            <Globe size={8} /> Global
                                                        </span>
                                                    )}
                                                </div>
                                                {hasPermission(PERMISSIONS.ZONES_MANAGE) && (
                                                    <button
                                                        onClick={() => handleDeleteSubZone(sz.id)}
                                                        className="opacity-100 md:opacity-0 group-hover/sz:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZoneManagementTab;
