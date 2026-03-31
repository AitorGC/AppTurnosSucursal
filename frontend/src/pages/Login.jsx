import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../apiConfig';

const Login = () => {
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeNumber, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(data.user));
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                navigate('/dashboard');
            } else {
                setError(data.message || 'Error al iniciar sesión');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
            <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300">
                <div className="bg-companyBlue dark:bg-gray-800 p-10 text-center relative overflow-hidden">
                    {/* no decorative overlay needed — bg-gray-800 header is corporate enough */}

                    <h1 className="text-4xl font-black text-white mb-2 relative z-10 tracking-tighter uppercase">
                        Auteide S.A. <span className="text-xl text-yellow-300 dark:text-yellow-200 align-top ml-2">(BETA)</span>
                    </h1>
                    <p className="text-blue-100 dark:text-gray-400 font-medium relative z-10 opacity-90 dark:opacity-100">Gestión de Turnos de Sucursal</p>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-gray-800 dark:text-white text-center">¡Bienvenido!</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-center text-sm font-medium">Ingresa tus credenciales para entrar</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-slate-800/60 text-companyRed dark:text-red-300 p-4 rounded-2xl text-sm text-center border border-red-100 dark:border-slate-600 animate-in fade-in duration-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Número de Empleado</label>
                            <input
                                type="number"
                                value={employeeNumber}
                                onChange={(e) => setEmployeeNumber(e.target.value)}
                                className="w-full px-5 py-3.5 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-800 dark:text-gray-100 outline-none transition-all shadow-sm"
                                placeholder="Ej. 12345"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-3.5 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-companyBlue dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-800 dark:text-gray-100 outline-none transition-all shadow-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 px-6 bg-companyBlue dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-black rounded-2xl shadow-xl transition-all transform active:scale-[0.98] flex justify-center items-center uppercase tracking-widest text-sm ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <svg className="animate-spin h-6 w-6 text-white dark:text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Iniciar Sesión'}
                    </button>
                </form>
                <div className="bg-gray-50 dark:bg-slate-950 p-6 text-center border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-bold uppercase tracking-wider">Desarrollado por Aitor Santana ©2026</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
