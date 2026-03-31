const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Iniciando inicialización exhaustiva de ZoneDefinitions ---');

    // 1. Obtener todos los nombres únicos de zonas existentes
    const existingZones = await prisma.zone.findMany({
        select: { name: true },
        distinct: ['name']
    });
    
    const zoneNames = existingZones.map(z => z.name);
    console.log(`Encontrados ${zoneNames.length} nombres de zonas únicos: ${zoneNames.join(', ')}`);

    for (const name of zoneNames) {
        try {
            // Upsert de la definición
            const def = await prisma.zoneDefinition.upsert({
                where: { name },
                update: {},
                create: { name }
            });
            console.log(`Definición confirmada: ${def.name} (ID: ${def.id})`);

            // Vincular todas las zonas con este nombre a la definición
            const updated = await prisma.zone.updateMany({
                where: { name: name, definitionId: null },
                data: { definitionId: def.id }
            });
            if (updated.count > 0) {
                console.log(`  -> ${updated.count} zonas vinculadas a ${name}`);
            }

            // Subzonas estándar para Almacén
            if (name === 'Almacén') {
                const subzones = [
                    'Rutas Picking',
                    'Revision Picking',
                    'Paquetera Packing',
                    'Intercentros Packing',
                    'Camion Expedicion',
                    'Inventario'
                ];
                for (const szName of subzones) {
                    const exists = await prisma.subZone.findFirst({
                        where: { name: szName, definitionId: def.id }
                    });
                    if (!exists) {
                        await prisma.subZone.create({
                            data: { name: szName, definitionId: def.id }
                        });
                        console.log(`  -> Subzona creada: ${szName}`);
                    }
                }
            }
        } catch (err) {
            console.error(`Error procesando ${name}:`, err.message);
        }
    }

    console.log('--- Inicialización completada ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
