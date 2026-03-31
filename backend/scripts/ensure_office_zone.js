const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando creación de zona "Oficina" y actualización de usuarios ---');

    try {
        const branches = await prisma.branch.findMany();
        console.log(`Encontradas ${branches.length} sucursales.`);

        for (const branch of branches) {
            // 1. Asegurar que exista la zona "Oficina"
            const zoneName = 'Oficina';
            let officeZone = await prisma.zone.findFirst({
                where: {
                    name: zoneName,
                    branchId: branch.id
                }
            });

            if (!officeZone) {
                officeZone = await prisma.zone.create({
                    data: {
                        name: zoneName,
                        branchId: branch.id
                    }
                });
                console.log(`[Sucursal ${branch.name}] Creada zona "Oficina" (ID: ${officeZone.id})`);
            } else {
                console.log(`[Sucursal ${branch.name}] La zona "Oficina" ya existe (ID: ${officeZone.id})`);
            }

            // 2. Actualizar usuarios con rol "administracion" a esta zona
            const updatedUsers = await prisma.user.updateMany({
                where: {
                    role: 'administracion',
                    branchId: branch.id,
                    zoneId: { not: officeZone.id }
                },
                data: {
                    zoneId: officeZone.id
                }
            });

            if (updatedUsers.count > 0) {
                console.log(`[Sucursal ${branch.name}] Actualizados ${updatedUsers.count} usuarios de Administración a la zona "Oficina".`);
            }
        }

        console.log('--- Proceso completado exitosamente ---');
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
