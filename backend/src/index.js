const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const cron = require('node-cron');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createAuditLog } = require('./utils/audit');
const PERMISSIONS = require('./constants/permissions');
require('dotenv').config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET must be defined in production environment.');
    process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'auteide_dev_secret_2026';

// Middleware: authenticateToken
const authenticateToken = (req, res, next) => {
    // Escapar rutas públicas
    const publicPaths = ['/api/login', '/health'];
    if (publicPaths.includes(req.path)) return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token de autenticación requerido' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
        req.user = user;
        next();
    });
};

// Middleware: requirePermission
const requirePermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }
        
        req.currentUserId = req.user.id;

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.currentUserId }
            });

            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
            if (!user.isActive) return res.status(403).json({ message: 'Usuario inactivo' });

            const rolePerms = await prisma.rolePermission.findUnique({
                where: { role: user.role }
            });

            if (!rolePerms || !rolePerms.permissions.includes(permission)) {
                return res.status(403).json({ message: `No tienes el permiso necesario: ${permission}` });
            }

            next();
        } catch (err) {
            console.error('Middleware error:', err);
            res.status(500).json({ message: 'Error en la verificación de permisos' });
        }
    };
};

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://172.16.12.66',
    'https://172.16.12.66'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origen (como Postman o apps móviles)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(authenticateToken);

// Cron job: Expira solicitudes pendientes antiguas cada día a medianoche
cron.schedule('0 0 * * *', async () => {
    try {
        const now = new Date();
        
        // 1. Obtener solicitudes PENDING cuya startDate ya pasó
        const pendingExpired = await prisma.shiftRequest.findMany({
            where: {
                status: 'PENDING',
                startDate: { lt: now }
            },
            select: { id: true, userId: true, type: true }
        });

        if (pendingExpired.length > 0) {
            const ids = pendingExpired.map(r => r.id);

            // 2. Marcar como EXPIRED usando los IDs obtenidos
            await prisma.shiftRequest.updateMany({
                where: { id: { in: ids } },
                data: { status: 'EXPIRED' }
            });

            console.log(`[CRON] ${pendingExpired.length} solicitudes expiradas automáticamente`);

            // 3. Crear notificaciones basadas en los datos en memoria del paso 1
            for (const req of pendingExpired) {
                await prisma.notification.create({
                    data: {
                        userId: req.userId,
                        message: `Tu solicitud de ${req.type} ha caducado porque no fue revisada a tiempo`
                    }
                });
            }
        }
    } catch (err) {
        console.error('[CRON ERROR]:', err);
    }
});

// Cron job: Anuncios automáticos de cumpleaños (cada día a las 00:01)
cron.schedule('1 0 * * *', async () => {
    try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // 1. Archivar automáticamente anuncios de cumpleaños anteriores (quitar comentarios)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        await prisma.announcement.updateMany({
            where: {
                type: 'BIRTHDAY',
                allowComments: true,
                createdAt: { lt: today }
            },
            data: { allowComments: false }
        });

        // 2. Crear anuncios para los cumpleañeros de hoy
        const users = await prisma.user.findMany({
            where: { showBirthday: true, birthDate: { not: null }, isActive: true }
        });

        const birthdayUsers = users.filter(u => {
            const bDate = new Date(u.birthDate);
            return (bDate.getUTCMonth() + 1) === month && bDate.getUTCDate() === day;
        });

        for (const user of birthdayUsers) {
            await prisma.announcement.create({
                data: {
                    title: `🎉 ¡Hoy es el cumpleaños de ${user.name}!`,
                    content: `Felicita a nuestro compañero/a.`,
                    allowComments: true,
                    type: 'BIRTHDAY',
                    authorId: user.id,
                    branchId: user.branchId,
                    priority: false
                }
            });
        }

        if (birthdayUsers.length > 0) {
            console.log(`[CRON BIRTHDAY] Creados ${birthdayUsers.length} anuncios de cumpleaños.`);
        }
    } catch (err) {
        console.error('[CRON ERROR BIRTHDAY]:', err);
    }
});

app.get('/', (req, res) => {
    res.send('Backend Turnos Auteide con Prisma 🚀');
});

// Endpoint de salud
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { employeeNumber, password: plainPassword } = req.body;

    if (!employeeNumber || !plainPassword) {
        return res.status(400).json({ message: 'Faltan credenciales' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { employeeNumber: parseInt(employeeNumber) },
            include: { branch: true, zone: true }
        });

        if (!user) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Usuario dado de baja. Contacte con administración.' });
        }

        // --- Verificación de Contraseña con Bcrypt ---
        let isCorrect = false;
        try {
            isCorrect = await bcrypt.compare(plainPassword, user.password);
        } catch (e) {
            // Error en compare — posiblemente es texto plano
            isCorrect = false;
        }

        // --- MIGRACIÓN SUAVE ---
        if (!isCorrect && user.password === plainPassword) {
            // Es texto plano — migrar a bcrypt AHORA
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            isCorrect = true;
            console.log(`Usuario ${user.id} migrado suavemente a bcrypt.`);
        }

        if (!isCorrect) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        // --- GENERACIÓN DE TOKEN ---
        const token = jwt.sign(
            { id: user.id, role: user.role, branchId: user.branchId },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        const userData = JSON.parse(JSON.stringify(user));
        delete userData.password;
        
        // Cargar permisos del rol
        const rolePerms = await prisma.rolePermission.findUnique({
            where: { role: user.role }
        });
        userData.permissions = rolePerms ? rolePerms.permissions : [];

        // Cargar managedBranches si el rol es responsable
        if (user.role === 'responsable') {
            const extraData = await prisma.user.findUnique({
                where: { id: user.id },
                include: { managedBranches: true }
            });
            userData.managedBranches = extraData ? extraData.managedBranches : [];
        }

        console.log(`[AUTH] Login exitoso para usuario ${user.id} (${user.role}). Token generado.`);
        res.json({ 
            user: userData, 
            token: token 
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

app.post('/api/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ message: 'Falta la nueva contraseña' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });
        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Error al actualizar la contraseña' });
    }
});

// --- USERS CRUD ---

// Listar usuarios
app.get('/api/users', requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
    const { userId, role } = req.query;
    try {
        let where = {};
        if (role === 'responsable' && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { managedBranches: true }
            });
            if (user) {
                const branchIds = user.managedBranches.map(b => b.id);
                branchIds.push(user.branchId);
                where.branchId = { in: branchIds };
            }
        } else if ((role === 'administracion' || role === 'employee' || role === 'jefe_departamento') && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) }
            });
            if (user) {
                where.branchId = user.branchId;
            }
        }

        const users = await prisma.user.findMany({
            where,
            include: { branch: true, zone: true, managedBranches: true },
            orderBy: { employeeNumber: 'asc' }
        });
        // Ocultar password
        const safeUsers = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Crear usuario
app.post('/api/users', requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
    const { employeeNumber, name, password, role, branchId, zoneId, isActive } = req.body;
    console.log('POST /api/users body:', req.body); // DEBUG

    try {
        const existing = await prisma.user.findUnique({
            where: { employeeNumber: parseInt(employeeNumber) }
        });
        if (existing) {
            return res.status(400).json({ message: 'El número de empleado ya existe' });
        }

        const pBranchId = parseInt(branchId);
        const pZoneId = parseInt(zoneId);

        if (isNaN(pBranchId) || isNaN(pZoneId)) {
            return res.status(400).json({ message: 'Sucursal o Zona inválida' });
        }

        const newUser = await prisma.user.create({
            data: {
                employeeNumber: parseInt(employeeNumber),
                name,
                password,
                role: role || 'employee',
                branchId: pBranchId,
                zoneId: pZoneId,
                mustChangePassword: true,
                isActive: isActive !== undefined ? isActive : true,
                managedBranches: req.body.managedBranchIds ? {
                    connect: req.body.managedBranchIds.map(id => ({ id: parseInt(id) }))
                } : undefined
            }
        });
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear usuario' });
    }
});

// Actualizar usuario
app.put('/api/users/:id', requirePermission(PERMISSIONS.USERS_EDIT), async (req, res) => {
    const { id } = req.params;
    const {
        name, role, branchId, zoneId, password, isActive,
        avatarUrl, birthDate, showBirthday, themePreference, notificationPrefs
    } = req.body;

    try {
        const pBranchId = parseInt(branchId);
        const pZoneId = parseInt(zoneId);

        if (isNaN(pBranchId) || isNaN(pZoneId)) {
            return res.status(400).json({ message: 'Sucursal o Zona inválida' });
        }

        const data = {
            name,
            role,
            branchId: pBranchId,
            zoneId: pZoneId,
            isActive: isActive !== undefined ? isActive : true
        };
        if (password) data.password = password;
        if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
        if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;
        if (showBirthday !== undefined) data.showBirthday = showBirthday;
        if (themePreference !== undefined) data.themePreference = themePreference;
        if (notificationPrefs !== undefined) data.notificationPrefs = notificationPrefs;

        if (req.body.managedBranchIds !== undefined) {
            data.managedBranches = {
                set: req.body.managedBranchIds.map(id => ({ id: parseInt(id) }))
            };
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data,
            include: { managedBranches: true }
        });

        // Audit Log
        const actorId = req.body.adminId || null; // El actor debe enviarse desde el frontend
        if (actorId) {
            await createAuditLog(parseInt(actorId), 'Actualización de Usuario', {
                targetUserId: id,
                changes: { name, role, branchId, zoneId, isActive, themePreference, showBirthday }
            });
        }

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
});

// Eliminar usuario
app.delete('/api/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        if (err.code === 'P2003') {
            return res.status(400).json({ message: 'No se puede eliminar: Este usuario tiene turnos, solicitudes o registros asociados. Elimina sus registros primero.' });
        }
        res.status(500).json({ message: 'Error al eliminar usuario' });
    }
});

// --- HELPERS (Branches/Zones) ---

