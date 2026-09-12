"use strict";

let medicosDB = [
    { id: "MED-001", nombre: "Dra. Ana López", especialidad: "Cardiología", estado: "Activo" },
    { id: "MED-002", nombre: "Dr. Carlos Ruiz", especialidad: "Pediatría", estado: "Activo" },
    { id: "MED-003", nombre: "Dra. María Gómez", especialidad: "Medicina General", estado: "Inactivo" }
];
let pacientesDB = [
    { dni: "72345678", nombre: "Juan Pérez Sánchez", ultima: "12/10/2023", historial: "Normal" },
    { dni: "74561239", nombre: "Lucía Fernández", ultima: "15/10/2023", historial: "Prioritario" }
];
let citasDB = [
    { id: "C-101", paciente: "Juan Pérez", medico: "Dra. Ana López", hora: "Hoy, 11:00 AM", estado: "En Espera" },
    { id: "C-102", paciente: "Lucía Fernández", medico: "Dr. Carlos Ruiz", hora: "Hoy, 11:30 AM", estado: "Confirmada" },
    { id: "C-103", paciente: "Marcos Silva", medico: "Dra. María Gómez", hora: "Mañana, 09:00 AM", estado: "Confirmada" }
];

let editandoMedicoIndex = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarNavegacion(); inicializarMenuUsuario(); inicializarGraficos(); cargarDatosSistema(); inicializarModalesYFormularios(); inicializarBuscadores(); inicializarAccionesSecundarias();
});

function inicializarNavegacion() {
    const tabs = document.querySelectorAll('.cuenta-tab');
    const secciones = document.querySelectorAll('.vista-seccion');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('cuenta-tab--activo'));
            secciones.forEach(s => s.hidden = true);
            tab.classList.add('cuenta-tab--activo');
            const target = tab.getAttribute('data-target');
            const vistaDestino = document.getElementById(`vista-${target}`);
            if (vistaDestino) vistaDestino.hidden = false;
        });
    });
}

function inicializarMenuUsuario() {
    const btnMenu = document.getElementById('btn-menu-usuario');
    const menu = document.getElementById('menu-desplegable');
    if (btnMenu && menu) {
        btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const expandido = btnMenu.getAttribute('aria-expanded') === 'true';
            btnMenu.setAttribute('aria-expanded', !expandido);
            menu.hidden = expandido;
        });
        document.addEventListener('click', (e) => {
            if (!btnMenu.contains(e.target) && !menu.contains(e.target)) {
                btnMenu.setAttribute('aria-expanded', 'false');
                menu.hidden = true;
            }
        });
    }
    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
        Swal.fire({ title: '¿Cerrar sesión?', text: "Tendrás que volver a ingresar tus credenciales.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'Sí, salir', cancelButtonText: 'Cancelar'
        }).then((result) => { if (result.isConfirmed) { sessionStorage.removeItem("curar_sesion_activa"); window.location.href = "autenticacion.html"; } });
    });
}

