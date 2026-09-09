## 🏗️ Arquitectura y Estado de Vistas (Navegación SPA)

El proyecto utiliza un sistema de navegación gestionado desde `js/login.js` (vinculado a la vista `autenticacion.html`) y apoyado por las reglas globales de `js/datos.js`.

### Flujo de Redirección Actual
* **Pacientes:** Al iniciar sesión con éxito, el sistema redirige automáticamente a la vista definitiva `cuenta-paciente.html`.
* **Médicos y Administradores:** Actualmente utilizan una vista de **Dashboard Simulado** (renderizada en la misma pantalla de autenticación). Este es un *placeholder* temporal que lee los bits de permisos para validar que el mapeo de roles funciona.

### 📌 Tareas Pendientes en relación al login.js
- [ ] Desarrollar la estructura e interfaz de `panel-medico.html` (y enlazarlo a `panel-medico.js`).
- [ ] Desarrollar la estructura e interfaz de `panel-administrativo.html` (y enlazarlo a `panel-administrativo.js`).
- [ ] Actualizar la función `manejarLogin()` en `login.js` para reemplazar la llamada al dashboard simulado por las redirecciones definitivas. El bloque de código a actualizar deberá quedar de la siguiente manera:

```javascript
// Redirigir según el rol
if (usuario.rol & ROLE_PACIENTE) {
    window.location.href = "cuenta-paciente.html";
} else if (usuario.rol & ROLE_MEDICO) {
    window.location.href = "panel-medico.html"; 
} else if (usuario.rol & ROLE_ADMIN) {
    window.location.href = "panel-administrativo.html"; 
}
