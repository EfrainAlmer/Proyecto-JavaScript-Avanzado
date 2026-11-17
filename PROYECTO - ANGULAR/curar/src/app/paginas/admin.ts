import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitasStore } from '../estado/citas-store';
import { HORARIO_BASE, type Cita, type Medico, type Reclamo } from '../modelos/cita';
import { ejecutar } from '../servicios/carga';
import { CurarApi, type UsuarioApi } from '../servicios/curar-api';
import { capitalizarNombre, PATRON_CMP, PATRON_NOMBRE } from '../utilidades/validacion';
type Tab = 'medicos' | 'citas' | 'reclamos';
@Component({
  selector: 'app-admin', imports: [ReactiveFormsModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px">
    <div class="panel-head">
      <div><h1>Panel de Administración General</h1><p>Control central de personal, citas y gobernanza pública.</p></div>
      <button class="btn" type="button" (click)="tab.set('medicos'); nuevo()">+ Registrar Médico</button>
    </div>
    <p class="err" role="alert">{{ error() }}</p><p role="status" aria-live="polite">{{ aviso() }}</p>
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3"><div class="stat"><small>Médicos activos</small><strong>{{ medicosActivos() }}</strong></div></div>
      <div class="col-6 col-md-3"><div class="stat ok"><small>Pacientes registrados</small><strong>{{ totalPacientes() }}</strong></div></div>
      <div class="col-6 col-md-3"><div class="stat warn"><small>Citas programadas (hoy)</small><strong>{{ citasHoy() }}</strong></div></div>
      <div class="col-6 col-md-3"><div class="stat bad"><small>Reclamos pendientes</small><strong>{{ reclamosPendientes() }}</strong></div></div>
    </div>
    <div role="tablist" aria-label="Secciones" style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
      @for (t of tabs; track t.id) { <button type="button" role="tab" class="btn" [class.ghost]="tab() !== t.id" [attr.aria-selected]="tab() === t.id" (click)="tab.set(t.id)">{{ t.n }}</button> }</div>
    @switch (tab()) {
      @case ('medicos') {
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:12px"><label style="min-width:260px">Buscar médico<input type="search" [value]="qMed()" (input)="qMed.set($any($event.target).value)"></label></div>
        @if (editando()) {
          <form class="tabla" [formGroup]="form" (ngSubmit)="guardar()" novalidate style="display:grid;gap:10px;max-width:560px"><h2 style="font-size:20px">{{ editando() === 'nuevo' ? 'Registrar nuevo médico' : 'Editar médico' }}</h2>
            <label>Nombre completo<input formControlName="nombre" [attr.aria-invalid]="malo('nombre')"></label>
            <label>Especialidad<select formControlName="especialidad"><option>Medicina General</option><option>Pediatría</option><option>Cardiología</option><option>Ginecología</option><option>Geriatría</option></select></label>
            <label>Código CMP (solo se valida el formato)<input formControlName="cmp" inputmode="numeric" maxlength="6" [attr.aria-invalid]="malo('cmp')"></label>
            <label>Sede<select formControlName="sedeId"><option value="">Sin asignar</option>@for (s of store.sedes(); track s.id) { <option [value]="s.id">{{ s.nombre }}</option> }</select></label>
            <label>Estado<select formControlName="estado"><option>Activo</option><option>Inactivo</option></select></label>
            <p class="err" role="alert">@if (intento() && form.invalid) { Nombre (5+ letras) y CMP de 5 o 6 dígitos son obligatorios. }</p>
            <div style="display:flex;gap:8px"><button class="btn brand" type="submit" [disabled]="cargando()">Guardar</button><button class="btn ghost" type="button" (click)="editando.set(null)">Cancelar</button></div></form> }
        <div class="tabla" style="overflow-x:auto"><h2 style="font-size:20px;margin-bottom:12px">Médicos registrados</h2><table class="table align-middle" style="margin:0"><caption class="visually-hidden">Directorio médico</caption>
          <thead><tr><th scope="col">Médico</th><th scope="col">CMP</th><th scope="col">Especialidad</th><th scope="col">Sede</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>@for (m of medicosFiltrados(); track m.id) {
            <tr><td><b>{{ m.nombre }}</b></td><td>{{ m.cmp ?? '—' }}</td><td>{{ m.especialidad }}</td><td>{{ sedeDe(m.sedeId) }}</td><td><span class="pill" [attr.data-estado]="m.estado ?? 'Activo'">{{ m.estado ?? 'Activo' }}</span></td>
              <td><button class="btn sm ghost" type="button" (click)="editar(m)">Editar</button>
                @if (borrando() === m.id) { <button class="btn sm" type="button" [disabled]="cargando()" (click)="eliminar(m.id)">Confirmar baja</button> <button class="btn sm ghost" type="button" (click)="borrando.set('')">No</button> }
                @else { <button class="btn sm ghost" type="button" (click)="borrando.set(m.id)">Dar de baja</button> }</td></tr>
          } @empty { <tr><td colspan="6">Sin resultados.</td></tr> }</tbody></table></div>
      }
      @case ('citas') {
        <div class="tabla" style="overflow-x:auto"><h2 style="font-size:20px;margin-bottom:12px">Monitoreo global de citas</h2><table class="table align-middle" style="margin:0"><caption class="visually-hidden">Citas</caption>
          <thead><tr><th scope="col">Fecha / Hora</th><th scope="col">Paciente</th><th scope="col">Médico / Sede</th><th scope="col">Estado</th><th scope="col">Acción admin</th></tr></thead>
          <tbody>@for (c of citas(); track c.id) {
            <tr><td>{{ c.fecha }} · {{ c.hora }}</td><td>{{ c.paciente ?? 'Paciente' }}<br><small>DNI {{ c.dniPaciente }}</small></td><td>{{ nombreMedico(c.medicoId) }}<br><small>{{ sedeDeMedico(c.medicoId) }}</small></td><td><span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span></td>
              <td>@if (c.estado === 'Pendiente' || c.estado === 'Confirmada') { <button class="btn sm ghost" type="button" [disabled]="cargando()" (click)="cancelarCita(c.id)">Anular cita</button> } @else { — }</td></tr>
          } @empty { <tr><td colspan="5">No hay citas.</td></tr> }</tbody></table></div>
      }
      @case ('reclamos') {
        <div class="tabla" style="overflow-x:auto"><h2 style="font-size:20px;margin-bottom:12px">Libro de Reclamaciones (Ley N° 29733)</h2><table class="table align-middle" style="margin:0"><caption class="visually-hidden">Reclamos y quejas</caption>
          <thead><tr><th scope="col">N° de hoja</th><th scope="col">Usuario / DNI</th><th scope="col">Motivo</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
          <tbody>@for (r of reclamos(); track r.id ?? r.codigo) {
            <tr><td><b>{{ r.codigo }}</b><br><small>{{ r.fecha }}</small></td><td>{{ r.nombre }}<br><small>DNI {{ r.dni }}</small></td>
              <td><span class="pill">{{ r.tipo }}</span> {{ r.servicio }}<br><small>{{ r.detalle }}</small></td>
              <td><span class="pill" [attr.data-estado]="colorReclamo(r.estado)">{{ r.estado }}</span></td>
              <td>@if (r.estado === 'Recibido') { <button class="btn sm" type="button" [disabled]="cargando()" (click)="avanzarReclamo(r)">Iniciar revisión</button> }
                @else if (r.estado === 'En revisión') { <button class="btn sm" type="button" [disabled]="cargando()" (click)="avanzarReclamo(r)">Marcar respondido</button> }
                @else { — }</td></tr>
          } @empty { <tr><td colspan="5">{{ cargando() ? 'Cargando…' : 'Aún no hay reclamos registrados.' }}</td></tr> }</tbody></table></div>
      }
    }
  </section>`,
})
export class Admin {
  private readonly api = inject(CurarApi); protected readonly store = inject(CitasStore);
  protected readonly tabs: { id: Tab; n: string }[] = [{ id: 'medicos', n: 'Directorio de Médicos' }, { id: 'citas', n: 'Supervisión de Citas' }, { id: 'reclamos', n: 'Libro de Reclamaciones' }];
  protected readonly tab = signal<Tab>('medicos');
  protected readonly usuarios = signal<readonly UsuarioApi[]>([]); protected readonly citas = signal<readonly Cita[]>([]);
  protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly aviso = signal('');
  protected readonly qMed = signal(''); protected readonly qPac = signal(''); protected readonly intento = signal(false);
  protected readonly editando = signal<Medico | 'nuevo' | null>(null); protected readonly borrando = signal('');
  protected readonly pendientes = computed(() => this.citas().filter((c) => c.estado === 'Pendiente').length);
  protected readonly atendidas = computed(() => this.citas().filter((c) => c.estado === 'Atendida').length);
  protected readonly reclamos = signal<readonly Reclamo[]>([]);
  protected readonly hoyIso = new Date().toLocaleDateString('sv-SE');
  protected readonly medicosActivos = computed(() => this.store.medicos().filter((m) => m.estado !== 'Inactivo').length);
  protected readonly totalPacientes = computed(() => this.usuarios().filter((u) => u.rol === 1).length);
  protected readonly citasHoy = computed(() => this.citas().filter((c) => c.fecha === this.hoyIso && c.estado !== 'Cancelada').length);
  protected readonly reclamosPendientes = computed(() => this.reclamos().filter((r) => r.estado !== 'Respondido').length);
  protected readonly pacientes = computed(() => { const q = this.qPac().trim().toLocaleLowerCase('es-PE'); return this.usuarios().filter((u) => u.rol === 1 && (!q || `${u.dni} ${u.nombre}`.toLocaleLowerCase('es-PE').includes(q))); });
  protected readonly medicosFiltrados = computed(() => { const q = this.qMed().trim().toLocaleLowerCase('es-PE'); return this.store.medicos().filter((m) => !q || m.nombre.toLocaleLowerCase('es-PE').includes(q)); });
  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(5), Validators.pattern(PATRON_NOMBRE)]], especialidad: ['Medicina General'], cmp: ['', [Validators.required, Validators.pattern(PATRON_CMP)]], sedeId: [''], estado: ['Activo' as 'Activo' | 'Inactivo'] });
  protected readonly config = this.fb.nonNullable.group({ nombre: ['Centro Médico Curar'], correo: ['admin@curar.pe'] });
  constructor() {
    this.store.cargarMedicos(); this.store.cargarSedes();
    ejecutar(this.api.todosUsuarios(), this.cargando, this.error, (l) => this.usuarios.set(l));
    ejecutar(this.api.todasCitas(), this.cargando, this.error, (l) => this.citas.set(l));
    ejecutar(this.api.reclamos(), this.cargando, this.error, (l) => this.reclamos.set(l));
  }
  protected malo(c: 'nombre' | 'cmp'): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected citasDe(dni: string): number { return this.citas().filter((c) => String(c.dniPaciente) === String(dni)).length; }
  protected nombreMedico(id: string): string { return this.store.medicos().find((m) => m.id === id)?.nombre ?? id; }
  protected nuevo(): void { this.intento.set(false); this.form.reset(); this.editando.set('nuevo'); }
  protected editar(m: Medico): void { this.intento.set(false); this.form.setValue({ nombre: m.nombre, especialidad: m.especialidad, cmp: m.cmp ?? '', sedeId: m.sedeId ?? '', estado: m.estado ?? 'Activo' }); this.editando.set(m); }
  protected guardar(): void {
    this.intento.set(true); this.aviso.set(''); const e = this.editando();
    if (this.form.invalid || !e || this.cargando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue(), centro = this.store.sedes().find((s) => s.id === v.sedeId)?.tipo ?? 'Por asignar', nombre = capitalizarNombre(v.nombre);
    const cerrar = (): void => { this.editando.set(null); this.aviso.set('Médico guardado.'); };
    if (e === 'nuevo') {
      const id = `m${v.cmp}`;
      if (this.store.medicos().some((m) => m.id === id)) { this.error.set('Ya existe un médico con ese CMP.'); return; }
      ejecutar(this.api.altaMedico({ id, nombre, especialidad: v.especialidad, calificacion: 0, centro, horario: [...HORARIO_BASE], sedeId: v.sedeId, cmp: v.cmp, estado: v.estado }), this.cargando, this.error, (n) => { this.store.medicos.update((l) => [...l, n]); cerrar(); });
    } else {
      ejecutar(this.api.guardarMedico({ ...e, nombre, especialidad: v.especialidad, centro, sedeId: v.sedeId, cmp: v.cmp, estado: v.estado }), this.cargando, this.error, (n) => { this.store.medicos.update((l) => l.map((x) => (x.id === n.id ? n : x))); cerrar(); });
    }
  }
  protected eliminar(id: string): void { ejecutar(this.api.eliminarMedico(id), this.cargando, this.error, () => { this.store.medicos.update((l) => l.filter((m) => m.id !== id)); this.borrando.set(''); this.aviso.set('Médico dado de baja.'); }); }
  protected cancelarCita(id: string): void { ejecutar(this.api.cancelar(id), this.cargando, this.error, (n) => this.citas.update((l) => l.map((c) => (c.id === id ? n : c)))); }
  protected sedeDe(id?: string): string { return this.store.sedes().find((s) => s.id === id)?.nombre ?? 'Sin asignar'; }
  protected colorReclamo(e: Reclamo['estado']): string { return e === 'Recibido' ? 'Pendiente' : e === 'En revisión' ? 'Confirmada' : 'Atendida'; }
  protected avanzarReclamo(r: Reclamo): void {
    if (!r.id || r.estado === 'Respondido') return;
    const estado = r.estado === 'Recibido' ? 'En revisión' : 'Respondido';
    ejecutar(this.api.actualizarReclamo(r.id, { estado }), this.cargando, this.error, (n) => this.reclamos.update((l) => l.map((x) => (x.id === n.id ? n : x))));
  }
  protected sedeDeMedico(id: string): string { return this.sedeDe(this.store.medicos().find((m) => m.id === id)?.sedeId); }
}