function inicializarGraficos() {
    const ctx = document.getElementById('chartEvolucion');
    if(ctx) {
        new Chart(ctx, { type: 'bar', data: { labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], datasets: [{ label: 'Ingresos (S/)', data: [1200, 1900, 1500, 2200, 1800, 900], backgroundColor: 'rgba(52, 152, 219, 0.6)', borderColor: 'rgba(52, 152, 219, 1)', borderWidth: 1 }, { label: 'Citas Atendidas', data: [12, 19, 15, 25, 20, 10], type: 'line', borderColor: '#e74c3c', backgroundColor: '#e74c3c', tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
}

function cargarDatosSistema() {
    document.getElementById('stat-pacientes').innerText = pacientesDB.length + 1450;
    document.getElementById('stat-medicos').innerText = medicosDB.length;
    document.getElementById('stat-citas').innerText = citasDB.filter(c => c.estado !== 'Cancelada').length;
    renderTablaMedicos(); renderTablaPacientes(); renderTablaCitas();
}

function renderTablaMedicos() {
    const tbody = document.getElementById('tbody-medicos');
    if(!tbody) return;
    tbody.innerHTML = '';
    medicosDB.forEach((m, index) => {
        const badgeClass = m.estado === 'Activo' ? 'badge-success' : 'badge-danger';
        tbody.innerHTML += `<tr><td>${m.id}</td><td><strong>${m.nombre}</strong></td><td>${m.especialidad}</td><td><span class="badge ${badgeClass}">${m.estado}</span></td><td><button class="btn-accion btn-ver" onclick="verPerfil('${m.nombre}')">Ver</button> <button class="btn-accion btn-editar" onclick="editarMedico(${index})">Editar</button> <button class="btn-accion btn-eliminar" onclick="eliminarMedico(${index})">Quitar</button></td></tr>`;
    });
}

function renderTablaPacientes() {
    const tbody = document.getElementById('tbody-pacientes');
    if(!tbody) return;
    tbody.innerHTML = '';
    pacientesDB.forEach(p => {
        tbody.innerHTML += `<tr><td>${p.dni}</td><td>${p.nombre}</td><td>${p.ultima}</td><td><span class="badge ${p.historial === 'Normal' ? 'badge-success' : 'badge-espera'}">${p.historial}</span></td><td><button class="btn-accion btn-ver" onclick="verPerfil('${p.nombre}')">Historial Clínico</button></td></tr>`;
    });
}

function renderTablaCitas() {
    const tbodyDash = document.getElementById('tbody-citas-dashboard');
    const tbodyFull = document.getElementById('tbody-citas-completas');
    let htmlContent = '';
    citasDB.forEach((c, index) => {
        let badgeClass = 'badge-espera';
        if(c.estado === 'Confirmada') badgeClass = 'badge-confirmada';
        if(c.estado === 'Cancelada') badgeClass = 'badge-cancelada';
        let btnCancelar = c.estado !== 'Cancelada' ? `<button class="btn-accion btn-cancelar" onclick="cancelarCita(${index})">Cancelar</button>` : `<span style="font-size:0.8em; color:gray;">Sin acciones</span>`;
        if(tbodyDash) { tbodyDash.innerHTML += `<tr><td>${c.paciente}</td><td>${c.hora}</td><td><span class="badge ${badgeClass}">${c.estado}</span></td><td>${btnCancelar}</td></tr>`; }
        htmlContent += `<tr><td>${c.id}</td><td>${c.paciente}</td><td>${c.medico}</td><td>${c.hora}</td><td><span class="badge ${badgeClass}">${c.estado}</span></td><td>${btnCancelar}</td></tr>`;
    });
    if(tbodyFull) tbodyFull.innerHTML = htmlContent;
}

function inicializarModalesYFormularios() {
    const modalMedico = document.getElementById('modal-medico');
    const btnNuevoMedico = document.getElementById('btn-nuevo-medico');
    const btnCerrar = document.querySelectorAll('.btn-cerrar-modal');
    const formMedico = document.getElementById('form-medico');

    if(btnNuevoMedico) {
        btnNuevoMedico.addEventListener('click', () => { editandoMedicoIndex = null; formMedico.reset(); document.getElementById('titulo-modal-medico').innerText = "Registrar Nuevo Médico"; modalMedico.hidden = false; modalMedico.style.display = 'flex'; });
    }
    btnCerrar.forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); modalMedico.hidden = true; modalMedico.style.display = 'none'; }); });
    if(formMedico) {
        formMedico.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('medico-nombre').value; const especialidad = document.getElementById('medico-especialidad').value; const estado = document.getElementById('medico-estado').value;
            if (editandoMedicoIndex !== null) { medicosDB[editandoMedicoIndex].nombre = nombre; medicosDB[editandoMedicoIndex].especialidad = especialidad; medicosDB[editandoMedicoIndex].estado = estado; Swal.fire('Actualizado', 'Datos del médico actualizados.', 'success'); }
            else { const nuevoId = "MED-00" + (medicosDB.length + 1); medicosDB.push({ id: nuevoId, nombre, especialidad, estado }); Swal.fire('Registrado', 'El médico ha sido agregado al sistema.', 'success'); }
            modalMedico.hidden = true; modalMedico.style.display = 'none'; cargarDatosSistema();
        });
    }
    document.getElementById('form-configuracion')?.addEventListener('submit', (e) => { e.preventDefault(); Swal.fire('Guardado', 'Los ajustes se han guardado exitosamente.', 'success'); });
}

