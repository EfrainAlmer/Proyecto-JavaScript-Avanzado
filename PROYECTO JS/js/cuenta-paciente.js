"use strict";

const DOM = {
    guardia: document.querySelector("#guardia-sesion"),
    app: document.querySelector("#app-paciente"),
    cabeceraAvatar: document.querySelector("#cabecera-avatar"),
    cabeceraNombre: document.querySelector("#cabecera-nombre"),
    cabeceraRol: document.querySelector("#cabecera-rol"),
    btnMenuUsuario: document.querySelector("#btn-menu-usuario"),
    menuUsuario: document.querySelector("#menu-usuario"),
    tabs: document.querySelectorAll(".cuenta-tab"),
    vistas: { resumen: document.querySelector("#vista-resumen"), perfil: document.querySelector("#vista-perfil") },
    resumen: { dni: document.querySelector("#resumen-dni"), correo: document.querySelector("#resumen-correo"), celular: document.querySelector("#resumen-celular"), seguro: document.querySelector("#resumen-seguro"), miembroDesde: document.querySelector("#resumen-miembro-desde"), permisos: document.querySelector("#resumen-permisos"), cita: document.querySelector("#resumen-cita") },
    formPerfil: document.querySelector("#form-perfil"),
    alertaPerfil: document.querySelector("#alerta-perfil"),
    perfilDni: document.querySelector("#perfil-dni"),
    perfilNombre: document.querySelector("#perfil-nombre"),
    perfilCorreo: document.querySelector("#perfil-correo"),
    perfilTelefono: document.querySelector("#perfil-telefono"),
    perfilSeguro: document.querySelector("#perfil-seguro"),
    formPassword: document.querySelector("#form-password"),
    alertaPassword: document.querySelector("#alerta-password"),
    passwordActual: document.querySelector("#password-actual"),
    passwordNueva: document.querySelector("#password-nueva"),
    passwordConfirmar: document.querySelector("#password-confirmar"),
    btnLogout: document.querySelector("#btn-logout")
};

let usuarioActual = null;

function protegerVista() {
    const sesion = obtenerSesionActiva();
    if (!sesion) { redirigirALogin("Debes iniciar sesión para ver tu cuenta."); return null; }
    if (!(sesion.rol & ROLE_PACIENTE)) { redirigirALogin("Esta sección es exclusiva para pacientes."); return null; }
    return sesion;
}

function redirigirALogin(mensaje) {
    DOM.guardia.textContent = mensaje;
    DOM.guardia.hidden = false;
    setTimeout(() => { window.location.href = "./autenticacion.html"; }, 1800);
}

function mostrarPanelAlerta(panel, errores, tipo = "error") {
    panel.replaceChildren();
    if (errores.length === 0) { panel.hidden = true; return; }
    panel.className = `mensaje-alerta ${tipo === "exito" ? "mensaje-alerta--exito" : "mensaje-alerta--error"}`;
    const titulo = document.createElement("strong");
    titulo.textContent = tipo === "exito" ? "¡Listo!" : "Revisa lo siguiente:";
    panel.append(titulo);
    const lista = document.createElement("ul");
    errores.forEach(err => { const item = document.createElement("li"); item.textContent = err; lista.append(item); });
    panel.append(lista);
    panel.hidden = false;
}

function cambiarVista(nombreVista) {
    Object.entries(DOM.vistas).forEach(([clave, vista]) => { vista.hidden = clave !== nombreVista; });
    DOM.tabs.forEach(tab => { tab.classList.toggle("cuenta-tab--activo", tab.dataset.vista === nombreVista); });
}

function alternarMenuUsuario(forzarEstado) {
    const abierto = typeof forzarEstado === "boolean" ? forzarEstado : DOM.menuUsuario.hidden;
    DOM.menuUsuario.hidden = !abierto;
    DOM.btnMenuUsuario.setAttribute("aria-expanded", String(abierto));
}

function manejarClicFueraDelMenu(evento) {
    const dentroDelMenu = DOM.btnMenuUsuario.contains(evento.target) || DOM.menuUsuario.contains(evento.target);
    if (!dentroDelMenu) { alternarMenuUsuario(false); }
}

function obtenerIniciales(nombreCompleto) {
    const partes = colapsarEspacios(nombreCompleto).split(" ").filter(Boolean);
    const iniciales = partes.slice(0, 2).map(parte => parte.charAt(0).toLocaleUpperCase("es-PE"));
    return iniciales.join("") || "🙂";
}

function formatearMiembroDesde(fechaIso) {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return "—";
    const texto = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(fecha);
    return capitalizarNombre(texto);
}

function renderizarCabecera(usuario) {
    DOM.cabeceraAvatar.textContent = obtenerIniciales(usuario.nombre);
    DOM.cabeceraNombre.textContent = usuario.nombre;
    DOM.cabeceraRol.textContent = usuario.nombreRol;
}