app.get('/api/branches', async (req, res) => {
    const { userId, role } = req.query;
    try {
        if (role === 'admin') {
            const branches = await prisma.branch.findMany({ 
                include: { zones: { orderBy: { name: 'asc' } } },
                orderBy: { name: 'asc' }
            });
            return res.json(branches);
        } else if (role === 'responsable' && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { 
                    managedBranches: { 
                        include: { zones: { orderBy: { name: 'asc' } } },
                        orderBy: { name: 'asc' }
                    },
                    branch: { include: { zones: { orderBy: { name: 'asc' } } } }
                }
            });
            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
            
            const branchesMap = new Map();
            if (user.branch) branchesMap.set(user.branch.id, user.branch);
            user.managedBranches.forEach(b => branchesMap.set(b.id, b));
            
            return res.json(Array.from(branchesMap.values()));
        } else if ((role === 'administracion' || role === 'employee' || role === 'jefe_departamento') && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { branch: { include: { zones: { orderBy: { name: 'asc' } } } } }
            });
            if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
            return res.json(user.branch ? [user.branch] : []);
        } else {
            // Usuarios sin rol o sin ID (público) - quizá solo nombres de sucursales?
            // Devolvemos todas pero sin zonas para proteger datos si no hay auth
            const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
            res.json(branches);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- ZONES & SUBZONES MANAGEMENT ---

// Listar definiciones de zona (ZoneDefinition)
app.get('/api/zone-definitions', requirePermission(PERMISSIONS.ZONES_VIEW), async (req, res) => {
    console.log('GET /api/zone-definitions');
    try {
        const userRole = req.query.role;
        const uId = req.query.userId;
        let branchFilter = {};

        if (userRole !== 'admin' && uId) {
            const user = await prisma.user.findUnique({ 
                where: { id: parseInt(uId) }, 
                include: { managedBranches: true } 
            });
            if (user) {
                const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
                branchFilter = { branchId: { in: allowed } };
            }
        }

        const definitions = await prisma.zoneDefinition.findMany({
            include: {
                subZones: {
                    where: userRole === 'admin' ? {} : { OR: [branchFilter, { branchId: null }] },
                    include: { branch: true }
                },
                zones: {
                    where: branchFilter,
                    include: { branch: true },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(definitions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Crear definición de zona
app.post('/api/zone-definitions', requirePermission(PERMISSIONS.ZONES_MANAGE), async (req, res) => {
    const { name, branchIds } = req.body;
    try {
        const definition = await prisma.zoneDefinition.create({
            data: { name }
        });

        // Si se especifican sucursales, crear la zona en cada una
        if (branchIds && Array.isArray(branchIds)) {
            for (const bId of branchIds) {
                await prisma.zone.create({
                    data: {
                        name: name,
                        branchId: parseInt(bId),
                        definitionId: definition.id
                    }
                });
            }
        }

        res.status(201).json(definition);
    } catch (err) {
        res.status(500).json({ message: 'Error al crear la definición de zona' });
    }
});

// Eliminar definición de zona
app.delete('/api/zone-definitions/:id', requirePermission(PERMISSIONS.ZONES_MANAGE), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.zoneDefinition.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Definición de zona eliminada' });
    } catch (err) {
        if (err.code === 'P2003') {
            return res.status(400).json({ message: 'No se puede eliminar: Esta zona tiene turnos o subzonas asignadas. Reasígnalos o elimínalos primero.' });
        }
        res.status(500).json({ message: 'Error al eliminar la definición de zona' });
    }
});

// Listar subzonas
app.get('/api/subzones', requirePermission(PERMISSIONS.ZONES_VIEW), async (req, res) => {
    const { definitionId, branchId } = req.query;
    console.log(`GET /api/subzones?definitionId=${definitionId}&branchId=${branchId}`);
    try {
        const userRole = req.query.role;
        const uId = req.query.userId;
        let bId = branchId ? parseInt(branchId) : null;

        if (uId) {
            if (userRole === 'responsable') {
                const user = await prisma.user.findUnique({ where: { id: parseInt(uId) }, include: { managedBranches: true } });
                const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
                if (bId && !allowed.includes(bId)) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
                if (!bId) bId = { in: allowed };
            } else if (userRole === 'administracion' || userRole === 'employee') {
                const user = await prisma.user.findUnique({ where: { id: parseInt(uId) } });
                if (bId && user.branchId !== bId) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
                if (!bId) bId = user.branchId;
            }
        }

        const where = {};
        if (definitionId) where.definitionId = parseInt(definitionId);
        if (bId) {
            where.OR = [
                { branchId: bId },
                { branchId: null }
            ];
        } else if (uId && (userRole === 'responsable' || userRole === 'administracion' || userRole === 'employee')) {
             where.branchId = bId;
        }
        const subZones = await prisma.subZone.findMany({
            where,
            include: { definition: true, branch: true },
            orderBy: { name: 'asc' }
        });
        res.json(subZones);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Crear subzona
app.post('/api/subzones', requirePermission(PERMISSIONS.ZONES_MANAGE), async (req, res) => {
    const { name, definitionId, branchId } = req.body;
    try {
        const subZone = await prisma.subZone.create({
            data: {
                name,
                definitionId: parseInt(definitionId),
                branchId: branchId ? parseInt(branchId) : null
            }
        });
        res.status(201).json(subZone);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Ya existe una subzona con ese nombre en esta ubicación.' });
        }
        res.status(500).json({ message: 'Error al crear la subzona' });
    }
});

// Eliminar subzona
app.delete('/api/subzones/:id', requirePermission(PERMISSIONS.ZONES_MANAGE), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.subZone.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Subzona eliminada' });
    } catch (err) {
        if (err.code === 'P2003') {
            return res.status(400).json({ message: 'No se puede eliminar: Esta subzona tiene turnos asignados. Reasígnalos primero.' });
        }
        res.status(500).json({ message: 'Error al eliminar la subzona' });
    }
});

// --- GLOBAL NOTICES ---

// Listar todos los avisos (Admin)
app.get('/api/global-notices', requirePermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE), async (req, res) => {
    try {
        const notices = await prisma.globalNotice.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Obtener avisos activos para el usuario
app.get('/api/global-notices/active', async (req, res) => {
    try {
        const notices = await prisma.globalNotice.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Crear aviso (Admin)
app.post('/api/global-notices', requirePermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE), async (req, res) => {
    const { title, message, type, adminId } = req.body;
    try {
        const notice = await prisma.globalNotice.create({
            data: { title, message, type: type || 'INFO' }
        });

        if (adminId) {
            await createAuditLog(parseInt(adminId), 'Creación de Comunicado Global', {
                noticeId: notice.id,
                title
            });
        }

        res.status(201).json(notice);
    } catch (err) {
        res.status(500).json({ message: 'Error al crear el comunicado' });
    }
});

// Actualizar/Toggle aviso (Admin)
app.put('/api/global-notices/:id', requirePermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE), async (req, res) => {
    const { id } = req.params;
    const { title, message, type, isActive, adminId } = req.body;
    try {
        const current = await prisma.globalNotice.findUnique({ where: { id: parseInt(id) } });
        if (!current) return res.status(404).json({ message: 'Comunicado no encontrado' });

        const notice = await prisma.globalNotice.update({
            where: { id: parseInt(id) },
            data: { title, message, type, isActive }
        });

        if (adminId) {
            await createAuditLog(parseInt(adminId), 'Actualización de Comunicado Global', {
                noticeId: notice.id,
                changes: { title, type, isActive }
            });
        }

        res.json(notice);
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar el comunicado' });
    }
});

// Eliminar aviso (Admin)
app.delete('/api/global-notices/:id', requirePermission(PERMISSIONS.GLOBAL_NOTICES_MANAGE), async (req, res) => {
    const { id } = req.params;
    const { adminId } = req.query;
    try {
        const notice = await prisma.globalNotice.findUnique({ where: { id: parseInt(id) } });
        if (!notice) return res.status(404).json({ message: 'Comunicado no encontrado' });

        await prisma.globalNotice.delete({ where: { id: parseInt(id) } });

        if (adminId) {
            await createAuditLog(parseInt(adminId), 'Eliminación de Comunicado Global', {
                noticeId: id,
                title: notice.title
            });
        }

        res.json({ message: 'Comunicado eliminado' });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar el comunicado' });
    }
});

// --- SHIFTS MODULE ---

// Listar turnos (filtro opcional por fecha)
app.get('/api/shifts', requirePermission(PERMISSIONS.SHIFTS_VIEW), async (req, res) => {
    const { start, end, branchId, zoneId } = req.query;
    try {
        const where = {};
        if (start && end) {
            where.startDate = {
                gte: new Date(start),
                lte: new Date(end)
            };
        }

        if (zoneId) {
            where.zoneId = parseInt(zoneId);
        }
        if (branchId) {
            const bId = parseInt(branchId);
            const userRole = req.query.role;
            const userId = req.query.userId;

            if (userRole === 'responsable' && userId) {
                const user = await prisma.user.findUnique({
                    where: { id: parseInt(userId) },
                    include: { managedBranches: true }
                });
                const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
                if (!allowed.includes(bId)) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
            } else if ((userRole === 'administracion' || userRole === 'employee') && userId) {
                const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
                if (user.branchId !== bId) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
            }

            where.zone = where.zone || {};
            where.zone.branchId = bId;
        } else if (req.query.role === 'responsable' && req.query.userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(req.query.userId) },
                include: { managedBranches: true }
            });
            const branchIds = user.managedBranches.map(b => b.id);
            branchIds.push(user.branchId);
            where.zone = where.zone || {};
            where.zone.branchId = { in: branchIds };
        } else if ((req.query.role === 'administracion' || req.query.role === 'employee' || req.query.role === 'jefe_departamento') && req.query.userId) {
            const user = await prisma.user.findUnique({ where: { id: parseInt(req.query.userId) } });
            where.zone = where.zone || {};
            where.zone.branchId = user.branchId;
        }

        const shifts = await prisma.shift.findMany({
            where,
            include: {
                user: true,
                zone: {
                    include: { branch: true }
                }
            }
        });
        res.json(shifts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- STATS MODULE (Cálculo) ---

// Auxiliar para obtener rango de fechas de un mes
const getMonthRange = (monthStr) => {
    // monthStr: "YYYY-MM"
    const [year, month] = monthStr.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return { start, end };
};

// Estadísticas individuales por mes
app.get('/api/stats/employee/:userId', async (req, res) => {
    const { userId } = req.params;
    const { month } = req.query; // Formato "YYYY-MM"

    try {
        if (!month) return res.status(400).json({ message: 'Mes requerido (YYYY-MM)' });
        
        const requesterRole = req.query.role;
        const requesterId = req.query.userId;
        const targetUserId = parseInt(userId);

        if (requesterRole === 'employee' && parseInt(requesterId) !== targetUserId) {
            return res.status(403).json({ message: 'No tienes permiso para ver estadísticas de otros usuarios' });
        }

        if (requesterRole === 'administracion' || requesterRole === 'responsable' || requesterRole === 'jefe_departamento') {
             const [requester, targetUser] = await Promise.all([
                 prisma.user.findUnique({ where: { id: parseInt(requesterId) }, include: { managedBranches: true } }),
                 prisma.user.findUnique({ where: { id: targetUserId } })
             ]);

             if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

             if ((requesterRole === 'administracion' || requesterRole === 'jefe_departamento') && requester.branchId !== targetUser.branchId) {
                 return res.status(403).json({ message: 'No tienes acceso a este usuario' });
             }

             if (requesterRole === 'responsable') {
                 const allowed = [requester.branchId, ...requester.managedBranches.map(b => b.id)];
                 if (!allowed.includes(targetUser.branchId)) {
                     return res.status(403).json({ message: 'No tienes acceso a este usuario' });
                 }
             }
        }

        const { start, end } = getMonthRange(month);

        const shifts = await prisma.shift.findMany({
            where: {
                userId: targetUserId,
                startDate: { gte: start, lte: end },
                type: 'WORK'
            },
            include: {
                zone: {
                    include: { branch: true }
                }
            }
        });

        const breakdown = shifts.reduce((acc, s) => {
            const hours = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60);
            const bId = s.branchId;
            const zId = s.zoneId;
            const sz = s.subZone || 'General';

            if (!acc[bId]) acc[bId] = { id: bId, name: s.zone.branch.name, zones: {}, normal: 0, extra: 0 };
            if (!acc[bId].zones[zId]) acc[bId].zones[zId] = { id: zId, name: s.zone.name, subZones: {}, normal: 0, extra: 0 };
            if (!acc[bId].zones[zId].subZones[sz]) acc[bId].zones[zId].subZones[sz] = { name: sz, normal: 0, extra: 0 };

            if (s.isOvertime) {
                acc[bId].extra += hours;
                acc[bId].zones[zId].extra += hours;
                acc[bId].zones[zId].subZones[sz].extra += hours;
            } else {
                acc[bId].normal += hours;
                acc[bId].zones[zId].normal += hours;
                acc[bId].zones[zId].subZones[sz].normal += hours;
            }
            return acc;
        }, {});

        // Convertir objetos a arrays para facilitar el mapeo en el frontend
        const detailedStats = Object.values(breakdown).map(branch => ({
            ...branch,
            zones: Object.values(branch.zones).map(zone => ({
                ...zone,
                subZones: Object.values(zone.subZones)
            }))
        }));

        const totals = shifts.reduce((acc, s) => {
            const hours = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60);
            if (s.isOvertime) acc.extra += hours;
            else acc.normal += hours;
            return acc;
        }, { normal: 0, extra: 0 });

        res.json({ userId: parseInt(userId), month, ...totals, breakdown: detailedStats });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ranking de sucursal por mes
app.get('/api/stats/ranking', async (req, res) => {
    const { branchId, month } = req.query;

    try {
        if (!branchId || !month) return res.status(400).json({ message: 'Sucursal y Mes requeridos' });
        const bId = parseInt(branchId);
        const userRole = req.query.role;
        const uId = req.query.userId;

        if (userRole === 'responsable' && uId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(uId) },
                include: { managedBranches: true }
            });
            const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
            if (!allowed.includes(bId)) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
        } else if ((userRole === 'administracion' || userRole === 'employee') && uId) {
            const user = await prisma.user.findUnique({ where: { id: parseInt(uId) } });
            if (user.branchId !== bId) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
        }

        const { start, end } = getMonthRange(month);

        const shifts = await prisma.shift.findMany({
            where: {
                zone: { branchId: bId },
                startDate: { gte: start, lte: end },
                type: 'WORK'
            },
            include: { user: true }
        });

        const rankingMap = {};

        shifts.forEach(s => {
            const uId = s.userId;
            if (!rankingMap[uId]) {
                rankingMap[uId] = {
                    id: uId,
                    name: s.user.name,
                    employeeNumber: s.user.employeeNumber,
                    normal: 0,
                    extra: 0
                };
            }
            const hours = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60);
            if (s.isOvertime) rankingMap[uId].extra += hours;
            else rankingMap[uId].normal += hours;
        });

        const ranking = Object.values(rankingMap).sort((a, b) => (b.normal + b.extra) - (a.normal + a.extra));
        res.json(ranking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Estadísticas de Vacaciones por año
app.get('/api/stats/vacations', async (req, res) => {
    const { year, branchId } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);

    try {
        let bId = branchId ? parseInt(branchId) : null;
        const userRole = req.query.role;
        const uId = req.query.userId;

        if (userRole === 'responsable' && uId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(uId) },
                include: { managedBranches: true }
            });
            const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
            if (bId && !allowed.includes(bId)) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
            if (!bId) bId = { in: allowed };
        } else if ((userRole === 'administracion' || userRole === 'employee') && uId) {
            const user = await prisma.user.findUnique({ where: { id: parseInt(uId) } });
            if (bId && user.branchId !== bId) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
            if (!bId) bId = user.branchId;
        }

        const userWhere = {};
        if (bId) {
            userWhere.branchId = bId;
        }

        const usersPromise = prisma.user.findMany({
            where: userWhere,
            orderBy: { name: 'asc' }
        });

        const shiftWhere = {
            startDate: { gte: startOfYear, lte: endOfYear },
            type: 'VACATION'
        };
        if (bId) {
            shiftWhere.user = { branchId: bId };
        }
        const shiftsPromise = prisma.shift.findMany({
            where: shiftWhere,
            include: { user: true }
        });

        const adjustmentWhere = { year: targetYear };
        if (branchId) {
            adjustmentWhere.user = { branchId: parseInt(branchId) };
        }
        const adjustmentsPromise = prisma.vacationAdjustment.findMany({
            where: adjustmentWhere
        });

        const [users, shifts, adjustments] = await Promise.all([
            usersPromise,
            shiftsPromise,
            adjustmentsPromise
        ]);

        // 3. Inicializar mapa con todos los usuarios
        const statsMap = {};
        users.forEach(u => {
            statsMap[u.id] = {
                id: u.id,
                name: u.name,
                employeeNumber: u.employeeNumber,
                branchId: u.branchId,
                days: new Set(),
                adjustedDays: 0
            };
        });

        adjustments.forEach(a => {
            const uId = a.userId;
            if (statsMap[uId]) {
                statsMap[uId].adjustedDays += a.days;
            }
        });

        // 4. Llenar con datos de turnos
        shifts.forEach(s => {
            const uId = s.userId;
            // Solo procesar si el usuario está en el mapa (por si acaso hay inconsistencias de sucursal)
            if (statsMap[uId]) {
                const dayStr = s.startDate.toISOString().split('T')[0];
                statsMap[uId].days.add(dayStr);
            }
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const currentVacations = [];
        const currentOffs = [];

        const ranking = Object.values(statsMap).map(stats => {
            const daysArray = Array.from(stats.days);
            const naturalDays = daysArray.length;
            const workingDays = daysArray.filter(d => {
                const day = new Date(d).getDay();
                return day !== 0 && day !== 6; // L-V
            }).length;

            if (stats.days.has(todayStr)) {
                currentVacations.push({ id: stats.id, name: stats.name, employeeNumber: stats.employeeNumber, type: 'VACATION' });
            }

            const baseNaturalDays = 30;
            const baseWorkingDays = 22;
            const totalNatural = baseNaturalDays + stats.adjustedDays;
            const totalWorking = baseWorkingDays + stats.adjustedDays;

            return {
                id: stats.id,
                name: stats.name,
                employeeNumber: stats.employeeNumber,
                branchId: stats.branchId,
                naturalDays,
                workingDays,
                adjustedDays: stats.adjustedDays,
                remainingNatural: Math.max(0, totalNatural - naturalDays),
                remainingWorking: Math.max(0, totalWorking - workingDays)
            };
        });

        // 5. Obtener empleados con día libre HOY
        const todayStart = new Date(todayStr + 'T00:00:00.000Z');
        const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

        const offShiftsWhere = {
            startDate: { gte: todayStart, lte: todayEnd },
            type: 'OFF'
        };

        if (branchId) {
            offShiftsWhere.user = { branchId: parseInt(branchId) };
        }

        const offShifts = await prisma.shift.findMany({
            where: offShiftsWhere,
            include: { user: true }
        });

        const offUserIds = new Set();
        offShifts.forEach(s => {
            if (!offUserIds.has(s.userId)) {
                offUserIds.add(s.userId);
                currentOffs.push({
                    id: s.userId,
                    name: s.user.name,
                    employeeNumber: s.user.employeeNumber,
                    type: 'OFF'
                });
            }
        });

        // 6. Obtener empleados con baja médica HOY
        const currentSickLeave = [];
        const sickLeaveShiftsWhere = {
            startDate: { gte: todayStart, lte: todayEnd },
            type: 'SICK_LEAVE'
        };

        if (branchId) {
            sickLeaveShiftsWhere.user = { branchId: parseInt(branchId) };
        }

        const sickLeaveShifts = await prisma.shift.findMany({
            where: sickLeaveShiftsWhere,
            include: { user: true }
        });

        const sickLeaveUserIds = new Set();
        sickLeaveShifts.forEach(s => {
            if (!sickLeaveUserIds.has(s.userId)) {
                sickLeaveUserIds.add(s.userId);
                currentSickLeave.push({
                    id: s.userId,
                    name: s.user.name,
                    employeeNumber: s.user.employeeNumber,
                    type: 'SICK_LEAVE'
                });
            }
        });

        // 7. Obtener empleados con visita médica HOY (incluir horario)
        const currentMedical = [];
        const medicalShiftsWhere = {
            startDate: { gte: todayStart, lte: todayEnd },
            type: 'MEDICAL'
        };

        if (branchId) {
            medicalShiftsWhere.user = { branchId: parseInt(branchId) };
        }

        const medicalShifts = await prisma.shift.findMany({
            where: medicalShiftsWhere,
            include: { user: true }
        });

        const medicalUserIds = new Set();
        medicalShifts.forEach(s => {
            if (!medicalUserIds.has(s.userId)) {
                medicalUserIds.add(s.userId);
                currentMedical.push({
                    id: s.userId,
                    name: s.user.name,
                    employeeNumber: s.user.employeeNumber,
                    type: 'MEDICAL',
                    startDate: s.startDate,
                    endDate: s.endDate
                });
            }
        });

        // Combinar vacaciones, días libres, bajas médicas y visitas médicas
        const currentAbsences = [...currentVacations, ...currentOffs, ...currentSickLeave, ...currentMedical];

        // Ordenar: primero los que tienen más días consumidos
        ranking.sort((a, b) => b.naturalDays - a.naturalDays);

        res.json({ year: targetYear, ranking, currentAbsences });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// NUEVO: Estadísticas dinámicas para el Dashboard
app.get('/api/dashboard/stats', async (req, res) => {
    const { userId, role, branchId, year } = req.query;
    const targetUserId = parseInt(userId);
    const targetBranchId = parseInt(branchId);
    const reqYear = parseInt(year) || new Date().getFullYear();
    const startOfYear = new Date(reqYear, 0, 1);
    const endOfYear = new Date(reqYear, 11, 31, 23, 59, 59);

    // Configurar HOY correctamente
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const result = {};

        // 1. Estadísticas Personales (para todos)
        if (targetUserId) {
            const personalShifts = await prisma.shift.findMany({
                where: {
                    userId: targetUserId,
                    startDate: { gte: startOfYear, lte: endOfYear }
                }
            });

            const vacations = personalShifts.filter(s => s.type === 'VACATION');
            const medical = personalShifts.filter(s => s.type === 'MEDICAL').length;
            const sickLeave = personalShifts.filter(s => s.type === 'SICK_LEAVE').length;

            // Calcular días de vacaciones (días únicos laborables L-V)
            const vacationDays = new Set();
            vacations.forEach(v => {
                const day = new Date(v.startDate).getDay();
                if (day !== 0 && day !== 6) {
                    vacationDays.add(v.startDate.toISOString().split('T')[0]);
                }
            });

            // Obtener ajustes para este usuario en el año
            const userAdjustments = await prisma.vacationAdjustment.findMany({
                where: {
                    userId: targetUserId,
                    year: reqYear
                }
            });

            let adjustmentDays = 0;
            const adjustmentDetails = [];
            userAdjustments.forEach(adj => {
                adjustmentDays += adj.days;
                adjustmentDetails.push({ days: adj.days, reason: adj.reason, date: adj.createdAt });
            });

            const baseVacations = 22;
            const vacationsTotal = baseVacations + adjustmentDays;

            result.personal = {
                vacationsConsumed: vacationDays.size,
                vacationsRemaining: Math.max(0, vacationsTotal - vacationDays.size),
                vacationsTotal: vacationsTotal,
                adjustmentDays: adjustmentDays,
                adjustmentDetails: adjustmentDetails,
                medicalVisits: medical,
                sickLeaveCount: sickLeave
            };
        }

        // 2. Estadísticas de Sucursal/Globales (Responsable/Admin)
        if (role === 'admin' || role === 'responsable') {
            const userWhere = {};
            if (role === 'responsable' && targetBranchId) {
                userWhere.branchId = targetBranchId;
            }

            const totalUsersAtBranch = await prisma.user.count({ where: userWhere });

            // Turnos de hoy para la sucursal/global
            const todayShifts = await prisma.shift.findMany({
                where: {
                    startDate: { gte: startOfDay, lte: endOfDay },
                    user: userWhere
                }
            });

            // Contar USUARIOS únicos (no turnos) por tipo
            const uniqueUsersWork = new Set(
                todayShifts.filter(s => s.type === 'WORK').map(s => s.userId)
            ).size;
            const uniqueUsersOvertime = new Set(
                todayShifts.filter(s => s.isOvertime).map(s => s.userId)
            ).size;
            const uniqueUsersMedical = new Set(
                todayShifts.filter(s => s.type === 'MEDICAL').map(s => s.userId)
            ).size;
            const uniqueUsersSickLeave = new Set(
                todayShifts.filter(s => s.type === 'SICK_LEAVE').map(s => s.userId)
            ).size;
            const uniqueUsersVacation = new Set(
                todayShifts.filter(s => s.type === 'VACATION').map(s => s.userId)
            ).size;

            result.branch = {
                totalUsers: totalUsersAtBranch,
                activeToday: uniqueUsersWork,
                overtimeToday: uniqueUsersOvertime,
                medicalToday: uniqueUsersMedical,
                sickLeaveToday: uniqueUsersSickLeave,
                vacationToday: uniqueUsersVacation,
                totalMedical: uniqueUsersMedical + uniqueUsersSickLeave
            };
        }

        res.json(result);
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// ========== SISTEMA DE SOLICITUDES (SHIFT REQUESTS) ==========

// POST /api/requests - Crear nueva solicitud
app.post('/api/requests', requirePermission(PERMISSIONS.REQUESTS_CREATE), async (req, res) => {
    const { userId, zoneId, type, startDate, endDate, userReason, subZone } = req.body;

    // Validación: No permitir SICK_LEAVE
    if (type === 'SICK_LEAVE') {
        return res.status(400).json({ message: 'Las bajas médicas solo pueden ser creadas por administradores/responsables' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validar fechas
        if (start >= end) {
            return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la de fin' });
        }

        // Si no se proporciona zoneId y el tipo no es WORK, usar la primera zona de la sucursal del usuario
        let finalZoneId = zoneId ? parseInt(zoneId) : null;

        if (!finalZoneId && type !== 'WORK') {
            const userWithZones = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: {
                    branch: {
                        include: { zones: { take: 1 } }
                    }
                }
            });
            if (userWithZones && userWithZones.branch.zones.length > 0) {
                finalZoneId = userWithZones.branch.zones[0].id;
            } else if (userWithZones) {
                // Fallback a su zoneId si por alguna razón la sucursal no tiene zonas definidas (no debería pasar)
                finalZoneId = userWithZones.zoneId;
            }
        }

        if (!finalZoneId) {
            return res.status(400).json({ message: 'La zona es obligatoria para turnos de trabajo' });
        }

        // Obtener la sucursal del usuario para integridad compuesta
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: { branchId: true }
        });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const request = await prisma.shiftRequest.create({
            data: {
                userId: parseInt(userId),
                zoneId: finalZoneId,
                branchId: user.branchId,
                type,
                startDate: start,
                endDate: end,
                userReason: userReason || null,
                subZone: subZone || null,
                status: 'PENDING'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeNumber: true,
                        branch: { select: { id: true, name: true } }
                    }
                },
                zone: { select: { id: true, name: true } }
            }
        });

        res.status(201).json(request);
    } catch (err) {
        console.error('Create request error:', err);
        res.status(500).json({ message: 'Error al crear la solicitud' });
    }
});

// GET /api/requests - Listar solicitudes
app.get('/api/requests', requirePermission(PERMISSIONS.REQUESTS_VIEW), async (req, res) => {
    const { userId, status, branchId, role } = req.query;

    try {
        let where = {};

        if (userId) {
            const uId = parseInt(userId);
            if (role === 'employee') {
                where = {
                    OR: [
                        { userId: uId },
                        { peerId: uId }
                    ]
                };
            } else if (role === 'administracion' || role === 'jefe_departamento') {
                const user = await prisma.user.findUnique({ where: { id: uId } });
                if (user) {
                    where.branchId = user.branchId;
                }
            }
        }

        if (role === 'responsable' && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { managedBranches: true }
            });
            const branchIds = user.managedBranches.map(b => b.id);
            branchIds.push(user.branchId);
            
            if (branchId) {
                const bId = parseInt(branchId);
                if (branchIds.includes(bId)) {
                    where.branchId = bId;
                } else {
                    return res.status(403).json({ message: 'No tienes permiso para ver solicitudes de esta sucursal' });
                }
            } else {
                where.branchId = { in: branchIds };
            }

            where.OR = [
                { type: { not: 'SWAP' } },
                { AND: [{ type: 'SWAP' }, { peerAccepted: true }] },
                { AND: [{ type: 'SWAP' }, { peerId: parseInt(userId) }] }
            ];
        } else if (branchId) {
            const bId = parseInt(branchId);
            const userRole = req.query.role;
            const uId = req.query.userId;
            
            if (userRole === 'administracion' || userRole === 'employee') {
                const user = await prisma.user.findUnique({ where: { id: parseInt(uId) } });
                if (user.branchId !== bId) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
            }
            where.branchId = bId;
        }

        // Filtrar por estado si se especifica
        if (status) {
            where.status = status;
        }

        const requests = await prisma.shiftRequest.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeNumber: true,
                        branch: { select: { id: true, name: true } }
                    }
                },
                zone: { select: { id: true, name: true } },
                shiftA: { include: { user: true, zone: true } },
                shiftB: { include: { user: true, zone: true } },
                peer: { select: { id: true, name: true, employeeNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (err) {
        console.error('List requests error:', err);
        res.status(500).json({ message: 'Error al listar solicitudes' });
    }
});

// PATCH /api/requests/:id/status - Aprobar/Rechazar solicitud
app.patch('/api/requests/:id/status', requirePermission(PERMISSIONS.REQUESTS_APPROVE), async (req, res) => {
    const { id } = req.params;
    const { status, managerComment } = req.body;

    // Solo Admin/Responsable pueden ejecutar esto
    // En producción deberías validar el rol del usuario autenticado

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Estado inválido. Debe ser APPROVED o REJECTED' });
    }

    try {
        // Obtener la solicitud
        const request = await prisma.shiftRequest.findUnique({
            where: { id: parseInt(id) },
            include: { user: true, zone: true }
        });

        if (!request) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: 'Solo se pueden aprobar/rechazar solicitudes pendientes' });
        }

        if (request.type === 'SWAP') {
            return res.status(400).json({ message: 'Las solicitudes de intercambio deben gestionarse a través de su endpoint específico' });
        }

        if (status === 'APPROVED') {
            // TRANSACCIÓN: Aprobar solicitud y crear turno real
            const result = await prisma.$transaction(async (tx) => {
                // 1. Actualizar estado de la solicitud
                const updatedRequest = await tx.shiftRequest.update({
                    where: { id: parseInt(id) },
                    data: {
                        status: 'APPROVED',
                        managerComment: managerComment || null
                    }
                });

                // 2. Crear el turno real
                const shift = await tx.shift.create({
                    data: {
                        userId: request.userId,
                        zoneId: request.zoneId,
                        branchId: request.branchId, // Pasar branchId de la solicitud
                        startDate: request.startDate,
                        endDate: request.endDate,
                        type: request.type,
                        subZone: request.subZone,
                        isOvertime: false // Se calculará después si es necesario
                    }
                });

                // 3. Crear notificación
                await tx.notification.create({
                    data: {
                        userId: request.userId,
                        message: `Tu solicitud de ${request.type === 'WORK' ? 'Trabajo' :
                            request.type === 'VACATION' ? 'Vacaciones' :
                                request.type === 'MEDICAL' ? 'Visita Médica' :
                                    request.type === 'SICK_LEAVE' ? 'Baja Médica' :
                                        request.type === 'OFF' ? 'Día Libre' :
                                            request.type === 'SWAP' ? 'Intercambio' : request.type} ha sido APROBADA${managerComment ? ': ' + managerComment : ''}`
                    }
                });

                // Audit Log
                const actorId = req.body.adminId || null;
                if (actorId) {
                    await tx.auditLog.create({
                        data: {
                            userId: parseInt(actorId),
                            action: 'Aprobación de Solicitud',
                            details: {
                                requestId: id,
                                targetUserId: request.userId,
                                type: request.type,
                                managerComment
                            }
                        }
                    });
                }

                return { updatedRequest, shift };
            });

            res.json({ message: 'Solicitud aprobada y turno creado', request: result.updatedRequest, shift: result.shift });

        } else if (status === 'REJECTED') {
            // Rechazar solicitud
            const updatedRequest = await prisma.shiftRequest.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'REJECTED',
                    managerComment: managerComment || null
                }
            });

            // Crear notificación
            await prisma.notification.create({
                data: {
                    userId: request.userId,
                    message: `Tu solicitud de ${request.type} ha sido RECHAZADA${managerComment ? '. Razón: ' + managerComment : ''}`
                }
            });

            // Audit Log
            const actorId = req.body.adminId || null;
            if (actorId) {
                await createAuditLog(parseInt(actorId), 'Rechazo de Solicitud', {
                    requestId: id,
                    targetUserId: request.userId,
                    type: request.type,
                    managerComment
                });
            }

            res.json({ message: 'Solicitud rechazada', request: updatedRequest });
        }

    } catch (err) {
        console.error('Update request status error:', err);
        res.status(500).json({ message: 'Error al actualizar la solicitud' });
    }
});

// --- SHIFT SWAP ENDPOINTS ---

// PROPOSE SWAP
app.post('/api/swaps/propose', requirePermission(PERMISSIONS.SWAPS_PROPOSE), async (req, res) => {
    const { userId, peerId, shiftAId, shiftBId } = req.body;

    try {
        const shiftA = await prisma.shift.findUnique({ where: { id: parseInt(shiftAId) }, include: { zone: true } });
        const shiftB = await prisma.shift.findUnique({ where: { id: parseInt(shiftBId) }, include: { zone: true } });

        if (!shiftA || !shiftB) {
            return res.status(404).json({ message: 'Uno o ambos turnos no existen' });
        }

        if (shiftA.userId !== parseInt(userId)) {
            return res.status(403).json({ message: 'El turno A no te pertenece' });
        }

        if (shiftB.userId !== parseInt(peerId)) {
            return res.status(403).json({ message: 'El turno B no pertenece al compañero seleccionado' });
        }

        if (shiftA.zone.branchId !== shiftB.zone.branchId) {
            return res.status(400).json({ message: 'No se permiten intercambios entre diferentes sucursales' });
        }

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (new Date(shiftA.startDate) < tomorrow || new Date(shiftB.startDate) < tomorrow) {
            return res.status(400).json({ message: 'Los intercambios solo pueden proponerse para turnos a partir de mañana' });
        }

        const request = await prisma.shiftRequest.create({
            data: {
                userId: parseInt(userId),
                peerId: parseInt(peerId),
                shiftAId: parseInt(shiftAId),
                shiftBId: parseInt(shiftBId),
                zoneId: shiftA.zoneId,
                branchId: shiftA.zone.branchId,
                type: 'SWAP',
                startDate: shiftA.startDate,
                endDate: shiftA.endDate,
                status: 'PENDING',
                peerAccepted: false
            }
        });

        // Notificar al compañero
        await prisma.notification.create({
            data: {
                userId: parseInt(peerId),
                message: `Has recibido una propuesta de intercambio de turno de ${shiftA.user ? shiftA.user.name : 'un compañero'}`
            }
        });

        res.status(201).json(request);
    } catch (err) {
        console.error('Propose swap error:', err);
        res.status(500).json({ message: 'Error al proponer el intercambio' });
    }
});

// PEER RESPOND
app.patch('/api/swaps/:id/peer-respond', requirePermission(PERMISSIONS.SWAPS_RESPOND), async (req, res) => {
    const { id } = req.params;
    const { accept } = req.body;

    try {
        const request = await prisma.shiftRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!request || request.type !== 'SWAP') {
            return res.status(404).json({ message: 'Solicitud de intercambio no encontrada' });
        }

        // --- PROTECCIÓN ATÓMICA ---
        // Intentamos actualizar solo si está PENDENTE y el peer NO ha aceptado aún
        const updateResult = await prisma.shiftRequest.updateMany({
            where: {
                id: parseInt(id),
                status: 'PENDING',
                peerAccepted: false
            },
            data: accept ? { peerAccepted: true } : { status: 'REJECTED', managerComment: 'Rechazado por el compañero' }
        });

        if (updateResult.count === 0) {
            return res.status(400).json({ message: 'La solicitud ya ha sido procesada o no se encuentra en estado pendiente.' });
        }

        // Notificaciones según la respuesta
        if (accept) {
            await prisma.notification.create({
                data: {
                    userId: request.userId,
                    message: `Tu compañero ha aceptado tu propuesta de intercambio. Ahora espera la aprobación del responsable.`
                }
            });
        } else {
            await prisma.notification.create({
                data: {
                    userId: request.userId,
                    message: `Tu compañero ha rechazado tu propuesta de intercambio.`
                }
            });
        }

        res.json({ message: 'Respuesta registrada' });
    } catch (err) {
        console.error('Peer respond error:', err);
        res.status(500).json({ message: 'Error al registrar la respuesta del compañero' });
    }
});

// APPROVE (MANAGER)
app.patch('/api/swaps/:id/approve', requirePermission(PERMISSIONS.SWAPS_APPROVE), async (req, res) => {
    const { id } = req.params;
    const { managerComment, adminId } = req.body;

    try {
        const request = await prisma.shiftRequest.findUnique({
            where: { id: parseInt(id) },
            include: { shiftA: true, shiftB: true }
        });

        if (!request || request.type !== 'SWAP') {
            return res.status(404).json({ message: 'Solicitud de intercambio no encontrada' });
        }

        if (!request.peerAccepted) {
            return res.status(400).json({ message: 'El compañero aún no ha aceptado el intercambio' });
        }

        await prisma.$transaction(async (tx) => {
            // --- PROTECCIÓN ATÓMICA DENTRO DE TRANSACCIÓN ---
            // Intentamos pasar a APPROVED solo si sigue PENDING
            const updateCount = await tx.shiftRequest.updateMany({
                where: {
                    id: parseInt(id),
                    status: 'PENDING'
                },
                data: { 
                    status: 'APPROVED', 
                    managerComment: managerComment || null 
                }
            });

            if (updateCount.count === 0) {
                throw new Error('La solicitud ya no está pendiente y no puede ser aprobada de nuevo.');
            }

            // Actualizar turno A para el compañero
            await tx.shift.update({
                where: { id: request.shiftAId },
                data: { userId: request.peerId }
            });

            // Actualizar turno B para el proponente
            await tx.shift.update({
                where: { id: request.shiftBId },
                data: { userId: request.userId }
            });

            // Notificaciones
            const msg = `El intercambio de turnos ha sido APROBADO por el responsable.`;
            await tx.notification.create({ data: { userId: request.userId, message: msg } });
            await tx.notification.create({ data: { userId: request.peerId, message: msg } });

            // Audit Log
            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        userId: parseInt(adminId),
                        action: 'Aprobación de Intercambio (SWAP)',
                        details: {
                            requestId: id,
                            userA: request.userId,
                            userB: request.peerId,
                            shiftA: request.shiftAId,
                            shiftB: request.shiftBId
                        }
                    }
                });
            }
        });

        res.json({ message: 'Intercambio aprobado y turnos actualizados' });
    } catch (err) {
        console.error('Approve swap error:', err);
        res.status(500).json({ message: 'Error al aprobar el intercambio' });
    }
});

