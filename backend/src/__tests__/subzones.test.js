'use strict';
/**
 * Tests for POST /api/subzones (subzone creation).
 * Covers: successful creation, and the missing duplicate-name constraint (documented bug).
 */
jest.mock('@prisma/client');

const request = require('supertest');
const { app } = require('../index');
const { mockPrismaClient: db } = require('@prisma/client');
const { generateTestToken } = require('./testHelper');

const token = generateTestToken({ id: 3, role: 'admin', branchId: 1 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupPermissionCheck({ permissions = ['ZONES_MANAGE'] } = {}) {
    db.user.findUnique.mockResolvedValueOnce({ id: 3, role: 'admin', isActive: true, branchId: 1 });
    db.rolePermission.findUnique.mockResolvedValueOnce({ role: 'admin', permissions });
}

const VALID_SUBZONE_BODY = {
    userId: 3,       // For requirePermission (body fallback)
    name: 'Estantería A',
    definitionId: 1,
    branchId: 1,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/subzones', () => {
    beforeEach(() => jest.clearAllMocks());

    it('✅ devuelve 201 al crear una subzona válida', async () => {
        setupPermissionCheck();
        db.subZone.create.mockResolvedValue({
            id: 1,
            name: 'Estantería A',
            definitionId: 1,
            branchId: 1,
        });

        const res = await request(app)
            .post('/api/subzones')
            .set('Authorization', `Bearer ${token}`)
            .send(VALID_SUBZONE_BODY);

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Estantería A');
    });

    it('🔴 devuelve 403 si el usuario no tiene permiso ZONES_MANAGE', async () => {
        setupPermissionCheck({ permissions: ['SHIFTS_VIEW'] }); // No ZONES_MANAGE
        const res = await request(app)
            .post('/api/subzones')
            .set('Authorization', `Bearer ${token}`)
            .send(VALID_SUBZONE_BODY);

        expect(res.status).toBe(403);
    });

    /**
     * EDGE CASE (AUDIT BUG): El modelo SubZone no tiene @@unique([name, definitionId, branchId]).
     * Actualmente el endpoint acepta crear dos subzonas con el mismo nombre en la misma
     * zona y sucursal, generando duplicados en los selectores del formulario.
     *
     * Este test estará en estado "expected to fail" hasta que se añada la constraint
     * de unicidad en el schema de Prisma.
     *
     * @see code_audit_report.md — Área 4, "Posible Duplicación de Nombres de Subzonas"
     */
    it.failing('🟡 EDGE CASE: debería devolver 400 al crear una subzona con nombre duplicado [BUG DOCUMENTADO]', async () => {
        setupPermissionCheck();
        // Simulate Prisma throwing a unique constraint violation (P2002)
        const prismaUniqueError = new Error('Unique constraint failed on the fields: (`name`,`definitionId`,`branchId`)');
        prismaUniqueError.code = 'P2002';
        db.subZone.create.mockRejectedValue(prismaUniqueError);

        const res = await request(app)
            .post('/api/subzones')
            .send(VALID_SUBZONE_BODY); // same name as before

        // Actualmente devuelve 500 genérico; debería devolver 400 con mensaje claro
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/duplicad|ya existe/i);
    });
});
