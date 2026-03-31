const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findLosMajuelosVacations() {
    try {
        // Encontrar la sucursal Los Majuelos
        const branch = await prisma.branch.findFirst({
            where: { name: { contains: 'Majuelos' } }
        });

        console.log('--- BRANCH LOS MAJUELOS ---');
        console.log(branch);

        if (!branch) {
            console.log('No se encontró la sucursal Los Majuelos');
            return;
        }

        // Encontrar todos los usuarios de esa sucursal
        const users = await prisma.user.findMany({
            where: { branchId: branch.id }
        });

        console.log(`\n--- USUARIOS EN LOS MAJUELOS (${users.length}) ---`);
        users.forEach(u => console.log(`${u.id} - ${u.name}`));

        // Encontrar todos los turnos de vacaciones de usuarios de esa sucursal
        const vacationShifts = await prisma.shift.findMany({
            where: {
                type: 'VACATION',
                user: { branchId: branch.id }
            },
            include: { user: true, zone: true }
        });

        console.log(`\n--- TURNOS DE VACACIONES EN LOS MAJUELOS (${vacationShifts.length}) ---`);
        vacationShifts.forEach(s => {
            console.log(`Shift ${s.id}: ${s.user.name} (User ${s.userId}), ${s.startDate.toISOString().split('T')[0]}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findLosMajuelosVacations();
