/**
 * Creates an audit log entry using the shared Prisma instance.
 *
 * @param {import('@prisma/client').PrismaClient} prisma - The shared Prisma client.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - Description of the action.
 * @param {object} details - JSON object with contextual data.
 */
async function createAuditLog(prisma, userId, action, details) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                details: details || {},
            },
        });
    } catch (error) {
        console.error('Error creating audit log:', error);
    }
}

module.exports = { createAuditLog };
