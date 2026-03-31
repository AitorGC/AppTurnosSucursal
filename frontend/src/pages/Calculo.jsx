import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, User, Users, Calendar, Download, RefreshCw, Trophy, Clock, Star, ChevronDown } from 'lucide-react';
import API_URL from '../apiConfig';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';
import { jsPDF } from 'jspdf';
import { numeroALetras } from '../utils/numberToWords';
import { ChevronRight, ChevronDown as ChevronDownIcon, MapPin, Building2, Layout } from 'lucide-react';

const HierarchicalNode = ({ node, type, expandedNodes, setExpandedNodes }) => {
    const isExpanded = expandedNodes.has(`${type}-${node.id || node.name}`);
    const toggle = () => {
        const newSet = new Set(expandedNodes);
        if (isExpanded) newSet.delete(`${type}-${node.id || node.name}`);
        else newSet.add(`${type}-${node.id || node.name}`);
        setExpandedNodes(newSet);
    };

    const hasChildren = (type === 'branch' && node.zones.length > 0) || (type === 'zone' && node.subZones.length > 0);

    const icons = {
        branch: <Building2 size={16} className="text-companyBlue dark:text-blue-200" />,
        zone: <Layout size={16} className="text-purple-600 dark:text-purple-200" />,
        subzone: <MapPin size={16} className="text-gray-400 dark:text-gray-500" />
    };

    const colors = {
        branch: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800',
        zone: 'bg-white dark:bg-slate-950 border-gray-50 dark:border-gray-900 ml-6',
        subzone: 'bg-gray-50/30 dark:bg-gray-900/10 border-transparent ml-12'
    };

    return (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div
                onClick={hasChildren ? toggle : undefined}
                className={`flex items-center justify-between p-4 rounded-xl border ${colors[type]} ${hasChildren ? 'cursor-pointer hover:border-companyBlue/30 transition-all' : ''}`}
            >
                <div className="flex items-center space-x-3">
                    {hasChildren && (
                        isExpanded ? <ChevronDownIcon size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />
                    )}
                    <div className="flex items-center space-x-2">
                        {icons[type]}
                        <span className={`text-sm font-bold ${type === 'branch' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {node.name}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Normal</p>
                        <p className={`text-sm font-black ${node.normal > 0 ? 'text-companyBlue dark:text-blue-200' : 'text-gray-300'}`}>
                            {node.normal.toFixed(1)}h
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Extra</p>
                        <p className={`text-sm font-black ${node.extra > 0 ? 'text-companyRed dark:text-slate-300' : 'text-gray-300'}`}>
                            {node.extra.toFixed(1)}h
                        </p>
                    </div>
                </div>
            </div>

            {isExpanded && type === 'branch' && (
                <div className="mt-2 space-y-2">
                    {node.zones.map(zone => (
                        <HierarchicalNode
                            key={zone.id}
                            node={zone}
                            type="zone"
                            expandedNodes={expandedNodes}
                            setExpandedNodes={setExpandedNodes}
                        />
                    ))}
                </div>
            )}

            {isExpanded && type === 'zone' && (
                <div className="mt-2 space-y-2">
                    {node.subZones.map(sz => (
                        <HierarchicalNode
                            key={sz.name}
                            node={sz}
                            type="subzone"
                            expandedNodes={expandedNodes}
                            setExpandedNodes={setExpandedNodes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Calculo = () => {
    const { hasPermission, user } = usePermissions();

    // Descomponer YYYY-MM inicial
    const initialDate = new Date();
    const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((initialDate.getMonth() + 1).toString().padStart(2, '0'));

    // El estado 'month' consolidado para las peticiones API
    const month = `${selectedYear}-${selectedMonth}`;

    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [stats, setStats] = useState({ normal: 0, extra: 0, breakdown: [] });
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [ranking, setRanking] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [loading, setLoading] = useState(false);

    const meses = [
        { val: '01', name: 'Enero' }, { val: '02', name: 'Febrero' }, { val: '03', name: 'Marzo' },
        { val: '04', name: 'Abril' }, { val: '05', name: 'Mayo' }, { val: '06', name: 'Junio' },
        { val: '07', name: 'Julio' }, { val: '08', name: 'Agosto' }, { val: '09', name: 'Septiembre' },
        { val: '10', name: 'Octubre' }, { val: '11', name: 'Noviembre' }, { val: '12', name: 'Diciembre' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`);
                if (!res.ok) {
                    setBranches([]);
                    return;
                }
                const data = await res.json();
                const branchesData = Array.isArray(data) ? data : [];
                setBranches(branchesData);
                if (branchesData.length > 0 && !selectedBranchId) {
                    setSelectedBranchId(branchesData[0].id.toString());
                }
            } catch (e) { 
                console.error('Error fetching branches:', e); 
                setBranches([]);
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch(`${API_URL}/users?userId=${user.id}&role=${user.role}`);
                if (!res.ok) {
                    setUsers([]);
                    return;
                }
                const data = await res.json();
                if (!Array.isArray(data)) {
                    setUsers([]);
                    return;
                }
                const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
                const filtered = bId ? data.filter(u => u.branchId === parseInt(bId)) : data;
                setUsers(filtered);
                if (filtered.length > 0) setSelectedUserId(filtered[0].id.toString());
                else setSelectedUserId('');
            } catch (e) {
                console.error('Error fetching users:', e);
                setUsers([]);
            }
        };
        fetchUsers();
    }, [selectedBranchId]);

    useEffect(() => {
        if (selectedUserId && month) {
            fetchIndividualStats();
        }
    }, [selectedUserId, month]);

    useEffect(() => {
        if (month) {
            fetchRanking();
        }
    }, [month, selectedBranchId]);

    const fetchIndividualStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/stats/employee/${selectedUserId}?month=${month}&userId=${user.id}&role=${user.role}`);
            const data = await res.json();
            setStats({
                normal: data.normal || 0,
                extra: data.extra || 0,
                breakdown: data.breakdown || []
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRanking = async () => {
        const bId = selectedBranchId || (hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) ? '' : user.branchId);
        if (!bId) {
            setRanking([]);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/stats/ranking?branchId=${bId}&month=${month}&userId=${user.id}&role=${user.role}`);
            if (!res.ok) {
                setRanking([]);
                return;
            }
            const data = await res.json();
            setRanking(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
            setRanking([]);
        }
    };

    const handleExportPDF = () => {
        const selectedEmployee = users.find(u => u.id.toString() === selectedUserId);
        if (!selectedEmployee) return;

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const totalAmount = stats.extra * 12;
        const totalAmountWords = numeroALetras(totalAmount);
        const monthName = meses.find(m => m.val === selectedMonth).name.toUpperCase();
        const currentFullDate = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);

        const margin = 25;
        let y = 40;
        const lineHeight = 7;
        const maxWidth = 160;

        // Line 1 & 2 logic: Mixed colors
        // "HE RECIBIDO DE LA EMPRESA AUTEIDE, S.A., LA CANTIDAD DE" (Black)
        // "[Total] €" (Red)
        // "( [Words] EUROS)," (Red)
        // "EN CONCEPTO DE" (Black)
        // "[Horas] HORAS ADICIONALES DE ALMACÉN REALIZADAS EN EL MES DE" (Black) -> Wait, user says "Horas adicionales" and "Mes" are red too.

        // Let's use specific positions for simplicity as it's a fixed template

        doc.setTextColor(0, 0, 0);
        doc.text('HE RECIBIDO DE LA EMPRESA AUTEIDE, S.A., LA', margin, y);
        y += lineHeight;

        doc.setTextColor(0, 0, 0);
        doc.text('CANTIDAD DE ', margin, y);
        let x = margin + doc.getTextWidth('CANTIDAD DE ');

        doc.setTextColor(255, 0, 0);
        doc.text(`${totalAmount.toFixed(0)} €`, x, y);
        x += doc.getTextWidth(`${totalAmount.toFixed(0)} € `);

        doc.text(`( ${totalAmountWords} )`, x, y);
        y += lineHeight;

        doc.setTextColor(0, 0, 0);
        doc.text('EN CONCEPTO DE ', margin, y);
        x = margin + doc.getTextWidth('EN CONCEPTO DE ');

        doc.setTextColor(255, 0, 0);
        doc.text(`${stats.extra.toFixed(1)}`, x, y);
        x += doc.getTextWidth(`${stats.extra.toFixed(1)} `);

        doc.setTextColor(0, 0, 0);
        doc.text(' HORAS ADICIONALES DE', x, y);
        y += lineHeight;

        doc.text('ALMACÉN REALIZADAS EN EL MES DE ', margin, y);
        x = margin + doc.getTextWidth('ALMACÉN REALIZADAS EN EL MES DE ');

        doc.setTextColor(255, 0, 0);
        doc.text(monthName, x, y);
        x += doc.getTextWidth(monthName + ' ');

        doc.setTextColor(0, 0, 0);
        doc.text('DE', x, y);
        y += lineHeight;

        doc.setTextColor(255, 0, 0);
        doc.text(selectedYear + '.', margin, y);

        y += lineHeight * 4;

        doc.setTextColor(0, 0, 0);
        doc.text('LAS PALMAS DE G.C., A ', margin, y);
        x = margin + doc.getTextWidth('LAS PALMAS DE G.C., A ');

        doc.setTextColor(255, 0, 0);
        doc.text(currentFullDate, x, y);

        y += lineHeight * 3;

        doc.setTextColor(0, 0, 0);
        doc.text('FDO.: ', margin, y);
        x = margin + doc.getTextWidth('FDO.: ');

        doc.setTextColor(255, 0, 0);
        doc.text(selectedEmployee.name.toUpperCase(), x, y);

        doc.save(`Recibo_Horas_Extras_${selectedEmployee.name}_${month}.pdf`);
    };

    const handleExportCSV = () => {
        const selectedEmployee = users.find(u => u.id.toString() === selectedUserId);
        if (!selectedEmployee || stats.breakdown.length === 0) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Sucursal,Zona,Subzona,Horas Normales,Horas Extras\n";

        stats.breakdown.forEach(branch => {
            branch.zones.forEach(zone => {
                zone.subZones.forEach(sz => {
                    csvContent += `"${branch.name}","${zone.name}","${sz.name}",${sz.normal.toFixed(1)},${sz.extra.toFixed(1)}\n`;
                });
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Reporte_Horas_${selectedEmployee.name}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Rankings específicos
    const normalRanking = [...ranking].sort((a, b) => b.normal - a.normal);
    const extraRanking = [...ranking].sort((a, b) => b.extra - a.extra);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">Cálculo de Horas</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de rendimiento y eficiencia por sucursal.</p>
                </div>

                {/* Custom Month/Year Selector */}
                <div className="flex items-center space-x-2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800">
                        <Calendar size={18} className="text-companyBlue dark:text-blue-200 mr-2" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none appearance-none pr-6 relative"
                            style={{ backgroundImage: 'none' }}
                        >
                            {meses.map(m => (
                                <option key={m.val} value={m.val} className="dark:bg-gray-900">{m.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-gray-400 -ml-4 pointer-events-none" />
                    </div>

                    <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer outline-none appearance-none pr-6"
                        >
                            {years.map(y => (
                                <option key={y} value={y} className="dark:bg-gray-900">{y}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-gray-400 -ml-4 pointer-events-none" />
                    </div>

                    {(hasPermission(PERMISSIONS.AUTH_ROLES_MANAGE) || (hasPermission(PERMISSIONS.STATS_VIEW_BRANCH) && branches.length > 1)) && (
                        <div className="flex items-center px-3 py-2 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-gray-800">
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
                </div>
            </div>

            {/* Individual Stats Section */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center space-x-3 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-companyBlue dark:text-blue-200">
                        <User size={24} />
                    </div>
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">Estadísticas por Empleado</h3>
                </div>

                <div className="p-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Selector Column */}
                        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Seleccionar Perfil</label>
                                <div className="relative">
                                    <select
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border-2 border-gray-200 dark:border-gray-800 rounded-xl py-4 px-4 text-gray-700 dark:text-gray-200 font-semibold focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-companyBlue dark:focus:border-cyan-500 transition-all outline-none appearance-none cursor-pointer shadow-sm hover:border-gray-200 dark:hover:border-gray-700"
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id} className="dark:bg-gray-900">{u.employeeNumber} - {u.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3">
                                <button
                                    onClick={handleExportPDF}
                                    className="w-full flex items-center justify-center space-x-2 bg-gray-800 dark:bg-companyBlue hover:bg-black dark:hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-blue-900/10"
                                >
                                    <Download size={20} />
                                    <span>Recibo PDF (Extras)</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-emerald-900/10"
                                >
                                    <Calculator size={20} />
                                    <span>Exportar CSV Detallado</span>
                                </button>
                            </div>
                        </div>

                        {/* Cards Row */}
                        <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Normal Hours Card */}
                            <div className="bg-white dark:bg-slate-950 border-2 border-blue-50 dark:border-blue-700/40 p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center min-h-[160px] shadow-sm hover:shadow-md dark:shadow-soft-sm transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex items-center space-x-6">
                                    <div className="p-4 bg-companyBlue/10 dark:bg-blue-900/30 text-companyBlue dark:text-blue-200 rounded-2xl">
                                        <Clock size={32} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-[0.2em] mb-1">Horas Normales</p>
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-5xl font-black text-companyBlue dark:text-blue-200 tabular-nums">{stats.normal.toFixed(1)}</span>
                                            <span className="text-base font-bold text-companyBlue/50 dark:text-blue-200/50">h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Overtime Hours Card */}
                            <div className="bg-white dark:bg-slate-950 border-2 border-red-50 dark:border-slate-600 p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center min-h-[160px] shadow-sm hover:shadow-md dark:shadow-soft-sm transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 dark:bg-slate-800/60 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex items-center space-x-6">
                                    <div className="p-4 bg-companyRed/10 dark:bg-slate-800/60 text-companyRed dark:text-slate-300 rounded-2xl">
                                        <TrendingUp size={32} />
                                    </div>
                                    <div>
                                        <p className="text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-[0.2em] mb-1">Horas Extras</p>
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-5xl font-black text-companyRed dark:text-slate-300 tabular-nums">{stats.extra.toFixed(1)}</span>
                                            <span className="text-base font-bold text-companyRed/50 dark:text-slate-300/50">h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hierarchical Breakdown */}
                    {stats.breakdown.length > 0 && (
                        <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 px-2 uppercase tracking-wider">Desglose Detallado</h4>
                            <div className="space-y-3">
                                {stats.breakdown.map(branch => (
                                    <HierarchicalNode
                                        key={branch.id}
                                        node={branch}
                                        type="branch"
                                        expandedNodes={expandedNodes}
                                        setExpandedNodes={setExpandedNodes}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rankings Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Normal Hours Ranking */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-companyBlue dark:text-blue-200">
                                <Trophy size={20} />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Ranking Horas Normales</h3>
                        </div>
                        <span className="text-[10px] font-black tracking-tighter text-companyBlue dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase">Mayor Dedicación</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 dark:bg-slate-950">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Puesto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Empleado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Acumulado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {normalRanking.map((row, index) => (
                                    <tr key={row.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-50/5 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm ${index === 0 ? 'bg-yellow-400 text-white animate-pulse shadow-neon-cyan/20' : index === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : index === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{row.name}</p>
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tight">ID: {row.employeeNumber}</p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-sm font-black text-companyBlue dark:text-blue-200 bg-blue-50 dark:bg-blue-50/10 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-700/40 shadow-sm">
                                                {row.normal.toFixed(1)}h
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {normalRanking.length === 0 && (
                                    <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 text-sm italic">Esperando datos de este mes...</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Overtime Hours Ranking */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-red-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-red-100 dark:bg-slate-800/60 rounded-lg text-companyRed dark:text-slate-300">
                                <Star size={20} />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Ranking Horas Extras</h3>
                        </div>
                        <span className="text-[10px] font-black tracking-tighter text-companyRed dark:text-slate-300 bg-red-100 dark:bg-slate-800/60 px-3 py-1 rounded-full uppercase">Picos de Carga</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-red-50/50 dark:bg-slate-950">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Puesto</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Empleado</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Acumulado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {extraRanking.map((row, index) => (
                                    <tr key={row.id} className={`hover:bg-red-50/20 dark:hover:bg-lime-400/5 transition-colors ${row.extra > 40 ? 'bg-red-50/10 dark:bg-slate-800/60' : ''}`}>
                                        <td className="px-6 py-5">
                                            <div className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-sm ${index === 0 && row.extra > 0 ? 'bg-companyRed dark:bg-slate-800 text-white ' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{row.name}</p>
                                            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tight">ID: {row.employeeNumber}</p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className={`text-sm font-black px-4 py-2 rounded-xl border transition-all ${row.extra > 0 ? 'text-companyRed dark:text-slate-300 bg-red-50 dark:bg-slate-800/60 border-red-100 dark:border-slate-600 shadow-sm' : 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-gray-800'}`}>
                                                {row.extra.toFixed(1)}h
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {extraRanking.length === 0 && (
                                    <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-400 dark:text-gray-600 text-sm italic">No hay horas extras registradas</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Calculo;
