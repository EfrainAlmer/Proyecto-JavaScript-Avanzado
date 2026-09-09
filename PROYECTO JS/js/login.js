"use strict";

/**
 * PROYECTO: CURAR - MÓDULO DE AUTENTICACIÓN Y GESTIÓN DE USUARIOS
 */

// ==========================================
// 1. BASE DE DATOS LOCAL Y SESIÓN (Usando datos.js)
// ==========================================

// Inicializar el estado de la aplicación usando la función que viene de datos.js
let listaUsuarios = obtenerUsuariosGuardados();
// Crear un Map para búsquedas en tiempo O(1) por DNI
let mapaUsuariosPorDni = new Map(listaUsuarios.map(u => [u.dni, u]));

// ==========================================
// 2. SELECTORES DEL DOM
// ==========================================

const DOM = {
    // Vistas principales
    vistas: {
        login: document.querySelector("#vista-login"),
        registroRol: document.querySelector("#vista-registro-rol"),
        registroPaciente: document.querySelector("#vista-registro-paciente"),
        registroMedico: document.querySelector("#vista-registro-medico"),
        recuperar: document.querySelector("#vista-recuperar"),
        dashboard: document.querySelector("#vista-dashboard")
    },
    
    // Formularios
    forms: {
        login: document.querySelector("#form-login"),
        regPaciente: document.querySelector("#form-registro-paciente"),
        regMedico: document.querySelector("#form-registro-medico"),
        recuperar: document.querySelector("#form-recuperar")
    },

    // Mensajes y alertas
    alertas: {
        login: document.querySelector("#alerta-login"),
        regPaciente: document.querySelector("#alerta-reg-paciente"),
        regMedico: document.querySelector("#alerta-reg-medico"),
        recuperar: document.querySelector("#alerta-recuperar")
    },

    // Dashboard UI
    dashboard: {
        nombreUsuario: document.querySelector("#dash-nombre"),
        rolUsuario: document.querySelector("#dash-rol"),
        dniUsuario: document.querySelector("#dash-dni"),
        correoUsuario: document.querySelector("#dash-correo"),
        celularUsuario: document.querySelector("#dash-celular"),
        adicionalUsuario: document.querySelector("#dash-adicional"),
        btnCerrarSesion: document.querySelector("#btn-logout"),
        permisosGrid: document.querySelector("#dash-permisos-grid")
    },

    // Botones de navegación entre pantallas
    nav: {
        irARegistroRol: document.querySelectorAll(".btn-ir-registro-rol"),
        irALogin: document.querySelectorAll(".btn-ir-login"),
        irARecuperar: document.querySelector("#btn-ir-recuperar"),
        seleccionarPaciente: document.querySelector("#btn-select-paciente"),
        seleccionarMedico: document.querySelector("#btn-select-medico")
    }
};

// ==========================================
// 3. CONTROLADOR DE VISTAS (Navegación SPA)
// ==========================================

function mostrarVista(vistaSeleccionada) {
    // Ocultar todas las vistas
    Object.values(DOM.vistas).forEach(vista => {
        if (vista) vista.hidden = true;
    });
    // Ocultar todas las alertas al navegar
    Object.values(DOM.alertas).forEach(alerta => {
        if (alerta) {
            alerta.hidden = true;
            alerta.replaceChildren();
        }
    });

    // Mostrar la seleccionada
    if (vistaSeleccionada) {
        vistaSeleccionada.hidden = false;
        
        // Foco automático para accesibilidad
        const primerInput = vistaSeleccionada.querySelector("input, select, button");
        if (primerInput) {
            queueMicrotask(() => primerInput.focus());
        }
    }
}

// ==========================================
// 4. ORQUESTACIÓN Y EVENTOS
// ==========================================

// --- VALIDACIONES DE NEGOCIO ---

