'use strict';
/**
 * Tests for POST /api/shifts (shift creation).
 * Covers: role-based creation block, past-date edge case doc.
 */
jest.mock('@prisma/client');

const request = require('supertest');
const { app } = require('../index');
const { mockPrismaClient: db } = require('@prisma/client');
const { generateTestToken } = require('./testHelper');

const token = generateTestToken({ id: 2, role: 'responsable', branchId: 1 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupPermissionCheck({ userId = 2, role = 'responsable', permissions = ['SHIFTS_CREATE'] } = {}) {
    db.user.findUnique.mockResolvedValueOnce({ id: userId, role, isActive: true, branchId: 1 });
    db.rolePermission.findUnique.mockResolvedValueOnce({ role, permissions });
}

function tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
}
function tomorrowEnd() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(16, 0, 0, 0);
    return d.toISOString();
}
function yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
}
function yesterdayEnd() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(16, 0, 0, 0);
    return d.toISOString();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/shifts', () => {
    beforeEach(() => jest.clearAllMocks());

    it('🔴 devuelve 403 si el body incluye role=employee (sin permiso de negocio)', async () => {
        // requirePermission passes (the user in the mock has SHIFTS_CREATE),
        // but the business-logic role check inside the handler blocks employee/administracion.
        setupPermissionCheck();
        const res = await request(app)
            .post('/api/shifts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                role: 'employee',     // ← blocked by business logic
                userId: 1,
                zoneId: 1,
                type: 'WORK',
                startDate: tomorrow(),
                endDate: tomorrowEnd(),
            });
        expect(res.status).toBe(403);
    });

    it('🔴 devuelve 403 si el body incluye role=administracion', async () => {
        setupPermissionCheck();
        const res = await request(app)
            .post('/api/shifts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                role: 'administracion',
                userId: 1,
                zoneId: 1,
                type: 'WORK',
                startDate: tomorrow(),
                endDate: tomorrowEnd(),
            });
        expect(res.status).toBe(403);
    });

    it('✅ devuelve 201 cuando un responsable crea un turno válido', async () => {
        setupPermissionCheck();
        // validateAndCreateShift calls user.findUnique for branchId
        db.user.findUnique.mockResolvedValueOnce({ id: 1, branchId: 1 });
        // No nearby shifts
        db.shift.findMany.mockResolvedValue([]);
        // Created shift
        db.shift.create.mockResolvedValue({
            id: 10, userId: 1, zoneId: 1, branchId: 1,
            startDate: new Date(tomorrow()), endDate: new Date(tomorrowEnd()),
            type: 'WORK', isOvertime: false,
        });
        // audit log
        db.auditLog.create.mockResolvedValue({});

        const res = await request(app)
            .post('/api/shifts')
            .set('Authorization', `Bearer ${token}`)
            .query({ userId: '2' })   // not needed by this path but harmless
            .send({
                role: 'responsable',
                userId: 1,
                adminId: 2,
                zoneId: 1,
                type: 'WORK',
                startDate: tomorrow(),
                endDate: tomorrowEnd(),
            });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('id');
    });

    /**
     * EDGE CASE (AUDIT BUG): No existe validación de fechas pasadas en validateAndCreateShift.
     * Este test documenta el comportamiento actual (permite fechas pasadas) y debería fallar
     * una vez que se añada la validación correspondiente.
     *
     * @see code_audit_report.md — Área 4, "Un Mánager Puede Asignar Turnos en el Pasado"
     */
    it.failing('🟡 EDGE CASE: debería rechazar turnos con fecha en el pasado [BUG DOCUMENTADO]', async () => {
        setupPermissionCheck();
        db.user.findUnique.mockResolvedValueOnce({ id: 1, branchId: 1 });
        db.shift.findMany.mockResolvedValue([]);
        db.shift.create.mockResolvedValue({ id: 99 });

        const res = await request(app)
            .post('/api/shifts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                role: 'responsable',
                userId: 1,
                zoneId: 1,
                type: 'WORK',
                startDate: yesterday(),   // fecha en el pasado — no debería permitirse
                endDate: yesterdayEnd(),
            });
        // Se espera 400; actualmente devuelve 201 porque no hay validación
        expect(res.status).toBe(400);
    });
});
