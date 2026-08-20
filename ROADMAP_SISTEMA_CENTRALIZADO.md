# 🚀 Roadmap & Arquitectura: Sistema Centralizado en la Nube (Gestión de Horas Pro)

Este documento guarda la visión, estructura y plan de acción para transformar la aplicación local/portable **Gestión de Horas Pro** en una **plataforma web centralizada, multiusuario y en la nube**, accesible desde cualquier lugar 24/7 de forma cómoda y **100% gratuita**.

---

## 🎯 1. Visión del Proyecto
Evolucionar el sistema para que todo el equipo acceda mediante una URL web única en su navegador (por ejemplo, `https://gestion-horas-equipo.onrender.com`), donde cada miembro inicie sesión con su propia cuenta, registre sus tareas de forma aislada y privada, y los líderes/administradores puedan ver el resumen consolidado del equipo y exportar reportes globales en 1 clic.

---

## ✅ 2. ¿Qué INCLUIR? (Lo que debemos construir)

### A. Autenticación y Cuentas de Usuario (`Flask-Login`)
* **Sistema de Login / Registro**: Pantalla de acceso limpia con correo electrónico y contraseña (encriptada de forma segura mediante hash `bcrypt` o `werkzeug.security`).
* **Roles de Usuario**:
  * **Colaborador**: Puede crear, editar, eliminar y visualizar **únicamente sus propios registros**. Su dashboard calcula sus horas personales.
  * **Administrador / Líder de Equipo**: Tiene acceso adicional a un panel superior ("Vista Global del Equipo") para ver el total de horas cargadas por todos, filtrar por colaborador y descargar los reportes unificados.
  * **Sesión persistente**: Recordar usuario logueado en el navegador para que no tenga que poner su clave varias veces al día.

### B. Estructura de Base de Datos Multi-tenancy (Aislamiento de datos)
* **Nueva tabla `usuarios`**:
  ```sql
  CREATE TABLE usuarios (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(120) UNIQUE NOT NULL,
      password_hash VARCHAR(256) NOT NULL,
      rol VARCHAR(20) DEFAULT 'colaborador',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
* **Modificación de tabla `registros`**:
  * Añadir columna `usuario_id` como clave foránea (`FOREIGN KEY (usuario_id) REFERENCES usuarios(id)`).
  * Todas las consultas actuales (`get_all_registros`, `get_dashboard_stats`) se filtrarán automáticamente con `WHERE usuario_id = :current_user_id` para colaboradores.

### C. Base de Datos Central Relacional (PostgreSQL)
* Migrar del archivo local `horas.db` (SQLite) a una base de datos centralizada en la nube usando **PostgreSQL**.
* Utilizar `SQLAlchemy` o adaptar nuestro `database.py` para manejar conexiones remotas eficientes sin bloqueos por uso simultáneo del equipo.

### D. Notificaciones y Alarmas en la Nube
* Guardar las preferencias de alarmas periódicas y de bitácora en la base de datos central vinculadas a cada `usuario_id` (o en el `localStorage` del navegador de cada usuario).
* Mantener el sistema de alertas por pantalla y sonido funcionando en la pestaña activa del navegador.

---

## ❌ 3. ¿Qué NO INCLUIR? (Para evitar complejidad innecesaria)

1. **No reescribir el Frontend en frameworks complejos (React, Angular, Next.js)**:
   * **Por qué no**: Nuestra arquitectura actual con HTML, CSS moderno, JS puro y plantillas Jinja es extremadamente rápida, ligera y ya tiene un diseño visual premium que funciona perfecto. Reescribir el frontend desde cero tomaría semanas sin aportar beneficios funcionales extra.
2. **No generar archivos ejecutables (`.exe`) ni instaladores portables para la versión centralizada**:
   * **Por qué no**: La magia de la nube es el acceso universal. Nadie necesitará descargar nada en su computadora. Todo se abre directo desde el navegador (PC, Mac, Linux, celular o tablet).
3. **No depender de servidores físicos locales en la oficina ni VPNs difíciles de mantener**:
   * **Por qué no**: Montar un servidor local expone al equipo a caídas de luz, cambios de IP local y configuraciones complejas de cortafuegos. Desplegar en la nube (PaaS) garantiza que esté en línea el 100% del tiempo.
4. **No mezclar permisos de edición entre compañeros**:
   * Un colaborador **nunca** debe poder editar ni ver los comentarios o actividades de otro colaborador por privacidad, a menos que tenga el rol explícito de Administrador.

---

## 🛠️ 4. Stack Tecnológico y Alojamiento Gratuito (`Free Tier`)

Para que el proyecto sea **permanente, robusto y con costo $0**, usaremos la siguiente combinación líder en 2026:

| Componente | Plataforma / Tecnología | Características Gratuita |
| :--- | :--- | :--- |
| **Backend Web** | **Render.com** (Web Service) | Alojamiento 24/7 para nuestra app Flask. Conectado a GitHub para auto-actualizarse con cada `git push`. |
| **Base de Datos** | **Neon.tech** (PostgreSQL Cloud) | Base de datos PostgreSQL en la nube con **500 MB** gratis (suficiente para más de 1,000,000 de horas/registros). |
| **Repositorio** | **GitHub** | Repositorio de código (puede ser privado) que gestiona las versiones y dispara los despliegues automáticos. |
| **ORM / Conexión** | **SQLAlchemy / Psycopg2** | Manejo profesional y seguro de la base de datos remota. |

---

## 🗺️ 5. Plan de Implementación Paso a Paso (Para cuando decidamos iniciar)

### 📍 Fase 1: Adaptación del Backend y Base de Datos (Local)
1. Instalar `Flask-Login` y `SQLAlchemy` (o `psycopg2-binary`).
2. Crear los modelos de base de datos (`Usuario` y `Registro` con `usuario_id`).
3. Modificar `database.py` para que acepte tanto SQLite en desarrollo local como PostgreSQL (`DATABASE_URL`) en la nube mediante una variable de entorno.

### 📍 Fase 2: Módulo de Autenticación y Seguridad
1. Crear plantillas `templates/login.html` y `templates/registro.html` manteniendo la estética visual moderna y los gradientes del sistema actual.
2. Proteger todas las rutas de la app con `@login_required` de Flask-Login.
3. Actualizar la lógica para que al guardar un registro se le asigne automáticamente la sesión actual: `add_registro(..., current_user.id)`.

### 📍 Fase 3: Dashboard Multi-rol y Exportaciones del Equipo
1. Adaptar el panel de control para mostrar métricas personales del usuario.
2. Agregar la pestaña o selector de **"Administración de Equipo"** visible solo para usuarios con `rol == 'admin'`.
3. Crear endpoint de exportación consolidada a Excel (`/export_all_excel`) que agrupe horas por colaborador, semana y cliente.

### 📍 Fase 4: Despliegue en la Nube (Producción)
1. Subir el código del proyecto a un repositorio en GitHub.
2. Crear una cuenta gratuita en **Neon.tech**, generar la base de datos PostgreSQL y copiar la cadena de conexión (`DATABASE_URL`).
3. Conectar GitHub con **Render.com**, configurar la variable de entorno `DATABASE_URL` y la clave secreta (`SECRET_KEY`).
4. ¡Listo! Compartir la dirección web con el equipo para que creen sus cuentas y empiecen a registrar.

---
*Documento creado el 14 de Julio de 2026. Guardado como referencia para la próxima evolución de Gestión de Horas Pro.*