function validarDatosComunes(datos, errores) {
    if (!PATRONES.DNI.test(datos.dni)) {
        errores.push("El DNI debe tener exactamente 8 dígitos numéricos.");
    } else if (mapaUsuariosPorDni.has(datos.dni)) {
        errores.push("El DNI ingresado ya se encuentra registrado.");
    }

    if (!PATRONES.NOMBRE.test(datos.nombre) || datos.nombre.length < 5) {
        errores.push("El nombre completo debe tener letras válidas y un mínimo de 5 caracteres.");
    }

    if (!PATRONES.CORREO.test(datos.correo)) {
        errores.push("El correo electrónico no tiene un formato válido (ej.: usuario@dominio.com).");
    } else {
        // Verificar unicidad de correo
        const correoExiste = Array.from(mapaUsuariosPorDni.values()).some(u => u.correo === datos.correo);
        if (correoExiste) errores.push("El correo electrónico ya está registrado por otro usuario.");
    }

    if (!PATRONES.TELEFONO.test(datos.telefono)) {
        errores.push("El celular debe ser peruano: comenzar con 9 y tener exactamente 9 dígitos.");
    }

    if (!PATRONES.PASSWORD.test(datos.password)) {
        errores.push("La contraseña debe tener mínimo 6 caracteres, incluyendo al menos una letra y un número.");
    } else if (datos.password !== datos.confirmPassword) {
        errores.push("Las contraseñas ingresadas no coinciden.");
    }
}

function mostrarPanelAlerta(panel, errores, tipo = "error") {
    panel.replaceChildren();
    
    if (errores.length === 0) {
        panel.hidden = true;
        return;
    }

    panel.className = `mensaje-alerta ${tipo === "exito" ? "mensaje-alerta--exito" : "mensaje-alerta--error"}`;
    
    const titulo = document.createElement("strong");
    titulo.textContent = tipo === "exito" ? "¡Operación Exitosa!" : "Por favor, corrige los siguientes errores:";
    panel.append(titulo);

    const lista = document.createElement("ul");
    errores.forEach(err => {
        const item = document.createElement("li");
        item.textContent = err;
        lista.append(item);
    });
    panel.append(lista);
    panel.hidden = false;
}

// --- PROCESO: INICIO DE SESIÓN ---

function manejarLogin(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.login;
    alerta.hidden = true;
    alerta.replaceChildren();

    const dni = document.querySelector("#login-dni").value.trim();
    const password = document.querySelector("#login-password").value;

    const errores = [];
    if (!dni) errores.push("El número de DNI es obligatorio.");
    if (!password) errores.push("La contraseña es obligatoria.");

    if (errores.length > 0) {
        mostrarPanelAlerta(alerta, errores);
        return;
    }

    // Búsqueda eficiente O(1) usando el Map 
    const usuario = mapaUsuariosPorDni.get(dni);

    if (!usuario || usuario.password !== password) {
        errores.push("El DNI o la contraseña son incorrectos.");
        mostrarPanelAlerta(alerta, errores);
        return;
    }

         // Sesión correcta
    sessionStorage.setItem(KEY_SESION, JSON.stringify(usuario.toJSON()));

    // Redirigir según el rol en vez de mostrar siempre el dashboard local
    if (usuario.rol & ROLE_PACIENTE) {
        window.location.href = "cuenta-paciente.html";
        return;
    }

    // Médico/Admin: aún no tienen página propia, se quedan con el dashboard de ejemplo
    cargarSesionYMostrarDashboard(usuario);
}


// --- PROCESO: REGISTRO DE PACIENTE ---

function manejarRegistroPaciente(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.regPaciente;
    alerta.hidden = true;

    const form = DOM.forms.regPaciente;
    const datos = {
        dni: form.querySelector("#reg-paciente-dni").value,
        nombre: capitalizarNombre(form.querySelector("#reg-paciente-nombre").value),
        correo: form.querySelector("#reg-paciente-correo").value,
        telefono: limpiarNumero(form.querySelector("#reg-paciente-telefono").value),
        rol: ROLE_PACIENTE,
        password: form.querySelector("#reg-paciente-password").value,
        confirmPassword: form.querySelector("#reg-paciente-confirm").value,
        infoAdicional: {
            seguro: form.querySelector("#reg-paciente-seguro").value
        }
    };

    const errores = [];
    validarDatosComunes(datos, errores);

    if (datos.infoAdicional.seguro === "") {
        errores.push("Debes seleccionar tu tipo de cobertura o seguro.");
    }

    if (errores.length > 0) {
        mostrarPanelAlerta(alerta, errores);
        return;
    }

    // Crear instancia de clase e insertar
    const nuevoPaciente = new Usuario(datos);
    listaUsuarios = [...listaUsuarios, nuevoPaciente]; // Copia inmutable
    guardarUsuarios(listaUsuarios);
    mapaUsuariosPorDni.set(nuevoPaciente.dni, nuevoPaciente); // Actualizar índice

    // Éxito
    form.reset();
    mostrarPanelAlerta(DOM.alertas.login, ["Tu cuenta de paciente se registró con éxito. Ya puedes iniciar sesión."], "exito");
    mostrarVista(DOM.vistas.login);
}

