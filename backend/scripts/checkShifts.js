const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.shift.count();
    console.log('TOTAL_SHIFTS:', count);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
