# Documentación Técnica - Gestión de Turnos Auteide

Este documento está dirigido a analistas de sistemas, arquitectos de software y desarrolladores encargados del mantenimiento, operación y escalabilidad del proyecto "Gestión de Turnos Auteide".

---

## 1. Visión General y Stack Tecnológico

El proyecto es una aplicación web integral de gestión de turnos orientada a sucursales. Está diseñada bajo el enfoque **PWA (Progressive Web App)** para permitir la instalación en dispositivos fijos y móviles, y se encuentra completamente dockerizada para asegurar la consistencia en cualquier entorno de despliegue.

### Tecnologías Principales
- **Frontend:** React 18, Vite, React Router DOM, TailwindCSS (Estilos), Lucide React (Iconografía).
- **Backend:** Node.js (Express.js).
- **Base de Datos:** PostgreSQL 15.
- **ORM:** Prisma Client (v5).
- **Infraestructura:** Docker & Docker Compose.
- **Proxy Inverso:** Nginx (Manejo de SSL/TLS y Gateway de microservicios).

### Diagrama de Arquitectura de Contenedores

```mermaid
graph TD
    Client([Navegador / Cliente PWA]) -->|HTTPS :443 [Host:3000]| Nginx[Nginx Reverse Proxy]
    
    subgraph Docker Network [app-network]
        Nginx -->|/api/*| Backend[Node.js Backend :3000]
        Nginx -->|/*| Frontend[React Static / Vite]
        Backend -->|Prisma ORM :5432| DB[(PostgreSQL 15)]
    end
```

El despliegue se organiza en una red interna de Docker (`app-network`) con cuatro servicios aislados:
1. **`db` (PostgreSQL):** Base de datos principal. Expone el puerto 5432 internamente pero NO al host.
2. **`backend` (Node.js):** API REST. Se conecta al contenedor de base de datos a través de la red interna.
3. **`frontend` (React):** Aplicación cliente. No expone puertos al host, siendo servida de forma interna directamente hacia Nginx.
4. **`nginx`:** Actúa como *API Gateway*. Maneja los certificados HTTPS en el puerto 3000 del host, mapeándolo al 443 interno, resolviendo así problemas de CORS y enrutando dinámicamente el tráfico web contra el frontend y las llamadas a `/api` contra el backend.

---

## 2. Estructura del Código Fuente

El repositorio cuenta con dos módulos principales (`frontend` y `backend`) además de configuraciones de Nginx y Docker.

### Frontend (`/frontend`)
Aplicación SPA construida con **Vite**. La gestión de la estructura es la siguiente:
- `src/components/`: Componentes UI reutilizables (Modales, Selectores, Layouts).
- `src/pages/`: Vistas completas de la aplicación (Login, Dashboard, Shifts, Vacaciones, etc.).
- `src/contexts/`: Manejadores de estado global (e.g., `ThemeContext.jsx` para el modo oscuro).
- `src/App.jsx`: Contiene el enrutador (`react-router-dom`) y los Guardianes de Ruta (`ProtectedRoute`, `AdminRoute`, `ManagerRoute`).
- `src/utils/`: Funciones auxiliares para fechas y conversiones.

### Backend (`/backend`)
Servidor API construido en **Express**.
- `src/index.js`: Punto de entrada único (Monolito) que define todas las rutas de la API, middleware de Express y tareas programadas (`node-cron`).
- `prisma/`: Contiene `schema.prisma` (Fuente de verdad de la base de datos) y la carpeta `migrations/` con el historial de cambios incrementales.

---

## 3. Esquema de Base de Datos (Core)

El modelo de datos relacional se compone de las siguientes entidades clave definidas en Prisma:

- **`User`:** Representa empleados y perfiles administrativos. Relacionado 1:N con sus turnos (`Shift`), notificaciones, solicitudes (`ShiftRequest`), y registros de log (`AuditLog`). Incluye una relación **Many-to-Many** (`managedBranches`) para definir el ámbito de gestión de los responsables.
- **`Branch` y `Zone`:** Organización jerárquica. Los usuarios están asignados a una Zona específica que pertenece a una Sucursal.
- **`ZoneDefinition` y `SubZone` [NUEVO]:** Sistema de plantillas de zona. Una `ZoneDefinition` (ej. "Almacén") agrupa zonas de diferentes sucursales. Las `SubZone` pertenecen a una `ZoneDefinition` y pueden ser **Globales** (visibles en todas las sucursales con esa zona) o **Exclusivas** (solo visibles en una sucursal específica).
- **`Shift`:** Registros cronológicos de turnos. Incluye estados como `WORK`, `VACATION`, `OFF`, `MEDICAL`, `SWAP`.
- **`ShiftRequest`:** Solicitudes de los usuarios para ausencias o cambios de turno. Puede apuntar a un segundo usuario (`peer`) en caso de intercambios y cruza con la tabla de turnos original para mantener la referencia.
- **`Announcement` y `GlobalNotice`:** Tablón de noticias. Las primeras son por sucursal, mientras que las notificaciones globales son para toda la instancia.
- **`VacationAdjustment`:** Registro inmutable de ajustes manuales (+ ó -) al saldo de vacaciones de un empleado, autorizado por un mánager por año.
- **`AuditLog`:** Sistema de trazabilidad (Quién, qué y cuándo) para acciones críticas.

---

## 4. Reglas de Negocio, Autenticación y Permisos (RBAC)

### Autenticación y Sesión
El sistema utiliza un modelo de autenticación directa basado en **Employee Number** y **Contraseña**.
- La sesión se mantiene del lado del cliente guardando un objeto JSON de usuario primario en el `localStorage` del navegador.
- Los Guardianes de Ruta (Route Guards) en React protegen la navegación en función del campo `role` inyectado en la sesión.

