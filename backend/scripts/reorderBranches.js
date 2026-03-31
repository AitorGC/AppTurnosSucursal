const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANZAROTE_USERS = [1008, 1011, 1026, 1032, 1041, 1048, 1062, 1104, 1118, 1143, 279, 296, 30, 31, 32, 33, 336, 34, 35, 368, 37, 38, 39, 42, 43, 452, 453, 469, 470, 473, 476, 562, 578, 579, 644, 692, 698, 729, 758, 766, 801, 823, 855, 873, 886, 887, 893, 909, 923];

async function main() {
    console.log('Iniciando migración de reordenamiento...');

    // 1. Mover usuarios de Lanzarote a un ID temporal para despejar ID 3
    console.log('Moviendo usuarios de Lanzarote temporalmente...');
    await prisma.user.updateMany({
        where: { employeeNumber: { in: LANZAROTE_USERS } },
        data: { branchId: 999, zoneId: 9999 }
    });

    // 2. Mover los demás usuarios a sus IDs destino (yendo de atrás hacia adelante para evitar colisiones)
    // El desplazamiento es +1 para todos desde Mecánica (Old 3) hasta Icod (Old 12)
    // El Goro (Old 13) se mueve a 15 (+2)
    // El Cuchillete (Old 14) se mueve a 16 (+2)

    const shifts = [
        { from: 14, to: 16 }, // El Cuchillete
        { from: 13, to: 15 }, // El Goro
        { from: 12, to: 13 }, // Icod
        { from: 11, to: 12 }, // Breña Alta
        { from: 10, to: 11 }, // La Orotava
        { from: 9, to: 10 },  // La Gomera
        { from: 8, to: 9 },   // Eléctrica
        { from: 7, to: 8 },   // Gáldar
        { from: 6, to: 7 },   // El Paso
        { from: 5, to: 6 },   // Fuerteventura
        { from: 4, to: 5 },   // Las Chafiras
        { from: 3, to: 4 },   // Mecánica (Solo no-Lanzarote)
    ];

    for (const shift of shifts) {
        console.log(`Desplazando usuarios y zonas de ID ${shift.from} a ${shift.to}...`);

        // Zonas (5 por sucursal)
        // Old ID 3 zones: 11-15 -> Now 16-20 (Mecánica)
        const oldZoneStart = (shift.from - 1) * 5 + 1;
        const newZoneStart = (shift.to - 1) * 5 + 1;

        for (let i = 0; i < 5; i++) {
            const oldZ = oldZoneStart + i;
            const newZ = newZoneStart + i;

            await prisma.user.updateMany({
                where: { zoneId: oldZ, branchId: shift.from === 3 ? { not: 999 } : shift.from },
                data: { zoneId: newZ + 1000 } // Temporal para evitar colisiones
            });
        }

        await prisma.user.updateMany({
            where: { branchId: shift.from, employeeNumber: { notIn: LANZAROTE_USERS } },
            data: { branchId: shift.to }
        });
    }

    // Corregir IDs de zonas (quitar el +1000)
    console.log('Corrigiendo IDs de zonas...');
    await prisma.$executeRawUnsafe(`UPDATE users SET "zoneId" = "zoneId" - 1000 WHERE "zoneId" > 1000;`);

    // 3. Devolver Lanzarote a ID 3
    console.log('Devolviendo Lanzarote a ID 3...');
    await prisma.user.updateMany({
        where: { branchId: 999 },
        data: { branchId: 3, zoneId: 11 } // Asignar a la primera zona de Lanzarote (3)
    });

    console.log('Migración completada.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
