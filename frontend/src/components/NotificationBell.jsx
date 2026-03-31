import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import API_URL from '../apiConfig';

const NotificationBell = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/notifications?userId=${userId}`);
            const data = await res.json();
            setNotifications(data);
        } catch (e) {
            console.error('Error fetching notifications:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            // Actualizar cada 30 segundos
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (notificationId) => {
        try {
            await fetch(`${API_URL}/notifications/${notificationId}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
        } catch (e) {
            console.error('Error marking as read:', e);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-companyBlue dark:hover:text-blue-300 transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-companyBlue/10 to-transparent dark:from-blue-500/10">
                        <h3 className="font-black text-lg text-gray-800 dark:text-white uppercase tracking-tight">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">{unreadCount} nuevas</span>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-6 text-center text-gray-500 dark:text-gray-400">Cargando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 dark:text-gray-400">No tienes notificaciones</div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    className={`p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                        }`}
                                >
                                    <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {new Date(notif.createdAt).toLocaleString('es-ES')}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
