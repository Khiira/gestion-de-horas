# Contexto y Documentación del Proyecto: Gestión de HORAS

## 1. Descripción General
"Gestión de Horas" (o Gestión de Horas Pro) es una aplicación web local desarrollada con **Python (Flask)** enfocada en el seguimiento del tiempo trabajado, registro de actividades, y agenda de tareas. Actualmente funciona de manera local/portable usando SQLite, pero tiene una proyección documentada para migrar a una arquitectura centralizada en la nube (SaaS multi-usuario).

## 2. Pila Tecnológica Actual (Local)
* **Backend:** Python con Flask.
* **Base de Datos:** SQLite (`horas.db`), manipulada nativamente en `database.py`. No usa ORM actualmente.
* **Frontend:** HTML, CSS moderno, y JavaScript puro con plantillas Jinja (`templates/`, `static/`). No utiliza frameworks de JavaScript pesados (React, Angular, etc.) y se busca mantener así por rendimiento y simplicidad.
* **Reportes:** Pandas y OpenPyXL para generación de reportes en Excel.
* **Notificaciones:** Sistema de recordatorios de escritorio y alarmas sonoras gestionado en un hilo de ejecución secundario (`recordatorio.py`, `alerta.mp3`).
* **Portabilidad:** Empaquetado para escritorio mediante scripts `.bat`, `.vbs`, y empaquetadores como PyInstaller (evidenciado por archivos `.spec` y rutinas para `sys._MEIPASS`).

## 3. Estructura de la Base de Datos (`horas.db`)
El esquema de la base de datos se gestiona en `database.py` e incluye las siguientes tablas principales:
* `registros`: Tabla principal para guardar las horas trabajadas (fecha, lugar, horas, actividad, comentario).
* `agenda_tareas`: Tabla para la planificación de tareas (título, descripción, fecha, hora, estado, lugar, horas estimadas). Permite convertir tareas a registros completados.
* `feriados_cache`: Cache local para guardar feriados y evitar peticiones repetidas a APIs externas.

## 4. Roadmap Futuro: Sistema Centralizado en la Nube
El documento `ROADMAP_SISTEMA_CENTRALIZADO.md` establece los lineamientos para la futura migración a la nube:
* **Autenticación:** Implementación de `Flask-Login` (roles de Colaborador y Administrador).
* **Base de Datos:** Migración a PostgreSQL usando SQLAlchemy o Psycopg2. Implementación de una tabla `usuarios` y transformación de la base de datos a un modelo Multi-tenancy (aislamiento por `usuario_id`).
* **Infraestructura Cloud:** Despliegue gratuito proyectado en Render.com (Backend) y Neon.tech (PostgreSQL Cloud).
* **Restricciones Importantes:** NO reescribir el frontend, NO generar ejecutables `.exe` para esta versión, NO usar servidores físicos locales y asegurar privacidad estricta entre colaboradores.

## 5. Directrices para el Asistente de IA (Antigravity/Gemini)
* **Mantenimiento de Código:** Respetar la arquitectura sin ORM (SQL puro) mientras el sistema sea local. Al abordar la migración a la nube, seguir estrictamente el `ROADMAP_SISTEMA_CENTRALIZADO.md`.
* **Frontend:** Mantener el uso de Vanilla JavaScript, CSS moderno y HTML semántico. No sugerir Tailwind u otros frameworks a menos que el usuario lo indique explícitamente.
* **Rutas y Rutinas:** Mantener organizadas las rutas en `app.py` y aislar la lógica de acceso a datos en `database.py`.
* **Rendimiento:** Evitar librerías pesadas innecesarias y optimizar la carga y lectura de reportes.

*Este archivo sirve como punto de referencia para entender el dominio, las limitaciones y las aspiraciones del proyecto para futuras tareas y refactorizaciones.*
