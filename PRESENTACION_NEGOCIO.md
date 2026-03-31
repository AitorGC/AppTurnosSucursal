# 📊 Gestión de Turnos Empresa — Propuesta de Valor

**Estado del proyecto:** ✅ Listo para producción  
**Versión:** 1.0.0 · Marzo 2026  
**Autor:** Aitor Santana

---

## 1. Resumen Ejecutivo

**Gestión de Turnos Empresa** es una plataforma digital diseñada a medida para centralizar y modernizar la planificación de personal en toda nuestra red de centros.

En la actualidad, la gestión de cuadrantes, vacaciones y cambios de turno se distribuye entre correos electrónicos, sistemas de mensajería no corporativos y hojas de cálculo. Este modelo genera errores, fricciones y un coste de tiempo significativo que impacta directamente en la productividad operativa.

**Esta plataforma elimina ese coste.**

---

## 2. Problemas que Resolvemos

| Situación Anterior | Nueva Realidad |
|:---|:---|
| Solicitudes de vacaciones verbales o en papel, sin trazabilidad. | Flujo digital con aprobación en un clic y registro permanente. |
| Comunicaciones de turno dispersas en sistemas no corporativos. | Toda la información centralizada en un único canal seguro. |
| Solapamientos de personal detectados de forma tardía. | Calendarios en tiempo real con visibilidad de toda la sucursal. |
| Disputas sobre quién aprobó un cambio o cuándo se solicitó. | Auditoría inmutable: quién, qué, cuándo y desde qué equipo. |
| Asignación accidental de turnos a empleados dados de baja. | Bloqueo automático a nivel de sistema para usuarios inactivos. |
| Gestión manual de saldos de vacaciones propensa a errores. | Cálculo automático y ajustes auditables por el responsable. |

---

## 3. Impacto Estimado en el Negocio

> Las siguientes estimaciones están basadas en flujos de trabajo típicos documentados durante la fase de análisis del proyecto.

| Indicador | Estimación |
|-----------|------------|
| ⏱️ **Ahorro en gestión de turnos** (por responsable/semana) | ~2–3 horas |
| 📋 **Reducción de errores de asignación** | ~80% estimado |
| 🔎 **Tiempo de resolución de disputas** | De días a minutos (logs instantáneos) |
| 📱 **Reducción de uso de canales no corporativos** | Completa para operativa de turnos |

---

## 4. Beneficios por Departamento

### 🏢 Recursos Humanos / Administración

- **Control del gasto de vacaciones:** Gestión estricta del saldo de días con ajustes auditables, asegurando el cumplimiento normativo.
- **Seguridad jurídica:** Registro detallado y con marca de tiempo de cada solicitud, aprobación y modificación. Cada acción queda vinculada a un usuario específico.
- **Cálculo de horas:** Herramienta integrada que genera informes de horas por empleado, diferenciando festivos y tipos de jornada.

### 👨‍💼 Responsables de Sucursal / Jefes de Zona

- **Gestión Multi-Centro:** Control de varias sucursales desde una única sesión, con cambio de contexto instantáneo.
- **Intercambio de turnos validado (Swap):** Los empleados proponen el cambio, el responsable solo aprueba. El calendario se actualiza automáticamente.
- **Avisos prioritarios:** Comunicados urgentes visibles para toda la plantilla desde el primer inicio de sesión del día.

### 📦 Empleado

- **Transparencia:** Consulta directa de horarios, saldo de vacaciones y estado de todas sus solicitudes.
- **Autonomía digital:** Gestión de turnos desde cualquier dispositivo, sin necesidad de consultar a un responsable para conocer su cuadrante.
- **Privacidad respetada:** La aplicación está diseñada para usarse desde equipos corporativos en horario laboral, respetando la desconexión digital del empleado fuera de su jornada.

---

## 5. Seguridad, Privacidad y Fiabilidad

La plataforma ha sido diseñada bajo estándares de seguridad corporativa en cada capa del sistema:

| Capa | Medida de Seguridad |
|------|---------------------|
| **Red** | Operación en infraestructura interna de empresa. Sin exposición a Internet salvo configuración explícita. |
| **Transporte** | Comunicaciones cifradas HTTPS mediante SSL. |
| **Acceso** | Autenticación JWT con expiración de sesión (12h). Sin contraseñas en texto plano. |
| **Datos** | Hashing de contraseñas con Bcrypt. Backups de base de datos bajo demanda desde administración. |
| **Auditoría** | Registro completo de todas las acciones con IP, usuario y timestamp. |

---

## 6. Plan de Adopción Propuesto

| Fase | Actividad | Plazo estimado |
|------|-----------|----------------|
| **1 – Despliegue** | Instalación en servidor corporativo y configuración de acceso | Semana 1 |
| **2 – Admin** | Creación de sucursales, zonas y alta de usuarios administradores | Semana 1–2 |
| **3 – Formación** | Sesión de formación para responsables (Manual de Usuario disponible in-app) | Semana 2 |
| **4 – Piloto** | Uso real en una sucursal piloto con soporte directo | Semana 3–4 |
| **5 – Extensión** | Despliegue progresivo al resto de centros | Mes 2 |

---

## 7. Conclusión

La plataforma está **lista para entrar en producción**. Técnicamente validada, funcionalmente completa y documentada para su operativa y mantenimiento.

La adopción de este sistema no supone únicamente una mejora tecnológica; es una decisión estratégica para profesionalizar la gestión de uno de los activos más importantes de la empresa: **el tiempo y bienestar de su plantilla**.

**Próximo paso:** Aprobar el despliegue en el servidor corporativo e iniciar la Fase 1.

---

> Desarrollado por **Aitor Santana** · Gestión de Turnos Empresa v1.0.0