window.editarMedico = function(index) {
    editandoMedicoIndex = index; const m = medicosDB[index];
    document.getElementById('titulo-modal-medico').innerText = "Editar Médico: " + m.id;
    document.getElementById('medico-nombre').value = m.nombre; document.getElementById('medico-especialidad').value = m.especialidad; document.getElementById('medico-estado').value = m.estado;
    const modal = document.getElementById('modal-medico'); modal.hidden = false; modal.style.display = 'flex';
};
window.eliminarMedico = function(index) {
    Swal.fire({ title: '¿Estás seguro?', text: `Vas a dar de baja a ${medicosDB[index].nombre}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#95a5a6', confirmButtonText: 'Sí, quitar' }).then((result) => {
        if (result.isConfirmed) { medicosDB.splice(index, 1); cargarDatosSistema(); Swal.fire('Eliminado!', 'El registro ha sido removido.', 'success'); }
    });
};
window.cancelarCita = function(index) {
    Swal.fire({ title: 'Cancelar Cita', text: `¿Seguro que deseas cancelar la cita de ${citasDB[index].paciente}?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#c0392b', confirmButtonText: 'Sí, cancelar cita' }).then((result) => {
        if (result.isConfirmed) { citasDB[index].estado = 'Cancelada'; cargarDatosSistema(); Swal.fire('Cancelada', 'La cita fue cancelada correctamente.', 'info'); }
    });
};
window.verPerfil = function(nombre) { Swal.fire({ title: `Perfil / Historial`, text: `Estás viendo la ficha de: ${nombre}\n(Esta acción redirigiría a su expediente completo en un sistema real)`, icon: 'info' }); };

function inicializarBuscadores() {
    const buscarEnTabla = (inputId, tbodyId) => {
        const input = document.getElementById(inputId);
        if(!input) return;
        input.addEventListener('keyup', function() {
            const filtro = this.value.toLowerCase(); const filas = document.querySelectorAll(`#${tbodyId} tr`);
            filas.forEach(fila => { const texto = fila.innerText.toLowerCase(); fila.style.display = texto.includes(filtro) ? '' : 'none'; });
        });
    }
    buscarEnTabla('buscar-medico', 'tbody-medicos'); buscarEnTabla('buscar-paciente', 'tbody-pacientes');
}

function inicializarAccionesSecundarias() {
    const descargarReporteSimulado = (e) => {
        e.preventDefault();
        Swal.fire({ title: 'Generando Reporte...', html: 'Por favor espera un momento.', timer: 1500, timerProgressBar: true, didOpen: () => { Swal.showLoading(); } }).then(() => {
            const data = "ID,Nombre,Estado\n1,Prueba,Generado\n2,Sistema,CURAR"; const blob = new Blob([data], { type: 'text/csv' }); const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', 'Reporte_CURAR_2026.csv');
            document.body.appendChild(a); a.click(); document.body.removeChild(a); Swal.fire('¡Listo!', 'El reporte se ha descargado.', 'success');
        });
    };
    document.getElementById('nav-btn-reportes')?.addEventListener('click', descargarReporteSimulado);
    document.getElementById('btn-descargar-reporte-menu')?.addEventListener('click', descargarReporteSimulado);
    document.getElementById('btn-reporte-general')?.addEventListener('click', descargarReporteSimulado);
    document.getElementById('btn-backup')?.addEventListener('click', () => { Swal.fire('Backup Iniciado', 'La base de datos se está respaldando en el servidor.', 'success'); });
}
