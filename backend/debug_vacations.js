const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log('--- BRANCHES ---');
        const branches = await prisma.branch.findMany();
        console.log(branches);

        console.log('\n--- USERS (With Branch) ---');
        const users = await prisma.user.findMany({
            include: { branch: true }
        });
        users.forEach(u => console.log(`${u.id} - ${u.name} (Branch: ${u.branch.name})`));

        console.log('\n--- VACATION SHIFTS (Current Year) ---');
        const shifts = await prisma.shift.findMany({
            where: { type: 'VACATION' },
            include: { user: true, zone: true }
        });
        shifts.forEach(s => {
            console.log(`Shift ${s.id}: User ${s.user.name} (${s.user.branchId}), Zone ${s.zone.name}, Start: ${s.startDate}, End: ${s.endDate}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