// ========== NOTIFICACIONES ==========

// GET /api/notifications - Obtener notificaciones del usuario
app.get('/api/notifications', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: 'Falta el userId' });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: 50 // Últimas 50 notificaciones
        });

        res.json(notifications);
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
});

// PATCH /api/notifications/:id/read - Marcar notificación como leída
app.patch('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;

    try {
        const notification = await prisma.notification.update({
            where: { id: parseInt(id) },
            data: { isRead: true }
        });

        res.json(notification);
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ message: 'Error al marcar notificación como leída' });
    }
});

// Ausencias semanales
app.get('/api/stats/vacations/weekly', async (req, res) => {
    const { weekOffset, branchId } = req.query;
    const offset = parseInt(weekOffset) || 0;

    try {
        let bId = branchId ? parseInt(branchId) : null;
        const userRole = req.query.role;
        const uId = req.query.userId;

        if (userRole === 'responsable' && uId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(uId) },
                include: { managedBranches: true }
            });
            const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
            if (bId && !allowed.includes(bId)) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
            if (!bId) bId = { in: allowed };
        } else if ((userRole === 'administracion' || userRole === 'employee') && uId) {
            const user = await prisma.user.findUnique({ where: { id: parseInt(uId) } });
            if (bId && user.branchId !== bId) {
                return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
            }
            if (!bId) bId = user.branchId;
        }

        // Calcular inicio y fin de la semana
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const daysToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + daysToMonday + (offset * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Buscar todos los turnos de ausencia en la semana
        const absenceWhere = {
            startDate: { gte: weekStart, lte: weekEnd },
            type: { in: ['VACATION', 'OFF', 'MEDICAL', 'SICK_LEAVE'] }
        };

        if (bId) {
            absenceWhere.user = { branchId: bId };
        }

        const shifts = await prisma.shift.findMany({
            where: absenceWhere,
            include: { user: true },
            orderBy: { startDate: 'asc' }
        });

        // Agrupar por fecha
        const absencesByDate = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            absencesByDate[dateStr] = [];
        }

        shifts.forEach(shift => {
            const dateStr = shift.startDate.toISOString().split('T')[0];
            if (absencesByDate[dateStr]) {
                absencesByDate[dateStr].push({
                    id: shift.userId,
                    name: shift.user.name,
                    employeeNumber: shift.user.employeeNumber,
                    type: shift.type,
                    startDate: shift.startDate,
                    endDate: shift.endDate
                });
            }
        });

        res.json({
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            absences: absencesByDate
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Auxiliar para obtener el inicio de la semana (Lunes 00:00)
const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
    const result = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0));
    return result;
};

