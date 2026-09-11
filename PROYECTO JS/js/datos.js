"use strict";

/**
 * CURAR — MÓDULO DE DATOS COMPARTIDO
 * Roles/permisos (Guía 2), patrones de validación (Guía 3) y el modelo
 * Usuario + acceso a localStorage (Guía 4).
 *
 * IMPORTANTE: este archivo debe cargarse ANTES que el script propio
 * de cada vista, por ejemplo:
 *   <script src="../js/datos.js" defer></script>
 *   <script src="../js/cuenta-paciente.js" defer></script>
 */

// ==========================================
// 1. ROLES Y PERMISOS (banderas de bits — Guía 2)
// ==========================================

const ROLE_PACIENTE = 1 << 0; // 001
const ROLE_MEDICO   = 1 << 1; // 010
const ROLE_ADMIN    = 1 << 2; // 100

const PERM_RESERVAR  = 1 << 0;
const PERM_RECETAR   = 1 << 1;
const PERM_GESTIONAR = 1 << 2;

const PERMISOS_POR_ROL = Object.freeze({
    [ROLE_PACIENTE]: PERM_RESERVAR,
    [ROLE_MEDICO]:   PERM_RECETAR,
    [ROLE_ADMIN]:    PERM_RESERVAR | PERM_RECETAR | PERM_GESTIONAR
});

// ==========================================
// 2. PATRONES DE VALIDACIÓN (Guía 3)
// ==========================================

const PATRONES = Object.freeze({
    DNI: /^\d{8}$/,
    NOMBRE: /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u,
    CORREO: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u,
    TELEFONO: /^9\d{8}$/,
    CMP: /^\d{5,6}$/,
    PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/ // Nota: El patrón requiere letras y números. "admin" no lo pasa, pero esto solo aplica a los nuevos registros, no a los hardcodeados
});

// ==========================================
// 3. CLAVES DE ALMACENAMIENTO
// ==========================================

const KEY_USUARIOS = "curar_usuarios";
const KEY_SESION = "curar_sesion_activa";

// ==========================================
// 4. MODELO DE DATOS — CLASE Usuario (Guía 4)
// ==========================================

class Usuario {
    constructor({ dni, nombre, correo, telefono, rol, password, infoAdicional = {}, creadoEn }) {
        this.dni = String(dni).trim();
        this.nombre = String(nombre).trim();
        this.correo = String(correo).trim().toLowerCase();
        this.telefono = String(telefono).trim();
        this.rol = Number(rol);
        this.password = password; // En un entorno real iría hasheado en backend
        this.infoAdicional = infoAdicional;
        // Conserva la fecha original si ya existía (evita "reescribirla" al recargar)
        this.creadoEn = creadoEn ?? new Date().toISOString();
    }

    get nombreRol() {
        if (this.rol & ROLE_ADMIN) return "Administrador";
        if (this.rol & ROLE_MEDICO) return "Médico Especialista";
        if (this.rol & ROLE_PACIENTE) return "Paciente";
        return "Desconocido";
    }

    tienePermiso(permiso) {
        const permisosDeUsuario = PERMISOS_POR_ROL[this.rol] ?? 0;
        return (permisosDeUsuario & permiso) !== 0;
    }

    toJSON() {
        return {
            dni: this.dni,
            nombre: this.nombre,
            correo: this.correo,
            telefono: this.telefono,
            rol: this.rol,
            password: this.password,
            infoAdicional: this.infoAdicional,
            creadoEn: this.creadoEn
        };
    }

    static desdeObjeto(datos) {
        return new Usuario(datos);
    }
}

// ==========================================
// 5. USUARIOS PREDETERMINADOS Y ACCESO A localStorage
// ==========================================

