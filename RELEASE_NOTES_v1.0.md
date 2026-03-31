# Release Notes — v1.0.0

**Proyecto:** Gestión de Turnos Empresa  
**Versión:** `1.0.0` — Release Estable  
**Desarrollador Principal:** Aitor Santana  
**Fecha de Lanzamiento:** 24 de marzo de 2026  
**Estado:** ✅ Producción

---

## Índice

- [Resumen](#resumen)
- [Nuevas Funcionalidades](#nuevas-funcionalidades)
- [Seguridad y Rendimiento](#seguridad-y-rendimiento)
- [Experiencia de Usuario](#experiencia-de-usuario)
- [Pipeline de Despliegue](#pipeline-de-despliegue)
- [Breaking Changes y Estado Inicial de Base de Datos](#breaking-changes-y-estado-inicial-de-base-de-datos)
- [Known Issues](#known-issues)
- [Historial de Versiones](#historial-de-versiones)

---

## Resumen

v1.0.0 es la primera versión estable y completamente funcional de la plataforma de gestión de turnos. Incluye el stack completo de producción: gestión de cuadrantes multi-sucursal, sistema RBAC de 5 niveles, módulo de vacaciones con flujos de aprobación, auditoría completa e infraestructura dockerizada con SSL.

---

## Nuevas Funcionalidades

### Gestión de Cuadrantes y Lógica de Negocio

- **Arquitectura Multi-Sucursal:** Selector global que permite a los responsables supervisar múltiples centros desde una única sesión, con sincronización de datos en tiempo real.
- **Sistema de Zonas y Subzonas:** Jerarquía avanzada con dos niveles: Zonas globales (disponibles en todas las sucursales) y Subzonas específicas por centro.
  - Visibilidad inteligente: Admin tiene visión total; el resto del personal ve solo su ámbito.
- **Intercambio Atómico de Turnos (Swap):** Flujo en dos fases (Propuesta → Aceptación del compañero → Aprobación del responsable) con validación de integridad para evitar colisiones de calendario.
- **Filtro de Personal Inactivo:** Bloqueo a nivel de API y UI que impide asignar turnos a usuarios con `isActive: false`.

### Comunicación y Automatización

- **Tablón de Anuncios:** Soporte para categorías `GENERAL`, `PRIORITY` y `BIRTHDAY` con indicadores visuales diferenciados.
- **Anuncios de Cumpleaños Automáticos:** Creación y archivado automático mediante cron job (ejecutado a las 00:01 diariamente).
- **Avisos Globales (Modales):** Comunicados de lectura obligatoria activables por el Admin, mostrados al iniciar sesión. Soporta tipos `INFO`, `WARNING` y `CRITICAL`.
- **Expiración Automática de Solicitudes:** Las `ShiftRequest` en estado `PENDING` cuya fecha ha pasado se marcan como `EXPIRED` automáticamente (cron a las 00:00 diariamente).

---

## Seguridad y Rendimiento

### Hardening de Seguridad

- **Hashing de contraseñas:** Bcrypt (`saltRounds: 10`) para todos los passwords almacenados. Incluye migración suave en el momento del login para cuentas con contraseñas en texto plano heredadas.
- **JWT:** Tokens firmados con `JWT_SECRET`, expiración en 12 horas. El backend valida la existencia y actividad del usuario en cada petición mediante `requirePermission`.
- **CORS:** Lista de dominios permitidos configurable mediante `FRONTEND_URL` en `.env`. No se permiten orígenes no autorizados en entorno de producción.
- **Protección de inicio en producción:** El proceso falla con `process.exit(1)` si `JWT_SECRET` no está definida, previniendo despliegues inseguros.
- **Auditoría:** Registro en `AuditLog` con IP, acción, payload y timestamp para todas las operaciones críticas.

### Rendimiento

- **Consultas optimizadas:** Uso de `select` e `include` selectivos en Prisma para evitar el problema N+1 y reducir la carga de red.
- **Ordenación nativa en backend:** Todas las entidades listadas (sucursales, zonas, usuarios) se devuelven ordenadas alfabéticamente por defecto.
- **Protección contra Race Conditions:** Las operaciones de Swap usan transacciones Prisma para garantizar consistencia en escrituras concurrentes.

---

## Experiencia de Usuario

- **PWA instalable:** Soporte completo de PWA con `manifest.json`, Service Worker y resolución de iconos para iOS y Android.
- **Mobile-First:** Interfaz diseñada para la operativa de almacén desde dispositivos móviles. Contenedores con scroll interno para gestionar listas largas sin romper el layout.
- **Sistema de temas:** Preferencia de tema claro/oscuro persistida por usuario en base de datos.
- **Interfaz 100% en español:** Mensajes de error, validaciones y documentación completamente localizados.

---

## Pipeline de Despliegue

```
1. Configurar .env  →  cp .env.example .env && nano .env
2. Generar SSL      →  ./setup-https.sh
3. Migrar BD        →  docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
4. Levantar         →  docker compose -f docker-compose.prod.yml up -d --build
5. Seed inicial     →  docker compose -f docker-compose.prod.yml exec backend node prisma/seed.js
```

---

## Breaking Changes y Estado Inicial de Base de Datos

> Esta es la versión inicial. No existen breaking changes frente a versiones anteriores.

**Estado inicial de la base de datos tras el seed:**

| Entidad | Estado |
|---------|--------|
| Roles (`RolePermission`) | Creados con permisos predefinidos para los 5 roles |
| Sucursales | Sin datos — deben crearse desde el panel de Gestión |
| Zonas y Subzonas | Sin datos — deben definirse tras crear las sucursales |
| Usuario Admin | Creado por defecto con las credenciales del seed (`prisma/seed.js`) |

> ⚠️ **Cambia la contraseña del usuario Admin inmediatamente tras el primer despliegue.**

---

## Known Issues

| ID | Descripción | Impacto | Estado |
|----|-------------|---------|--------|
| KI-001 | En iOS Safari, la instalación como PWA puede requerir limpiar la caché del navegador si ya existe una versión anterior en pantalla de inicio. | Bajo | Pendiente de revisión en v1.1 |
| KI-002 | El endpoint `/api/backup` genera el `pg_dump` en memoria; para bases de datos de gran tamaño (`>500MB`) puede causar un timeout de Nginx (60s). | Bajo | Pendiente. Workaround: ejecutar backup directamente por SSH. |
| KI-003 | El filtro de fechas en la pantalla de Cálculo no valida si la fecha de fin es anterior a la de inicio, devolviendo un resultado vacío sin mensaje de error. | Bajo | Pendiente en v1.1 |

---

## Historial de Versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| `1.0.0` | 24-03-2026 | Release estable inicial. Stack completo en producción. |
