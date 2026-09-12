"use strict";

let listaUsuarios = obtenerUsuariosGuardados();
let mapaUsuariosPorDni = new Map(listaUsuarios.map(u => [u.dni, u]));

const DOM = {
    vistas: { login: document.querySelector("#vista-login"), registroRol: document.querySelector("#vista-registro-rol"), registroPaciente: document.querySelector("#vista-registro-paciente"), registroMedico: document.querySelector("#vista-registro-medico"), recuperar: document.querySelector("#vista-recuperar"), dashboard: document.querySelector("#vista-dashboard") },
    forms: { login: document.querySelector("#form-login"), regPaciente: document.querySelector("#form-registro-paciente"), regMedico: document.querySelector("#form-registro-medico"), recuperar: document.querySelector("#form-recuperar") },
    alertas: { login: document.querySelector("#alerta-login"), regPaciente: document.querySelector("#alerta-reg-paciente"), regMedico: document.querySelector("#alerta-reg-medico"), recuperar: document.querySelector("#alerta-recuperar") },
    dashboard: { nombreUsuario: document.querySelector("#dash-nombre"), rolUsuario: document.querySelector("#dash-rol"), dniUsuario: document.querySelector("#dash-dni"), correoUsuario: document.querySelector("#dash-correo"), celularUsuario: document.querySelector("#dash-celular"), adicionalUsuario: document.querySelector("#dash-adicional"), btnCerrarSesion: document.querySelector("#btn-logout"), permisosGrid: document.querySelector("#dash-permisos-grid") },
    nav: { irARegistroRol: document.querySelectorAll(".btn-ir-registro-rol"), irALogin: document.querySelectorAll(".btn-ir-login"), irARecuperar: document.querySelector("#btn-ir-recuperar"), seleccionarPaciente: document.querySelector("#btn-select-paciente"), seleccionarMedico: document.querySelector("#btn-select-medico") }
};

function mostrarVista(vistaSeleccionada) {
    Object.values(DOM.vistas).forEach(vista => { if (vista) vista.hidden = true; });
    Object.values(DOM.alertas).forEach(alerta => { if (alerta) { alerta.hidden = true; alerta.replaceChildren(); } });
    if (vistaSeleccionada) {
        vistaSeleccionada.hidden = false;
        const primerInput = vistaSeleccionada.querySelector("input, select, button");
        if (primerInput) queueMicrotask(() => primerInput.focus());
    }
}

function validarDatosComunes(datos, errores) {
    if (!PATRONES.DNI.test(datos.dni)) errores.push("El DNI debe tener exactamente 8 dígitos numéricos.");
    else if (mapaUsuariosPorDni.has(datos.dni)) errores.push("El DNI ingresado ya se encuentra registrado.");
    if (!PATRONES.NOMBRE.test(datos.nombre) || datos.nombre.length < 5) errores.push("El nombre completo debe tener letras válidas y un mínimo de 5 caracteres.");
    if (!PATRONES.CORREO.test(datos.correo)) errores.push("El correo electrónico no tiene un formato válido (ej.: usuario@dominio.com).");
    else {
        const correoExiste = Array.from(mapaUsuariosPorDni.values()).some(u => u.correo === datos.correo);
        if (correoExiste) errores.push("El correo electrónico ya está registrado por otro usuario.");
    }
    if (!PATRONES.TELEFONO.test(datos.telefono)) errores.push("El celular debe ser peruano: comenzar con 9 y tener exactamente 9 dígitos.");
    if (!PATRONES.PASSWORD.test(datos.password)) errores.push("La contraseña debe tener mínimo 6 caracteres, incluyendo al menos una letra y un número.");
    else if (datos.password !== datos.confirmPassword) errores.push("Las contraseñas ingresadas no coinciden.");
}

