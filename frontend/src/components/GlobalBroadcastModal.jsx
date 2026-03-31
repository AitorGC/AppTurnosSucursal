import React, { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react';

const GlobalBroadcastModal = ({ notices, onDismiss }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Keyboard: Esc advances/dismisses current notice
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') handleNext(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    });

    if (!notices || notices.length === 0) return null;

    const currentNotice = notices[currentIndex];

    const getIcon = (type) => {
        switch (type) {
            case 'URGENT':
                return <AlertTriangle className="text-red-500 animate-pulse" size={48} />;
            case 'CHANGELOG':
                return <MessageSquare className="text-blue-500" size={48} />;
            default:
                return <Info className="text-companyBlue dark:text-blue-200" size={48} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'URGENT':
                return 'URGENTE';
            case 'CHANGELOG':
                return 'NOVEDADES';
            default:
                return 'INFORMACIÓN';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'URGENT':
                return 'bg-red-500 text-white';
            case 'CHANGELOG':
                return 'bg-blue-500 text-white';
            default:
                return 'bg-companyBlue dark:bg-blue-700 text-white';
        }
    };

    const handleNext = () => {
        const dismissedNotices = JSON.parse(localStorage.getItem('dismissedNotices') || '[]');
        if (!dismissedNotices.includes(currentNotice.id)) {
            dismissedNotices.push(currentNotice.id);
            localStorage.setItem('dismissedNotices', JSON.stringify(dismissedNotices));
        }

        if (currentIndex < notices.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onDismiss();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-300">
                <div className={`h-2 ${getTypeColor(currentNotice.type)}`} />

                <div className="p-8 flex flex-col items-center text-center">
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                        {getIcon(currentNotice.type)}
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${getTypeColor(currentNotice.type)}`}>
                        {getTypeLabel(currentNotice.type)}
                    </span>

                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                        {currentNotice.title}
                    </h2>

                    <div className="w-full max-h-[30vh] overflow-y-auto mb-8 px-2">
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed whitespace-pre-wrap">
                            {currentNotice.message}
                        </p>
                    </div>

                    <button
                        onClick={handleNext}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${getTypeColor(currentNotice.type)} hover:opacity-90`}
                    >
                        <CheckCircle size={24} />
                        {currentIndex < notices.length - 1 ? 'Siguiente Aviso' : 'Entendido'}
                    </button>

                    {notices.length > 1 && (
                        <p className="mt-4 text-xs font-bold text-gray-400">
                            Aviso {currentIndex + 1} de {notices.length}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalBroadcastModal;
