# 🔧 Documentación Técnica — Gestión de Turnos Empresa (v1.0)

> Documento de referencia para desarrolladores y administradores de sistemas. Cubre arquitectura, modelo de datos, API completa, decisiones de diseño y operaciones.

---

## 📋 Tabla de Contenidos

- [1. Visión General y Stack](#1-visión-general-y-stack)
- [2. Arquitectura de Contenedores](#2-arquitectura-de-contenedores)
- [3. Modelo de Datos (Schema)](#3-modelo-de-datos-schema)
- [4. Sistema de Roles y Permisos (RBAC)](#4-sistema-de-roles-y-permisos-rbac)
- [5. Referencia de la API REST](#5-referencia-de-la-api-rest)
- [6. Tareas Automáticas (Cron Jobs)](#6-tareas-automáticas-cron-jobs)
- [7. Testing](#7-testing)
- [8. Guía de Operaciones](#8-guía-de-operaciones)
- [9. Decisiones de Arquitectura (ADR)](#9-decisiones-de-arquitectura-adr)

---

## 1. Visión General y Stack

Aplicación **monorepo** con frontend desacoplado del backend, comunicados vía API REST y autenticados mediante JWT. Cada componente es un contenedor Docker independiente.

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| **Gateway** | Nginx | 1.25 | Reverse proxy, terminación SSL, enrutamiento |
| **Frontend** | React + Vite | 18 / 5 | SPA / PWA estática |
| **Estilos** | Tailwind CSS | 3 | Utility-first CSS framework |
| **Backend** | Node.js + Express | 20 LTS | API REST monolítica |
| **ORM** | Prisma | 5 | Consultas tipadas, migraciones |
| **Base de Datos** | PostgreSQL | 15 | Persistencia relacional |
| **Auth** | JWT + Bcrypt | — | Tokens de sesión + hash de contraseñas |

---

## 2. Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Docker Compose Network: app-network             │
│                                                                     │
│  ┌──────────────┐     /api/*    ┌─────────────────────────────┐    │
│  │   NGINX      │──────────────►│   express-backend (3000)    │    │
│  │   :443 SSL   │               │   • REST API                │────►  postgres:5432
│  │   :80  HTTP  │     /*        │   • Cron Jobs               │    │
│  │  (redirect)  │──────────────►│   • Audit Logger            │    │
│  └──────────────┘               └─────────────────────────────┘    │
│         ▲                                                           │
└─────────┼───────────────────────────────────────────────────────── ┘
          │ HTTPS :443
   [ Cliente PWA / Navegador ]
```

### Archivos de composición

| Archivo | Propósito |
|---------|-----------|
| `docker-compose.yml` | Desarrollo local (hot-reload, logs verbosos) |
| `docker-compose.prod.yml` | Producción (imágenes optimizadas, HTTPS obligatorio) |

---

## 3. Modelo de Datos (Schema)

Resumen del esquema Prisma. Schema completo en `backend/prisma/schema.prisma`.

### Entidades principales

```
User
├── id, employeeNumber, name, password (bcrypt)
├── role: employee | responsable | jefe_departamento | administracion | admin
├── branchId → Branch (sucursal principal)
├── zoneId → Zone
├── isActive, mustChangePassword
├── avatarUrl, birthDate, showBirthday
├── themePreference, notificationPrefs
└── managedBranches → Branch[] (muchos a muchos)

Branch
├── id, name
└── zones → Zone[]

ZoneDefinition
├── id, name
├── zones → Zone[]
└── subZones → SubZone[]

Zone
├── id, name
├── branchId → Branch
└── definitionId → ZoneDefinition

SubZone
├── id, name
├── definitionId → ZoneDefinition
└── branchId → Branch | null  (null = global a todas las sucursales)

Shift
├── id, startDate, endDate, type
├── userId → User
├── branchId → Branch
├── zoneId → Zone
└── subZoneId → SubZone | null

ShiftRequest (Vacaciones, Médico, Asuntos propios)
├── id, type, status: PENDING | APPROVED | REJECTED | EXPIRED
├── startDate, endDate, comment
└── userId → User

ShiftSwap (Intercambio atómico de turnos)
├── id, status: PENDING | ACCEPTED | REJECTED | APPROVED
├── requesterId, targetId → User
├── requesterShiftId, targetShiftId → Shift
└── approverId → User | null

Announcement
├── id, title, content, type: GENERAL | PRIORITY | BIRTHDAY
├── priority (boolean), allowComments
├── authorId → User
└── branchId → Branch | null (null = global)

GlobalNotice
├── id, title, message, type: INFO | WARNING | CRITICAL
└── isActive (boolean)

Notification
├── id, message, isRead
└── userId → User

AuditLog
├── id, action, details (JSON)
├── ip, createdAt
└── userId → User
```

### Regla de visibilidad de SubZonas

```
admin          → Todas las SubZonas del sistema (branchId = any)
responsable    → SubZonas de sus sucursales + SubZonas globales (branchId = null)
demás roles    → SubZonas de su propia sucursal + globales
```

---

## 4. Sistema de Roles y Permisos (RBAC)

Los permisos se almacenan en la tabla `RolePermission` de la base de datos, lo que permite modificarlos sin redespliegue. Los permisos son constantes en `backend/src/constants/permissions.js`.

| Permiso | employee | responsable | jefe_dpto | administracion | admin |
|---------|:---:|:---:|:---:|:---:|:---:|
| `SHIFTS_VIEW` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `SHIFTS_CREATE` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `SHIFTS_EDIT` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `SHIFTS_DELETE` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `USERS_VIEW` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `USERS_CREATE` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `USERS_EDIT` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `USERS_DELETE` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `ZONES_VIEW` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ZONES_MANAGE` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `AUDIT_VIEW` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `GLOBAL_NOTICES_MANAGE` | ❌ | ❌ | ❌ | ❌ | ✅ |

> Los permisos se comprueban en el middleware `requirePermission(PERMISSIONS.X)` aplicado en cada ruta del backend.

---

## 5. Referencia de la API REST

**Base URL:** `/api`  
**Autenticación:** `Authorization: Bearer <JWT>` (excepto `/api/login`)  
**Tokens:** Expiran en 12 horas.

### 🔐 Auth

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/login` | ❌ | Login. Devuelve `{ user, token }` |
| `POST` | `/api/users/:id/change-password` | ✅ | Cambia contraseña del usuario |

### 👥 Usuarios

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/users` | `USERS_VIEW` | Lista usuarios (filtrado por rol del solicitante) |
| `POST` | `/api/users` | `USERS_CREATE` | Crea un nuevo usuario |
| `PUT` | `/api/users/:id` | `USERS_EDIT` | Actualiza datos y perfil del usuario |
| `DELETE` | `/api/users/:id` | `USERS_DELETE` | Elimina usuario (falla si tiene registros asociados) |

### 🏢 Sucursales y Zonas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/branches` | ✅ | Lista sucursales (filtradas según rol) |
| `GET` | `/api/zone-definitions` | `ZONES_VIEW` | Lista definiciones de zona con sus subzonas |
| `POST` | `/api/zone-definitions` | `ZONES_MANAGE` | Crea definición de zona |
| `DELETE` | `/api/zone-definitions/:id` | `ZONES_MANAGE` | Elimina definición de zona |
| `GET` | `/api/subzones` | `ZONES_VIEW` | Lista subzonas (filtradas según rol y sucursal) |
| `POST` | `/api/subzones` | `ZONES_MANAGE` | Crea subzona (global si `branchId=null`) |
| `DELETE` | `/api/subzones/:id` | `ZONES_MANAGE` | Elimina subzona |

### 📅 Turnos

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/shifts` | `SHIFTS_VIEW` | Lista turnos (filtro: `start`, `end`, `branchId`, `zoneId`) |
| `POST` | `/api/shifts` | `SHIFTS_CREATE` | Crea turno. Bloquea si usuario está inactivo |
| `PUT` | `/api/shifts/:id` | `SHIFTS_EDIT` | Actualiza turno |
| `DELETE` | `/api/shifts/:id` | `SHIFTS_DELETE` | Elimina turno (registra en AuditLog) |

### 🔄 Solicitudes e Intercambios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/shift-requests` | ✅ | Lista solicitudes (vacaciones, médico, etc.) |
| `POST` | `/api/shift-requests` | ✅ | Crea solicitud de permiso |
| `PUT` | `/api/shift-requests/:id` | ✅ | Aprueba / Rechaza solicitud |
| `DELETE` | `/api/shift-requests/:id` | ✅ | Cancela solicitud pendiente |
| `GET` | `/api/shift-swaps` | ✅ | Lista intercambios de turno |
| `POST` | `/api/shift-swaps` | ✅ | Propone intercambio de turno |
| `PUT` | `/api/shift-swaps/:id/respond` | ✅ | Compañero acepta/rechaza la propuesta |
| `PUT` | `/api/shift-swaps/:id/approve` | ✅ | Responsable aprueba el intercambio final |

### 📢 Anuncios y Comunicados

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/announcements` | ✅ | Lista anuncios (filtrados por sucursal del usuario) |
| `POST` | `/api/announcements` | ✅ | Crea anuncio |
| `PUT` | `/api/announcements/:id` | ✅ | Edita anuncio |
| `DELETE` | `/api/announcements/:id` | ✅ | Elimina anuncio |
| `GET` | `/api/global-notices/active` | ✅ | Avisos globales activos (mostrar al login) |
| `GET` | `/api/global-notices` | `GLOBAL_NOTICES_MANAGE` | Gestión de todos los avisos globales |
| `POST` | `/api/global-notices` | `GLOBAL_NOTICES_MANAGE` | Crea aviso global |
| `PUT` | `/api/global-notices/:id` | `GLOBAL_NOTICES_MANAGE` | Edita / activa / desactiva aviso |
| `DELETE` | `/api/global-notices/:id` | `GLOBAL_NOTICES_MANAGE` | Elimina aviso |

### 🔔 Notificaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | ✅ | Lista notificaciones del usuario autenticado |
| `PUT` | `/api/notifications/:id/read` | ✅ | Marca notificación como leída |
| `DELETE` | `/api/notifications/:id` | ✅ | Elimina notificación |

### 🛡️ Auditoría y Sistema

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/api/audit-logs` | `AUDIT_VIEW` | Lista logs de auditoría con paginación |
| `GET` | `/api/backup` | `AUDIT_VIEW` | Genera y descarga un `pg_dump` de la base de datos |
| `GET` | `/health` | ❌ | Health check: verifica conexión a PostgreSQL |

---

## 6. Tareas Automáticas (Cron Jobs)

El backend gestiona dos tareas programadas mediante `node-cron`:

| Tarea | Schedule | Descripción |
|-------|----------|-------------|
| **Expiración de solicitudes** | `0 0 * * *` (00:00 diario) | Marca como `EXPIRED` las `ShiftRequest` en estado `PENDING` cuya `startDate` ya ha pasado. Genera una `Notification` para el empleado afectado. |
| **Anuncios de cumpleaños** | `1 0 * * *` (00:01 diario) | (1) Archiva (`allowComments: false`) los anuncios de tipo `BIRTHDAY` del día anterior. (2) Crea nuevos anuncios para los usuarios que tienen `showBirthday: true` y cumplen años hoy. |

---

## 7. Testing

El proyecto incluye tests de integración con **Vitest** (backend) y **React Testing Library** (frontend).

### Ejecutar tests

```bash
# Backend: tests unitarios e integración
cd backend && npm test

# Frontend: tests de componentes
cd frontend && npm test
```

### Cobertura de tests

| Módulo | Archivo de test | Qué cubre |
|--------|----------------|-----------|
| Auth | `src/__tests__/auth.test.js` | Login exitoso, credenciales incorrectas, usuario inactivo |
| Middleware | `src/__tests__/middleware.test.js` | `authenticateToken`, `requirePermission` |
| Turnos | `src/__tests__/shifts.test.js` | CRUD de turnos, bloqueo de usuarios inactivos |
| Subzonas | `src/__tests__/subzones.test.js` | Visibilidad por rol, subzonas globales |
| Swaps | `src/__tests__/swaps.test.js` | Flujo de intercambio en dos fases |
| Frontend | `src/__tests__/Login.test.jsx` | Render del formulario de login |
| Hooks | `src/__tests__/usePermissions.test.js` | Resolución de permisos por rol en cliente |

---

## 8. Guía de Operaciones

### Comandos habituales

```bash
# Levantar en producción (primera vez o tras cambios)
docker compose -f docker-compose.prod.yml up -d --build

# Ver logs en tiempo real
docker compose logs -f

# Ejecutar migraciones de Prisma (NUNCA migrate dev en producción)
docker compose exec backend npx prisma migrate deploy

# Acceder a la consola de PostgreSQL
docker compose exec db psql -U <DB_USER> turnos_db

# Generar backup manual
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://tu-dominio.com/api/backup -o backup.sql

# Restaurar backup
docker compose exec -T db psql -U <DB_USER> turnos_db < backup.sql
```

### Gestión de la identidad Git del servidor

En el servidor, configura la identidad de Git para evitar advertencias en los commits automatizados:

```bash
git config --global user.email "deploy@tu-empresa.com"
git config --global user.name "Deploy Bot"
```

---

## 9. Decisiones de Arquitectura (ADR)

### ADR-001: Monolito en el backend vs. microservicios

**Decisión:** API Express monolítica en `src/index.js`.  
**Razón:** El volumen de operaciones no justifica la complejidad operativa de microservicios. Una API monolítica permite una iteración más rápida y un debugging más sencillo. El código sigue siendo testeable de forma unitaria.

### ADR-002: Prisma ORM vs. consultas raw SQL

**Decisión:** Prisma ORM para todas las consultas.  
**Razón:** Proporciona tipado, validación de esquema en tiempo de compilación, y un sistema de migraciones reproducible. Las transacciones Prisma previenen race conditions en operaciones críticas como los `ShiftSwap`.

### ADR-003: Vite vs. Create React App

**Decisión:** Vite como bundler del frontend.  
**Razón:** Tiempos de arranque y HMR (Hot Module Replacement) significativamente más rápidos que CRA. Soporte nativo para ESModules y una configuración mínima para PWA.

### ADR-004: Docker Compose vs. Kubernetes

**Decisión:** Docker Compose para orquestación.  
**Razón:** El sistema está diseñado para un único servidor de empresa. La complejidad de Kubernetes no aporta valor a esta escala. Docker Compose es suficiente para garantizar aislamiento, reproducibilidad y facilidad de despliegue.

### ADR-005: Permisos en base de datos vs. código hardcodeado

**Decisión:** Los permisos de rol se almacenan en la tabla `RolePermission`.  
**Razón:** Permite modificar los permisos de un rol sin necesidad de redespliegue. Los identificadores de permisos están definidos como constantes en `constants/permissions.js` para prevenir errores tipográficos.