function mostrarPanelAlerta(panel, errores, tipo = "error") {
    panel.replaceChildren();
    if (errores.length === 0) { panel.hidden = true; return; }
    panel.className = `mensaje-alerta ${tipo === "exito" ? "mensaje-alerta--exito" : "mensaje-alerta--error"}`;
    const titulo = document.createElement("strong");
    titulo.textContent = tipo === "exito" ? "¡Operación Exitosa!" : "Por favor, corrige los siguientes errores:";
    panel.append(titulo);
    const lista = document.createElement("ul");
    errores.forEach(err => { const item = document.createElement("li"); item.textContent = err; lista.append(item); });
    panel.append(lista);
    panel.hidden = false;
}

function manejarLogin(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.login;
    alerta.hidden = true; alerta.replaceChildren();
    const dni = document.querySelector("#login-dni").value.trim();
    const password = document.querySelector("#login-password").value;
    const errores = [];
    if (!dni) errores.push("El número de DNI es obligatorio.");
    if (!password) errores.push("La contraseña es obligatoria.");
    if (errores.length > 0) { mostrarPanelAlerta(alerta, errores); return; }

    const usuario = mapaUsuariosPorDni.get(dni);
    if (!usuario || usuario.password !== password) {
        errores.push("El DNI o la contraseña son incorrectos.");
        mostrarPanelAlerta(alerta, errores); return;
    }

    sessionStorage.setItem(KEY_SESION, JSON.stringify(usuario.toJSON()));

    if (usuario.rol & ROLE_PACIENTE) {
        window.location.href = "cuenta-paciente.html";
    } else if (usuario.rol & ROLE_MEDICO) {
        window.location.href = "panel-medico.html"; 
    } else if (usuario.rol & ROLE_ADMIN) {
        window.location.href = "panel-administrativo.html";
    }
}

function manejarRegistroPaciente(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.regPaciente; alerta.hidden = true;
    const form = DOM.forms.regPaciente;
    const datos = {
        dni: form.querySelector("#reg-paciente-dni").value,
        nombre: capitalizarNombre(form.querySelector("#reg-paciente-nombre").value),
        correo: form.querySelector("#reg-paciente-correo").value,
        telefono: limpiarNumero(form.querySelector("#reg-paciente-telefono").value),
        rol: ROLE_PACIENTE, password: form.querySelector("#reg-paciente-password").value, confirmPassword: form.querySelector("#reg-paciente-confirm").value,
        infoAdicional: { seguro: form.querySelector("#reg-paciente-seguro").value }
    };
    const errores = []; validarDatosComunes(datos, errores);
    if (datos.infoAdicional.seguro === "") errores.push("Debes seleccionar tu tipo de cobertura o seguro.");
    if (errores.length > 0) { mostrarPanelAlerta(alerta, errores); return; }
    const nuevoPaciente = new Usuario(datos);
    listaUsuarios = [...listaUsuarios, nuevoPaciente]; guardarUsuarios(listaUsuarios); mapaUsuariosPorDni.set(nuevoPaciente.dni, nuevoPaciente);
    form.reset(); mostrarPanelAlerta(DOM.alertas.login, ["Tu cuenta de paciente se registró con éxito. Ya puedes iniciar sesión."], "exito"); mostrarVista(DOM.vistas.login);
}

