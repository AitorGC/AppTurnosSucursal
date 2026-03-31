/**
 * Manual mock for @prisma/client.
 * Jest automatically picks this up for any test that calls jest.mock('@prisma/client').
 */

const createModelMock = () => ({
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
});

// Single shared mock instance — returned every time `new PrismaClient()` is called.
const mockPrismaClient = {
    user: createModelMock(),
    shift: createModelMock(),
    shiftRequest: createModelMock(),
    rolePermission: createModelMock(),
    branch: createModelMock(),
    zone: createModelMock(),
    zoneDefinition: createModelMock(),
    subZone: createModelMock(),
    notification: createModelMock(),
    announcement: createModelMock(),
    announcementRead: createModelMock(),
    comment: createModelMock(),
    vacationAdjustment: createModelMock(),
    globalNotice: createModelMock(),
    auditLog: createModelMock(),
    // Transaction: by default invokes the callback with itself so handlers work transparently.
    $transaction: jest.fn((arg) => {
        if (typeof arg === 'function') return arg(mockPrismaClient);
        return Promise.all(arg);
    }),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
};

const PrismaClient = jest.fn(() => mockPrismaClient);

module.exports = { PrismaClient };
module.exports.mockPrismaClient = mockPrismaClient;
