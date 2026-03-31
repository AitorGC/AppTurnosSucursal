const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOfficeZone() {
    console.log('--- Creando Zona "Oficina" ---');

    try {
        const branches = await prisma.branch.findMany();
        let createdCount = 0;
        let skippedCount = 0;

        for (const branch of branches) {
            const existing = await prisma.zone.findFirst({
                where: {
                    name: 'Oficina',
                    branchId: branch.id
                }
            });

            if (!existing) {
                await prisma.zone.create({
                    data: {
                        name: 'Oficina',
                        branchId: branch.id
                    }
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`Zonas creadas: ${createdCount}`);
        console.log(`Zonas ya existentes (omitidas): ${skippedCount}`);
    } catch (e) {
        console.error('Error al crear zonas:', e);
    }

    await prisma.$disconnect();
}

createOfficeZone();
