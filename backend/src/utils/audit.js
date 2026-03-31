const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Creates an audit log entry.
 * 
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} action - Description of the action.
 * @param {object} details - JSON object with old and new data.
 */
async function createAuditLog(userId, action, details) {
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
