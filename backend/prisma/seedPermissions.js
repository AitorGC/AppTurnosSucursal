const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando seed de permisos RBAC...');
    
    const allPermissions = [
        'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_CHANGE_PASSWORD',
        'SHIFTS_VIEW', 'SHIFTS_CREATE', 'SHIFTS_EDIT', 'SHIFTS_DELETE',
        'REQUESTS_VIEW', 'REQUESTS_CREATE', 'REQUESTS_APPROVE', 'REQUESTS_DELETE',
        'SWAPS_PROPOSE', 'SWAPS_RESPOND', 'SWAPS_APPROVE',
        'ZONES_VIEW', 'ZONES_MANAGE', 'BRANCHES_VIEW',
        'ANNOUNCEMENTS_VIEW', 'ANNOUNCEMENTS_CREATE', 'ANNOUNCEMENTS_EDIT', 'ANNOUNCEMENTS_DELETE',
        'GLOBAL_NOTICES_MANAGE', 'AUDIT_LOGS_VIEW', 'BACKUPS_MANAGE',
        'AUTH_ROLES_MANAGE', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'STATS_VIEW_GLOBAL',
        'VACATION_ADJUSTMENTS_MANAGE',
        'DASHBOARD_VIEW', 'CALCULO_VIEW', 'VACACIONES_VIEW', 'MAINTENANCE_VIEW', 'TECH_DOC_VIEW', 'MANUAL_VIEW'
    ];

    const rolesPermissions = [
        {
            role: 'admin',
            permissions: allPermissions
        },
        {
            role: 'jefe_departamento',
            permissions: [
                'DASHBOARD_VIEW', 'SHIFTS_VIEW', 'VACACIONES_VIEW', 'REQUESTS_VIEW', 'MANUAL_VIEW',
                'USERS_VIEW', 'ANNOUNCEMENTS_VIEW', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'CALCULO_VIEW'
            ]
        },
        {
            role: 'responsable',
            permissions: [
                'DASHBOARD_VIEW', 'SHIFTS_VIEW', 'VACACIONES_VIEW', 'REQUESTS_VIEW', 'MANUAL_VIEW',
                'USERS_VIEW', 'SHIFTS_CREATE', 'SHIFTS_EDIT', 'SHIFTS_DELETE',
                'REQUESTS_CREATE', 'REQUESTS_APPROVE', 'REQUESTS_DELETE',
                'SWAPS_PROPOSE', 'SWAPS_RESPOND', 'SWAPS_APPROVE',
                'ZONES_VIEW', 'BRANCHES_VIEW', 'ANNOUNCEMENTS_VIEW', 'ANNOUNCEMENTS_CREATE',
                'ANNOUNCEMENTS_EDIT', 'ANNOUNCEMENTS_DELETE', 'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH',
                'VACATION_ADJUSTMENTS_MANAGE', 'CALCULO_VIEW'
            ]
        },
        {
            role: 'administracion',
            permissions: [
                'DASHBOARD_VIEW', 'SHIFTS_VIEW', 'VACACIONES_VIEW', 'REQUESTS_VIEW', 'MANUAL_VIEW',
                'USERS_VIEW', 'ZONES_VIEW', 'BRANCHES_VIEW', 'ANNOUNCEMENTS_VIEW',
                'STATS_VIEW_OWN', 'STATS_VIEW_BRANCH', 'AUDIT_LOGS_VIEW', 'CALCULO_VIEW'
            ]
        },
        {
            role: 'employee',
            permissions: [
                'DASHBOARD_VIEW', 'SHIFTS_VIEW', 'REQUESTS_VIEW', 'MANUAL_VIEW',
                'REQUESTS_CREATE', 'SWAPS_PROPOSE', 'SWAPS_RESPOND', 'ANNOUNCEMENTS_VIEW', 'STATS_VIEW_OWN'
            ]
        }
    ];

    for (const rp of rolesPermissions) {
        await prisma.rolePermission.upsert({
            where: { role: rp.role },
            update: { permissions: rp.permissions },
            create: { role: rp.role, permissions: rp.permissions }
        });
        console.log(`Permisos para el rol ${rp.role} inicializados.`);
    }

    console.log('Seed de permisos completado exitosamente.');
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