### Sistema de Roles
Técnicamente existen 4 identificadores principales de rol (`role`) evaluados en `App.jsx`:
- **`employee` (Usuario base):** Puede ver su propio calendario, solicitar vacaciones y proponer intercambios de turno con otros compañeros.
- **`responsable` (Manager):** Gestión de turnos, aprobación de solicitudes, anuncios y ajustes de vacaciones. Su ámbito puede ser su sucursal base o un conjunto de **múltiples sucursales asignadas** (`managedBranches`). El sistema aplica filtros dinámicos en la UI y validaciones de seguridad en el backend para este ámbito extendido.
- **`administracion` (Oficina):** Perfil intermedio para visualización, cálculos y auditorías sin privilegios técnicos plenos. Este rol está restringido estrictamente a la zona "Oficina" de su sucursal.
- **`admin` (Superusuario):** Acceso total al sistema, mantenimiento, auditorías `AuditLogs`, configuración global y respaldos.

### Intercambio de Turnos (Swap - Transacción Atómica)
El proceso de cambio de turno funciona como una **transacción de consenso en dos fases**:
1. **Fase de Consenso:** El empleado solicitante crea un `ShiftRequest` (`type: SWAP`). Se selecciona el compañero (`peer`) y los turnos involucrados. El compañero entra a su panel y debe **aceptar explícitamente** la solicitud (`peerAccepted: true`).
2. **Fase de Aprobación:** Una vez aceptada por el compañero, cambia su estado visual para que el `responsable` o `admin` lo evalúe. Si lo aprueba, el backend ejecuta el intercambio cruzado de datos en la tabla `Shift`.

### Reglas de Vacaciones
- **Regla Base:** La aplicación establece una base de **22 días** anuales.
- **Ajustes y Paridad:** El saldo total se computa de forma dinámica sumando la base a cualquier registro existente en `VacationAdjustment` del año en curso.
- **Anualidad Estricta:** No existe arrastre (acumulación automática) de un año al siguiente; los cálculos del balance se reinician al iniciar el año natural (1 de enero).

### Restricciones de Estado de Usuario [NUEVO]

- **Bloqueo de Inactivos:** El sistema prohíbe estrictamente la asignación de nuevos turnos a usuarios con el campo `isActive: false`.
- **Validación Multi-Nivel:** Esta regla se aplica tanto en la interfaz de usuario (filtrado en selectores) como en el backend (`validateAndCreateShift`), garantizando la integridad de los datos incluso si se intenta evadir la UI.
- **Auditoría Histórica:** Los turnos antiguos de usuarios ahora inactivos permanecen visibles y editables para fines de auditoría, pero no se pueden generar nuevas asignaciones para ellos.

---

## 5. API Backend - Rutas Principales

El `index.js` agrupa los siguientes bloques funcionales:

- **Auth:** Endpoints base de validación y reseteo de contraseñas.
- **Módulo `/shifts`:** Permite consultas por rango de fechas, generación de turnos recurrentes y control algorítmico de descansos (Márgenes de 12 horas). **Incluye validación obligatoria de estado activo del usuario.**
- **Módulo `/requests`:** Maneja las máquinas de estados para solicitudes de ausencias e intercambios de turno.
- **Módulo Vacacional (`/vacation-balance` / `/vacation-adjustments`):** Genera resúmenes calculados de días restantes según registros aprobados.
- **Gestión de Sucursales (`/api/branches`):** Permite obtener la lista de sucursales autorizadas para el usuario actual. **Los resultados de zonas están ordenados alfabéticamente por defecto.**
- **Gestión de Zonas y Subzonas [NUEVO]:** Endpoints `/api/zone-definitions` y `/api/subzones`. Soporta subzonas globales y filtrado por sucursal.
- **Mantenimiento (`/api/backup`):** Permite a administradores forzar un `pg_dump` directo al servidor PostgreSQL para obtener un volcado de resguardo (`turnos_backup.sql`).

---

## 6. Guía de Operaciones y Flujo CI/CD (Importante)

### 🚀 Arranque del Entorno
Las operaciones se centralizan a través de Docker:
- **Despliegue inicial o arranque estándar:** `docker-compose up -d`
- **Reconstruir imágenes completas** (Necesario tras instalar dependencias o cambiar código estructurado): `docker-compose up -d --build`
- **Reinicio rápido del Backend** (Necesario tras modificar `index.js` manualmente): `docker compose restart backend`
- **Diagnóstico y Monitorización en Vivo (Backend):** `docker logs -f auteide_backend`
- **Parada de servicios:** `docker-compose down`

### ⚠️ Base de Datos, Prisma y Despliegues (Crítico)
El manejo del esquema de la base de datos en producción requiere extrema precaución:

- ❌ **PRECAUCIÓN `npx prisma migrate dev`:**
  Este comando solo debe usarse en entornos **locales de desarrollo**. Intenta sincronizar el código con la base de datos generando nuevas migraciones y resolviendo conflictos. Si detecta divergencias insalvables, **ejecutará un RESET completo y truncará todos los datos irrecuperablemente.**
  
- ✅ **COMANDO SEGURO `npx prisma migrate deploy`:**
  Comando **obligatorio para producción**. Aplica únicamente las migraciones SQL previamente generadas de `/prisma/migrations` de forma secuencial, **conservando intactos todos los datos existentes.**

### Configuración PWA y Caché Web
Cualquier actualización en los manifiestos, ídolos de la PWA o el Service Worker (`sw.js`) requiere una fase de reconstrucción del frontend (`vite build`) ejecutada automáticamente al emplear el parámetro `--build` en docker-compose, o limpiando explícitamente la caché del navagador.
