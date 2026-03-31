import { useCallback } from 'react';

/**
 * Hook para gestionar permisos en el frontend.
 */
export const usePermissions = () => {
    const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');

    const hasPermission = useCallback((permission) => {
        const user = getUser();
        if (!user) return false;
        
        // ADMIN tiene acceso total por defecto si falla algo
        if (user.role === 'admin') return true;

        if (!user.permissions) return false;
        return user.permissions.includes(permission);
    }, []);

    const hasAnyPermission = useCallback((permissionsArray) => {
        const user = getUser();
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        if (!user.permissions) return false;
        return permissionsArray.some(p => user.permissions.includes(p));
    }, []);

    return {
        hasPermission,
        hasAnyPermission,
        user: getUser()
    };
};