function manejarRegistroMedico(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.regMedico; alerta.hidden = true;
    const form = DOM.forms.regMedico;
    const datos = {
        dni: form.querySelector("#reg-medico-dni").value, nombre: capitalizarNombre(form.querySelector("#reg-medico-nombre").value), correo: form.querySelector("#reg-medico-correo").value, telefono: limpiarNumero(form.querySelector("#reg-medico-telefono").value), rol: ROLE_MEDICO, password: form.querySelector("#reg-medico-password").value, confirmPassword: form.querySelector("#reg-medico-confirm").value,
        infoAdicional: { cmp: form.querySelector("#reg-medico-cmp").value.trim(), especialidad: form.querySelector("#reg-medico-especialidad").value }
    };
    const errores = []; validarDatosComunes(datos, errores);
    if (!PATRONES.CMP.test(datos.infoAdicional.cmp)) errores.push("El número de colegiatura CMP debe tener 5 o 6 dígitos numéricos.");
    if (datos.infoAdicional.especialidad === "") errores.push("Debes seleccionar una especialidad médica.");
    if (errores.length > 0) { mostrarPanelAlerta(alerta, errores); return; }
    const nuevoMedico = new Usuario(datos);
    listaUsuarios = [...listaUsuarios, nuevoMedico]; guardarUsuarios(listaUsuarios); mapaUsuariosPorDni.set(nuevoMedico.dni, nuevoMedico);
    form.reset(); mostrarPanelAlerta(DOM.alertas.login, ["Tu cuenta médica se registró con éxito y se encuentra en estado de verificación."], "exito"); mostrarVista(DOM.vistas.login);
}

function manejarRecuperarPassword(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.recuperar; alerta.hidden = true;
    const dni = document.querySelector("#recuperar-dni").value.trim(); const correo = document.querySelector("#recuperar-correo").value.trim().toLowerCase();
    const errores = [];
    if (!dni) errores.push("El DNI es obligatorio."); if (!correo) errores.push("El correo electrónico es obligatorio.");
    if (errores.length > 0) { mostrarPanelAlerta(alerta, errores); return; }
    const usuario = mapaUsuariosPorDni.get(dni);
    if (!usuario || usuario.correo !== correo) { errores.push("No se encontró ningún usuario con esos datos de credenciales."); mostrarPanelAlerta(alerta, errores); return; }
    DOM.forms.recuperar.reset();
    mostrarPanelAlerta(DOM.alertas.login, [ `Se ha enviado un enlace de recuperación a: ${correo}.`, `Para fines didácticos, tu contraseña actual es: "${usuario.password}"` ], "exito"); mostrarVista(DOM.vistas.login);
}

function manejarCerrarSesion() { sessionStorage.removeItem(KEY_SESION); DOM.forms.login.reset(); mostrarVista(DOM.vistas.login); }

function inicializarApp() {
    DOM.forms.login.addEventListener("submit", manejarLogin);
    DOM.forms.regPaciente.addEventListener("submit", manejarRegistroPaciente);
    DOM.forms.regMedico.addEventListener("submit", manejarRegistroMedico);
    DOM.forms.recuperar.addEventListener("submit", manejarRecuperarPassword);
    DOM.dashboard.btnCerrarSesion.addEventListener("click", manejarCerrarSesion);
    DOM.nav.irARegistroRol.forEach(btn => btn.addEventListener("click", () => mostrarVista(DOM.vistas.registroRol)));
    DOM.nav.irALogin.forEach(btn => btn.addEventListener("click", () => mostrarVista(DOM.vistas.login)));
    DOM.nav.irARecuperar.addEventListener("click", () => mostrarVista(DOM.vistas.recuperar));
    DOM.nav.seleccionarPaciente.addEventListener("click", () => mostrarVista(DOM.vistas.registroPaciente));
    DOM.nav.seleccionarMedico.addEventListener("click", () => mostrarVista(DOM.vistas.registroMedico));

    try {
        const sesionGuardada = sessionStorage.getItem(KEY_SESION);
        if (sesionGuardada) {
            const datosObj = JSON.parse(sesionGuardada); const usuarioInstancia = Usuario.desdeObjeto(datosObj);
            if (usuarioInstancia.rol & ROLE_PACIENTE) window.location.href = "cuenta-paciente.html";
            else if (usuarioInstancia.rol & ROLE_MEDICO) window.location.href = "panel-medico.html"; 
            else if (usuarioInstancia.rol & ROLE_ADMIN) window.location.href = "panel-administrativo.html";
        } else { mostrarVista(DOM.vistas.login); }
    } catch (e) { mostrarVista(DOM.vistas.login); }
}

inicializarApp();
