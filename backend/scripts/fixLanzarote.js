const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANZAROTE_USERS = [1008, 1011, 1026, 1032, 1041, 1048, 1062, 1104, 1118, 1143, 279, 296, 30, 31, 32, 33, 336, 34, 35, 368, 37, 38, 39, 42, 43, 452, 453, 469, 470, 473, 476, 562, 578, 579, 644, 692, 698, 729, 758, 766, 801, 823, 855, 873, 886, 887, 893, 909, 923];

async function main() {
    console.log('Fijando sucursal Lanzarote (ID 3)...');

    // Mover a los usuarios identificados por su employeeNumber
    const result = await prisma.user.updateMany({
        where: { employeeNumber: { in: LANZAROTE_USERS } },
        data: {
            branchId: 3,
            zoneId: 11 // Mostrador de Lanzarote
        }
    });

    console.log(`Actualizados ${result.count} usuarios de Lanzarote.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
