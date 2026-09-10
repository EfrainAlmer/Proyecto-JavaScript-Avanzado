"use strict";


// ==========================================
// CURAR - RESERVA DE CITAS
// ==========================================


// ==========================================
// ELEMENTOS
// ==========================================

const formReserva =
    document.querySelector("#form-reserva");

const medicoNombre =
    document.querySelector("#medico-nombre");

const medicoEspecialidad =
    document.querySelector("#medico-especialidad");

const medicoCmp =
    document.querySelector("#medico-cmp");

const fechaCita =
    document.querySelector("#fecha-cita");

const horaCita =
    document.querySelector("#hora-cita");

const motivoCita =
    document.querySelector("#motivo-cita");

const alertaReserva =
    document.querySelector("#alerta-reserva");

const btnVolver =
    document.querySelector("#btn-volver-medicos");


// ==========================================
// MÉDICO SELECCIONADO
// ==========================================

const medicoGuardado =
    sessionStorage.getItem(
        "curar_medico_seleccionado"
    );


let medicoSeleccionado = null;


if (medicoGuardado) {

    medicoSeleccionado =
        JSON.parse(medicoGuardado);


    medicoNombre.value =
        medicoSeleccionado.nombre;

    medicoEspecialidad.value =
        medicoSeleccionado.especialidad;

    medicoCmp.value =
        medicoSeleccionado.cmp;

} else {

    alertaReserva.hidden = false;

    alertaReserva.className =
        "mensaje-alerta mensaje-alerta--error";

    alertaReserva.textContent =
        "Primero debes seleccionar un médico.";

}


// ==========================================
// FECHA MÍNIMA
// ==========================================

const hoy =
    new Date()
        .toISOString()
        .split("T")[0];


fechaCita.min = hoy;


// ==========================================
// GUARDAR CITA
// ==========================================

function guardarCita(cita) {

    const citas =
        JSON.parse(
            localStorage.getItem("curar_citas")
        ) || [];


    citas.push(cita);


    localStorage.setItem(
        "curar_citas",
        JSON.stringify(citas)
    );

}


// ==========================================
// MOSTRAR MENSAJE
// ==========================================

function mostrarMensaje(
    mensaje,
    tipo
) {

    alertaReserva.hidden = false;

    alertaReserva.className =
        tipo === "exito"
            ? "mensaje-alerta mensaje-alerta--exito"
            : "mensaje-alerta mensaje-alerta--error";


    alertaReserva.textContent =
        mensaje;

}


// ==========================================
// RESERVAR
// ==========================================

formReserva.addEventListener(
    "submit",
    evento => {

        evento.preventDefault();


        if (!medicoSeleccionado) {

            mostrarMensaje(
                "Debes seleccionar un médico.",
                "error"
            );

            return;

        }


        if (
            fechaCita.value === "" ||
            horaCita.value === "" ||
            motivoCita.value.trim() === ""
        ) {

            mostrarMensaje(
                "Completa todos los campos.",
                "error"
            );

            return;

        }


        const paciente =
            obtenerSesionActiva();


        if (!paciente) {

            mostrarMensaje(
                "Debes iniciar sesión nuevamente.",
                "error"
            );

            return;

        }


        const cita = {

            id: Date.now(),

            pacienteDni:
                paciente.dni,

            paciente:
                paciente.nombre,

            medico:
                medicoSeleccionado.nombre,

            especialidad:
                medicoSeleccionado.especialidad,

            cmp:
                medicoSeleccionado.cmp,

            fecha:
                fechaCita.value,

            hora:
                horaCita.value,

            motivo:
                motivoCita.value.trim(),

            estado:
                "Reservada"

        };


        guardarCita(cita);


        mostrarMensaje(
            "Cita reservada correctamente.",
            "exito"
        );


        fechaCita.value = "";
        horaCita.value = "";
        motivoCita.value = "";

    }
);


// ==========================================
// VOLVER
// ==========================================

btnVolver.addEventListener(
    "click",
    () => {

        window.location.href =
            "./busqueda-medicos.html";

    }
);