// Crear Turno con Validaciones y Cálculo Automático de Extras
// Función centralizada de validación y creación de turnos
async function validateAndCreateShift({ userId, zoneId, startDate, endDate, type, subZone }) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationHours = (end - start) / (1000 * 60 * 60);
    const uId = parseInt(userId);
    const zId = parseInt(zoneId);
    const datePart = startDate.split('T')[0];

    if (durationHours <= 0) {
        throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }

    if (isNaN(uId) || isNaN(zId)) {
        throw new Error('ID de usuario o zona no válido');
    }

    // Obtener información del usuario para la sucursal (integridad compuesta)
    const user = await prisma.user.findUnique({
        where: { id: uId },
        select: { branchId: true, isActive: true }
    });

    if (!user) throw new Error('Usuario no encontrado');
    if (!user.isActive) throw new Error('Operación denegada: No se pueden asignar turnos a un empleado dado de baja.');
    const bId = user.branchId;

    // Bajas médicas no tienen restricciones (se cuentan por días completos, no por horas)
    if (type === 'SICK_LEAVE') {
        return await prisma.shift.create({
            data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: end, type, subZone: subZone || null, isOvertime: false }
        });
    }

    // 1. Regla de Descanso de 12h (Mínimo 12h entre turnos de DISTINTOS DÍAS)
    // Excluir SICK_LEAVE de esta validación
    const marginMs = 12 * 60 * 60 * 1000;
    const startWithMargin = new Date(start.getTime() - marginMs);
    const endWithMargin = new Date(end.getTime() + marginMs);

    const nearbyShifts = await prisma.shift.findMany({
        where: {
            userId: uId,
            type: { not: 'SICK_LEAVE' }, // Excluir bajas médicas
            OR: [
                { startDate: { gte: start, lt: end } },
                { endDate: { gt: start, lte: end } },
                { startDate: { lte: start }, endDate: { gte: end } },
                {
                    AND: [
                        { endDate: { gt: startWithMargin, lte: start } },
                        { NOT: { startDate: { gte: new Date(`${datePart}T00:00:00.000Z`), lte: new Date(`${datePart}T23:59:59.999Z`) } } }
                    ]
                },
                {
                    AND: [
                        { startDate: { gte: end, lt: endWithMargin } },
                        { NOT: { startDate: { gte: new Date(`${datePart}T00:00:00.000Z`), lte: new Date(`${datePart}T23:59:59.999Z`) } } }
                    ]
                }
            ]
        }
    });

    if (nearbyShifts.length > 0) {
        const overlap = nearbyShifts.find(s =>
            (new Date(s.startDate) < end && new Date(s.endDate) > start)
        );
        if (overlap) {
            throw new Error('El usuario ya tiene un turno en ese horario.');
        }

        const marginViolations = nearbyShifts.filter(s => type === 'WORK' && s.type === 'WORK');
        if (marginViolations.length > 0) {
            throw new Error('Debe haber un descanso mínimo de 12 horas entre jornadas de distintos días.');
        }
    }

    // 2. Límite Diario Total (12h de trabajo/extra total al día)
    // Excluir SICK_LEAVE del cálculo
    const dayStart = new Date(`${datePart}T00:00:00.000Z`);
    const dayEnd = new Date(`${datePart}T23:59:59.999Z`);

    const allDayShifts = await prisma.shift.findMany({
        where: {
            userId: uId,
            startDate: { gte: dayStart, lte: dayEnd },
            type: { not: 'SICK_LEAVE' } // Excluir bajas médicas
        }
    });

    const totalDayHours = allDayShifts.reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);

    if (type === 'WORK' && totalDayHours + durationHours > 12) {
        throw new Error(`El límite de horas totales (Normal + Extra) por día es de 12h. Ya tiene ${totalDayHours.toFixed(1)}h asignadas.`);
    }

    // 3. Lógica de Tipo No Laboral (Vacaciones, Día Libre, Visita Médica)
    if (['VACATION', 'OFF', 'MEDICAL'].includes(type)) {
        return await prisma.shift.create({
            data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: end, type, isOvertime: false }
        });
    }

    // 4. Lógica de Horas Extra Automática (WORK)
    const dayOfWeek = dayStart.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
        return await prisma.shift.create({
            data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: end, type: 'WORK', isOvertime: true }
        });
    }

    // Cálculo de horas normales consumidas hoy (excluir SICK_LEAVE)
    const normalDayShifts = allDayShifts.filter(s => !s.isOvertime && s.type === 'WORK');
    const dayNormalUsed = normalDayShifts.reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);

    // Cálculo de horas normales consumidas en la semana (excluir SICK_LEAVE)
    const weekStart = getStartOfWeek(start);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const normalWeekShifts = await prisma.shift.findMany({
        where: {
            userId: uId,
            startDate: { gte: weekStart, lt: weekEnd },
            isOvertime: false,
            type: 'WORK'
        }
    });
    const weekNormalUsed = normalWeekShifts.reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);

    const remainingDailyNormal = Math.max(0, 8 - dayNormalUsed);
    const remainingWeeklyNormal = Math.max(0, 40 - weekNormalUsed);
    const canTakeAsNormal = Math.min(remainingDailyNormal, remainingWeeklyNormal);

    if (canTakeAsNormal <= 0) {
        return await prisma.shift.create({
            data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: end, type: 'WORK', subZone: subZone || null, isOvertime: true }
        });
    } else if (canTakeAsNormal >= durationHours) {
        return await prisma.shift.create({
            data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: end, type: 'WORK', subZone: subZone || null, isOvertime: false }
        });
    } else {
        const splitPoint = new Date(start.getTime() + canTakeAsNormal * 60 * 60 * 1000);
        const results = await prisma.$transaction([
            prisma.shift.create({
                data: { userId: uId, zoneId: zId, branchId: bId, startDate: start, endDate: splitPoint, type: 'WORK', subZone: subZone || null, isOvertime: false }
            }),
            prisma.shift.create({
                data: { userId: uId, zoneId: zId, branchId: bId, startDate: splitPoint, endDate: end, type: 'WORK', subZone: subZone || null, isOvertime: true }
            })
        ]);
        return results[0];
    }
}