function renderizarResumen(usuario) {
    const { seguro } = usuario.infoAdicional;
    DOM.resumen.dni.textContent = usuario.dni;
    DOM.resumen.correo.textContent = usuario.correo;
    DOM.resumen.celular.textContent = usuario.telefono;
    DOM.resumen.seguro.textContent = seguro ?? "No especificada";
    DOM.resumen.miembroDesde.textContent = formatearMiembroDesde(usuario.creadoEn);
    DOM.resumen.permisos.replaceChildren();
    const permisosDef = [ { key: PERM_RESERVAR, label: "Reservar citas médicas" }, { key: PERM_RECETAR, label: "Emitir recetas digitales" } ];
    permisosDef.forEach(perm => {
        const activo = usuario.tienePermiso(perm.key);
        const fila = document.createElement("div");
        fila.className = `permiso-fila ${activo ? "permiso-fila--activo" : "permiso-fila--inactivo"}`;
        const icono = document.createElement("span");
        icono.className = "permiso-fila__icono";
        icono.setAttribute("aria-hidden", "true");
        icono.textContent = activo ? "✓" : "✕";
        const texto = document.createElement("span");
        texto.textContent = perm.label;
        fila.append(icono, texto);
        DOM.resumen.permisos.append(fila);
    });
}

function precargarFormularioPerfil(usuario) {
    DOM.perfilDni.value = usuario.dni;
    DOM.perfilNombre.value = usuario.nombre;
    DOM.perfilCorreo.value = usuario.correo;
    DOM.perfilTelefono.value = usuario.telefono;
    DOM.perfilSeguro.value = usuario.infoAdicional.seguro ?? "Particular";
}

function manejarGuardarPerfil(evento) {
    evento.preventDefault();
    const nombre = capitalizarNombre(DOM.perfilNombre.value);
    const correo = DOM.perfilCorreo.value.trim().toLowerCase();
    const telefono = limpiarNumero(DOM.perfilTelefono.value);
    const seguro = DOM.perfilSeguro.value;
    const errores = [];

    if (!PATRONES.NOMBRE.test(nombre) || nombre.length < 5) errores.push("El nombre debe tener letras válidas y un mínimo de 5 caracteres.");
    if (!PATRONES.CORREO.test(correo)) {
        errores.push("El correo electrónico no tiene un formato válido.");
    } else {
        const usuarios = obtenerUsuariosGuardados();
        const correoUsado = usuarios.some(u => u.correo === correo && u.dni !== usuarioActual.dni);
        if (correoUsado) errores.push("Ese correo ya está registrado por otra cuenta.");
    }
    if (!PATRONES.TELEFONO.test(telefono)) errores.push("El celular debe ser peruano: comenzar con 9 y tener 9 dígitos.");

    if (errores.length > 0) { mostrarPanelAlerta(DOM.alertaPerfil, errores); return; }

    try {
        const actualizado = actualizarUsuario(usuarioActual.dni, { nombre, correo, telefono, infoAdicional: { ...usuarioActual.infoAdicional, seguro } });
        usuarioActual = actualizado;
        guardarSesionActiva(actualizado);
        renderizarCabecera(actualizado);
        renderizarResumen(actualizado);
        mostrarPanelAlerta(DOM.alertaPerfil, ["Tus datos se actualizaron correctamente."], "exito");
    } catch (error) { mostrarPanelAlerta(DOM.alertaPerfil, [error.message]); }
}

function manejarCambiarPassword(evento) {
    evento.preventDefault();
    const actual = DOM.passwordActual.value;
    const nueva = DOM.passwordNueva.value;
    const confirmar = DOM.passwordConfirmar.value;
    const errores = [];

    if (actual !== usuarioActual.password) errores.push("La contraseña actual no es correcta.");
    if (!PATRONES.PASSWORD.test(nueva)) errores.push("La nueva contraseña debe tener mínimo 6 caracteres, con letras y números.");
    else if (nueva !== confirmar) errores.push("Las contraseñas nuevas no coinciden.");

    if (errores.length > 0) { mostrarPanelAlerta(DOM.alertaPassword, errores); return; }

    try {
        const actualizado = actualizarUsuario(usuarioActual.dni, { password: nueva });
        usuarioActual = actualizado;
        guardarSesionActiva(actualizado);
        DOM.formPassword.reset();
        mostrarPanelAlerta(DOM.alertaPassword, ["Contraseña actualizada correctamente."], "exito");
    } catch (error) { mostrarPanelAlerta(DOM.alertaPassword, [error.message]); }
}

function manejarLogout() {
    cerrarSesionActiva();
    window.location.href = "./autenticacion.html";
}

function inicializar() {
    const sesion = protegerVista();
    if (!sesion) return;
    usuarioActual = sesion;
    DOM.app.hidden = false;
    renderizarCabecera(usuarioActual);
    renderizarResumen(usuarioActual);
    precargarFormularioPerfil(usuarioActual);

    DOM.tabs.forEach(tab => { tab.addEventListener("click", () => cambiarVista(tab.dataset.vista)); });
    DOM.btnMenuUsuario.addEventListener("click", () => alternarMenuUsuario());
    document.addEventListener("click", manejarClicFueraDelMenu);
    document.addEventListener("keydown", evento => { if (evento.key === "Escape") alternarMenuUsuario(false); });
    DOM.formPerfil.addEventListener("submit", manejarGuardarPerfil);
    DOM.formPassword.addEventListener("submit", manejarCambiarPassword);
    DOM.btnLogout.addEventListener("click", manejarLogout);
}

inicializar();
