const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKiko890() {
    try {
        const user = await prisma.user.findUnique({
            where: { id: 890 },
            include: { branch: true, zone: true }
        });

        console.log('--- USER 890 (KIKO) ---');
        console.log(JSON.stringify(user, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkKiko890();