// --- PROCESO: REGISTRO DE MÉDICO ---

function manejarRegistroMedico(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.regMedico;
    alerta.hidden = true;

    const form = DOM.forms.regMedico;
    const datos = {
        dni: form.querySelector("#reg-medico-dni").value,
        nombre: capitalizarNombre(form.querySelector("#reg-medico-nombre").value),
        correo: form.querySelector("#reg-medico-correo").value,
        telefono: limpiarNumero(form.querySelector("#reg-medico-telefono").value),
        rol: ROLE_MEDICO,
        password: form.querySelector("#reg-medico-password").value,
        confirmPassword: form.querySelector("#reg-medico-confirm").value,
        infoAdicional: {
            cmp: form.querySelector("#reg-medico-cmp").value.trim(),
            especialidad: form.querySelector("#reg-medico-especialidad").value
        }
    };

    const errores = [];
    validarDatosComunes(datos, errores);

    if (!PATRONES.CMP.test(datos.infoAdicional.cmp)) {
        errores.push("El número de colegiatura CMP debe tener 5 o 6 dígitos numéricos.");
    }
    if (datos.infoAdicional.especialidad === "") {
        errores.push("Debes seleccionar una especialidad médica.");
    }

    if (errores.length > 0) {
        mostrarPanelAlerta(alerta, errores);
        return;
    }

    // Crear instancia de clase e insertar
    const nuevoMedico = new Usuario(datos);
    listaUsuarios = [...listaUsuarios, nuevoMedico];
    guardarUsuarios(listaUsuarios);
    mapaUsuariosPorDni.set(nuevoMedico.dni, nuevoMedico);

    // Éxito
    form.reset();
    mostrarPanelAlerta(DOM.alertas.login, ["Tu cuenta médica se registró con éxito y se encuentra en estado de verificación."], "exito");
    mostrarVista(DOM.vistas.login);
}

// --- PROCESO: RECUPERAR CONTRASEÑA ---

function manejarRecuperarPassword(evento) {
    evento.preventDefault();
    const alerta = DOM.alertas.recuperar;
    alerta.hidden = true;

    const dni = document.querySelector("#recuperar-dni").value.trim();
    const correo = document.querySelector("#recuperar-correo").value.trim().toLowerCase();

    const errores = [];
    if (!dni) errores.push("El DNI es obligatorio.");
    if (!correo) errores.push("El correo electrónico es obligatorio.");

    if (errores.length > 0) {
        mostrarPanelAlerta(alerta, errores);
        return;
    }

    const usuario = mapaUsuariosPorDni.get(dni);
    if (!usuario || usuario.correo !== correo) {
        errores.push("No se encontró ningún usuario con esos datos de credenciales.");
        mostrarPanelAlerta(alerta, errores);
        return;
    }

    // Simular envío de código de recuperación
    DOM.forms.recuperar.reset();
    mostrarPanelAlerta(DOM.alertas.login, [
        `Se ha enviado un enlace de recuperación a: ${correo}.`,
        `Para fines didácticos, tu contraseña actual es: "${usuario.password}"`
    ], "exito");
    mostrarVista(DOM.vistas.login);
}

// --- RENDERING: DASHBOARD DE SESIÓN ---

