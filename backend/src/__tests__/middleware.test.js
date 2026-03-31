'use strict';
/**
 * Tests for the requirePermission middleware (via protected API endpoints).
 * Tests that users without the right permission are denied, and users with it proceed.
 */
jest.mock('@prisma/client');

const request = require('supertest');
const { app } = require('../index');
const { mockPrismaClient: db } = require('@prisma/client');
const { generateTestToken } = require('./testHelper');

const token = generateTestToken({ id: 1, role: 'employee', branchId: 1 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sets up the two DB calls made by requirePermission:
 *   1. user.findUnique  (check existence + isActive)
 *   2. rolePermission.findUnique (check permissions array)
 */
function setupPermissionCheck({ userId = 1, role = 'employee', isActive = true, permissions = [] } = {}) {
    db.user.findUnique.mockResolvedValueOnce({ id: userId, role, isActive, branchId: 1 });
    db.rolePermission.findUnique.mockResolvedValueOnce({ role, permissions });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('requirePermission middleware', () => {
    beforeEach(() => jest.clearAllMocks());

    it('🔴 devuelve 401 si no se proporciona userId ni adminId', async () => {
        // GET /api/users requires USERS_VIEW — no userId anywhere in request
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });

    it('🔴 devuelve 404 si el userId no corresponde a ningún usuario de la BD', async () => {
        db.user.findUnique.mockResolvedValueOnce(null);
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    it('🔴 devuelve 403 si el usuario está inactivo', async () => {
        db.user.findUnique.mockResolvedValueOnce({ id: 1, role: 'employee', isActive: false, branchId: 1 });
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/inactivo/i);
    });

    it('🔴 devuelve 403 si el rol no tiene el permiso requerido', async () => {
        // User exists and is active, but has NO permissions at all
        setupPermissionCheck({ permissions: [] });
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permiso/i);
    });

    it('✅ llama al handler del endpoint si el permiso está presente', async () => {
        // Give the user USERS_VIEW permission — the handler runs and returns users list
        setupPermissionCheck({ permissions: ['USERS_VIEW'] });
        // The route handler will call findMany — return an empty array
        db.user.findMany.mockResolvedValueOnce([]);
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);
        // The middleware passed — we get the route handler's response (200 with [])
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
