import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, Eye, History, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import API_URL from '../apiConfig';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAction, setSelectedAction] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            let url = `${API_URL}/audit-logs?adminId=${user.id}&`;
            if (selectedAction) url += `action=${selectedAction}&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;

            const res = await fetch(url);
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [selectedAction, startDate, endDate]);

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

    const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => {
        const matchesSearch = log.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Sort logs
    const sortedLogs = [...filteredLogs].sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'createdAt') {
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
        } else if (sortConfig.key === 'user') {
            aValue = a.user?.name.toLowerCase() || '';
            bValue = b.user?.name.toLowerCase() || '';
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const actionTypes = [
        'Creación de Turno',
        'Edición de Turno',
        'Eliminación de Turno',
        'Aprobación de Solicitud',
        'Rechazo de Solicitud',
        'Actualización de Usuario'
    ];

    const formatDetails = (details) => {
        if (!details) return '-';
        return (
            <div className="text-[10px] font-mono bg-gray-50 dark:bg-slate-950 p-2 rounded border border-gray-200 dark:border-gray-800 max-h-32 overflow-y-auto">
                <pre>{JSON.stringify(details, null, 2)}</pre>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Logs del Sistema</h2>
                <div className="flex items-center space-x-2 text-xs font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <History size={16} />
                    <span>Último 500 registros</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Filters */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por usuario o acción..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="relative">
                                <select
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                    className="pl-10 pr-8 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none font-medium"
                                >
                                    <option value="">Todas las Acciones</option>
                                    {actionTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-sm dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue"
                                />
                                <span className="text-gray-400">al</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-slate-950 text-sm dark:text-gray-200 outline-none focus:ring-2 focus:ring-companyBlue"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                        <thead className="bg-gray-50/50 dark:bg-slate-950 border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th onClick={() => handleSort('createdAt')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center">Fecha/Hora {getSortIcon('createdAt')}</div>
                                </th>
                                <th onClick={() => handleSort('user')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center">Usuario (Actor) {getSortIcon('user')}</div>
                                </th>
                                <th onClick={() => handleSort('action')} className="px-6 py-4 font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center">Acción {getSortIcon('action')}</div>
                                </th>
                                <th className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-gray-500 dark:text-gray-400">Detalles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">Cargando logs...</td>
                                </tr>
                            ) : sortedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">No se encontraron registros</td>
                                </tr>
                            ) : (
                                sortedLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-50/5 transition group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900 dark:text-gray-200">
                                                {new Date(log.createdAt).toLocaleDateString('es-ES')}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(log.createdAt).toLocaleTimeString('es-ES')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3 font-black text-xs text-gray-500 dark:text-gray-400">
                                                    {log.user?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{log.user?.name}</span>
                                                    <span className="block text-[10px] text-gray-400 uppercase tracking-tighter">ID: {log.user?.employeeNumber}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${log.action.includes('Creación') ? 'bg-green-100 dark:bg-slate-800/60 text-green-700 dark:text-slate-300' :
                                                    log.action.includes('Eliminación') ? 'bg-red-100 dark:bg-slate-800/60 text-red-700 dark:text-red-300' :
                                                        log.action.includes('Edición') ? 'bg-blue-100 dark:bg-blue-900/30 text-companyBlue dark:text-blue-200' :
                                                            'bg-purple-100 dark:bg-slate-800/60 text-purple-700 dark:text-purple-200'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            {formatDetails(log.details)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
