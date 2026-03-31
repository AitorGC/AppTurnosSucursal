# Manual de Usuario - Gestión de Turnos Auteide

Bienvenido/a a la aplicación de **Gestión de Turnos Auteide**. Esta herramienta está diseñada para facilitar la planificación, asignación y seguimiento de los turnos de trabajo, así como la gestión de vacaciones y solicitudes entre compañeros.

---

## 1. Introducción
La aplicación permite a los empleados consultar su horario, solicitar días de vacaciones y organizar intercambios, mientras que a los responsables y administradores les ofrece el control total sobre la planificación.

### Cómo acceder e instalar la aplicación
Puedes acceder a la aplicación desde cualquier navegador web (preferiblemente Chrome o Safari) en tu teléfono móvil o computadora.
Además, la aplicación está diseñada como **PWA (Aplicación Web Progresiva)**. Esto significa que puedes instalarla en tu dispositivo para que funcione como una aplicación nativa:
- **En Android (Chrome):** Al abrir la página, es posible que aparezca un mensaje de "Añadir a la pantalla de inicio". Si no, abre el menú del navegador y selecciona esa opción.
- **En iOS (Safari):** Toca el botón de "Compartir" en la parte inferior de la pantalla y selecciona "Añadir a la pantalla de inicio".

---

## 2. Perfil General (Para todos los usuarios)

Todos los usuarios de la plataforma disponen de estas opciones principales, especialmente orientadas al uso frecuente diario:

### 2.1 Dashboard (Inicio y Tablón de Anuncios)
Al entrar a la app, tu pantalla principal es el Dashboard.
- **Resumen rápido:** Puedes ver si tienes un turno próximo o actual.
- **Tablón de Anuncios:** Un espacio central de comunicación.
  - **Leer anuncios:** Aquí verás mensajes importantes publicados por tus compañeros o superiores. Los anuncios de tipo **"Cumpleaños"** se cierran automáticamente al finalizar el día para mantener el tablón organizado.
  - **Publicar un anuncio:** Puedes escribir mensajes para todo el equipo (por ejemplo, "Busco a alguien para cambiar el turno del viernes"). Solo tienes que escribir en la caja de texto y darle a "Publicar". Los responsables pueden marcar avisos como "Importantes" (‼️) o "Cambio de Turno" (🔀).
- **Notificaciones:** En la parte superior derecha tienes una campana donde recibirás avisos importantes (como aprobaciones de solicitudes o nuevos avisos globales).

### 2.2 Turnos (Calendario)
La sección central para ver el trabajo programado y realizar peticiones.
- **Cómo leer el calendario mensual:** Los colores de cada día indican información importante:
  - **Azul Corporativo / Celeste:** Indica los días en los que tienes un turno asignado.
  - **Amarillo / Naranja / Verde:** Diferentes estados de días libres, vacaciones u otros permisos solicitados o aprobados.
  - **Gris o sin color:** Día libre o sin turno asignado.
- **Ver Detalles:** Al hacer clic en un día del calendario, podrás ver exactamente la hora de entrada, salida y la zona de trabajo asignada.
- **Solicitar Vacaciones/Días:** Al hacer clic en un día concreto (o pulsando el botón de solicitar si está disponible), puedes enviar una solicitud formal para ausentarte, ya sea por vacaciones u otro motivo, indicando el tipo de permiso y comentarios si fuesen necesarios.
- **Intercambio de Turnos (Swap):** Si necesitas cambiar tu turno con un compañero, puedes usar el botón de "Intercambio" o "Swap" disponible al ver los detalles de tu turno u opciones de día. Podrás elegir a un compañero y proponerle el cambio por otro turno. Si la persona acepta, se enviará una solicitud formal a tu responsable para que la apruebe resolviendo el cambio.

### 2.3 Vacaciones
Una sección dedicada específicamente al saldo de tus vacaciones.
- **Balance de días:** Visualizarás de forma clara cuántos días de vacaciones tienes disponibles para el año en curso, cuántos has disfrutado y cuántos te quedan.
- **Solicitar desde aquí:** También puedes acceder al calendario o al formulario correspondiente para continuar solicitando tus permisos anuales.