// Auxiliar para logging de turnos
async function logShiftAction(actorId, action, shift) {
    if (!actorId) return;
    await createAuditLog(parseInt(actorId), action, {
        shiftId: shift.id,
        targetUserId: shift.userId,
        type: shift.type,
        startDate: shift.startDate,
        endDate: shift.endDate,
        zoneId: shift.zoneId
    });
}

// Crear Turno(s) con soporte para asignación masiva
app.post('/api/shifts', requirePermission(PERMISSIONS.SHIFTS_CREATE), async (req, res) => {
    const { userId, zoneId, type, startDate, endDate, dates, subZone, role } = req.body;

    // Validación de permisos: Solo admin y responsable pueden crear turnos directamente
    if (role === 'employee' || role === 'administracion' || role === 'jefe_departamento') {
        return res.status(403).json({ message: 'No tienes permiso para crear turnos manualmente.' });
    }

    // Validación de fecha en el pasado (2 días de gracia)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    try {
        // Modo Masivo: Se recibe un array de fechas y un horario base
        if (dates && Array.isArray(dates)) {
            const results = { success: [], errors: [] };

            // Extraer solo la parte horaria de startDate y endDate (si existen - legacy mode)
            const startTimeStr = startDate ? startDate.split('T')[1] : null;
            const endTimeStr = endDate ? endDate.split('T')[1] : null;

            for (const item of dates) {
                try {
                    let currentStart, currentEnd, dateLog;

                    if (typeof item === 'string') {
                        // Legacy mode: date string + base times
                        currentStart = `${item}T${startTimeStr}`;
                        currentEnd = `${item}T${endTimeStr}`;
                        dateLog = item;
                    } else {
                        currentStart = item.startDate;
                        currentEnd = item.endDate;
                        dateLog = currentStart.split('T')[0];
                    }

                    // Validar fecha en pasado para cada turno del masivo
                    if (new Date(currentStart) < twoDaysAgo && role !== 'admin') {
                        throw new Error(`No tienes permisos para crear turnos en fechas pasadas (${dateLog})`);
                    }

                    const shift = await validateAndCreateShift({
                        userId, zoneId, type, subZone,
                        startDate: currentStart,
                        endDate: currentEnd
                    });
                    results.success.push({ date: dateLog, id: shift.id });
                } catch (e) {
                    const dateLog = typeof item === 'string' ? item : (item.startDate ? item.startDate.split('T')[0] : 'unknown');
                    console.warn(`Error creating bulk shift on ${dateLog}:`, e.message);
                    results.errors.push({ date: dateLog, message: e.message });
                }
            }
            if (results.errors.length > 0 && results.success.length === 0) {
                return res.status(400).json({ message: 'Error al crear turnos: ' + results.errors.map(e => e.message).join(', ') });
            }
            return res.json(results);
        }

        // Modo Individual
        if (new Date(startDate) < twoDaysAgo && role !== 'admin') {
            return res.status(400).json({ message: 'No tienes permisos para crear turnos en fechas pasadas.' });
        }

        const shift = await validateAndCreateShift({ userId, zoneId, startDate, endDate, type, subZone });

        // Audit Log
        const actorId = req.body.adminId || null;
        await logShiftAction(actorId, 'Creación de Turno', shift);

        return res.status(201).json(shift);

    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message || 'Error al crear turno' });
    }
});

