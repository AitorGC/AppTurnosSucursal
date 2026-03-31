import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    Home, Calendar, Users, LogOut, Calculator, Umbrella,
    Sun, Moon, FileText, User, History, Database, ChevronRight, HelpCircle, Shield,
    Menu, X as CloseIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import NotificationBell from './NotificationBell';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';
import IconATR from './common/IconATR';


const AVATAR_FALLBACKS = ['👨‍💼', '👩‍💼', '👷‍♂️', '👷‍♀️', '🧑‍🔧', '🧑‍🚀', '👨‍🔧', '👩‍🔧', '🚐', '🚚'];

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { hasPermission, user } = usePermissions();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar whenever the route changes (user tapped a nav link on mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Close sidebar on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') setIsSidebarOpen(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const roleLabel = {
        admin: 'Administrador',
        jefe_departamento: 'Jefe de Departamento',
        responsable: 'Responsable',
        administracion: 'Oficina',
        employee: 'Empleado',
    }[user.role] || 'Empleado';

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-slate-950 font-sans transition-colors duration-300">

            {/* ── Mobile backdrop overlay ───────────────────────── */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside className={[
                'fixed md:relative inset-y-0 left-0 z-40',
                'w-64 flex-shrink-0 flex flex-col',
                'bg-white dark:bg-slate-900 shadow-md border-r border-gray-200 dark:border-slate-800',
                'transition-transform duration-300 ease-in-out',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            ].join(' ')}>

                {/* Logo / App Title — includes mobile close button */}
                <div className="px-5 py-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <IconATR className="w-9 h-9 text-companyBlue dark:text-white" />
                        <div>

                            <h1 className="text-base font-black text-gray-900 dark:text-slate-100 leading-tight tracking-tight">
                                Auteide
                                <span className="ml-1.5 text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200 px-1.5 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700/40 align-middle">
                                    BETA
                                </span>
                            </h1>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-none mt-0.5">Gestión de Turnos</p>
                        </div>
                    </div>
                    {/* Close button — only visible on mobile */}
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Cerrar menú"
                    >
                        <CloseIcon size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

                    {/* — Principal — */}
                    {(hasPermission(PERMISSIONS.DASHBOARD_VIEW) || 
                      hasPermission(PERMISSIONS.SHIFTS_VIEW) || 
                      hasPermission(PERMISSIONS.CALCULO_VIEW) || 
                      hasPermission(PERMISSIONS.VACACIONES_VIEW) || 
                      hasPermission(PERMISSIONS.REQUESTS_VIEW)) && (
                        <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            Principal
                        </p>
                    )}
                    
                    {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && (
                        <NavLink to="/dashboard" icon={<Home size={17} />} label="Dashboard" active={isActive('/dashboard')} />
                    )}
                    
                    {hasPermission(PERMISSIONS.SHIFTS_VIEW) && (
                        <NavLink to="/shifts" icon={<Calendar size={17} />} label="Turnos" active={isActive('/shifts')} />
                    )}
 
                    {hasPermission(PERMISSIONS.CALCULO_VIEW) && (
                        <NavLink to="/calculo" icon={<Calculator size={17} />} label="Cálculo" active={isActive('/calculo')} />
                    )}
 
                    {hasPermission(PERMISSIONS.VACACIONES_VIEW) && (
                        <NavLink to="/vacaciones" icon={<Umbrella size={17} />} label="Vacaciones" active={isActive('/vacaciones')} colorOverride="text-emerald-600 dark:text-slate-300" />
                    )}
                    
                    {hasPermission(PERMISSIONS.REQUESTS_VIEW) && (
                        <NavLink to="/requests" icon={<FileText size={17} />} label="Solicitudes" active={isActive('/requests')} colorOverride="text-violet-600 dark:text-violet-200" />
                    )}

                    {/* — Administración — */}
                    {(hasPermission(PERMISSIONS.USERS_VIEW) || 
                      hasPermission(PERMISSIONS.AUDIT_LOGS_VIEW) || 
                      hasPermission(PERMISSIONS.MAINTENANCE_VIEW)) && (<>
                        <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                            Administración
                        </p>
                        {hasPermission(PERMISSIONS.USERS_VIEW) && (
                            <NavLink to="/management" icon={<Users size={17} />} label="Gestión" active={isActive('/management')} />
                        )}
                        {hasPermission(PERMISSIONS.AUDIT_LOGS_VIEW) && (
                            <NavLink to="/logs" icon={<History size={17} />} label="Logs" active={isActive('/logs')} />
                        )}
                        {hasPermission(PERMISSIONS.MAINTENANCE_VIEW) && (
                            <NavLink to="/maintenance" icon={<Database size={17} />} label="Mantenimiento" active={isActive('/maintenance')} />
                        )}
                    </>)}

                    {/* — Cuenta — */}
                    <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Cuenta
                    </p>
                    {hasPermission(PERMISSIONS.MANUAL_VIEW) && (
                        <NavLink to="/manual" icon={<HelpCircle size={17} />} label="Ayuda / Manual" active={isActive('/manual')} colorOverride="text-teal-600 dark:text-teal-400" />
                    )}
                    {hasPermission(PERMISSIONS.TECH_DOC_VIEW) && (
                        <NavLink to="/tech-doc" icon={<FileText size={17} />} label="Doc Técnica" active={isActive('/tech-doc')} colorOverride="text-cyan-600 dark:text-cyan-400" />
                    )}
                    <NavLink to="/settings" icon={<User size={17} />} label="Mi Perfil" active={isActive('/settings')} />
                </nav>

                {/* Bottom: User card + Theme + Logout */}
                <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-800 space-y-1">

                    {/* User Card */}
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-companyBlue dark:bg-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                            {user.avatarUrl !== null && user.avatarUrl !== undefined && AVATAR_FALLBACKS[parseInt(user.avatarUrl)]
                                ? <span className="text-lg leading-none">{AVATAR_FALLBACKS[parseInt(user.avatarUrl)]}</span>
                                : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-tight">{user.name || 'Usuario'}</p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate leading-none mt-0.5">{roleLabel}</p>
                        </div>
                        <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
                    >
                        <div className="flex items-center gap-3">
                            {theme === 'light'
                                ? <Moon size={16} className="text-gray-500" />
                                : <Sun size={16} className="text-yellow-400" />}
                            <span className="font-medium text-sm">
                                {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
                            </span>
                        </div>
                        {/* Toggle pill */}
                        <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${theme === 'dark' ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-sm font-medium"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* ── Main Content ─────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950 min-w-0">
                {/* Top Bar */}
                <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        {/* Hamburger — only visible on mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Abrir menú de navegación"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="flex items-center gap-2">
                            <IconATR className="w-6 h-6 text-companyBlue dark:text-blue-400" />
                            <div>
                                <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 uppercase tracking-tight leading-none">
                                    Bienvenido, {user.name?.split(' ')[0] || 'Usuario'}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                    Gestión de Turnos Auteide
                                </p>
                            </div>
                        </div>
                    </div>
                    {user.id && <NotificationBell userId={user.id} />}
                </header>


                <Outlet />
            </main>
        </div>
    );
};

/**
 * NavLink — sidebar navigation item with clear active state indicator.
 * Active: colored left border + tinted background + bold text + colored icon dot
 */
const NavLink = ({ to, icon, label, active, colorOverride }) => {
    const activeTextColor = colorOverride || 'text-companyBlue dark:text-blue-200';
    const activeBg = 'bg-blue-50 dark:bg-blue-950/40';
    const activeBorder = 'border-companyBlue dark:border-blue-400';

    const dotColor = colorOverride
        ? colorOverride.split(' ')[0].replace('text-', 'bg-')
        : 'bg-companyBlue dark:bg-blue-400';

    return (
        <Link
            to={to}
            className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                'border-l-[3px] transition-all duration-150',
                active
                    ? `${activeBg} ${activeBorder} ${activeTextColor} font-semibold`
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200 font-medium',
            ].join(' ')}
        >
            <span className={`flex-shrink-0 ${active ? activeTextColor : ''}`}>
                {icon}
            </span>
            <span className="text-sm leading-none">{label}</span>
            {active && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
            )}
        </Link>
    );
};

export default Layout;
