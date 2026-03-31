import React, { useState } from 'react';
import { Database, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import API_URL from '../apiConfig';

const Maintenance = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleDownloadBackup = async () => {
        setIsLoading(true);
        setStatusMessage({ type: 'info', text: 'Procesando backup, por favor espera...' });

        try {
            // Utilizamos el token o adminId para auth básica si no hay interceptor completo
            const response = await fetch(`${API_URL}/admin/backup?adminId=${user.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al generar el backup');
            }

            // Obtener el Blob del archivo
            const blob = await response.blob();

            // Extraer nombre de archivo de los headers si es posible, o usar por defecto
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `backup_auteide_${new Date().toISOString().split('T')[0]}.sql`;
            if (contentDisposition && contentDisposition.includes('filename=')) {
                filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
            }

            // Crear enlace temporal para forzar descarga
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setStatusMessage({ type: 'success', text: 'Backup descargado exitosamente.' });
        } catch (error) {
            console.error('Download error:', error);
            setStatusMessage({ type: 'error', text: error.message || 'Hubo un problema al descargar el backup.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <Database className="text-companyBlue dark:text-blue-200" />
                <span>Mantenimiento del Sistema</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Gestión de Datos</h2>
                        <Database className="text-gray-400" size={20} />
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Genera un volcado completo de la base de datos PostgreSQL. Esta acción puede tardar unos momentos dependiendo del volumen de datos históricos.
                    </p>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-4 mb-6 flex items-start space-x-3">
                        <AlertTriangle className="text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" size={18} />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200/90 leading-relaxed">
                            <strong>Aviso importante:</strong> Este backup contiene toda la estructura y datos de la aplicación. Guárdalo en un lugar seguro antes de realizar migraciones o cambios estructurales críticos.
                        </div>
                    </div>

                    <button
                        onClick={handleDownloadBackup}
                        disabled={isLoading}
                        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isLoading
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            : 'bg-companyBlue dark:bg-blue-700 hover:bg-companyBlue/90 dark:hover:bg-blue-50 text-white shadow-sm dark:shadow-soft-sm'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                <span>Generar y Descargar Backup (.sql)</span>
                            </>
                        )}
                    </button>

                    {statusMessage.text && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 text-sm ${statusMessage.type === 'success' ? 'bg-green-50 dark:bg-slate-800/60 text-green-700 dark:text-slate-300 border border-green-200 dark:border-green-800/50' :
                            statusMessage.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50' :
                                'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                            }`}>
                            {statusMessage.type === 'success' && <CheckCircle2 size={16} />}
                            {statusMessage.type === 'error' && <AlertTriangle size={16} />}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
