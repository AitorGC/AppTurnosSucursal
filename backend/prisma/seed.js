const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando seed...');

    const branches = [
        { id: 1, name: 'Arinaga' },
        { id: 2, name: 'Los Majuelos' },
        { id: 3, name: 'Lanzarote' },
        { id: 4, name: 'Mecánica' },
        { id: 5, name: 'Las Chafiras' },
        { id: 6, name: 'Fuerteventura' },
        { id: 7, name: 'El Paso' },
        { id: 8, name: 'Gáldar' },
        { id: 9, name: 'Eléctrica' },
        { id: 10, name: 'La Gomera' },
        { id: 11, name: 'La Orotava' },
        { id: 12, name: 'Breña Alta' },
        { id: 13, name: 'Icod' },
        { id: 15, name: 'El Goro' },
        { id: 16, name: 'El Cuchillete' },
        { id: 17, name: 'Las Torres Almacén' },
        { id: 18, name: 'Gran Canaria Industrial' },
        { id: 19, name: 'Tenerife Industrial' }
    ];

    const zonesList = ['Mostrador', 'Almacén', 'Call Center', 'Neumáticos', 'Reparto', 'Comercial'];

    console.log('Iniciando proceso de limpieza y unificación de zonas...');

    // 1. Crear/Upsert todas las sucursales y sus zonas válidas primero
    // Esto asegura que los IDs de destino existan antes de reasignar registros
    const validZoneIds = [];
    for (const b of branches) {
        const branch = await prisma.branch.upsert({
            where: { id: b.id },
            update: { name: b.name },
            create: { id: b.id, name: b.name }
        });

        const startZoneId = (b.id - 1) * 10 + 1;
        for (let j = 0; j < zonesList.length; j++) {
            const zoneName = zonesList[j];
            const currentZoneId = startZoneId + j;
            validZoneIds.push(currentZoneId);

            await prisma.zone.upsert({
                where: { id: currentZoneId },
                update: { name: zoneName, branchId: b.id },
                create: { id: currentZoneId, name: zoneName, branchId: b.id }
            });
        }
    }

    // 2. Reasignar Turnos y Usuarios a los nuevos IDs
    // Buscamos cualquier registro que apunte a una zona fuera del set válido o con ID incorrecto
    const allShifts = await prisma.shift.findMany({ include: { zone: true } });
    console.log(`Verificando ${allShifts.length} turnos...`);
    for (const shift of allShifts) {
        if (!shift.zone) continue;
        const zoneIdx = zonesList.indexOf(shift.zone.name);
        if (zoneIdx === -1) continue;

        const correctZoneId = (shift.zone.branchId - 1) * 10 + 1 + zoneIdx;
        if (shift.zoneId !== correctZoneId) {
            await prisma.shift.update({
                where: { id: shift.id },
                data: { zoneId: correctZoneId }
            });
        }
    }

    const allUsers = await prisma.user.findMany({ include: { zone: true } });
    console.log(`Verificando ${allUsers.length} usuarios...`);
    for (const user of allUsers) {
        if (!user.zone) continue;
        const zoneIdx = zonesList.indexOf(user.zone.name);
        if (zoneIdx === -1) continue;

        const correctZoneId = (user.zone.branchId - 1) * 10 + 1 + zoneIdx;
        if (user.zoneId !== correctZoneId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { zoneId: correctZoneId }
            });
        }
    }

    // 3. Ahora que todos apuntan a IDs válidos, eliminamos cualquier zona que no esté en nuestro set oficial
    const deletedZones = await prisma.zone.deleteMany({
        where: { id: { notIn: validZoneIds } }
    });
    console.log(`Eliminadas ${deletedZones.count} zonas duplicadas/huérfanas.`);

    // 4. Corregir secuencias de Postgres
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('branches', 'id'), (SELECT MAX(id) FROM branches));`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('zones', 'id'), (SELECT MAX(id) FROM zones));`);

    // 5. Crear/Actualizar Admin
    await prisma.user.upsert({
        where: { employeeNumber: 1 },
        update: {
            role: 'admin',
            password: 'admin1234',
            branchId: 1,
            zoneId: 1
        },
        create: {
            employeeNumber: 1,
            name: 'Admin User',
            password: 'admin1234',
            role: 'admin',
            branchId: 1,
            zoneId: 1
        }
    });
    console.log('Admin user upserted.');

    // 6. Seed Role Permissions
    console.log('Iniciando seed de permisos...');
    const allPermissions = [
        'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_CHANGE_PASSWORD',
        'SHIFTS_VIEW', 'SHIFTS_CREATE', 'SHIFTS_EDIT', 'SHIFTS_DELETE',
        'REQUESTS_VIEW', 'REQUESTS_CREATE', 'REQUESTS_APPROVE', 'REQUESTS_DELETE',
        'SWAPS_PROPOSE', 'SWAPS_RESPOND', 'SWAPS_APPROVE',
        'ZONES_VIEW', 'ZONES_MANAGE', 'BRANCHES_VIEW',
        'ANNOUNCEMENTS_VIEW', 'ANNOUNCEMENTS_CREATE', 'ANNOUNCEMENTS_EDIT', 'ANNOUNCEMENTS_DELETE',
        'GLOBAL_NOTICES_MANAGE', 'AUDIT_LOGS_VIEW', 'BACKUPS_MANAGE',
        'AUTH_ROLES_MANAGE', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'STATS_VIEW_GLOBAL',
        'VACATION_ADJUSTMENTS_MANAGE'
    ];

    const rolesPermissions = [
        {
            role: 'admin',
            permissions: allPermissions
        },
        {
            role: 'responsable',
            permissions: [
                'USERS_VIEW', 'SHIFTS_VIEW', 'SHIFTS_CREATE', 'SHIFTS_EDIT', 'SHIFTS_DELETE',
                'REQUESTS_VIEW', 'REQUESTS_CREATE', 'REQUESTS_APPROVE', 'REQUESTS_DELETE',
                'SWAPS_PROPOSE', 'SWAPS_RESPOND', 'SWAPS_APPROVE',
                'ZONES_VIEW', 'BRANCHES_VIEW', 'ANNOUNCEMENTS_VIEW', 'ANNOUNCEMENTS_CREATE',
                'ANNOUNCEMENTS_EDIT', 'ANNOUNCEMENTS_DELETE', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH',
                'VACATION_ADJUSTMENTS_MANAGE'
            ]
        },
        {
            role: 'administracion',
            permissions: [
                'USERS_VIEW', 'SHIFTS_VIEW', 'REQUESTS_VIEW', 'ZONES_VIEW', 'BRANCHES_VIEW',
                'ANNOUNCEMENTS_VIEW', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'AUDIT_LOGS_VIEW'
            ]
        },
        {
            role: 'employee',
            permissions: [
                'SHIFTS_VIEW', 'REQUESTS_VIEW', 'REQUESTS_CREATE', 'SWAPS_PROPOSE',
                'SWAPS_RESPOND', 'ANNOUNCEMENTS_VIEW', 'STATS_VIEW_OWN'
            ]
        }
    ];

    for (const rp of rolesPermissions) {
        await prisma.rolePermission.upsert({
            where: { role: rp.role },
            update: { permissions: rp.permissions },
            create: { role: rp.role, permissions: rp.permissions }
        });
    }
    console.log('Permisos de roles inicializados.');

    console.log('Seed completado exitosamente.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
