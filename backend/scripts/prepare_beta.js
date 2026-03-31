const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function prepareBeta() {
    console.log('🔄 Iniciando preparación para BETA...');

    try {
        // 1. Delete AuditLogs
        console.log('🗑️  Borrando Audit Logs...');
        const deletedAuditLogs = await prisma.auditLog.deleteMany({});
        console.log(`   ✅ ${deletedAuditLogs.count} Audit Logs borrados.`);

        // 2. Delete Notifications
        console.log('🗑️  Borrando Notificaciones...');
        const deletedNotifications = await prisma.notification.deleteMany({});
        console.log(`   ✅ ${deletedNotifications.count} Notificaciones borradas.`);

        // 3. Delete ShiftRequests (Depend on Shifts)
        console.log('🗑️  Borrando Solicitudes de Turno (ShiftRequests)...');
        const deletedRequests = await prisma.shiftRequest.deleteMany({});
        console.log(`   ✅ ${deletedRequests.count} Solicitudes borradas.`);

        // 4. Delete Shifts
        console.log('🗑️  Borrando Turnos...');
        const deletedShifts = await prisma.shift.deleteMany({});
        console.log(`   ✅ ${deletedShifts.count} Turnos borrados.`);

        console.log('🎉 Preparación de base de datos para BETA completada exitosamente.');
        console.log('ℹ️  Usuarios, Sucursales, Zonas y Tablón de anuncios se han mantenido intactos.');

    } catch (error) {
        console.error('❌ Error durante la preparación para BETA:', error);
    } finally {
        await prisma.$disconnect();
    }
}

prepareBeta();
