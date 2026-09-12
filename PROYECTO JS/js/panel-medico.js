"use strict";

class CitaMedico {
    constructor({ id, paciente, especialidad, fecha, hora, estado, medico, sede }) {
        this.id = id; this.paciente = String(paciente).trim(); this.especialidad = especialidad || "General"; this.ubicacion = sede || "Sede Ate"; this.fecha = fecha; this.hora = hora; this.estado = estado; this.medico = medico;
    }
}

let misCitas = [];

document.addEventListener("DOMContentLoaded", () => {
    inicializarPanelMedico(); configurarEventos(); configurarBotonesInterfaz(); actualizarCalendarioDinamico();
});

function inicializarPanelMedico() {
    try {
        let sesion = JSON.parse(sessionStorage.getItem("curar_sesion_activa"));
        if (!sesion || sesion.rol !== 2) { sesion = { nombre: "Dr. Carlos Mendoza Arana", rol: 2 }; }
        const navDocName = document.getElementById("pm-doc-name"); const navProfile = document.getElementById("pm-profile-name");
        if (navDocName) navDocName.textContent = `Buenos días, ${sesion.nombre}`; if (navProfile) navProfile.textContent = sesion.nombre;

        let todasLasCitas = JSON.parse(localStorage.getItem("curar_citas")) || [];
        if (todasLasCitas.length === 0) {
            todasLasCitas = [
                { id: "101", paciente: "Ana María Torres", medico: sesion.nombre, especialidad: "General", sede: "Sede Ate", fecha: "2026-09-12", hora: "08:00", estado: "Pendiente" },
                { id: "102", paciente: "David Laid", medico: sesion.nombre, especialidad: "General", sede: "Sede Ate", fecha: "2026-09-13", hora: "16:00", estado: "Pendiente" }
            ];
            localStorage.setItem("curar_citas", JSON.stringify(todasLasCitas));
        }
        const dataFiltrada = todasLasCitas.filter(cita => cita.medico === sesion.nombre);
        misCitas = dataFiltrada.map(c => new CitaMedico(c));
        calcularMetricas(); renderizarCitas(misCitas); renderizarProximosPacientes(misCitas);
    } catch (error) { console.error("Error cargando panel médico:", error.message); }
}

function calcularMetricas() {
    const metricas = misCitas.reduce((acc, cita) => {
        acc.citasTotales++;
        const estado = cita.estado.toLowerCase();
        if (estado.includes("atendid") || estado.includes("completad")) acc.pacientesUnicos++;
        return acc;
    }, { citasTotales: 0, pacientesUnicos: 0 });
    const elApp = document.getElementById("metric-appointments"); const elPat = document.getElementById("metric-patients");
    if (elApp) elApp.textContent = Math.max(0, metricas.citasTotales); if (elPat) elPat.textContent = Math.max(0, metricas.pacientesUnicos + 578);
}

function renderizarCitas(citas) {
    const contenedor = document.getElementById("pm-citas-container");
    if (!contenedor) return; contenedor.innerHTML = "";
    if (citas.length === 0) { contenedor.innerHTML = `<p style="text-align: center; color: #888;">No hay citas programadas para hoy.</p>`; return; }
    citas.forEach(cita => {
        const esAtendida = cita.estado.toLowerCase().includes("atendid") || cita.estado.toLowerCase().includes("completad");
        const fila = document.createElement("div");
        fila.style.cssText = "display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;";
        fila.innerHTML = `<div><strong>👤 ${cita.paciente}</strong></div><div>${cita.ubicacion}</div><div>${cita.fecha}</div><div>${cita.hora}</div><div style="display: flex; gap: 10px; align-items: center;">${esAtendida ? `<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 10px; border-radius: 20px; font-size: 14px;">✔ Atendida</span>` : `<button class="btn-atender" data-id="${cita.id}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">Atender</button>`}</div>`;
        contenedor.appendChild(fila);
    });
    document.querySelectorAll(".btn-atender").forEach(btn => { btn.addEventListener("click", (e) => procesarAtencion(e.target.dataset.id)); });
}

function procesarAtencion(idCita) {
    if(!confirm("¿Confirmar que el paciente ha sido atendido?")) return;
    let baseCitas = JSON.parse(localStorage.getItem("curar_citas")) || [];
    const index = baseCitas.findIndex(c => c.id.toString() === idCita.toString());
    if (index !== -1) { baseCitas[index].estado = "Atendida"; localStorage.setItem("curar_citas", JSON.stringify(baseCitas)); inicializarPanelMedico(); }
}

function renderizarProximosPacientes(citas) {
    const contenedor = document.getElementById("pm-next-patients");
    if (!contenedor) return; contenedor.innerHTML = "";
    citas.slice(0, 4).forEach((cita, index) => {
        const clase = index === 0 ? "pm-mini-card active" : "pm-mini-card";
        contenedor.innerHTML += `<div class="${clase}" style="cursor: pointer;">👤<br><strong>${cita.paciente.split(" ")[0]}</strong><br><small>${cita.hora.split(" ")[0]}</small></div>`;
    });
}

function configurarEventos() {
    const inputBuscar = document.getElementById("pm-search");
    if (inputBuscar) {
        inputBuscar.addEventListener("input", (e) => {
            const termino = e.target.value.trim();
            if (!termino) { renderizarCitas(misCitas); return; }
            try { const patron = new RegExp(termino, "iu"); const filtradas = misCitas.filter(cita => patron.test(cita.paciente) || patron.test(cita.ubicacion)); renderizarCitas(filtradas); } catch (error) {}
        });
    }
    const btnLogout = document.getElementById("btn-logout-medico");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => { sessionStorage.removeItem("curar_sesion_activa"); window.location.href = "autenticacion.html"; });
    }
}

function configurarBotonesInterfaz() {
    const btnAdd = document.querySelector(".pm-btn-primary");
    if (btnAdd) btnAdd.addEventListener("click", () => window.location.href = "busqueda-medicos.html");
    const botonesNav = document.querySelectorAll(".pm-nav-btn:not(.pm-logout)");
    botonesNav.forEach(boton => { boton.addEventListener("click", (e) => { botonesNav.forEach(b => b.classList.remove("active")); e.currentTarget.classList.add("active"); }); });
}

function actualizarCalendarioDinamico() {
    const contenedorDias = document.querySelector(".pm-days");
    if (!contenedorDias) return;
    const hoy = new Date(); const diaSemana = hoy.getDay(); const diferenciaAlLunes = hoy.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const lunes = new Date(hoy.setDate(diferenciaAlLunes));
    const nombresDias = ["Lun", "Mar", "Mié", "Jue", "Vie"];
    let htmlCalendario = "";
    for (let i = 0; i < 5; i++) {
        const d = new Date(lunes); d.setDate(lunes.getDate() + i);
        const numeroDia = d.getDate(); const esHoy = d.toDateString() === new Date().toDateString();
        const claseActiva = esHoy ? "pm-day pm-day--active" : "pm-day";
        htmlCalendario += `<div class="${claseActiva}" data-fecha="${d.toISOString().split('T')[0]}">${nombresDias[i]}<br><strong>${numeroDia}</strong></div>`;
    }
    contenedorDias.innerHTML = htmlCalendario;
    document.querySelectorAll(".pm-day").forEach(dia => {
        dia.addEventListener("click", (e) => {
            document.querySelectorAll(".pm-day").forEach(d => d.classList.remove("pm-day--active")); e.currentTarget.classList.add("pm-day--active");
        });
    });
}
