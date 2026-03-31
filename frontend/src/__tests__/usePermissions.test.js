/**
 * Tests for the usePermissions hook.
 * Covers: admin always has access, employee only sees assigned permissions,
 * missing user in localStorage, and hasAnyPermission logic.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../hooks/usePermissions';

// ─── Helper ──────────────────────────────────────────────────────────────────

function setUser(user) {
    if (user === null) {
        localStorage.removeItem('user');
    } else {
        localStorage.setItem('user', JSON.stringify(user));
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('usePermissions hook', () => {
    beforeEach(() => localStorage.clear());

    it('✅ admin tiene acceso a cualquier permiso sin importar la lista', () => {
        setUser({ id: 1, role: 'admin', permissions: [] });
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasPermission('SHIFTS_CREATE')).toBe(true);
        expect(result.current.hasPermission('AUTH_ROLES_MANAGE')).toBe(true);
        expect(result.current.hasPermission('PERMISO_INVENTADO')).toBe(true);
    });

    it('✅ employee sólo tiene acceso a los permisos que tiene asignados', () => {
        setUser({ id: 2, role: 'employee', permissions: ['SHIFTS_VIEW', 'REQUESTS_CREATE'] });
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasPermission('SHIFTS_VIEW')).toBe(true);
        expect(result.current.hasPermission('REQUESTS_CREATE')).toBe(true);
    });

    it('🔴 employee NO tiene acceso a permisos no asignados', () => {
        setUser({ id: 2, role: 'employee', permissions: ['SHIFTS_VIEW'] });
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasPermission('SHIFTS_CREATE')).toBe(false);
        expect(result.current.hasPermission('AUTH_ROLES_MANAGE')).toBe(false);
    });

    it('🔴 devuelve false para cualquier permiso si no hay usuario en localStorage', () => {
        setUser(null);
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasPermission('SHIFTS_VIEW')).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('🔴 devuelve false si el usuario no tiene la propiedad permissions', () => {
        setUser({ id: 3, role: 'employee' }); // Sin campo permissions
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasPermission('SHIFTS_VIEW')).toBe(false);
    });

    it('✅ hasAnyPermission devuelve true si al menos uno de los permisos está presente', () => {
        setUser({ id: 2, role: 'employee', permissions: ['REQUESTS_CREATE'] });
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasAnyPermission(['SHIFTS_CREATE', 'REQUESTS_CREATE'])).toBe(true);
    });

    it('🔴 hasAnyPermission devuelve false si ningún permiso está presente', () => {
        setUser({ id: 2, role: 'employee', permissions: ['SHIFTS_VIEW'] });
        const { result } = renderHook(() => usePermissions());
        expect(result.current.hasAnyPermission(['SHIFTS_CREATE', 'AUTH_ROLES_MANAGE'])).toBe(false);
    });
});
