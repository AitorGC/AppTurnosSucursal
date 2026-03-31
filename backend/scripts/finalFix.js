const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando corrección final de asignaciones...');

    // Mapeo de OLD_ID -> NEW_ID
    const branchMapping = [
        { old: 18, new: 3 },  // Lanzarote
        { old: 17, new: 19 }, // Tenerife Industrial
        { old: 16, new: 18 }, // Gran Canaria Industrial
        { old: 15, new: 17 }, // Las Torres Almacén
        { old: 14, new: 16 }, // El Cuchillete
        { old: 13, new: 15 }, // El Goro
        { old: 12, new: 13 }, // Icod
        { old: 11, new: 12 }, // Breña Alta
        { old: 10, new: 11 }, // La Orotava
        { old: 9, new: 10 },  // La Gomera
        { old: 8, new: 9 },   // Eléctrica
        { old: 7, new: 8 },   // Gáldar
        { old: 6, new: 7 },   // El Paso
        { old: 5, new: 6 },   // Fuerteventura
        { old: 4, new: 5 },   // Las Chafiras
        { old: 3, new: 4 }    // Mecánica
    ];

    // Procesar de forma que no colisionemos si es posible, o usar desplazamientos temporales
    // Como estamos actualizando branchId y zoneId simultáneamente, podemos usar un offset temporal

    for (const mapping of branchMapping) {
        console.log(`Actualizando usuarios de Rama ${mapping.old} a ${mapping.new}...`);

        // Cada rama tiene 5 zonas. 
        // En la estructura nueva, ZoneID = (branchId - 1) * 5 + [1..5]
        // No sabemos exactamente en qué zona estaba el usuario (Mostrador, Almacén, etc.) 
        // pero podemos mantener el offset relativo (1-5).

        const users = await prisma.user.findMany({ where: { branchId: mapping.old } });

        for (const user of users) {
            // Calcular el offset relativo de la zona (1-5)
            // En el seed antiguo, las zonas eran correlativas.
            // Para ID 1 (Arinaga): 1,2,3,4,5
            // Para ID 2 (Majuelos): 6,7,8,9,10
            // Offset = ((oldZoneId - 1) % 5)
            const zoneOffset = (user.zoneId - 1) % 5;
            const newZoneId = (mapping.new - 1) * 5 + 1 + zoneOffset;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    branchId: mapping.new,
                    zoneId: newZoneId
                }
            });
        }
    }

    console.log('Corrección completada.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
