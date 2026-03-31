const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Eliminando registros huérfanos...');
    await prisma.zone.deleteMany({ where: { branchId: 14 } });
    await prisma.branch.delete({ where: { id: 14 } });
    console.log('Registro huérfano ID 14 eliminado.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