// Eliminar Turno
app.delete('/api/shifts/:id', requirePermission(PERMISSIONS.SHIFTS_DELETE), async (req, res) => {
    const { id } = req.params;
    const { role } = req.query; // Recibir el rol para validar reglas

    try {
        const shift = await prisma.shift.findUnique({
            where: { id: parseInt(id) }
        });

        if (!shift) {
            return res.status(404).json({ message: 'Turno no encontrado' });
        }

        // Regla de borrado: Empleado y Administración NO pueden borrar
        if (role === 'employee' || role === 'administracion' || role === 'jefe_departamento') {
            return res.status(403).json({ message: 'No tienes permiso para eliminar turnos.' });
        }

        // Regla de borrado: Responsable solo < 48h
        if (role === 'responsable') {
            const now = new Date();
            const shiftDate = new Date(shift.startDate);
            const hoursDiff = (now - shiftDate) / (1000 * 60 * 60);

            if (hoursDiff > 48) {
                return res.status(403).json({
                    message: 'Los responsables no pueden eliminar turnos con más de 48 horas de antigüedad.'
                });
            }
        }

        await prisma.shift.delete({ where: { id: parseInt(id) } });

        // Audit Log
        const actorId = req.query.adminId || null;
        await logShiftAction(actorId, 'Eliminación de Turno', shift);

        res.json({ message: 'Turno eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar turno' });
    }
});
// Actualizar Turno
app.put('/api/shifts/:id', requirePermission(PERMISSIONS.SHIFTS_EDIT), async (req, res) => {
    const { id } = req.params;
    const { userId, zoneId, startDate, endDate, type, subZone, role } = req.body;

    // Validación de permisos
    if (role === 'employee' || role === 'administracion' || role === 'jefe_departamento') {
        return res.status(403).json({ message: 'No tienes permiso para modificar turnos.' });
    }

    // Validación de fecha en el pasado (2 días de gracia)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    if (new Date(startDate) < twoDaysAgo && role !== 'admin') {
        return res.status(400).json({ message: 'No tienes permisos para modificar turnos en fechas pasadas.' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationHours = (end - start) / (1000 * 60 * 60);
        const uId = parseInt(userId);
        const zId = parseInt(zoneId);
        const datePart = startDate.split('T')[0];

        if (durationHours <= 0) {
            return res.status(400).json({ message: 'La fecha de fin debe ser posterior a la de inicio' });
        }

        if (isNaN(uId) || isNaN(zId)) {
            return res.status(400).json({ message: 'ID de usuario o zona no válido' });
        }

        // --- NUEVA VALIDACIÓN: Usuario Activo ---
        const targetUser = await prisma.user.findUnique({
            where: { id: uId },
            select: { isActive: true }
        });
        if (!targetUser) {
            return res.status(404).json({ message: 'Usuario objetivo no encontrado' });
        }
        if (!targetUser.isActive) {
            return res.status(400).json({ message: 'Operación denegada: No se pueden asignar turnos a un empleado dado de baja.' });
        }
        // ------------------------------------------

        // 1. Regla de Descanso de 12h (Mínimo 12h entre turnos de DISTINTOS DÍAS)
        const marginMs = 12 * 60 * 60 * 1000;
        const startWithMargin = new Date(start.getTime() - marginMs);
        const endWithMargin = new Date(end.getTime() + marginMs);

        const nearbyShifts = await prisma.shift.findMany({
            where: {
                userId: uId,
                id: { not: parseInt(id) }, // Excluir el turno actual
                OR: [
                    { startDate: { gte: start, lt: end } },
                    { endDate: { gt: start, lte: end } },
                    { startDate: { lte: start }, endDate: { gte: end } },
                    // Regla de 12h (solo si NO son del mismo día)
                    {
                        AND: [
                            { endDate: { gt: startWithMargin, lte: start } },
                            { NOT: { startDate: { gte: new Date(`${datePart}T00:00:00`), lte: new Date(`${datePart}T23:59:59`) } } }
                        ]
                    },
                    {
                        AND: [
                            { startDate: { gte: end, lt: endWithMargin } },
                            { NOT: { startDate: { gte: new Date(`${datePart}T00:00:00`), lte: new Date(`${datePart}T23:59:59`) } } }
                        ]
                    }
                ]
            }
        });

        if (nearbyShifts.length > 0) {
            const overlap = nearbyShifts.find(s =>
                (new Date(s.startDate) < end && new Date(s.endDate) > start)
            );
            if (overlap) {
                return res.status(400).json({ message: 'El usuario ya tiene un turno en ese horario.' });
            }
            const marginViolations = nearbyShifts.filter(s => type === 'WORK' && s.type === 'WORK');
            if (marginViolations.length > 0) {
                return res.status(400).json({ message: 'Debe haber un descanso mínimo de 12 horas entre jornadas de distintos días.' });
            }
        }

        // 2. Límite Diario Total (9h de trabajo/extra total al día)
        const dayStart = new Date(`${datePart}T00:00:00`);
        const dayEnd = new Date(`${datePart}T23:59:59`);

        const allDayShifts = await prisma.shift.findMany({
            where: {
                userId: uId,
                id: { not: parseInt(id) },
                startDate: { gte: dayStart, lte: dayEnd }
            }
        });

        const totalDayHours = allDayShifts.reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);
        if (type === 'WORK' && totalDayHours + durationHours > 12) {
            return res.status(400).json({ message: `El límite de horas totales (Normal + Extra) por día es de 12h. Ya tiene ${totalDayHours.toFixed(1)}h adicionales asignadas.` });
        }

        // 3. Si es tipo no laboral o fin de semana, lógica simple
        // Forzamos detección de finde basada en la fecha local de la cadena
        const dayOfWeek = dayStart.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isNonWork = ['VACATION', 'OFF', 'MEDICAL'].includes(type);

        if (isNonWork || isWeekend) {
            const updatedShift = await prisma.shift.update({
                where: { id: parseInt(id) },
                data: {
                    userId: uId,
                    zoneId: zId,
                    startDate: start,
                    endDate: end,
                    type,
                    subZone: subZone || null,
                    isOvertime: !isNonWork && isWeekend
                }
            });
            return res.json(updatedShift);
        }

        // 4. Lógica de Recalculo para WORK en día laboral
        const dailyNormalHours = allDayShifts.filter(s => !s.isOvertime && s.type === 'WORK')
            .reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);

        const weekStart = getStartOfWeek(start);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const normalWeekShifts = await prisma.shift.findMany({
            where: {
                userId: uId,
                id: { not: parseInt(id) },
                startDate: { gte: weekStart, lt: weekEnd },
                isOvertime: false,
                type: 'WORK'
            }
        });
        const weekNormalUsed = normalWeekShifts.reduce((acc, s) => acc + (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60 * 60), 0);

        const remainingDaily = Math.max(0, 8 - dailyNormalHours);
        const remainingWeekly = Math.max(0, 40 - weekNormalUsed);
        const remainingNormal = Math.min(remainingDaily, remainingWeekly);

        let isOvertime = remainingNormal <= 0;

        const updatedShift = await prisma.shift.update({
            where: { id: parseInt(id) },
            data: {
                userId: uId,
                zoneId: zId,
                startDate: start,
                endDate: end,
                type,
                subZone: subZone || null,
                isOvertime
            }
        });

        // Audit Log
        const actorId = req.body.adminId || null;
        await logShiftAction(actorId, 'Edición de Turno', updatedShift);

        res.json(updatedShift);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar el turno' });
    }
});

