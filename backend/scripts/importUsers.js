const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const prisma = new PrismaClient();

async function importUsers(filePath) {
    if (!filePath) {
        console.error('Error: Por favor especifica la ruta del archivo CSV.');
        console.log('Uso: node importUsers.js <archivo.csv>');
        process.exit(1);
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: El archivo ${absolutePath} no existe.`);
        process.exit(1);
    }

    console.log(`Iniciando importación desde: ${absolutePath}`);

    // Cargar ramas y zonas en memoria para búsqueda rápida
    const branches = await prisma.branch.findMany({
        include: { zones: true }
    });

    const fileStream = fs.createReadStream(absolutePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let errors = 0;
    let isHeader = true;

    for await (const line of rl) {
        if (!line.trim()) continue;
        if (isHeader) {
            isHeader = false;
            continue;
        }

        const [employeeNumber, name, password, role, branchName, zoneName] = line.split(';').map(s => s.trim());

        if (!employeeNumber || !name || !branchName || !zoneName) {
            console.warn(`[Línea saltada] Faltan datos críticos: ${line}`);
            errors++;
            continue;
        }

        // Buscar Sucursal
        const branch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase());
        if (!branch) {
            console.error(`[Error] Sucursal no encontrada: ${branchName} (Usuario: ${name})`);
            errors++;
            continue;
        }

        // Buscar Zona dentro de la Sucursal
        const zone = branch.zones.find(z => z.name.toLowerCase() === zoneName.toLowerCase());
        if (!zone) {
            console.error(`[Error] Zona ${zoneName} no encontrada en sucursal ${branchName} (Usuario: ${name})`);
            errors++;
            continue;
        }

        try {
            await prisma.user.upsert({
                where: { employeeNumber: parseInt(employeeNumber) },
                update: {
                    name,
                    password: password || 'auteide2026', // Password por defecto si falta
                    role: (role || 'employee').toLowerCase(),
                    branchId: branch.id,
                    zoneId: zone.id
                },
                create: {
                    employeeNumber: parseInt(employeeNumber),
                    name,
                    password: password || 'auteide2026',
                    role: (role || 'employee').toLowerCase(),
                    branchId: branch.id,
                    zoneId: zone.id
                }
            });
            count++;
            if (count % 10 === 0) console.log(`Procesados ${count} usuarios...`);
        } catch (err) {
            console.error(`[Error DB] No se pudo importar a ${name}:`, err.message);
            errors++;
        }
    }

    console.log('------------------------------------');
    console.log(`Importación finalizada.`);
    console.log(`Éxitos: ${count}`);
    console.log(`Errores: ${errors}`);
    console.log('------------------------------------');
}

const csvFile = process.argv[2];
importUsers(csvFile)
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
