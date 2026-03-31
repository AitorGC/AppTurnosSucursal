import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import API_URL from '../apiConfig';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const UserFormModal = ({ isOpen, onClose, onSave, userToEdit }) => {
    const [formData, setFormData] = useState({
        employeeNumber: '',
        name: '',
        password: '',
        role: 'employee',
        branchId: '',
        zoneId: '',
        isActive: true,
        managedBranchIds: []
    });

    const [branches, setBranches] = useState([]);
    const [zones, setZones] = useState([]);
    const { user, hasPermission } = usePermissions();

    useEffect(() => {
        // Cargar sucursales (y sus zonas)
        fetch(`${API_URL}/branches?userId=${user.id}&role=${user.role}`)
            .then(res => res.json())
            .then(data => {
                const branchesData = Array.isArray(data) ? data : [];
                setBranches(branchesData);
                // Si hay data y es creación, preseleccionar primera sucursal y su zona
                if (branchesData.length > 0 && !userToEdit) {
                    const firstBranch = branchesData[0];
                    const branchZones = Array.isArray(firstBranch.zones) ? firstBranch.zones : [];
                    const firstZone = branchZones.length > 0 ? branchZones[0].id : '';
                    setFormData(prev => ({
                        ...prev,
                        branchId: firstBranch.id,
                        zoneId: firstZone
                    }));
                }
            })
            .catch(console.error);
    }, [user.id, user.role, userToEdit]);

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                ...userToEdit,
                password: '', // No mostrar password
                branchId: userToEdit.branchId,
                zoneId: userToEdit.zoneId,
                isActive: userToEdit.isActive ?? true,
                managedBranchIds: userToEdit.managedBranches ? userToEdit.managedBranches.map(b => b.id) : []
            });
        } else {
            // Reset form
            const defaultBranchId = branches.length > 0 ? branches[0].id : '';
            const defaultBranch = branches.find(b => b.id === defaultBranchId);
            const branchZones = defaultBranch && Array.isArray(defaultBranch.zones) ? defaultBranch.zones : [];
            const defaultZoneId = branchZones.length > 0 ? branchZones[0].id : '';

            setFormData({
                employeeNumber: '',
                name: '',
                password: '',
                role: 'employee',
                branchId: defaultBranchId,
                zoneId: defaultZoneId,
                isActive: true,
                managedBranchIds: []
            });
        }
    }, [userToEdit, branches]);

    // Efecto para inicializar zonas cuando carga branches o userToEdit
    // PERO NO para cambios manuales de branchId (eso va en handleChange)
    useEffect(() => {
        const selectedBranch = branches.find(b => b.id === parseInt(formData.branchId));
        if (selectedBranch && Array.isArray(selectedBranch.zones)) {
            setZones(selectedBranch.zones);
        } else {
            setZones([]);
        }
    }, [formData.branchId, branches]); // Mantenemos para carga inicial y cambios externos

    // Efecto para forzar zona "Oficina" si el rol es administración
    useEffect(() => {
        if (formData.role === 'administracion' && Array.isArray(zones) && zones.length > 0) {
            const officeZone = zones.find(z => z.name === 'Oficina');
            if (officeZone && formData.zoneId !== officeZone.id) {
                setFormData(prev => ({ ...prev, zoneId: officeZone.id }));
            }
        }
    }, [formData.role, zones]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'branchId') {
            const newBranchId = parseInt(value);
            const selectedBranch = branches.find(b => b.id === newBranchId);
            const branchZones = selectedBranch && Array.isArray(selectedBranch.zones) ? selectedBranch.zones : [];
            const defaultZoneId = branchZones.length > 0 ? branchZones[0].id : '';

            setFormData(prev => ({
                ...prev,
                [name]: value,
                zoneId: defaultZoneId // Actualizar zona inmediatamente
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleManagedBranchChange = (branchId) => {
        const bId = parseInt(branchId);
        setFormData(prev => {
            const current = prev.managedBranchIds || [];
            if (current.includes(bId)) {
                return { ...prev, managedBranchIds: current.filter(id => id !== bId) };
            } else {
                return { ...prev, managedBranchIds: [...current, bId] };
            }
        });
    };    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Keyboard: Esc closes modal
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-companyBlue to-blue-600 dark:from-gray-800 dark:to-gray-900 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white dark:text-blue-200 uppercase tracking-tight">{userToEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Número de Empleado</label>
                        <input
                            type="number"
                            name="employeeNumber"
                            value={formData.employeeNumber}
                            onChange={handleChange}
                            disabled={!!userToEdit || isSubmitting} // No editar ID empleado
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 transition-all outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            {userToEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none"
                            {...(!userToEdit && { required: true })}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none"
                                disabled={isSubmitting}
                            >
                                <option value="employee" className="dark:bg-gray-900">Empleado</option>
                                <option value="jefe_departamento" className="dark:bg-gray-900">Jefe de Departamento</option>
                                <option value="responsable" className="dark:bg-gray-900">Responsable</option>
                                <option value="administracion" className="dark:bg-gray-900">Oficina</option>
                                <option value="admin" className="dark:bg-gray-900">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Sucursal</label>
                            <select
                                name="branchId"
                                value={formData.branchId}
                                onChange={handleChange}
                                className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none"
                                required
                                disabled={isSubmitting}
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id} className="dark:bg-gray-900">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Zona</label>
                        <select
                            name="zoneId"
                            value={formData.zoneId}
                            onChange={handleChange}
                            disabled={formData.role === 'administracion' || isSubmitting}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm py-2.5 px-4 focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-sm dark:text-gray-200 transition-all outline-none appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                            required
                        >
                            {zones.map(z => (
                                <option key={z.id} value={z.id} className="dark:bg-gray-900">{z.name}</option>
                            ))}
                        </select>
                    </div>

                    {formData.role === 'responsable' && (
                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <label className="block text-sm font-bold text-gray-700 dark:text-blue-300 mb-2 italic">
                                Gestionar Sucursales Adicionales
                            </label>
                            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                {branches.filter(b => b.id !== parseInt(formData.branchId)).map(b => (
                                    <label key={b.id} className="flex items-center space-x-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.managedBranchIds?.includes(b.id)}
                                                onChange={() => !isSubmitting && handleManagedBranchChange(b.id)}
                                                className="sr-only peer"
                                                disabled={isSubmitting}
                                            />
                                            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md peer-checked:bg-companyBlue peer-checked:border-companyBlue transition-all"></div>
                                            <svg className="absolute w-3 h-3 text-white left-1 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                <path d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-companyBlue dark:group-hover:text-blue-400 transition-colors">
                                            {b.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                                El responsable podrá gestionar estas sucursales además de su sucursal base.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 my-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={(e) => !isSubmitting && setFormData({ ...formData, isActive: e.target.checked })}
                                className="sr-only peer"
                                disabled={isSubmitting}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-companyBlue dark:peer-checked:bg-blue-50"></div>
                        </label>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Estado del Usuario</span>
                            <span className={`text-xs font-semibold ${formData.isActive ? 'text-green-600 dark:text-slate-300' : 'text-red-600 dark:text-red-300'}`}>
                                {formData.isActive ? 'ACTIVO' : 'BAJA (Sin acceso al sistema)'}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 min-w-[120px] text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-950 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all border border-transparent dark:border-gray-800"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex items-center justify-center px-6 py-2.5 min-w-[120px] text-sm font-bold text-white bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 rounded-xl shadow-sm dark:shadow-soft-sm transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} className="mr-2" />
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