const USUARIOS_PREDETERMINADOS = [
    {
        dni: "12345678",
        nombre: "Ana María Torres",
        correo: "ana.torres@gmail.com",
        telefono: "987654321",
        rol: ROLE_PACIENTE,
        password: "paciente123",
        infoAdicional: { seguro: "SIS" }
    },
    {
        dni: "87654321",
        nombre: "Dr. Carlos Mendoza Arana",
        correo: "c.mendoza@curar.pe",
        telefono: "912345678",
        rol: ROLE_MEDICO,
        password: "medico123",
        infoAdicional: { cmp: "54321", especialidad: "Pediatría" }
    },
    {
        dni: "11112222",
        nombre: "Administrador General",
        correo: "admin@curar.pe",
        telefono: "999888777",
        rol: ROLE_ADMIN,
        password: "admin123",
        infoAdicional: { area: "Sistemas Central" }
    },
    // NUEVO ADMINISTRADOR AÑADIDO
    {
        dni: "70490991",
        nombre: "Administrador Principal",
        correo: "admin.principal@curar.pe",
        telefono: "900000000",
        rol: ROLE_ADMIN,
        password: "admin",
        infoAdicional: { area: "Panel Administrativo" }
    }
];

function obtenerUsuariosGuardados() {
    try {
        const raw = localStorage.getItem(KEY_USUARIOS);
        if (!raw) {
            localStorage.setItem(KEY_USUARIOS, JSON.stringify(USUARIOS_PREDETERMINADOS));
            return USUARIOS_PREDETERMINADOS.map(Usuario.desdeObjeto);
        }
        const listaObj = JSON.parse(raw);
        return listaObj.map(Usuario.desdeObjeto);
    } catch (e) {
        console.error("Error al cargar usuarios de localStorage, usando predeterminados", e);
        return USUARIOS_PREDETERMINADOS.map(Usuario.desdeObjeto);
    }
}

function guardarUsuarios(listaUsuarios) {
    localStorage.setItem(
        KEY_USUARIOS,
        JSON.stringify(listaUsuarios.map(u => (u instanceof Usuario ? u.toJSON() : u)))
    );
}

/**
 * Actualiza un usuario existente (por DNI) fusionando los cambios de forma
 * inmutable con spread (Guía 2 y 4) y persiste la colección completa.
 */
function actualizarUsuario(dni, cambios) {
    const usuarios = obtenerUsuariosGuardados();
    const indice = usuarios.findIndex(u => u.dni === dni);

    if (indice === -1) {
        throw new Error("No se encontró el usuario a actualizar.");
    }

    const actualizado = new Usuario({ ...usuarios[indice].toJSON(), ...cambios });
    usuarios[indice] = actualizado;
    guardarUsuarios(usuarios);
    return actualizado;
}

// ==========================================
// 6. SESIÓN ACTIVA (sessionStorage)
// ==========================================

function obtenerSesionActiva() {
    try {
        const guardada = sessionStorage.getItem(KEY_SESION);
        if (!guardada) return null;
        return Usuario.desdeObjeto(JSON.parse(guardada));
    } catch (e) {
        console.error("Sesión corrupta o inválida en sessionStorage", e);
        return null;
    }
}

function guardarSesionActiva(usuarioInstancia) {
    sessionStorage.setItem(KEY_SESION, JSON.stringify(usuarioInstancia.toJSON()));
}

function cerrarSesionActiva() {
    sessionStorage.removeItem(KEY_SESION);
}

// ==========================================
// 7. NORMALIZACIÓN DE TEXTO (Guía 3)
// ==========================================

function colapsarEspacios(texto) {
    return String(texto).trim().replace(/\s+/gu, " ");
}

function capitalizarNombre(texto) {
    return colapsarEspacios(texto)
        .toLocaleLowerCase("es-PE")
        .replace(/(^|[ '\-])\p{L}/gu, coincidencia =>
            coincidencia.toLocaleUpperCase("es-PE")
        );
}

function limpiarNumero(texto) {
    return String(texto).replace(/[\s-]/gu, "");
}