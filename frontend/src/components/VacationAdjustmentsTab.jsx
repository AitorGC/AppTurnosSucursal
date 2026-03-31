import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, CalendarPlus, UserCheck } from 'lucide-react';
import API_URL from '../apiConfig';

const VacationAdjustmentsTab = ({ externalBranchId }) => {
    const [adjustments, setAdjustments] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        userId: '',
        days: '',
        reason: '',
        year: new Date().getFullYear().toString()
    });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Lista de años disponibles (actual y próximo)
    const currentY = new Date().getFullYear();
    const availableYears = [currentY.toString(), (currentY + 1).toString()];

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users?userId=${currentUser.id}`);
            const data = await res.json();
            if (!Array.isArray(data)) {
                setAvailableUsers([]);
                return;
            }
            const bId = externalBranchId || (currentUser.role === 'responsable' ? currentUser.branchId : '');
            if (bId) {
                setAvailableUsers(data.filter(u => u.branchId === parseInt(bId)));
            } else {
                setAvailableUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setAvailableUsers([]);
        }
    };

    const fetchAdjustments = async () => {
        setLoading(true);
        try {
            const bId = externalBranchId || (currentUser.role === 'responsable' ? currentUser.branchId : '');
            const query = bId ? `&branchId=${bId}` : '';
            const res = await fetch(`${API_URL}/vacation-adjustments?year=${filterYear}${query}&userId=${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setAdjustments(Array.isArray(data) ? data : []);
            } else {
                setAdjustments([]);
            }
        } catch (error) {
            console.error('Error fetching adjustments:', error);
            setAdjustments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [externalBranchId]);

    useEffect(() => {
        fetchAdjustments();
    }, [filterYear, externalBranchId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.userId || !formData.days || !formData.reason || !formData.year) {
            alert('Por favor, rellena todos los campos');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/vacation-adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: formData.userId,
                    days: formData.days,
                    reason: formData.reason,
                    year: formData.year,
                    actorId: currentUser.id,
                    actorRole: currentUser.role,
                    actorBranchId: externalBranchId || currentUser.branchId
                })
            });

            if (res.ok) {
                setFormData({ ...formData, userId: '', days: '', reason: '' });
                fetchAdjustments(); // Recargar tabla
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar ajuste');
            }
        } catch (error) {
            console.error('Error saving adjustment:', error);
            alert('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este ajuste?')) return;

        try {
            const bId = externalBranchId || currentUser.branchId;
            const res = await fetch(`${API_URL}/vacation-adjustments/${id}?actorId=${currentUser.id}&actorRole=${currentUser.role}&actorBranchId=${bId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchAdjustments();
            } else {
                const err = await res.json();
                alert(err.message || 'Error al eliminar ajuste');
            }
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            alert('Error de conexión');
        }
    };

    const filteredAdjustments = adjustments.filter(adj =>
        (adj.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (adj.user?.employeeNumber?.toString() || '').includes(searchTerm)
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Columna Izquierda: Formulario (1/3 ocuppacion) */}
            <div className="xl:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-companyBlue/10 dark:bg-blue-900/30 rounded-2xl text-companyBlue dark:text-blue-200">
                            <CalendarPlus size={24} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Nuevo Ajuste</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Empleado</label>
                            <select
                                name="userId"
                                value={formData.userId}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue"
                                required
                            >
                                <option value="">Selecciona empleado...</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} (Nº {u.employeeNumber})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Año</label>
                                <select
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue"
                                    required
                                >
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Días</label>
                                <input
                                    type="number"
                                    name="days"
                                    step="0.5"
                                    value={formData.days}
                                    onChange={handleChange}
                                    placeholder="+N o -N"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Motivo</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                placeholder="Ej: Horas extra compensadas..."
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center py-3 bg-companyBlue dark:bg-blue-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blue-800 transition-colors disabled:opacity-50 mt-4"
                        >
                            <Plus size={18} className="mr-2" />
                            {isSubmitting ? 'Guardando...' : 'Conceder Ajuste'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Columna Derecha: Ranking / Tabla (2/3 ocuppacion) */}
            <div className="xl:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col h-full">

                    {/* Controles de tabla */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-2xl text-gray-600 dark:text-gray-300">
                                <UserCheck size={24} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Historial de Ajustes</h3>
                        </div>

                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar empleado..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-companyBlue outline-none dark:text-gray-200"
                                />
                            </div>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-companyBlue outline-none dark:text-gray-200 font-bold"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tabla de ajustes */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                            <thead className="bg-gray-50/50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500">Empleado</th>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500 text-center">Días</th>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500">Motivo</th>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500">Autorizador</th>
                                    <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">Cargando ajustes...</td>
                                    </tr>
                                ) : filteredAdjustments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">No se encontraron ajustes para el año seleccionado.</td>
                                    </tr>
                                ) : (
                                    filteredAdjustments.map((adj) => (
                                        <tr key={adj.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-50/5 transition">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 dark:text-gray-200">{adj.user?.name}</p>
                                                <p className="text-[10px] font-medium text-gray-400">Nº {adj.user?.employeeNumber}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider ${adj.days > 0 ? 'bg-green-100 text-green-700 dark:bg-slate-800/60 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-slate-800/60 dark:text-red-400'}`}>
                                                    {adj.days > 0 ? '+' : ''}{adj.days}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" title={adj.reason}>{adj.reason}</p>
                                                <p className="text-[10px] text-gray-400 mt-1">{new Date(adj.createdAt).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-xs dark:text-gray-400">
                                                {adj.authorizedBy?.name || 'Sistema'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(adj.id)}
                                                    className="p-2 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all"
                                                    title="Eliminar Ajuste"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VacationAdjustmentsTab;