function cargarSesionYMostrarDashboard(usuarioInstancia) {
    const user = usuarioInstancia;
    
    DOM.dashboard.nombreUsuario.textContent = user.nombre;
    DOM.dashboard.rolUsuario.textContent = user.nombreRol;
    DOM.dashboard.dniUsuario.textContent = user.dni;
    DOM.dashboard.correoUsuario.textContent = user.correo;
    DOM.dashboard.celularUsuario.textContent = user.telefono;

    // Mostrar detalles específicos (object unpacking)
    const { seguro, cmp, especialidad, area } = user.infoAdicional;
    if (seguro) {
        DOM.dashboard.adicionalUsuario.innerHTML = `<strong>Cobertura de Seguro:</strong> Cobertura ${seguro}`;
    } else if (cmp) {
        DOM.dashboard.adicionalUsuario.innerHTML = `<strong>CMP:</strong> N° ${cmp} <br> <strong>Especialidad:</strong> ${especialidad}`;
    } else if (area) {
        DOM.dashboard.adicionalUsuario.innerHTML = `<strong>Área de Gestión:</strong> ${area}`;
    } else {
        DOM.dashboard.adicionalUsuario.textContent = "Sin datos adicionales.";
    }

    // Renderizar permisos dinámicos empleando bits
    DOM.dashboard.permisosGrid.replaceChildren();
    
    const permisosDef = [
        { key: PERM_RESERVAR, label: "Reservar Citas Médicas", desc: "Permite seleccionar médicos y agendar turnos" },
        { key: PERM_RECETAR, label: "Emitir Recetas Digitales", desc: "Permite redactar prescripciones para pacientes" },
        { key: PERM_GESTIONAR, label: "Mantenimiento del Sistema", desc: "Permite administrar especialidades y cuentas" }
    ];

    permisosDef.forEach(perm => {
        const tieneElPermiso = user.tienePermiso(perm.key);
        
        const card = document.createElement("div");
        card.className = `permiso-tarjeta ${tieneElPermiso ? "permiso-tarjeta--activo" : "permiso-tarjeta--inactivo"}`;
        
        const badge = document.createElement("span");
        badge.className = "permiso-badge";
        badge.textContent = tieneElPermiso ? "Activo" : "No asignado";
        
        const titulo = document.createElement("h4");
        titulo.textContent = perm.label;
        
        const desc = document.createElement("p");
        desc.textContent = perm.desc;

        card.append(badge, titulo, desc);
        DOM.dashboard.permisosGrid.append(card);
    });

    mostrarVista(DOM.vistas.dashboard);
}

// --- CIERRE DE SESIÓN ---

function manejarCerrarSesion() {
    sessionStorage.removeItem(KEY_SESION);
    DOM.forms.login.reset();
    mostrarVista(DOM.vistas.login);
}

// ==========================================
// 5. ASOCIACIÓN DE LISTENERS (Eventos)
// ==========================================

function inicializarApp() {
    // Escuchar envíos de formularios
    DOM.forms.login.addEventListener("submit", manejarLogin);
    DOM.forms.regPaciente.addEventListener("submit", manejarRegistroPaciente);
    DOM.forms.regMedico.addEventListener("submit", manejarRegistroMedico);
    DOM.forms.recuperar.addEventListener("submit", manejarRecuperarPassword);

    DOM.dashboard.btnCerrarSesion.addEventListener("click", manejarCerrarSesion);

    // Navegación rápida entre pantallas (SPA)
    DOM.nav.irARegistroRol.forEach(btn => btn.addEventListener("click", () => mostrarVista(DOM.vistas.registroRol)));
    DOM.nav.irALogin.forEach(btn => btn.addEventListener("click", () => mostrarVista(DOM.vistas.login)));
    DOM.nav.irARecuperar.addEventListener("click", () => mostrarVista(DOM.vistas.recuperar));
    
    DOM.nav.seleccionarPaciente.addEventListener("click", () => mostrarVista(DOM.vistas.registroPaciente));
    DOM.nav.seleccionarMedico.addEventListener("click", () => mostrarVista(DOM.vistas.registroMedico));

    // Verificar si ya hay una sesión activa guardada
    try {
        const sesionGuardada = sessionStorage.getItem(KEY_SESION);
        if (sesionGuardada) {
            const datosObj = JSON.parse(sesionGuardada);
            const usuarioInstancia = Usuario.desdeObjeto(datosObj);
            cargarSesionYMostrarDashboard(usuarioInstancia);
        } else {
            mostrarVista(DOM.vistas.login);
        }
    } catch (e) {
        console.error("Sesión corrupta o inválida en sessionStorage, iniciando en login", e);
        mostrarVista(DOM.vistas.login);
    }
}

// Ejecutar inicialización una vez que el DOM esté cargado (script cargado con defer)
inicializarApp();