// ========== SISTEMA DE ANUNCIOS (ANNOUNCEMENTS) ==========

// POST /api/announcements - Crear anuncio
app.post('/api/announcements', requirePermission(PERMISSIONS.ANNOUNCEMENTS_CREATE), async (req, res) => {
    const { title, content, authorId, branchId, priority, expiresAt, allowComments, type } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: parseInt(authorId) } });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Si el rol es 'USER', priority siempre es false
        let finalPriority = priority;
        if (user.role === 'employee') {
            finalPriority = false;
        }

        // Si es prioridad alta, expiresAt es obligatorio
        if (finalPriority && !expiresAt) {
            return res.status(400).json({ message: 'La fecha de expiración es obligatoria para anuncios prioritarios' });
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                authorId: parseInt(authorId),
                branchId: parseInt(branchId),
                priority: finalPriority || false,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                allowComments: allowComments !== undefined ? allowComments : true,
                type: type || 'GENERAL'
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });

        res.status(201).json(announcement);
    } catch (err) {
        console.error('Create announcement error:', err);
        res.status(500).json({ message: 'Error al crear el anuncio' });
    }
});

// GET /api/announcements - Listar anuncios
app.get('/api/announcements', requirePermission(PERMISSIONS.ANNOUNCEMENTS_VIEW), async (req, res) => {
    const { branchId, userId, role } = req.query;
    try {
        let whereClause = {
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        };

        if (branchId) {
            const bId = parseInt(branchId);
            if (req.query.role === 'responsable' && userId) {
                const user = await prisma.user.findUnique({
                    where: { id: parseInt(userId) },
                    include: { managedBranches: true }
                });
                const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
                if (!allowed.includes(bId)) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
            } else if ((req.query.role === 'administracion' || req.query.role === 'employee' || req.query.role === 'jefe_departamento') && userId) {
                const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
                if (user.branchId !== bId) {
                    return res.status(403).json({ message: 'No tienes acceso a esta sucursal' });
                }
            }
            whereClause.branchId = bId;
        } else if (req.query.role === 'responsable' && userId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { managedBranches: true }
            });
            const branchIds = user.managedBranches.map(b => b.id);
            branchIds.push(user.branchId);
            whereClause.branchId = { in: branchIds };
        } else if ((req.query.role === 'administracion' || req.query.role === 'employee' || req.query.role === 'jefe_departamento') && userId) {
            const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
            whereClause.branchId = user.branchId;
        } else {
            return res.status(400).json({ message: 'branchId es obligatorio' });
        }

        const announcements = await prisma.announcement.findMany({
            where: whereClause,
            include: {
                author: { select: { name: true, role: true } },
                comments: {
                    include: {
                        user: { select: { name: true } }
                    }
                },
                _count: {
                    select: { reads: true }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        // Marcar si el usuario actual ha leído cada anuncio (opcional, útil para UI)
        let processedAnnouncements = announcements;
        if (userId) {
            const reads = await prisma.announcementRead.findMany({
                where: { userId: parseInt(userId) }
            });
            const readIds = new Set(reads.map(r => r.announcementId));
            processedAnnouncements = announcements.map(a => ({
                ...a,
                isRead: readIds.has(a.id)
            }));
        }

        res.json(processedAnnouncements);
    } catch (err) {
        console.error('List announcements error:', err);
        res.status(500).json({ message: 'Error al listar anuncios' });
    }
});

// POST /api/announcements/:id/read - Registrar lectura
app.post('/api/announcements/:id/read', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        await prisma.announcementRead.upsert({
            where: {
                announcementId_userId: {
                    announcementId: parseInt(id),
                    userId: parseInt(userId)
                }
            },
            update: { readAt: new Date() },
            create: {
                announcementId: parseInt(id),
                userId: parseInt(userId)
            }
        });
        res.json({ message: 'Lectura registrada' });
    } catch (err) {
        console.error('Record read error:', err);
        res.status(500).json({ message: 'Error al registrar lectura' });
    }
});

// GET /api/announcements/:id/stats - Estadísticas (Solo Managers/Admin)
app.get('/api/announcements/:id/stats', async (req, res) => {
    const { id } = req.params;
    const { role, branchId } = req.query;

    if (role !== 'admin' && role !== 'responsable') {
        return res.status(403).json({ message: 'No tienes permiso para ver estadísticas' });
    }

    try {
        const announcement = await prisma.announcement.findUnique({
            where: { id: parseInt(id) }
        });

        if (!announcement) return res.status(404).json({ message: 'Anuncio no encontrado' });

        // Empleados de la sucursal
        const totalEmployees = await prisma.user.count({
            where: {
                branchId: announcement.branchId,
                role: 'employee'
            }
        });

        const readCount = await prisma.announcementRead.count({
            where: {
                announcementId: parseInt(id),
                user: {
                    role: 'employee'
                }
            }
        });

        const percentage = totalEmployees > 0 ? (readCount / totalEmployees) * 100 : 0;

        res.json({
            totalEmployees,
            readCount,
            percentage: percentage.toFixed(2)
        });
    } catch (err) {
        console.error('Announcement stats error:', err);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
});

// POST /api/announcements/:id/comments - Añadir comentario
app.post('/api/announcements/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { userId, content } = req.body;

    try {
        const announcement = await prisma.announcement.findUnique({ where: { id: parseInt(id) } });
        if (!announcement) return res.status(404).json({ message: 'Anuncio no encontrado' });
        if (!announcement.allowComments) return res.status(400).json({ message: 'Los comentarios están desactivados para este anuncio' });

        const comment = await prisma.comment.create({
            data: {
                announcementId: parseInt(id),
                userId: parseInt(userId),
                content
            },
            include: {
                user: { select: { name: true } }
            }
        });

        res.status(201).json(comment);
    } catch (err) {
        console.error('Create comment error:', err);
        res.status(500).json({ message: 'Error al crear comentario' });
    }
});

