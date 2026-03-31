import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, AlertCircle, FileCode } from 'lucide-react';

const TechDocPage = () => {
    const [markdownContent, setMarkdownContent] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                // Fetch the README_TECH.md file which should be exposed in public folder
                const res = await fetch('/README_TECH.md');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                let content = await res.text();

                setMarkdownContent(content.trim());
            } catch (err) {
                console.error("Error cargando la documentación técnica:", err);
                setError("No se pudo cargar el archivo de documentación. " + (err.message || ''));
            }
        };

        fetchDoc();
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            {/* Cabecera */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                        <FileCode className="text-cyan-600 dark:text-cyan-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 uppercase tracking-tight">Documentación Técnica</h1>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 ml-13">
                    Arquitectura, base de datos y detalles operativos. Acceso exclusivo Administradores.
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
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-8 mb-4 text-cyan-600 dark:text-cyan-400 flex items-center gap-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-slate-200" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-4 text-gray-600 dark:text-slate-300 leading-relaxed text-sm" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-600 dark:text-slate-300 text-sm" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-gray-600 dark:text-slate-300 text-sm" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-slate-100" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-8 border-gray-200 dark:border-slate-800" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10 dark:border-cyan-500 rounded-r-lg p-4 my-4 italic text-gray-700 dark:text-slate-300" {...props} />,
                            pre: ({ node, ...props }) => (
                                <div className="bg-gray-900 text-gray-100 p-4 rounded-xl my-4 overflow-x-auto shadow-inner border border-gray-800">
                                    <pre className="text-sm font-mono leading-relaxed" {...props} />
                                </div>
                            ),
                            code: ({ node, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                // Si no hay match de lenguaje pero tiene saltos de línea, también es un bloque
                                const hasNewLines = typeof children === 'string' && children.includes('\n');
                                const isBlock = match || hasNewLines;

                                return isBlock ? (
                                    <code className={`${className} block text-sm font-mono text-cyan-300`} {...props}>
                                        {children}
                                    </code>
                                ) : (
                                    <code
                                        className="bg-gray-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-gray-200 dark:border-slate-700"
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {markdownContent}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};

export default TechDocPage;
