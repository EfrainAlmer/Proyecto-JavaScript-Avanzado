"use strict";

document.addEventListener("DOMContentLoaded", () => {
    inicializarGestionCitas();
    const btnLogout = document.getElementById("btn-logout-medico");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem("curar_sesion_activa");
            window.location.href = "autenticacion.html";
        });
    }
});

function inicializarGestionCitas() {
    let sesion = JSON.parse(sessionStorage.getItem("curar_sesion_activa"));
    if (!sesion || !(sesion.rol & 2)) { 
        sesion = { nombre: "Dr. Carlos Mendoza Arana", rol: 2 }; 
        sessionStorage.setItem("curar_sesion_activa", JSON.stringify(sesion));
    }
    let baseCitas = JSON.parse(localStorage.getItem("curar_citas")) || [];
    if (baseCitas.length === 0) {
        baseCitas = [
            { id: "101", paciente: "Ana María Torres", medico: sesion.nombre, especialidad: "General", sede: "Sede Ate", fecha: "2026-09-12", hora: "08:00", estado: "Pendiente" },
            { id: "102", paciente: "David Laid", medico: sesion.nombre, especialidad: "General", sede: "Sede Ate", fecha: "2026-09-13", hora: "16:00", estado: "Pendiente" }
        ];
        localStorage.setItem("curar_citas", JSON.stringify(baseCitas));
    }
    let citasDelDoctor = baseCitas.filter(cita => cita.medico === sesion.nombre);
    if (citasDelDoctor.length === 0) { citasDelDoctor = baseCitas; }
    renderizarTablaCitas(citasDelDoctor);
}

function renderizarTablaCitas(citas) {
    const tbody = document.querySelector("#cuerpo-tabla-medico");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (citas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #888;">No hay citas programadas.</td></tr>`;
        return;
    }
    citas.forEach(cita => {
        const estadoNorm = (cita.estado || "").toLowerCase();
        const esAtendida = estadoNorm.includes("atendid") || estadoNorm.includes("completad");
        const fila = document.createElement("tr");
        fila.style.borderBottom = "1px solid #eee";
        fila.innerHTML = `
            <td style="padding: 15px;"><strong>👤 ${cita.paciente || "Paciente"}</strong></td>
            <td style="padding: 15px;">${cita.fecha || "2026-09-12"} a las ${cita.hora || "08:00"}</td>
            <td style="padding: 15px;">${cita.sede || "Sede Ate"}</td>
            <td style="padding: 15px;">
                ${esAtendida 
                    ? `<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 10px; border-radius: 20px; font-size: 14px;">✔ Atendida</span>` 
                    : `<button class="btn-atender-gestion" data-id="${cita.id}" style="background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">Atender</button>`
                }
            </td>
        `;
        tbody.appendChild(fila);
    });
    document.querySelectorAll(".btn-atender-gestion").forEach(btn => {
        btn.addEventListener("click", (e) => procesarAtencionGestion(e.target.dataset.id));
    });
}

function procesarAtencionGestion(idCita) {
    if(!confirm("¿Confirmar que este paciente ha sido atendido?")) return;
    let baseCitas = JSON.parse(localStorage.getItem("curar_citas")) || [];
    const index = baseCitas.findIndex(c => c.id.toString() === idCita.toString());
    if (index !== -1) {
        baseCitas[index].estado = "Atendida";
        localStorage.setItem("curar_citas", JSON.stringify(baseCitas));
        inicializarGestionCitas();
    }
}
