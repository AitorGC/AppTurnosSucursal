import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, AlertCircle } from 'lucide-react';
// Usamos el import crudo de vite para traer el contenido de texto directamente o hacemos un fetch.
// Para vite podemos usar ?raw para importar el string
// IMPORTANTE: Vite sirve estáticos de public/ o relativos. Como USER_MANUAL está en la raíz,
// puede que tengamos que copiarlo o importarlo.
// Intentemos fetch al raw string desde la url base si podemos, o compilarlo en build.

// Simplificación: al compilar con Vite, podríamos importar el md como texto crudo, 
// pero `vite-plugin-raw` u otros pueden requerirse. 
// Una solución robusta es importar el markdown como módulo con ?raw
// Esto asume que Vite permite cargar archivos fuera de src, lo cual por defecto estricto no lo hace.
// Para que Vite pueda construir el proyecto, pondremos el manual en public/
// Y lo recuperaremos usando un fetch de /USER_MANUAL.md

const ManualPage = () => {
    const [markdownContent, setMarkdownContent] = useState('');
    const [error, setError] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isEmployeeOnly = user.role === 'employee';

    useEffect(() => {
        const fetchManual = async () => {
            try {
                // Hacemos fetch del archivo expuesto en public/
                const res = await fetch('/USER_MANUAL.md');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                let content = await res.text();

                // Lógica de filtrado por roles v1.0 (Jerárquica)
                const roleTags = ['EMPLOYEE', 'OFFICE', 'MANAGER', 'HEAD_DEPT', 'ADMIN'];
                let tagsToKeep = ['EMPLOYEE']; // Todos ven la guía base y de empleado

                if (user.role === 'admin') {
                    tagsToKeep = roleTags; // Admin ve todo
                } else if (user.role === 'responsable') {
                    tagsToKeep.push('HEAD_DEPT', 'OFFICE', 'MANAGER'); // Responsable ve todo lo operativo y administrativo

                } else if (user.role === 'jefe_departamento') {
                    tagsToKeep.push('HEAD_DEPT'); // Jefe solo ve lo suyo
                } else if (user.role === 'administracion') {
                    tagsToKeep.push('OFFICE');
                }



                // Eliminar secciones de etiquetas que no debemos mantener
                roleTags.forEach(tag => {
                    if (!tagsToKeep.includes(tag)) {
                        const regex = new RegExp(`<!-- ROLE_${tag}_CONTENT_START -->[\\s\\S]*?<!-- ROLE_${tag}_CONTENT_END -->`, 'gi');
                        content = content.replace(regex, '');
                    }
                });

                // Limpiar siempre las etiquetas de comentarios sobrantes
                content = content.replace(/<!-- ROLE_[A-Z_]+_CONTENT_(START|END) -->/gi, '');


                setMarkdownContent(content.trim());
            } catch (err) {
                console.error("Error cargando el manual:", err);
                setError("No se pudo cargar el archivo del manual. " + (err.message || ''));
            }
        };

        fetchManual();
    }, [isEmployeeOnly, user.role]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            {/* Cabecera */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <BookOpen className="text-companyBlue dark:text-blue-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">Manual de Usuario</h1>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 ml-13">
                    Guía de uso y funcionalidades del sistema.
                </p>
            </div>

            {error ? (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-800/50">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <div>
                        <h3 className="font-semibold text-sm">Error al cargar el contenido</h3>
                        <p className="text-xs mt-1">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 sm:p-8 custom-markdown-container">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black mb-6 text-gray-900 dark:text-slate-100 pb-4 border-b border-gray-200 dark:border-slate-800" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-8 mb-4 text-companyBlue dark:text-blue-400 flex items-center gap-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-slate-200" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 text-gray-600 dark:text-slate-300 leading-relaxed text-sm" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-600 dark:text-slate-300 text-sm" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-600 dark:text-slate-300 text-sm" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-slate-100" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-8 border-gray-200 dark:border-slate-800" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-companyBlue bg-blue-50 dark:bg-blue-900/10 dark:border-blue-500 rounded-r-lg p-4 my-4 italic text-gray-700 dark:text-slate-300" {...props} />,
                        }}
                    >
                        {markdownContent}
                    </ReactMarkdown>
                </div>
            )}

            <style jsx="true">{`
            .custom-markdown-container {
                /* Para asegurar que los saltos de línea y espaciados generales se vean limpios. */
            }
            `}</style>
        </div>
    );
};

export default ManualPage;
