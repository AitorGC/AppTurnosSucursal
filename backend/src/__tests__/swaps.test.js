'use strict';
/**
 * Tests for PATCH /api/swaps/:id/approve (manager approves a swap).
 *
 * Key test: documents the Race Condition where two managers can approve
 * the same swap simultaneously (no status guard inside the transaction).
 */
jest.mock('@prisma/client');

const request = require('supertest');
const { app } = require('../index');
const { mockPrismaClient: db } = require('@prisma/client');
const { generateTestToken } = require('./testHelper');

const token = generateTestToken({ id: 5, role: 'responsable', branchId: 1 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupPermissionCheck({ userId = 5, role = 'responsable', permissions = ['SWAPS_APPROVE'] } = {}) {
    db.user.findUnique.mockResolvedValueOnce({ id: userId, role, isActive: true, branchId: 1 });
    db.rolePermission.findUnique.mockResolvedValueOnce({ role, permissions });
}

const PENDING_SWAP = {
    id: 1,
    type: 'SWAP',
    status: 'PENDING',
    peerAccepted: true,
    userId: 10,
    peerId: 11,
    shiftAId: 100,
    shiftBId: 101,
    shiftA: { id: 100, userId: 10 },
    shiftB: { id: 101, userId: 11 },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PATCH /api/swaps/:id/approve', () => {
    beforeEach(() => jest.clearAllMocks());

    it('🔴 devuelve 404 si la solicitud no existe', async () => {
        setupPermissionCheck();
        db.shiftRequest.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .patch('/api/swaps/999/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({ adminId: 5 });
        expect(res.status).toBe(404);
    });

    it('🔴 devuelve 404 si el registro existe pero no es de tipo SWAP', async () => {
        setupPermissionCheck();
        db.shiftRequest.findUnique.mockResolvedValue({ ...PENDING_SWAP, type: 'VACATION' });

        const res = await request(app)
            .patch('/api/swaps/1/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({ adminId: 5 });
        expect(res.status).toBe(404);
    });

    it('🔴 devuelve 400 si el compañero no ha aceptado aún', async () => {
        setupPermissionCheck();
        db.shiftRequest.findUnique.mockResolvedValue({ ...PENDING_SWAP, peerAccepted: false });

        const res = await request(app)
            .patch('/api/swaps/1/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({ adminId: 5 });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/compañero/i);
    });

    it('✅ devuelve 200 y ejecuta la transacción cuando el swap es válido y aceptado', async () => {
        setupPermissionCheck();
        db.shiftRequest.findUnique.mockResolvedValue(PENDING_SWAP);
        // $transaction will invoke the callback with db (default mock behaviour)
        db.shift.update.mockResolvedValue({});
        db.shiftRequest.update.mockResolvedValue({ ...PENDING_SWAP, status: 'APPROVED' });
        db.notification.create.mockResolvedValue({});
        db.auditLog.create.mockResolvedValue({});

        const res = await request(app)
            .patch('/api/swaps/1/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({ adminId: 5 });
        expect(res.status).toBe(200);
        // Both shifts should have been swapped
        expect(db.shift.update).toHaveBeenCalledTimes(2);
    });

    /**
     * RACE CONDITION (AUDIT BUG): El endpoint no verifica status === 'PENDING' antes de
     * ejecutar la transacción. Si dos mánagers aprueban simultáneamente, ambos pueden
     * pasar el check de `peerAccepted` y ejecutar la transacción dos veces.
     *
     * Este test estará en estado "expected to fail" hasta que se añada la verificación
     * atómica dentro de la transacción.
     *
     * @see code_audit_report.md — Área 1, "Race Condition en Aprobación de SWAP"
     */
    it.failing('🟡 RACE CONDITION: debería devolver 400 si el swap ya fue aprobado [BUG DOCUMENTADO]', async () => {
        setupPermissionCheck();
        // Simula el segundo request que llega cuando el swap ya está APPROVED
        db.shiftRequest.findUnique.mockResolvedValue({ ...PENDING_SWAP, status: 'APPROVED' });

        const res = await request(app)
            .patch('/api/swaps/1/approve')
            .set('Authorization', `Bearer ${token}`)
            .send({ adminId: 5 });
        // Debería devolver 400 — actualmente devuelve 200 porque no hay verificación de estado
        expect(res.status).toBe(400);
    });
});
