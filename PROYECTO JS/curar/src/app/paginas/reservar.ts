import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import type { Seguro } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
import { Flujo } from '../servicios/flujo';
import { ValoracionPipe } from '../pipes/valoracion.pipe';

type Paso = 1 | 2 | 3 | 4 | 5;
const ESPECIALIDADES = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ANTICIPACION = 3; // regla Curar: máximo 3 días de anticipación
const iso = (d: Date): string => d.toLocaleDateString('sv-SE');
const esSeguro = (s: string | null | undefined): s is Seguro => s === 'EsSalud' || s === 'SIS';

@Component({
  selector: 'app-reservar', imports: [RouterLink, DatePipe, DecimalPipe, ValoracionPipe], changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrarPerfil()' },
  template: `<section class="wrap" style="padding:32px 20px 48px">
    <div class="top">
      <a class="btn ghost sm pillbtn" routerLink="/panel"><i class="bi bi-arrow-left"></i> Volver a mis citas</a>
      <span class="chip">Reserva de Cita</span>
    </div>
    <div class="panel-card card">
      <h1>Reserva de cita médica</h1>
      @if (paso() < 5) { <p class="visually-hidden" role="status">Paso {{ paso() }} de 4</p> }

      @switch (paso()) {
        @case (1) {
          <h2 class="step">Paso 1: Seleccione su seguro y especialidad</h2>
          @if (store.familiares().length) {
            <label class="campo">¿Para quién es la cita?
              <select (change)="elegirPara($any($event.target).value)">
                <option value="" [selected]="!para()">Para mí ({{ auth.usuario()?.nombre }})</option>
                @for (f of store.familiares(); track f.id) { <option [value]="f.id" [selected]="f.id === para()">{{ f.nombre }} ({{ f.parentesco }})</option> }
              </select></label>
          }
          <div class="seg" role="group" aria-label="Seguro">
            @for (s of seguros; track s.id) {
              <button type="button" class="opt" [class.on]="seguro() === s.id" [attr.aria-pressed]="seguro() === s.id" (click)="elegirSeguro(s.id)">
                <i [class]="'bi ' + s.icono + ' ' + s.clase" aria-hidden="true"></i><b>{{ s.id }}</b>
              </button>
            }
          </div>
          <label class="campo">Especialidad médica
            <select class="big" (change)="elegirEspecialidad($any($event.target).value)">
              @for (e of especialidades; track e) { <option [selected]="e === especialidad()">{{ e }}</option> }
            </select></label>
          <div class="nav"><button class="btn pillbtn der" type="button" (click)="ir(2)">Siguiente →</button></div>
        }

        @case (2) {
          <h2 class="step">Paso 2: Seleccione la sede o centro de salud</h2>
          <div class="lista" role="group" aria-label="Sede o centro de salud">
            @for (s of sedes(); track s.id) {
              <button type="button" class="fila" [class.on]="sedeId() === s.id" [attr.aria-pressed]="sedeId() === s.id" (click)="elegirSede(s.id)">
                <span class="radio" aria-hidden="true"></span>
                <span><b>{{ s.nombre }}</b><small>{{ s.direccion }}</small></span>
              </button>
            } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando sedes…' : 'No hay sedes con ' + seguro() + ' que atiendan ' + especialidad() + '. Vuelve atrás y prueba otra combinación.' }}</p> }
          </div>
          <div class="nav">
            <button class="btn ghost pillbtn" type="button" (click)="ir(1)">← Anterior</button>
            <button class="btn pillbtn der" type="button" [disabled]="!sedeId()" (click)="ir(3)">Siguiente →</button>
          </div>
        }

        @case (3) {
          <h2 class="step">Paso 3: Seleccione al profesional de la salud</h2>
          <div class="lista">
            @for (m of medicos(); track m.id) {
              <div class="medfila">
                <button type="button" class="fila" [class.on]="medicoId() === m.id" [attr.aria-pressed]="medicoId() === m.id" (click)="elegirMedico(m.id)">
                  <span><b>Dr(a). {{ m.nombre }}</b><small>CMP: {{ m.cmp ?? 's/n' }} | {{ m.especialidad }} (★ {{ m.calificacion | number: '1.1-1' }})</small></span>
                  @if (medicoId() === m.id) { <span class="sel">Seleccionado</span> }
                </button>
                <button type="button" class="accion" (click)="verPerfil(m.id)"><i class="bi bi-person-circle" aria-hidden="true"></i> Ver perfil</button>
<button type="button" class="accion" [class.fav]="esFav(m.id)" [attr.aria-pressed]="esFav(m.id)" [disabled]="store.guardando()" (click)="alternarFav(m.id)"><i [class]="esFav(m.id) ? 'bi bi-star-fill' : 'bi bi-star'" aria-hidden="true"></i> Favorito</button>
              </div>
            } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando médicos…' : 'No hay médicos de ' + especialidad() + ' en esta sede.' }}</p> }
          </div>
          <div class="nav">
            <button class="btn ghost pillbtn" type="button" (click)="ir(2)">← Anterior</button>
            <button class="btn pillbtn der" type="button" [disabled]="!medicoId()" (click)="ir(4)">Siguiente →</button>
          </div>
        }

        @case (4) {
          <h2 class="step">Paso 4: Escoge fecha y hora</h2>
          <div class="alert alert-warning py-2 px-3 small mb-3" role="note">
            <i class="bi bi-info-circle-fill me-1"></i><strong>Regla Curar:</strong> Solo se permite agendar citas con un máximo de <strong>3 días de anticipación</strong>.
          </div>
          @if (medico(); as m) { <p class="resumen">Dr(a). {{ m.nombre }} · {{ sede()?.nombre }} · {{ seguro() }}</p> }

          <p class="etq">Días disponibles:</p>
          <div class="dias" role="group" aria-label="Días disponibles">
            @for (d of dias; track d.iso) {
              <button type="button" class="dia" [class.on]="dia() === d.iso" [disabled]="d.bloqueado" [attr.aria-pressed]="dia() === d.iso" (click)="elegirDia(d.iso)">
                <strong>{{ d.n }} {{ d.num }}</strong><small>{{ d.bloqueado ? 'Bloqueado' : d.etiqueta }}</small>
              </button>
            }
          </div>

          <p class="etq">Horarios libres:</p>
          <div class="horas" role="group" aria-label="Horarios libres">
            @for (h of libres(); track h) {
              <button type="button" class="hora" [class.on]="hora() === h" [attr.aria-pressed]="hora() === h" (click)="hora.set(h)">{{ h }}</button>
            } @empty { <p class="tabla" role="status" style="grid-column:1/-1;margin:0">{{ cargandoHoras() ? 'Buscando horarios…' : 'No hay horarios libres este día. Elige otro día.' }}</p> }
          </div>
          <p class="err" role="alert">{{ errHoras() }}</p>

          <label class="campo">Motivo de consulta
            <input [value]="motivo()" (input)="motivo.set($any($event.target).value)" maxlength="120" placeholder="Ej. Dolor de cabeza" [attr.aria-invalid]="intento() && motivo().trim().length < 3"></label>
          <p class="err" role="alert">@if (intento() && !hora()) { Elige un horario. } @else if (intento() && motivo().trim().length < 3) { Escribe el motivo de tu consulta (mínimo 3 letras). }</p>
          <p class="err" role="alert">{{ store.error() }}</p>

          <div class="nav">
            <button class="btn ghost pillbtn" type="button" (click)="ir(3)">← Anterior</button>
            <button class="btn pillbtn confirmar der" type="button" [disabled]="store.guardando() || cargandoHoras()" (click)="confirmar()">{{ store.guardando() ? 'Reservando…' : 'Confirmar Reserva' }}</button>
          </div>
        }

        @case (5) {
          <div class="ok" role="status">
            <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
            <h2>¡Cita confirmada exitosamente!</h2>
            <p>Se ha agregado a tus citas pendientes.</p>
            @if (medico(); as m) {
              <div class="tabla ficha">
                <b>Dr(a). {{ m.nombre }}</b><span>{{ m.especialidad }} · {{ sede()?.nombre }}</span>
                <span>{{ dia() | date: 'EEEE d' }} de {{ dia() | date: 'MMMM' }} · {{ hora() }}</span>
                <span>Paciente: {{ familiar()?.nombre ?? auth.usuario()?.nombre }} · {{ seguro() }}</span>
              </div>
            }
            <div class="nav centro">
              <a class="btn pillbtn" routerLink="/citas">Ver mis citas</a>
              <a class="btn ghost pillbtn" routerLink="/panel">Volver a mi panel</a>
              <button class="btn ghost pillbtn" type="button" (click)="nueva()">Reservar otra cita</button>
            </div>
          </div>
        }
      }
    </div>

    @if (perfil(); as p) {
      <div class="overlay" (click)="cerrarPerfil()">
        <div class="ventana" role="dialog" aria-modal="true" aria-labelledby="perfil-tit" (click)="$event.stopPropagation()">
          <button type="button" class="cerrar" aria-label="Cerrar perfil" (click)="cerrarPerfil()">✕</button>
          <div class="cab">
            @if (p.foto) { <img class="foto" [src]="p.foto" [alt]="'Foto de ' + p.nombre" width="96" height="96"> } @else { <div class="avatar" style="width:96px;height:96px"></div> }
            <div>
              <h2 id="perfil-tit" style="font-size:24px">Dr(a). {{ p.nombre }}</h2>
              <p>{{ p.especialidad }} · CMP {{ p.cmp ?? 's/n' }}</p>
              <p class="stars">★ {{ p.calificacion | number: '1.1-1' }} · {{ p.calificacion | valoracion }}</p>
            </div>
          </div>
          <h3>Formación y experiencia</h3>
          <p>{{ p.universidad ?? 'No registrada' }}</p>
          <p>{{ p.experiencia ?? 'Sin información adicional.' }}</p>
          <h3>Reconocimientos</h3>
          @for (r of p.reconocimientos ?? []; track r) { <p>★ {{ r }}</p> } @empty { <p>Aún no hay reconocimientos registrados.</p> }
          <h3>Sede y horario</h3>
          <p>{{ nombreSede(p.sedeId) }}</p>
          <p>Horario: {{ p.horario.join(' · ') }}</p>
        </div>
      </div>
    }
  </section>`,
  styles: `
    :host { --acc: #0369a1; display: block; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    .pillbtn { border-radius: 999px; padding-inline: 24px; }
    .chip { font-size: 13px; font-weight: 600; background: var(--card); border: 1px solid var(--line); padding: 4px 12px; border-radius: 6px; }
    .card { padding: clamp(22px, 5vw, 48px); }
    h1 { font-size: clamp(26px, 3.4vw, 34px); font-weight: 700; margin-bottom: 24px; }
    .step { font-size: 22px; font-weight: 700; color: var(--acc); margin-bottom: 16px; }
    .campo { font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 20px; }
    .big { font-size: 17px; padding: 14px 16px; }
    .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    @media (max-width: 560px) { .seg { grid-template-columns: 1fr; } }
    .opt { display: grid; justify-items: center; gap: 6px; padding: 24px 16px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); cursor: pointer; font: inherit; color: var(--navy); }
    .opt i { font-size: 30px; }
    .opt .es { color: var(--acc); } .opt .sis { color: #198754; }
    .opt.on, .fila.on { background: #F1F5FD; border-color: var(--acc); box-shadow: 0 0 0 1px var(--acc); }
    .lista { display: grid; gap: 10px; margin-bottom: 24px; }
    .fila { flex: 1; display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 16px 18px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); cursor: pointer; font: inherit; color: var(--navy); }
    .fila small { display: block; color: var(--slate-text); font-size: 14px; }
    .radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--slate); flex: none; display: grid; place-items: center; }
    .fila.on .radio { border-color: var(--acc); }
    .fila.on .radio::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--acc); }
    .sel { margin-left: auto; background: var(--acc); color: #fff; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 999px; }
    .medfila { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.medfila .fila { flex: 1 1 320px; width: auto; }
.accion { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); color: var(--navy); font: 600 14px var(--font); cursor: pointer; transition: background .15s, border-color .15s; }
.accion i { font-size: 15px; }
.accion:hover { background: #F1F5FD; border-color: var(--acc); }
.accion:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.accion:disabled { opacity: .6; cursor: not-allowed; }
.accion.fav { background: #FFF8E6; border-color: #F5C26B; color: #92400E; }
    .resumen { color: var(--slate-text); margin-bottom: 16px; font-size: 14px; }
    .etq { font-weight: 600; margin: 0 0 8px; }
    .dias { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 24px; }
    .dia { min-width: 96px; padding: 10px 16px; text-align: center; background: var(--card); border: 1px solid #cbd5e1; border-radius: 12px; cursor: pointer; font: inherit; color: var(--navy); line-height: 1.35; }
    .dia small { display: block; font-size: 13px; }
    .dia.on { background: var(--navy); color: #fff; border-color: var(--navy); }
    .dia:disabled { background: #F1F5F9; color: #5B6672; border-style: dashed; cursor: not-allowed; }
    .dia:disabled small { color: #B3261E; }
    .horas { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px; }
    .hora { padding: 12px; text-align: center; background: var(--card); border: 1px solid #cbd5e1; border-radius: 10px; font: 600 15px var(--font); color: var(--navy); cursor: pointer; }
    .hora:hover, .hora.on { background: var(--acc); color: #fff; border-color: var(--acc); }
    .nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    .nav.centro { justify-content: center; margin-top: 20px; }
    .der { margin-left: auto; }
    .confirmar { background: #198754; }
    .ok { text-align: center; display: grid; justify-items: center; gap: 10px; }
    .ok > i { font-size: 56px; color: #198754; }
    .ficha { display: grid; gap: 4px; text-align: left; margin-top: 10px; min-width: min(420px, 100%); }
    .overlay { position: fixed; inset: 0; z-index: 1000; background: rgb(0 11 51 / .55); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
    .ventana { position: relative; width: min(640px, 100%); max-height: 90vh; overflow-y: auto; background: var(--card); border-radius: var(--r-lg); padding: 28px; box-shadow: 0 30px 60px rgb(0 11 51 / .3); }
    .cerrar { position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--card); color: var(--navy); font-size: 18px; cursor: pointer; }
    .cab { display: flex; gap: 20px; align-items: center; margin: 8px 44px 16px 0; }
    .foto { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; flex: none; }
    .ventana h3 { font-size: 18px; margin: 16px 0 4px; }
  `,
})
export class Reservar {
  protected readonly store = inject(CitasStore); protected readonly auth = inject(Auth);
  private readonly api = inject(CurarApi); private readonly flujo = inject(Flujo);
  private readonly q = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly especialidades = ESPECIALIDADES;
  protected readonly seguros: { id: Seguro; icono: string; clase: string }[] = [{ id: 'EsSalud', icono: 'bi-hospital', clase: 'es' }, { id: 'SIS', icono: 'bi-heart-pulse', clase: 'sis' }];
  protected readonly hoy = iso(new Date());
  private readonly ahora = new Date().toTimeString().slice(0, 5);
  protected readonly dias = Array.from({ length: ANTICIPACION + 1 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { iso: iso(d), n: DIAS[d.getDay()], num: d.getDate(), etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `En ${i} días`, bloqueado: d.getDay() === 0 }; // domingos sin atención
  });
  protected readonly paso = signal<Paso>(1);
  protected readonly perfilId = signal('');
  protected readonly perfil = computed(() => this.store.medicos().find((m) => m.id === this.perfilId()));
  protected nombreSede(id?: string): string { return this.store.sedes().find((s) => s.id === id)?.nombre ?? 'Sede por asignar'; }
  protected verPerfil(id: string): void { this.perfilId.set(id); }
  protected cerrarPerfil(): void { this.perfilId.set(''); }
  protected readonly seguro = signal<Seguro>(this.flujo.seguro() ?? 'EsSalud');
  protected readonly especialidad = signal(ESPECIALIDADES.includes(this.flujo.especialidad()) ? this.flujo.especialidad() : 'Medicina General');
  protected readonly para = signal(''); protected readonly sedeId = signal(''); protected readonly medicoId = signal('');
  protected readonly dia = signal(this.dias.find((d) => !d.bloqueado)?.iso ?? ''); protected readonly hora = signal(''); protected readonly motivo = signal('');
  protected readonly ocupadas = signal<string[]>([]); protected readonly cargandoHoras = signal(false); protected readonly errHoras = signal(''); protected readonly intento = signal(false);
  protected readonly sedes = computed(() => this.store.sedes().filter((s) => s.seguros.includes(this.seguro()) && this.store.activos().some((m) => m.sedeId === s.id && m.especialidad === this.especialidad())));
  protected readonly medicos = computed(() => this.store.activos().filter((m) => m.sedeId === this.sedeId() && m.especialidad === this.especialidad()));
  protected readonly medico = computed(() => this.store.medicos().find((m) => m.id === this.medicoId()));
  protected readonly sede = computed(() => this.store.sedes().find((s) => s.id === this.sedeId()));
  protected readonly familiar = computed(() => this.store.familiares().find((f) => f.id === this.para()));
  protected readonly libres = computed(() => [...(this.medico()?.horario ?? [])].sort().filter((h) => !this.ocupadas().includes(h) && !(this.dia() === this.hoy && h <= this.ahora)));
  private readonly clave = computed(() => `${this.medicoId()}|${this.dia()}`);
  private precargado = false; private paraAplicado = false;
  constructor() {
    this.store.error.set(''); this.store.cargarMedicos(); this.store.cargarSedes();
    const u = this.auth.usuario(); if (u) { this.store.cargarFavoritos(u.dni); this.store.cargarFamiliares(u.dni); }
    effect(() => { // ?medicoId=… (perfil, favoritos o buscador público) salta directo al paso 4
      const id = this.q.get('medicoId'), medicos = this.store.medicos(), sedes = this.store.sedes();
      if (this.precargado || !id || !medicos.length || !sedes.length) return;
      this.precargado = true;
      const m = medicos.find((x) => x.id === id); if (!m) return;
      const s = sedes.find((x) => x.id === m.sedeId), sq = this.q.get('seguro');
      this.seguro.set(esSeguro(sq) ? sq : s && !s.seguros.includes(this.seguro()) ? (s.seguros[0] ?? this.seguro()) : this.seguro());
      this.especialidad.set(m.especialidad); this.sedeId.set(m.sedeId ?? ''); this.medicoId.set(m.id);
      const f = this.q.get('fecha') ?? this.flujo.fecha(), d = this.dias.find((x) => x.iso === f && !x.bloqueado); if (d) this.dia.set(d.iso);
      this.paso.set(4);
    });
    effect(() => { // ?para=<id de familiar> (botón "Reservar" de Mis familiares)
      const f = this.store.familiares().find((x) => x.id === this.q.get('para'));
      if (this.paraAplicado || !f) return;
      this.paraAplicado = true; this.para.set(f.id ?? '');
      if (!this.q.get('medicoId') && esSeguro(f.seguro)) this.seguro.set(f.seguro);
    });
    effect(() => { // horas libres reales = horario del médico − citas activas de ese día
      const clave = this.clave(), [id, fecha] = clave.split('|'); this.ocupadas.set([]);
      if (id && fecha) ejecutar(this.api.ocupadas(id, fecha), this.cargandoHoras, this.errHoras, (l) => { if (this.clave() === clave) this.ocupadas.set(l); });
    });
  }
  protected esFav(id: string): boolean { return this.store.favoritos().some((f) => f.medicoId === id); }
  protected alternarFav(id: string): void { const u = this.auth.usuario(); if (u) this.store.alternarFavorito(u.dni, id); }
  private reiniciar(): void { this.sedeId.set(''); this.medicoId.set(''); this.hora.set(''); }
  protected elegirSeguro(s: Seguro): void { if (s !== this.seguro()) { this.seguro.set(s); this.reiniciar(); } }
  protected elegirEspecialidad(e: string): void { if (e !== this.especialidad()) { this.especialidad.set(e); this.reiniciar(); } }
  protected elegirPara(id: string): void { this.para.set(id); const f = this.familiar(); if (f && esSeguro(f.seguro)) this.elegirSeguro(f.seguro); }
  protected elegirSede(id: string): void { if (id !== this.sedeId()) { this.sedeId.set(id); this.medicoId.set(''); this.hora.set(''); } }
  protected elegirMedico(id: string): void { this.medicoId.set(id); this.hora.set(''); }
  protected elegirDia(d: string): void { this.dia.set(d); this.hora.set(''); }
  protected ir(p: Paso): void {
    if (p === 2 && !this.sedeId() && this.sedes().length === 1) this.sedeId.set(this.sedes()[0]!.id); // una sola opción: ya queda elegida
    if (p === 3 && !this.medicoId() && this.medicos().length === 1) this.medicoId.set(this.medicos()[0]!.id);
    this.store.error.set(''); this.paso.set(p); window.scrollTo(0, 0);
  }
  protected confirmar(): void {
    this.intento.set(true);
    const u = this.auth.usuario(), m = this.medico(), motivo = this.motivo().trim();
    if (!u || !m || !this.dia() || !this.hora() || motivo.length < 3) return;
    if (!this.libres().includes(this.hora())) { this.store.error.set('Esa hora ya no está disponible. Elige otra.'); this.hora.set(''); return; }
    const fam = this.familiar();
    this.store.reservar({ dniPaciente: u.dni, paciente: fam?.nombre ?? u.nombre, medicoId: m.id, seguro: this.seguro(), fecha: this.dia(), hora: this.hora(), motivo, ...(fam?.id ? { familiarId: fam.id } : {}) },
      () => { this.paso.set(5); window.scrollTo(0, 0); });
  }
  protected nueva(): void { this.reiniciar(); this.motivo.set(''); this.intento.set(false); this.paso.set(1); window.scrollTo(0, 0); }
}