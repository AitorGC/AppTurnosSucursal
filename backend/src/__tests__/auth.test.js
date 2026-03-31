'use strict';
/**
 * Tests for POST /api/login
 * Covers: missing credentials, user not found, inactive user, wrong password, successful login.
 */
jest.mock('@prisma/client');

const request = require('supertest');
const { app } = require('../index');
const { mockPrismaClient: db } = require('@prisma/client');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACTIVE_USER = {
    id: 1,
    employeeNumber: 100,
    name: 'Test User',
    password: 'password123',
    role: 'employee',
    branchId: 1,
    isActive: true,
    branch: { id: 1, name: 'Sucursal Test' },
    zone: { id: 1, name: 'Almacén' },
    mustChangePassword: false,
    avatarUrl: null,
};

const ROLE_PERMS = {
    role: 'employee',
    permissions: ['SHIFTS_VIEW', 'REQUESTS_VIEW', 'REQUESTS_CREATE'],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('🔴 devuelve 400 si faltan credenciales (sin body)', async () => {
        const res = await request(app).post('/api/login').send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    it('🔴 devuelve 400 si falta la contraseña', async () => {
        const res = await request(app).post('/api/login').send({ employeeNumber: 100 });
        expect(res.status).toBe(400);
    });

    it('🔴 devuelve 401 si el empleado no existe en la BD', async () => {
        db.user.findUnique.mockResolvedValue(null);
        const res = await request(app).post('/api/login').send({ employeeNumber: 9999, password: 'test' });
        expect(res.status).toBe(401);
    });

    it('🔴 devuelve 403 si el usuario está dado de baja (isActive: false)', async () => {
        db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, isActive: false });
        const res = await request(app)
            .post('/api/login')
            .send({ employeeNumber: 100, password: 'password123' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/baja/i);
    });

    it('🔴 devuelve 401 si la contraseña es incorrecta', async () => {
        db.user.findUnique.mockResolvedValue(ACTIVE_USER);
        db.rolePermission.findUnique.mockResolvedValue(ROLE_PERMS);
        const res = await request(app)
            .post('/api/login')
            .send({ employeeNumber: 100, password: 'WRONG_PASSWORD' });
        expect(res.status).toBe(401);
    });

    it('✅ devuelve 200 con datos del usuario (sin password) si las credenciales son correctas', async () => {
        db.user.findUnique.mockResolvedValue(ACTIVE_USER);
        db.rolePermission.findUnique.mockResolvedValue(ROLE_PERMS);
        const res = await request(app)
            .post('/api/login')
            .send({ employeeNumber: 100, password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('user');
        // La contraseña NUNCA debe viajar al frontend
        expect(res.body.user).not.toHaveProperty('password');
        expect(res.body.user.id).toBe(1);
    });

    it('✅ el usuario devuelto incluye sus permisos de rol', async () => {
        db.user.findUnique.mockResolvedValue(ACTIVE_USER);
        db.rolePermission.findUnique.mockResolvedValue(ROLE_PERMS);
        const res = await request(app)
            .post('/api/login')
            .send({ employeeNumber: 100, password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.user.permissions).toContain('SHIFTS_VIEW');
        expect(res.body.user.permissions).toContain('REQUESTS_CREATE');
    });
});
