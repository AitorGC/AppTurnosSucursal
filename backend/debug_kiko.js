const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugKiko() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 2 },
            include: { branch: true }
        });
        console.log('--- USER 2 (KIKO) ---');
        console.log(user);

        const shifts = await prisma.shift.findMany({
            where: { userId: 2, type: 'VACATION' },
            include: { zone: { include: { branch: true } } }
        });
        console.log('\n--- VACATION SHIFTS FOR USER 2 ---');
        console.log(JSON.stringify(shifts, null, 2));

        const losMajuelos = await prisma.branch.findMany({
            where: { name: { contains: 'Majuelos' } }
        });
        console.log('\n--- BRANCH LOS MAJUELOS ---');
        console.log(losMajuelos);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debugKiko();
