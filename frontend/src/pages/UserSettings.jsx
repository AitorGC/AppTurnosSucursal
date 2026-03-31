import React, { useState, useEffect } from 'react';
import { Settings, Lock, User as UserIcon, Calendar, Bell, Palette, Save, Key, AlertCircle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import API_URL from '../apiConfig';
import { useTheme } from '../contexts/ThemeContext';

const AVATARS = [
    '/avatars/avatar1.png', // We'll just use simple urls or emoji placeholders if images aren't present.
    '/avatars/avatar2.png',
    '/avatars/avatar3.png',
    '/avatars/avatar4.png',
    '/avatars/avatar5.png',
    '/avatars/avatar6.png',
];

// Fallbacks directly in UI if real images don't exist
const AVATAR_FALLBACKS = ['👨‍💼', '👩‍💼', '👷‍♂️', '👷‍♀️', '🧑‍🔧', '🧑‍🚀', '👨‍🔧', '👩‍🔧', '🚐', '🚚'];

const UserSettings = () => {
    const { changeTheme } = useTheme();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

    // Configuración Personal State
    const [personalData, setPersonalData] = useState({
        avatarUrl: user.avatarUrl || '0', // Index of AVATAR_FALLBACKS
        birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
        showBirthday: user.showBirthday !== undefined ? user.showBirthday : true,
        themePreference: user.themePreference || 'system',
        notificationPrefs: user.notificationPrefs || { notifyOnApproval: true, notifyOnComments: true, notifyOnUrgent: true }
    });
    const [personalStatus, setPersonalStatus] = useState({ loading: false, error: '', success: false });

    // Contraseña State
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: '', success: false });

    const handlePersonalChange = (field, value) => {
        setPersonalData(prev => ({ ...prev, [field]: value }));
    };

    const handleNotificationChange = (field, checked) => {
        setPersonalData(prev => ({
            ...prev,
            notificationPrefs: { ...prev.notificationPrefs, [field]: checked }
        }));
    };

    const handlePersonalSubmit = async (e) => {
        e.preventDefault();
        setPersonalStatus({ loading: true, error: '', success: false });

        try {
            const payload = {
                name: user.name,
                role: user.role,
                branchId: user.branchId,
                zoneId: user.zoneId,
                avatarUrl: personalData.avatarUrl,
                birthDate: personalData.birthDate || null,
                showBirthday: personalData.showBirthday,
                themePreference: personalData.themePreference,
                notificationPrefs: personalData.notificationPrefs,
                userId: user.id
            };

            const res = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updatedUser = await res.json();

                // Actualizar contexto/localstorage
                const newUserObj = { ...user, ...updatedUser };
                localStorage.setItem('user', JSON.stringify(newUserObj));
                setUser(newUserObj);

                // Aplicar tema instantáneamente
                changeTheme(personalData.themePreference);

                setPersonalStatus({ loading: false, error: '', success: true });
                setTimeout(() => setPersonalStatus(prev => ({ ...prev, success: false })), 3000);
            } else {
                const data = await res.json();
                setPersonalStatus({ loading: false, error: data.message || 'Error al guardar configuración', success: false });
            }
        } catch (e) {
            setPersonalStatus({ loading: false, error: 'Error de conexión', success: false });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordStatus({ loading: true, error: '', success: false });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordStatus({ loading: false, error: 'Las contraseñas no coinciden', success: false });
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/${user.id}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: passwordData.newPassword })
            });

            if (res.ok) {
                setPasswordStatus({ loading: false, error: '', success: true });
                setPasswordData({ newPassword: '', confirmPassword: '' });

                const updatedUser = { ...user, mustChangePassword: false };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);

                setTimeout(() => setPasswordStatus(prev => ({ ...prev, success: false })), 3000);
            } else {
                const data = await res.json();
                setPasswordStatus({ loading: false, error: data.message || 'Error al cambiar contraseña', success: false });
            }
        } catch (e) {
            setPasswordStatus({ loading: false, error: 'Error de conexión', success: false });
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-companyBlue dark:bg-blue-900/30 text-white dark:text-blue-200 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-soft-sm">
                    <Settings size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Perfil de Usuario</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Visualiza tus datos corporativos y gestiona tus preferencias</p>
                </div>
            </div>

            <div className="grid gap-8">
                {/* Bloque A: Datos Corporativos (Solo Lectura) */}
                <section className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10 text-gray-400 dark:text-gray-500 pointer-events-none">
                        <Lock size={120} />
                    </div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Datos Corporativos</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Información no editable. Contacta con RRHH si hay algún error.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Nombre Completo</label>
                            <input type="text" disabled value={user.name || ''} className="w-full px-4 py-3 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 font-medium cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">ID / Número de Empleado</label>
                            <input type="text" disabled value={user.employeeNumber || ''} className="w-full px-4 py-3 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 font-medium cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Rol</label>
                            <input type="text" disabled value={user.role ? user.role.toUpperCase() : ''} className="w-full px-4 py-3 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 font-medium cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Sucursal / Zona</label>
                            <input type="text" disabled value={`${user.branch?.name || 'N/A'} - ${user.zone?.name || 'N/A'}`} className="w-full px-4 py-3 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 font-medium cursor-not-allowed" />
                        </div>
                    </div>
                </section>

                {/* Bloque B: Configuración Personal (Editable) */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-companyBlue dark:text-blue-300 rounded-xl">
                            <UserIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Configuración Personal</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza tu experiencia en el Tablón y la aplicación</p>
                        </div>
                    </div>

                    <form onSubmit={handlePersonalSubmit} className="space-y-8">

                        {/* Avatar */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider"><ImageIcon size={16} /> Avatar de Perfil</h4>
                            <div className="flex flex-wrap gap-4">
                                {AVATAR_FALLBACKS.map((emoji, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handlePersonalChange('avatarUrl', index.toString())}
                                        className={`w-16 h-16 text-3xl flex items-center justify-center rounded-2xl transition-all ${personalData.avatarUrl === index.toString() ? 'bg-companyBlue text-white shadow-lg ring-4 ring-blue-200 dark:ring-blue-900' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-800" />

                        {/* Cumpleaños */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider"><Calendar size={16} /> Cumpleaños</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-2">
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tu fecha de nacimiento</label>
                                    <input
                                        type="date"
                                        value={personalData.birthDate}
                                        onChange={(e) => handlePersonalChange('birthDate', e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    />
                                    <p className="text-xs text-gray-400 dark:text-gray-500">* El año no se mostrará a tus compañeros.</p>
                                </div>

                                <label className="flex items-start gap-4 p-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-slate-800/30 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            checked={personalData.showBirthday}
                                            onChange={(e) => handlePersonalChange('showBirthday', e.target.checked)}
                                            className="w-5 h-5 text-companyBlue rounded focus:ring-companyBlue bg-white dark:bg-slate-900 border-gray-300 dark:border-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">Anunciar mi cumpleaños</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El sistema publicará un mensaje automático en el Tablón de la sucursal para que tus compañeros te feliciten.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-800" />

                        {/* Preferencias */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Notificaciones */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider"><Bell size={16} /> Notificaciones</h4>
                                <div className="space-y-3">
                                    {[
                                        { id: 'notifyOnApproval', label: 'Avisos de mis solicitudes', desc: 'Cuando te aprueben o denieguen turnos/vacaciones.' },
                                        { id: 'notifyOnComments', label: 'Nuevos comentarios', desc: 'Cuando alguien comente en tus anuncios.' },
                                        { id: 'notifyOnUrgent', label: 'Anuncios urgentes', desc: 'Notificaciones sobre avisos prioritarios.' }
                                    ].map(opt => (
                                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={personalData.notificationPrefs[opt.id] || false}
                                                onChange={(e) => handleNotificationChange(opt.id, e.target.checked)}
                                                className="w-5 h-5 text-companyBlue rounded focus:ring-companyBlue border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-companyBlue dark:group-hover:text-blue-400 transition-colors">{opt.label}</span>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">{opt.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Tema */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider"><Palette size={16} /> Apariencia</h4>
                                <div className="space-y-3">
                                    {[
                                        { id: 'light', label: 'Claro ☀️', desc: 'Tema de colores brillantes' },
                                        { id: 'dark', label: 'Oscuro 🌙', desc: 'Colores oscuros para reducir fatiga visual' },
                                        { id: 'system', label: 'Sistema 💻', desc: 'Se adapta a la configuración de tu dispositivo' }
                                    ].map(opt => (
                                        <label key={opt.id} className="flex items-center gap-3 cursor-pointer group p-3 border border-transparent rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <input
                                                type="radio"
                                                name="themePref"
                                                value={opt.id}
                                                checked={personalData.themePreference === opt.id}
                                                onChange={(e) => handlePersonalChange('themePreference', e.target.value)}
                                                className="w-5 h-5 text-companyBlue border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:ring-companyBlue"
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{opt.label}</span>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">{opt.desc}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {personalStatus.error && (
                            <div className="p-4 bg-red-50 dark:bg-slate-800/60 border border-red-200 dark:border-slate-600 rounded-2xl text-red-600 dark:text-red-300 text-sm font-medium flex items-center gap-3">
                                <AlertCircle size={18} />
                                {personalStatus.error}
                            </div>
                        )}

                        {personalStatus.success && (
                            <div className="p-4 bg-green-50 dark:bg-slate-800/60 border border-green-200 dark:border-slate-600 rounded-2xl text-green-600 dark:text-slate-300 text-sm font-medium flex items-center gap-3">
                                <CheckCircle size={18} />
                                Preferencias guardadas correctamente
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={personalStatus.loading}
                                className={`px-8 py-4 bg-companyBlue dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm active:scale-95 ${personalStatus.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {personalStatus.loading ? (
                                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Guardar Preferencias
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Bloque C: Seguridad / Contraseña */}
                <section className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-purple-100 dark:bg-slate-800/60 text-purple-600 dark:text-purple-300 rounded-xl">
                            <Key size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Seguridad</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Mantén tu cuenta protegida cambiando tu contraseña</p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nueva Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                        <Key size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Confirmar Contraseña</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                        <Key size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 outline-none transition-all dark:text-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {passwordStatus.error && (
                            <div className="p-4 bg-red-50 dark:bg-slate-800/60 border border-red-200 dark:border-slate-600 rounded-2xl text-red-600 dark:text-red-300 text-sm font-medium flex items-center gap-3">
                                <AlertCircle size={18} />
                                {passwordStatus.error}
                            </div>
                        )}

                        {passwordStatus.success && (
                            <div className="p-4 bg-green-50 dark:bg-slate-800/60 border border-green-200 dark:border-slate-600 rounded-2xl text-green-600 dark:text-slate-300 text-sm font-medium flex items-center gap-3">
                                <CheckCircle size={18} />
                                Contraseña actualizada correctamente
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={passwordStatus.loading}
                            className={`w-full py-4 bg-gray-800 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-black rounded-2xl shadow-xl transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm active:scale-95 ${passwordStatus.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {passwordStatus.loading ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Nueva Contraseña
                                </>
                            )}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default UserSettings;
