import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { Auth } from '../servicios/auth';
import { DatePipe } from '@angular/common';
import type { EstadoCita } from '../modelos/cita';
type Filtro = 'Todas' | 'Pendiente' | 'Confirmada' | 'Atendida';
@Component({
  selector: 'app-panel-medico', imports: [RouterLink, DatePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:32px 20px 48px">
    <header class="pm-cab">
      <div>
        <h1 class="pm-saludo">{{ saludo }}, Dr(a). {{ auth.usuario()?.nombre }}</h1>
        <p class="pm-sub">
          @if (miMedico(); as m) { <span class="pm-cmp">CMP: {{ m.cmp ?? 's/n' }}</span> Servicio de {{ m.especialidad }} · {{ miSede() }} }
        </p>
      </div>
      <div class="pm-fecha"><i class="bi bi-calendar3" aria-hidden="true"></i> {{ hoy | date: "EEEE, d 'de' MMMM y" }}</div>
    </header>

    <div class="pm-stats" role="list">
      <article class="pm-stat" role="listitem"><p>Citas para hoy</p><strong>{{ paraHoy() }}</strong></article>
      <article class="pm-stat" role="listitem"><p>Pendientes</p><strong class="pend">{{ cuenta('Pendiente') }}</strong></article>
      <article class="pm-stat" role="listitem"><p>Confirmadas</p><strong class="conf">{{ cuenta('Confirmada') }}</strong></article>
      <article class="pm-stat" role="listitem"><p>Atendidas</p><strong class="aten">{{ cuenta('Atendida') }}</strong></article>
    </div>

    <p class="err" role="alert">{{ store.error() }}</p>

    <div class="pm-cols">
      <section class="pm-card" aria-labelledby="agenda-tit">
        <div class="pm-card-cab">
          <h2 id="agenda-tit"><i class="bi bi-list-check" aria-hidden="true"></i> Agenda y Gestión de Citas</h2>
          <input class="pm-buscar" type="search" placeholder="Buscar DNI o paciente…" aria-label="Buscar por DNI o paciente" [value]="q()" (input)="q.set($any($event.target).value)">
        </div>

        <div class="pm-filtros" role="group" aria-label="Filtrar por estado">
          @for (f of filtros; track f.id) {
            <button type="button" class="pm-chip" [attr.data-f]="f.id" [class.on]="filtro() === f.id" [attr.aria-pressed]="filtro() === f.id" (click)="filtro.set(f.id)">{{ f.texto }}</button>
          }
        </div>

        @for (c of visibles(); track c.id) {
          <article class="pm-cita" [attr.data-estado]="c.estado">
            <div class="pm-hora">
              <strong>{{ hora12(c.hora) }}</strong>
              <small>{{ c.fecha === hoyIso ? 'Hoy' : (c.fecha | date: 'EEE d MMM') }}</small>
              <span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span>
            </div>
            <div class="pm-pac">
              <b>{{ c.paciente ?? 'Paciente' }}</b>
              <span>DNI {{ c.dniPaciente }} · <em class="pm-seg">{{ c.seguro }}</em></span>
              <small>Motivo: {{ c.motivo ?? 'No indicado' }}</small>
            </div>
            <div class="pm-acc">
                            @if (c.estado === 'Pendiente' || c.estado === 'Confirmada') {
                @if (confirmando() === 'c:' + c.id) {
                  <button class="btn pm-b pm-rojo" type="button" [disabled]="store.guardando()" (click)="cancelar(c.id)">Sí, cancelar</button>
                  <button class="btn ghost pm-b" type="button" (click)="confirmando.set('')">No</button>
                } @else {
                  <a class="btn pm-b" [routerLink]="['/consulta', c.id]">Atender</a>
                  <button class="btn ghost pm-b pm-cancelar" type="button" (click)="confirmando.set('c:' + c.id)">Cancelar</button>
                }
              } @else if (c.estado === 'Atendida') {
                <a class="btn ghost pm-b" routerLink="/agenda"><i class="bi bi-file-earmark-text" aria-hidden="true"></i> Ver receta</a>
              }
            </div>
          </article>
        } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando…' : 'No hay citas para esta vista.' }}</p> }
      </section>

            <aside class="pm-lado">
        <article class="pm-sig" aria-live="polite">
          @if (siguiente(); as s) {
            <span class="pm-badge">SIGUIENTE PACIENTE</span>
            <h2>{{ s.paciente ?? 'Paciente' }}</h2>
            <p class="pm-sig-id">DNI: {{ s.dniPaciente }} | {{ s.seguro }}</p>
            <div class="pm-sig-datos">
              <p><i class="bi bi-clock" aria-hidden="true"></i> {{ s.fecha === hoyIso ? 'Hoy' : (s.fecha | date: 'EEE d MMM') }} · {{ hora12(s.hora) }}</p>
              <p><i class="bi bi-chat-left-text" aria-hidden="true"></i> Motivo: {{ s.motivo ?? 'No indicado' }}</p>
            </div>
            @if (confirmando() === 'a:' + s.id) {
                          <a class="btn brand pm-sig-b1" [routerLink]="['/consulta', s.id]"><i class="bi bi-clipboard2-pulse" aria-hidden="true"></i> Iniciar atención</a>
            } @else {
              <button class="btn brand pm-sig-b1" type="button" (click)="confirmando.set('a:' + s.id)"><i class="bi bi-clipboard2-pulse" aria-hidden="true"></i> Iniciar atención</button>
            }
            <a class="pm-sig-b2" routerLink="/agenda"><i class="bi bi-prescription2" aria-hidden="true"></i> Emitir receta médica</a>
            @if (restantes() > 0) { <small class="pm-sig-mas">Después de este: {{ restantes() }} {{ restantes() === 1 ? 'paciente más' : 'pacientes más' }} por atender.</small> }
          } @else {
            <span class="pm-badge pm-badge-off">SIN PENDIENTES</span>
            <h2>No tienes pacientes pendientes</h2>
            <p class="pm-sig-id">Cuando haya nuevas citas aparecerán aquí.</p>
          }
        </article>
        <p style="margin-top:16px"><a routerLink="/gestion-citas" class="btn ghost">Gestión de citas</a> <a routerLink="/agenda" class="btn ghost">Agenda y recetas</a></p>
      </aside>`,
  styles: `
    .pm-cab { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .pm-saludo { font-size: clamp(26px, 3.4vw, 36px); font-weight: 700; margin: 0; }
    .pm-sub { margin: 8px 0 0; color: var(--slate-text); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pm-cmp { background: var(--navy); color: #fff; font-size: 13px; font-weight: 700; padding: 3px 12px; border-radius: 999px; }
    .pm-fecha { display: inline-flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 10px 18px; font-weight: 700; text-transform: capitalize; box-shadow: 0 4px 12px rgb(0 11 51 / .06); }
    .pm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 800px) { .pm-stats { grid-template-columns: 1fr 1fr; } }
    .pm-stat { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 24px 16px; text-align: center; box-shadow: 0 8px 24px rgb(119 148 208 / .12); }
    .pm-stat p { margin: 0 0 4px; color: var(--slate-text); font-weight: 500; }
    .pm-stat strong { display: block; font-size: 40px; line-height: 1.1; color: var(--navy); }
    .pm-stat .pend { color: #EAB308; } .pm-stat .conf { color: #2563EB; } .pm-stat .aten { color: #198754; }

    .pm-cols { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 24px; margin-top: 24px; align-items: start; }
    @media (max-width: 1000px) { .pm-cols { grid-template-columns: 1fr; } }
    .pm-card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 24px; box-shadow: 0 8px 24px rgb(119 148 208 / .12); }
    .pm-card-cab { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .pm-card-cab h2 { font-size: 22px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px; }
    .pm-buscar { max-width: 260px; border-radius: 999px; }
    .pm-filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .pm-chip { padding: 8px 18px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); color: var(--navy); font: 600 14px var(--font); cursor: pointer; }
    .pm-chip[data-f='Pendiente'] { border-color: #F5C26B; } .pm-chip[data-f='Confirmada'] { border-color: #7AA7F0; } .pm-chip[data-f='Atendida'] { border-color: #6CC9A0; }
    .pm-chip.on { background: var(--navy); color: #fff; border-color: var(--navy); }

    .pm-cita { display: grid; grid-template-columns: 150px minmax(0, 1fr) auto; gap: 16px; align-items: center; padding: 16px 18px; margin-bottom: 12px; border: 1px solid var(--line); border-left: 6px solid #9CA3AF; border-radius: var(--r-md); background: var(--card); }
    .pm-cita[data-estado='Pendiente'] { border-left-color: #F59E0B; background: #FFFBEB; }
    .pm-cita[data-estado='Confirmada'] { border-left-color: #2563EB; background: #F5F8FF; }
    .pm-cita[data-estado='Atendida'] { border-left-color: #10B981; }
    .pm-cita[data-estado='Cancelada'] { border-left-color: #9CA3AF; opacity: .75; }
    .pm-hora { display: grid; gap: 4px; justify-items: start; }
    .pm-hora strong { font-size: 22px; }
    .pm-hora small { color: var(--slate-text); text-transform: capitalize; }
    .pm-pac { display: grid; gap: 2px; min-width: 0; }
    .pm-pac b { font-size: 17px; }
    .pm-pac span, .pm-pac small { color: var(--slate-text); }
    .pm-seg { font-style: normal; font-size: 12px; font-weight: 700; background: #DBEAFE; color: #1E40AF; padding: 1px 8px; border-radius: 6px; }
    .pm-acc { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .pm-b { border-radius: 999px; padding: 8px 18px; min-height: 40px; font-size: 14px; }
    .pm-cancelar { border-color: #E5A3A0; color: #B3261E; }
    .pm-rojo { background: #B3261E; }
        .pm-lado { position: sticky; top: 16px; }
    @media (max-width: 1000px) { .pm-lado { position: static; } }
    .pm-sig { background: var(--navy); color: #fff; border-radius: var(--r-lg); padding: 28px; display: grid; gap: 14px; box-shadow: 0 16px 40px rgb(0 11 51 / .25); }
    .pm-badge { justify-self: start; background: #FACC15; color: #1F2937; font-size: 12px; font-weight: 800; letter-spacing: .04em; padding: 5px 14px; border-radius: 999px; }
    .pm-badge-off { background: #475569; color: #fff; }
    .pm-sig h2 { color: #fff; font-size: 28px; font-weight: 700; margin: 0; }
    .pm-sig-id { color: #AEB9D6; margin: -6px 0 0; }
    .pm-sig-datos { border-top: 1px solid rgb(255 255 255 / .14); padding-top: 14px; display: grid; gap: 8px; }
    .pm-sig-datos p { margin: 0; color: #fff; display: flex; align-items: center; gap: 10px; }
    .pm-sig-datos i { color: #7DD3FC; }
    .pm-sig .btn { justify-content: center; border-radius: 999px; min-height: 48px; }
    .pm-sig-conf { display: grid; gap: 8px; }
    .pm-sig-b2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 999px; border: 1.5px solid rgb(255 255 255 / .8); background: transparent; color: #fff; font: 600 15px var(--font); text-decoration: none; cursor: pointer; }
    .pm-sig-b2:hover { background: rgb(255 255 255 / .1); }
    .pm-sig-mas { color: #AEB9D6; text-align: center; }
    @media (max-width: 640px) { .pm-cita { grid-template-columns: 1fr; } .pm-acc { justify-content: flex-start; } }
  `,
})
export class PanelMedico {
  protected readonly store = inject(CitasStore); protected readonly auth = inject(Auth);
  protected readonly q = signal(''); protected readonly filtro = signal<Filtro>('Todas'); protected readonly confirmando = signal('');
  protected readonly filtros: { id: Filtro; texto: string }[] = [{ id: 'Todas', texto: 'Todas' }, { id: 'Pendiente', texto: 'Pendientes' }, { id: 'Confirmada', texto: 'Confirmadas' }, { id: 'Atendida', texto: 'Atendidas' }];
  protected readonly hoy = new Date();
  protected readonly hoyIso = this.hoy.toLocaleDateString('sv-SE');
  protected readonly saludo = (() => { const h = this.hoy.getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; })();
  protected readonly miMedico = computed(() => this.store.medicos().find((m) => m.id === this.auth.usuario()?.medicoId));
  protected readonly miSede = computed(() => this.store.sedes().find((s) => s.id === this.miMedico()?.sedeId)?.nombre ?? 'Sede por asignar');
  protected readonly paraHoy = computed(() => this.store.citasMedico().filter((c) => c.fecha === this.hoyIso && c.estado !== 'Cancelada').length);
  protected cuenta(e: EstadoCita): number { return this.store.citasMedico().filter((c) => c.estado === e).length; }
  protected readonly visibles = computed(() => {
    const q = this.q().trim().toLocaleLowerCase('es-PE'), f = this.filtro();
    return this.store.citasMedico()
      .filter((c) => (f === 'Todas' || c.estado === f) && (!q || `${c.paciente ?? ''} ${c.dniPaciente}`.toLocaleLowerCase('es-PE').includes(q)))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  });
  protected readonly siguiente = computed(() => this.store.citasMedico().filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0]);
  constructor() {
    this.store.cargarMedicos(); this.store.cargarSedes();
    const id = this.auth.usuario()?.medicoId; if (id) this.store.cargarCitasMedico(id);
  }
    protected readonly restantes = computed(() => Math.max(0, this.store.citasMedico().filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada').length - 1));
  protected hora12(h: string): string { const [hh = '0', mm = '00'] = h.split(':'); const n = Number(hh); return `${n % 12 || 12}:${mm} ${n < 12 ? 'AM' : 'PM'}`; }
  protected atender(id: string): void { this.store.atender(id); this.confirmando.set(''); }
  protected cancelar(id: string): void { this.store.cancelarMedico(id); this.confirmando.set(''); }
}