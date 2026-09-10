"use strict";


// ==========================================
// CURAR - BÚSQUEDA DE MÉDICOS
// ==========================================


// Médicos de ejemplo

const medicos = [

    {
        id: 1,
        nombre: "Dr. Carlos Mendoza Arana",
        especialidad: "Pediatría",
        cmp: "54321",
        horario: "08:00 AM - 01:00 PM"
    },

    {
        id: 2,
        nombre: "Dra. María López García",
        especialidad: "Cardiología",
        cmp: "65432",
        horario: "09:00 AM - 03:00 PM"
    },

    {
        id: 3,
        nombre: "Dr. José Ramírez Torres",
        especialidad: "Medicina General",
        cmp: "76543",
        horario: "08:00 AM - 04:00 PM"
    },

    {
        id: 4,
        nombre: "Dra. Andrea Salazar Ruiz",
        especialidad: "Ginecología",
        cmp: "87654",
        horario: "10:00 AM - 05:00 PM"
    },

    {
        id: 5,
        nombre: "Dr. Roberto Castillo",
        especialidad: "Geriatría",
        cmp: "98765",
        horario: "08:00 AM - 02:00 PM"
    }

];


// ==========================================
// ELEMENTOS
// ==========================================

const inputNombre =
    document.querySelector("#buscar-nombre");

const selectEspecialidad =
    document.querySelector("#buscar-especialidad");

const listaMedicos =
    document.querySelector("#lista-medicos");

const btnVolver =
    document.querySelector("#btn-volver");


// ==========================================
// MOSTRAR MÉDICOS
// ==========================================

function mostrarMedicos(lista) {

    listaMedicos.replaceChildren();


    if (lista.length === 0) {

        const mensaje =
            document.createElement("p");

        mensaje.textContent =
            "No se encontraron médicos.";

        listaMedicos.append(mensaje);

        return;
    }


    lista.forEach(medico => {

        const tarjeta =
            document.createElement("article");

        tarjeta.className =
            "permiso-tarjeta permiso-tarjeta--activo";


        const titulo =
            document.createElement("h3");

        titulo.textContent =
            medico.nombre;


        const especialidad =
            document.createElement("p");

        especialidad.textContent =
            `Especialidad: ${medico.especialidad}`;


        const cmp =
            document.createElement("p");

        cmp.textContent =
            `CMP: ${medico.cmp}`;


        const horario =
            document.createElement("p");

        horario.textContent =
            `Horario: ${medico.horario}`;


        const boton =
            document.createElement("button");

        boton.textContent =
            "Reservar cita";

        boton.className =
            "btn btn--primario";


        boton.addEventListener(
            "click",
            () => reservarConMedico(medico)
        );


        tarjeta.append(
            titulo,
            especialidad,
            cmp,
            horario,
            boton
        );


        listaMedicos.append(tarjeta);

    });

}


// ==========================================
// FILTRAR
// ==========================================

function filtrarMedicos() {

    const nombre =
        inputNombre.value
            .trim()
            .toLowerCase();

    const especialidad =
        selectEspecialidad.value;


    const resultado =
        medicos.filter(medico => {

            const coincideNombre =
                medico.nombre
                    .toLowerCase()
                    .includes(nombre);


            const coincideEspecialidad =
                especialidad === "" ||
                medico.especialidad === especialidad;


            return (
                coincideNombre &&
                coincideEspecialidad
            );

        });


    mostrarMedicos(resultado);

}


// ==========================================
// IR A RESERVA
// ==========================================

function reservarConMedico(medico) {

    sessionStorage.setItem(
        "curar_medico_seleccionado",
        JSON.stringify(medico)
    );


    window.location.href =
        "./reserva-citas.html";

}


// ==========================================
// EVENTOS
// ==========================================

inputNombre.addEventListener(
    "input",
    filtrarMedicos
);


selectEspecialidad.addEventListener(
    "change",
    filtrarMedicos
);


btnVolver.addEventListener(
    "click",
    () => {

        window.location.href =
            "./cuenta-paciente.html";

    }
);


// ==========================================
// INICIAR
// ==========================================

mostrarMedicos(medicos);