// DELETE /api/announcements/:id - Eliminar anuncio
// Usuarios: solo pueden eliminar el propio si han pasado menos de 48h.
// Responsable/Admin: pueden eliminar el propio en cualquier momento.
// DELETE /api/announcements/:id - Eliminar anuncio
app.delete('/api/announcements/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_DELETE), async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.body;

    try {
        const announcement = await prisma.announcement.findUnique({ where: { id: parseInt(id) } });
        if (!announcement) return res.status(404).json({ message: 'Anuncio no encontrado' });

        // Solo el autor puede eliminar
        if (announcement.authorId !== parseInt(userId)) {
            return res.status(403).json({ message: 'Solo el autor puede eliminar el anuncio' });
        }

        // Restricción de 48h para empleados (roles no manager)
        if ((role === 'employee' || role === 'administracion' || role === 'jefe_departamento') && userId) {
            const now = new Date();
            const created = new Date(announcement.createdAt);
            const hoursElapsed = (now - created) / (1000 * 60 * 60);
            if (hoursElapsed > 48) {
                return res.status(403).json({ message: 'Los anuncios no pueden eliminarse después de 48 horas' });
            }
        }

        // Eliminar comentarios y lecturas primero (integridad referencial)
        await prisma.comment.deleteMany({ where: { announcementId: parseInt(id) } });
        await prisma.announcementRead.deleteMany({ where: { announcementId: parseInt(id) } });
        await prisma.announcement.delete({ where: { id: parseInt(id) } });

        res.json({ message: 'Anuncio eliminado correctamente' });
    } catch (err) {
        console.error('Delete announcement error:', err);
        res.status(500).json({ message: 'Error al eliminar el anuncio' });
    }
});

// PUT /api/announcements/:id - Editar anuncio
app.put('/api/announcements/:id', requirePermission(PERMISSIONS.ANNOUNCEMENTS_EDIT), async (req, res) => {
    const { id } = req.params;
    const { userId, role, title, content, type, expiresAt, allowComments } = req.body;

    if (role !== 'admin' && role !== 'responsable') {
        return res.status(403).json({ message: 'Solo los responsables pueden editar anuncios' });
    }

    try {
        const announcement = await prisma.announcement.findUnique({ where: { id: parseInt(id) } });
        if (!announcement) return res.status(404).json({ message: 'Anuncio no encontrado' });

        if (announcement.authorId !== parseInt(userId)) {
            return res.status(403).json({ message: 'Solo el autor puede editar el anuncio' });
        }

        const updated = await prisma.announcement.update({
            where: { id: parseInt(id) },
            data: {
                title: title ?? announcement.title,
                content: content ?? announcement.content,
                type: type ?? announcement.type,
                expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : announcement.expiresAt,
                allowComments: allowComments !== undefined ? allowComments : announcement.allowComments
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });

        res.json(updated);
    } catch (err) {
        console.error('Update announcement error:', err);
        res.status(500).json({ message: 'Error al editar el anuncio' });
    }
});

// ========== SISTEMA DE AUDITORÍA (AUDIT LOGS) ==========

app.get('/api/audit-logs', requirePermission(PERMISSIONS.AUDIT_LOGS_VIEW), async (req, res) => {
    const { action, userId, startDate, endDate } = req.query;

    try {
        const userRole = req.query.role;
        const adminId = req.query.adminId; // El frontend envía adminId para los logs

        const where = {};
        if (adminId) {
            if (userRole === 'responsable') {
                const user = await prisma.user.findUnique({
                    where: { id: parseInt(adminId) },
                    include: { managedBranches: true }
                });
                const allowed = [user.branchId, ...user.managedBranches.map(b => b.id)];
                where.user = { branchId: { in: allowed } };
            } else if (userRole === 'administracion' || userRole === 'employee' || userRole === 'jefe_departamento') {
                const user = await prisma.user.findUnique({ where: { id: parseInt(adminId) } });
                where.user = { branchId: user.branchId };
            }
        }

        if (action) {
            where.action = { contains: action, mode: 'insensitive' };
        }
        if (userId) {
            where.userId = parseInt(userId);
        }
        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeNumber: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 500 // Limitar a los últimos 500 logs
        });

        res.json(logs);
    } catch (err) {
        console.error('List audit logs error:', err);
        res.status(500).json({ message: 'Error al listar los logs de auditoría' });
    }
});

// ========== BACKUP MANUAL (ADMIN) ==========

app.get('/api/admin/backup', requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (req, res) => {
    const { adminId } = req.query;

    if (!adminId) {
        return res.status(400).json({ message: 'adminId es obligatorio' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(adminId) }
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'No autorizado para realizar respaldos. Se requiere rol ADMIN.' });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `backup_auteide_${dateStr}.sql`;

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Parse DATABASE_URL to extract credentials for pg_dump
        // DATABASE_URL format: postgres://user:password@host:port/dbname
        const dbUrl = new URL(process.env.DATABASE_URL);
        const pgEnv = {
            ...process.env,
            PGPASSWORD: dbUrl.password
        };
        const pgDump = spawn('pg_dump', [
            '-h', dbUrl.hostname,
            '-p', dbUrl.port || '5432',
            '-U', dbUrl.username,
            '-d', dbUrl.pathname.replace('/', ''),
            '--no-password'
        ], { env: pgEnv });

        pgDump.stdout.pipe(res);

        pgDump.stderr.on('data', (data) => {
            console.error(`pg_dump stderr: ${data}`);
        });

        pgDump.on('close', async (code) => {
            if (code !== 0) {
                console.error(`pg_dump process exited with code ${code}`);
                // Can't reliably send an error response here because headers/data might have already been sent
            } else {
                console.log('Database backup successfully generated and sent.');
                await createAuditLog(parseInt(adminId), 'Descarga de Backup Manual', {
                    fileName
                });
            }
        });

        pgDump.on('error', (err) => {
            console.error('Failed to start pg_dump process:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Error interno al generar el backup' });
            }
        });

    } catch (err) {
        console.error('Backup request error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error al procesar la solicitud de backup' });
        }
    }
});

// ========== VACATION ADJUSTMENTS ==========

app.post('/api/vacation-adjustments', requirePermission(PERMISSIONS.VACATION_ADJUSTMENTS_MANAGE), async (req, res) => {
    const { userId, days, reason, year, actorId, actorRole, actorBranchId } = req.body;

    if (!userId || days === undefined || !reason || !year || !actorId || !actorRole) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    try {
        if (actorRole !== 'admin' && actorRole !== 'responsable') {
            return res.status(403).json({ message: 'No tienes permiso para conceder ajustes de vacaciones' });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (actorRole === 'responsable' && targetUser.branchId !== parseInt(actorBranchId)) {
            return res.status(403).json({ message: 'No puedes ajustar vacaciones de empleados de otra sucursal' });
        }

        const adjustment = await prisma.vacationAdjustment.create({
            data: {
                userId: parseInt(userId),
                authorizedById: parseInt(actorId),
                days: parseFloat(days),
                reason,
                year: parseInt(year)
            }
        });

        await createAuditLog(parseInt(actorId), 'Ajuste de Vacaciones Creado', {
            targetUserId: userId,
            days,
            reason,
            year
        });

        res.status(201).json(adjustment);
    } catch (err) {
        console.error('Error creating vacation adjustment:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

app.get('/api/vacation-adjustments', requirePermission(PERMISSIONS.VACATION_ADJUSTMENTS_MANAGE), async (req, res) => {
    const { branchId, year } = req.query;

    try {
        const where = {};
        if (year) where.year = parseInt(year);
        if (branchId) {
            where.user = {
                branchId: parseInt(branchId)
            };
        }

        const adjustments = await prisma.vacationAdjustment.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, employeeNumber: true, branchId: true } },
                authorizedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(adjustments);
    } catch (err) {
        console.error('Error fetching vacation adjustments:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

app.delete('/api/vacation-adjustments/:id', requirePermission(PERMISSIONS.VACATION_ADJUSTMENTS_MANAGE), async (req, res) => {
    const { id } = req.params;
    const { actorId, actorRole, actorBranchId } = req.query;

    try {
        if (actorRole !== 'admin' && actorRole !== 'responsable') {
            return res.status(403).json({ message: 'Sin permisos' });
        }

        const adjustment = await prisma.vacationAdjustment.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!adjustment) return res.status(404).json({ message: 'Ajuste no encontrado' });

        if (actorRole === 'responsable' && adjustment.user.branchId !== parseInt(actorBranchId)) {
            return res.status(403).json({ message: 'No puedes eliminar ajustes de otra sucursal' });
        }

        await prisma.vacationAdjustment.delete({ where: { id: parseInt(id) } });

        await createAuditLog(parseInt(actorId), 'Ajuste de Vacaciones Eliminado', {
            adjustmentId: id,
            targetUserId: adjustment.userId,
            days: adjustment.days,
            year: adjustment.year
        });

        res.json({ message: 'Ajuste eliminado con éxito' });
    } catch (err) {
        console.error('Error deleting vacation adjustment:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// --- ROLE PERMISSIONS MANAGEMENT ---

app.get('/api/role-permissions', requirePermission(PERMISSIONS.AUTH_ROLES_MANAGE), async (req, res) => {
    try {
        const perms = await prisma.rolePermission.findMany();
        res.json(perms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/role-permissions', requirePermission(PERMISSIONS.AUTH_ROLES_MANAGE), async (req, res) => {
    const { role, permissions, adminId } = req.body;
    try {
        const updated = await prisma.rolePermission.upsert({
            where: { role },
            update: { permissions },
            create: { role, permissions }
        });

        if (adminId) {
            await createAuditLog(parseInt(adminId), 'Actualización de Permisos de Rol', {
                role,
                permissionsCount: permissions.length
            });
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Servidor corriendo en http://localhost:${port}`);
    });
}

module.exports = { app };