### 2.4 Mi Perfil
En esta sección puedes consultar tu información corporativa de solo lectura (como tu número de empleado, rol, y sucursal/zona asignada) y gestionar tus preferencias personales en la aplicación:
- **Avatar:** Puedes seleccionar un avatar (emoji) para personalizar tu perfil entre una variedad de perfiles: personal de oficina, personal de almacén, mecánicos (👨‍🔧/👩‍🔧) o incluso vehículos de reparto (🚐/🚚). Este se mostrará en el menú de navegación y en tus publicaciones del tablón de anuncios.
- **Cumpleaños:** Puedes indicar tu fecha de nacimiento (el año se mantiene privado). Si habilitas la opción **"Mostrar mi cumpleaños en el Tablón"**, el sistema publicará automáticamente un anuncio festivo el día de tu cumpleaños para que tus compañeros te feliciten.
- **Preferencias de Notificaciones:** Te permite activar o desactivar qué tipos de notificaciones quieres recibir (como aprobaciones de solicitudes o comentarios en tus publicaciones).
- **Apariencia:** Puedes elegir entre el Modo Claro, el Modo Oscuro, o ajustarlo automáticamente según las preferencias del "Sistema" de tu dispositivo.
- **Seguridad:** Desde aquí también puedes cambiar tu contraseña de acceso de manera segura o cerrar tu sesión.

---

<!-- ROLE_MANAGER_CONTENT_START -->
## 3. Perfiles de Responsable / Administración

Si tienes el rol de "Responsable" o perteneces a "Administración", dispondrás de un menú extendido con herramientas orientadas a la gestión del equipo:

### 3.1 Gestión Multi-Sucursal (Novedad)
Si eres responsable de más de una sucursal, verás un **Selector de Sucursal** en la parte superior de las pantallas principales (Dashboard, Calendario, Solicitudes, etc.). 
- Al cambiar de sucursal en el desplegable, la información se actualizará automáticamente para mostrar los datos del centro seleccionado.
- Por defecto, la aplicación mostrará tu "Sucursal Base" al iniciar sesión.

### 3.2 Cálculo (Administración y Responsables)
Esta herramienta permite visualizar y calcular horas o turnos trabajados. Los responsables pueden alternar entre sus sucursales asignadas para obtener informes por centro.

### 3.2 Solicitudes
Desde aquí, los responsables gestionan las peticiones en curso de su plantilla:
- **Flujo de aprobación:** Cuando un empleado solicita vacaciones, un permiso o un intercambio de turnos, la solicitud entra en la bandeja de "Pendientes".
- **Aprobar o Rechazar:** Podrás revisar quién la envía, por qué motivo y cuándo, y decidir si se Aprueba (aplicando los cambios al calendario automáticamente) o se Rechaza (notificando al empleado el motivo).

### 3.3 Gestión de Vacaciones Avanzada
Como responsable, además de ver el balance global, tienes acceso a la pestaña de "Ajustes de Vacaciones":
- **Añadir / Restar días manuales:** Podrás buscar a un empleado concreto e insertar un ajuste manual, por ejemplo, sumándole 2 días extra por compensación, lo cual actualizará instantáneamente su saldo total de vacaciones de ese año.

### 3.4 Publicar Anuncios Prioritarios
En el Tablón de Anuncios, los responsables pueden publicar mensajes. Si gestionas varias sucursales, deberás seleccionar a qué **Sucursal de Destino** va dirigido el anuncio antes de publicar. Además, puedes marcar publicaciones como "Alta Prioridad" para que queden fijadas en la parte superior.
<!-- ROLE_MANAGER_CONTENT_END -->

---

<!-- ROLE_ADMIN_CONTENT_START -->
## 4. Perfil de Administrador (Admin)

El nivel más alto de permisos. Además de incluir todas las funcionalidades de Responsable, ofrece acceso completo a los engranajes internos del sistema:

### 4.1 Gestión (Usuarios y Zonas)
- **Creación de Empleados:** Permite dar de alta usuarios y definir su rol.
- **Asignación Multi-Sucursal:** Para los usuarios con rol "Responsable", los administradores pueden activar la opción de gestionar múltiples sucursales, seleccionándolas de la lista de centros disponibles en el formulario de usuario.
- **Gestión de Zonas/Tipos de Turno:** Permite editar los tipos de turno, horarios y colores del calendario.

### 4.2 Logs (Registro de Auditoría)
Para seguridad del sistema, se guarda un historial inmutable de las operaciones.
- En la página de Logs podrás ver un rastro detallado de, por ejemplo, cuándo y quién entró al sistema, borró un turno por error o modificó una solicitud. Esto es clave para rastrear posibles equivocaciones (saber el usuario exacto y la IP).

### 4.3 Mantenimiento (Global Notices y Backups)
El panel de "Mantenimiento" oculta herramientas críticas:
- **Avisos Globales (Modal):** Permite crear un "Aviso Global" (Global Notice) que aparecerá irremediablemente de forma emergente en el centro de la pantalla la próxima vez que los usuarios inicien sesión, siendo excelente para notificaciones que deben ser leídas por completo (como cambios de protocolo o avisos de cierre).
- **Descargar Backup de Base de Datos:** Con un simple clic, el sistema ejecuta la exportación del respaldo completo de todos los datos y te descarga un archivo `.sql` o `.dump` seguro al ordenador para preservarlo ante cualquier caída del sistema.
<!-- ROLE_ADMIN_CONTENT_END -->
