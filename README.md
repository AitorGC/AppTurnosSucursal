<div align="center">

# 🗓️ Gestión de Turnos Empresa

**Una PWA completa y dockerizada para la administración eficiente de turnos en sucursales.**

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_15-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

[📖 Manual de Usuario](./USER_MANUAL.md) · [🔧 Documentación Técnica](./README_TECH.md) · [📋 Release Notes](./RELEASE_NOTES_v1.0.md) · [🐛 Reportar un Bug](https://github.com/AitorGC/AppTurnosSucursal/issues)

</div>

---

## 📋 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#-características-principales)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [Instalación y Configuración](#-instalación-y-configuración)
  - [Prerrequisitos](#prerrequisitos)
  - [Entorno de Desarrollo](#entorno-de-desarrollo)
  - [Entorno de Producción](#entorno-de-producción)
- [Variables de Entorno](#-variables-de-entorno)
- [Guía de Operaciones](#-guía-de-operaciones)
- [Roles y Permisos](#-roles-y-permisos)
- [Hoja de Ruta](#️-hoja-de-ruta)
- [Autor](#-autor)
- [Licencia](#-licencia)

---

## 🎯 Acerca del Proyecto

**Gestión de Turnos Empresa** es una plataforma web diseñada para resolver la complejidad de la planificación de personal en entornos multi-sucursal. Nace de una necesidad real: centralizar la gestión de horarios, vacaciones y comunicación interna en una sola herramienta accesible desde cualquier dispositivo.

Las características que hacen este proyecto diferente:

- ✅ **Arquitectura dockerizada** lista para despliegue en producción desde el primer momento.
- ✅ **Sistema RBAC** finamente granulado para entornos donde la privacidad operativa es crítica.
- ✅ **PWA instalable** que funciona como una app nativa en móvil, sin necesidad de Play Store ni App Store.
- ✅ **Cero dependencias de terceros en cloud**: tus datos permanecen en tu servidor.

---

## ✨ Características Principales

| Módulo | Descripción |
|--------|-------------|
| 🔐 **Sistema RBAC** | 5 niveles de permisos con visibilidad de datos adaptada a cada rol |
| 📅 **Cuadrantes de Turno** | Creación, edición y visualización dinámica por sucursal, zona y subzona |
| 🔄 **Intercambio de Turnos** | Proceso en dos fases con validación del responsable, sin riesgo de colisiones |
| 🏝️ **Módulo de Vacaciones** | Seguimiento y ajuste de días de descanso con historial por empleado |
| 📢 **Tablón de Anuncios** | Comunicación interna con categorías, prioridades y anuncios de cumpleaños automáticos |
| 🔔 **Avisos Globales** | Modales de lectura obligatoria para comunicados críticos de empresa |
| 🛡️ **Auditoría Integral** | Registro inmutable de acciones críticas: quién, qué, cuándo y desde qué IP |
| 💾 **Backups Integrados** | Generación de `pg_dump` bajo demanda desde la interfaz de administración |
| 📱 **PWA Ready** | Instalable en iOS y Android, interfaz optimizada para uso en almacén y mostrador |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | React + Vite | 18 / 5 |
| **Estilos** | Tailwind CSS + Lucide Icons | 3 |
| **Backend** | Node.js + Express | 20 LTS |
| **ORM** | Prisma | 5 |
| **Base de Datos** | PostgreSQL | 15 |
| **Proxy / SSL** | Nginx | 1.25 |
| **Contenedores** | Docker + Docker Compose | v2 |

---

## 🏗️ Arquitectura del Sistema

El proyecto utiliza una arquitectura de microservicios orquestados por Docker Compose, donde Nginx actúa como único punto de entrada, gestionando el SSL y enrutando el tráfico hacia el frontend estático o la API según la ruta solicitada.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Network: app-network              │
│                                                                   │
│   ┌──────────────┐     /api/*    ┌──────────────────────────┐   │
│   │              │──────────────►│   Express API            │   │
│   │  Nginx       │               │   (Node.js :3000)        │───►  PostgreSQL 15
│   │  :443 (SSL)  │     /*        │                          │   │
│   │              │──────────────►│   Vite Static Frontend   │   │
│   └──────────────┘               └──────────────────────────┘   │
│          ▲                                                        │
└──────────┼────────────────────────────────────────────────────── ┘
           │ HTTPS
    [ Cliente PWA / Navegador ]
```

> Para un diagrama técnico completo con flujos de Prisma y relaciones de base de datos, consulta la [Documentación Técnica](./README_TECH.md).

---

## 🚀 Instalación y Configuración

### Prerrequisitos

Asegúrate de tener instalados en el sistema host:

- **[Docker](https://docs.docker.com/get-docker/) ≥ 24.0** y **[Docker Compose](https://docs.docker.com/compose/install/) v2**
- **[Git](https://git-scm.com/)** para clonar el repositorio

Para desarrollo local también necesitarás:
- **[Node.js](https://nodejs.org/) ≥ 20 LTS** y **npm ≥ 10**

---

### Entorno de Desarrollo

> Útil para modificar el código y ver los cambios en tiempo real con Hot Reload.

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/AitorGC/AppTurnosSucursal.git
   cd AppTurnosSucursal
   ```

2. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales locales
   ```

3. **Levanta los servicios con Docker (Dev):**
   ```bash
   docker compose up -d
   ```
   > La base de datos y el backend se levantan en Docker. El frontend puede correr localmente con `npm run dev` en la carpeta `frontend/`.

4. **Accede a la aplicación:**
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:3000/api`

---

### Entorno de Producción

> Para despliegue en un servidor con dominio real y SSL.

1. **Clona y configura el entorno** (igual que en desarrollo).

2. **Genera los certificados SSL** (o coloca los tuyos en `nginx/certs/`):
   ```bash
   chmod +x setup-https.sh && ./setup-https.sh
   ```

3. **Aplica las migraciones de base de datos:**
   ```bash
   docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
   ```

4. **Levanta todos los servicios en producción:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

5. **Carga los datos iniciales (primera vez):**
   ```bash
   docker compose -f docker-compose.prod.yml exec backend node prisma/seed.js
   ```

La aplicación estará disponible en `https://tu-dominio.com`.

---

## 🔑 Variables de Entorno

Copia `.env.example` a `.env` y configura cada variable:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión completa a PostgreSQL | `postgresql://user:pass@db:5432/turnos_db` |
| `JWT_SECRET` | Secreto para firmar tokens JWT. **Usa una cadena larga y aleatoria en producción.** | `openssl rand -base64 64` |
| `NODE_ENV` | Entorno de ejecución | `production` / `development` |
| `PORT` | Puerto interno del backend | `3000` |
| `FRONTEND_URL` | URL del frontend (para política CORS) | `https://mi-empresa.com` |

> ⚠️ **Nunca subas el archivo `.env` a Git.** Está incluido en `.gitignore` por defecto.

---

## ⚙️ Guía de Operaciones

### Comandos habituales

```bash
# Reconstruir contenedores tras cambios de dependencias
docker compose -f docker-compose.prod.yml up -d --build

# Ver logs en tiempo real de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Acceder a la shell del contenedor del backend
docker compose exec backend sh

# Ejecutar migraciones de Prisma en producción (NUNCA migrate dev)
docker compose exec backend npx prisma migrate deploy

# Generar un backup de la base de datos
# Disponible desde la UI en: Administración > Backup
```

### Gestión de datos

```bash
# Acceder a la consola de PostgreSQL
docker compose exec db psql -U <DB_USER> -d turnos_db

# Restaurar un backup
docker compose exec -T db psql -U <DB_USER> turnos_db < backup.sql
```

---

## 👥 Roles y Permisos

El sistema implementa un control de acceso basado en roles (RBAC) con 5 niveles:

| Rol | Identificador | Capacidades |
|-----|--------------|-------------|
| **Empleado** | `employee` | Ver sus propios turnos, solicitar vacaciones y cambios |
| **Responsable** | `responsable` | Gestionar cuadrantes y personal de su/s sucursal/es |
| **Jefe de Dpto.** | `jefe_departamento` | Coordinación transversal entre departamentos y sucursales |
| **Administración** | `administracion` | Gestión técnica, acceso a la zona Oficina |
| **Administrador** | `admin` | Control total: logs, mantenimiento, visibilidad global de subzonas |

---

## 🗺️ Hoja de Ruta

- [x] v1.0 — Plataforma base con RBAC, turnos, vacaciones y auditoría
- [ ] v1.1 — Exportación de cuadrantes a PDF / Excel
- [ ] v1.2 — Notificaciones push via PWA (Web Push API)
- [ ] v2.0 — App móvil nativa (React Native)

---

## 👨‍💻 Autor

**Aitor Santana**

- GitHub: [@AitorGC](https://github.com/AitorGC)

---

## 📄 Licencia

Distribuido bajo la licencia **GNU General Public License v3.0**.
Consulta el archivo [`LICENSE`](./LICENSE) para más detalles.
