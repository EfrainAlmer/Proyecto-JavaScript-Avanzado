import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaCita } from '../componentes/tarjeta-cita';
import { CitasStore } from '../estado/citas-store';
import type { Cita, Receta } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
@Component({
  selector: 'app-panel-paciente', imports: [RouterLink, DatePipe, TarjetaCita], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px">
    <div class="panel-head">
      <div><h1>Hola, {{ auth.usuario()?.nombre }}</h1><p>Tus citas, recetas y familiares en un solo lugar.</p></div>
      <a class="btn" routerLink="/reservar"><i class="bi bi-calendar-plus"></i> Reservar nueva cita</a>
    </div>
    <p class="err" role="alert">{{ store.error() }}{{ error() }}</p>
    <div class="row g-3 mb-4">
      <div class="col-md-4"><div class="stat"><small>Citas activas</small><strong>{{ proximas().length }}</strong></div></div>
      <div class="col-md-4"><div class="stat ok"><small>Recetas disponibles</small><strong>{{ recetas().length }}</strong></div></div>
      <div class="col-md-4"><div class="stat violet"><small>Familiares registrados</small><strong>{{ store.familiares().length }}</strong></div></div>
    </div>
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="panel-card sep">
          <h2><i class="bi bi-calendar-check"></i>Próximas citas</h2>
          @for (c of proximas().slice(0, 3); track c.id) {
            <app-tarjeta-cita [cita]="c" [titulo]="'Dr(a). ' + (medico(c.medicoId)?.nombre ?? c.medicoId)" [subtitulo]="detalle(c)">
              @if (confirmando() === c.id) {
                <button class="btn sm" type="button" [disabled]="store.guardando()" (click)="cancelar(c.id)">Sí, cancelar</button>
                <button class="btn sm ghost" type="button" (click)="confirmando.set('')">No</button>
              } @else { <button class="btn sm ghost" type="button" (click)="confirmando.set(c.id)">Cancelar cita</button> }
            </app-tarjeta-cita>
          } @empty { <p role="status">{{ store.cargando() ? 'Cargando…' : 'No tienes citas próximas.' }} <a routerLink="/seguro" class="link">Reserva una</a>.</p> }
          <p class="mas"><a routerLink="/citas" class="link">Ver todas mis citas</a></p>
        </div>
        <div class="panel-card">
          <h2><i class="bi bi-clock-history"></i>Historial de atenciones</h2>
          <div class="table-responsive"><table class="table align-middle">
            <thead><tr><th>Fecha</th><th>Médico</th><th>Motivo</th><th></th></tr></thead>
            <tbody>
              @for (c of atendidas(); track c.id) {
                @let m = medico(c.medicoId);
                <tr><td>{{ c.fecha | date: 'd MMM y' }}</td><td>Dr(a). {{ m?.nombre ?? c.medicoId }}<br><small>{{ m?.especialidad }}</small></td><td>{{ c.motivo ?? 'Consulta médica' }}</td>
                  <td>@if (tieneReceta(c)) { <a class="btn sm ghost" routerLink="/recetas"><i class="bi bi-file-earmark-text"></i> Ver receta</a> }</td></tr>
              } @empty { <tr><td colspan="4">{{ store.cargando() ? 'Cargando…' : 'Aún no tienes atenciones registradas.' }}</td></tr> }
            </tbody></table></div>
          <p class="mas"><a routerLink="/historial" class="link">Ver historial completo</a></p>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="panel-card">
          <div class="cab"><h2><i class="bi bi-people"></i>Mis familiares</h2><a class="btn sm ghost" routerLink="/familiares">+ Agregar</a></div>
          @for (f of store.familiares(); track f.id) {
            <div class="fam"><div><b>{{ f.nombre }}</b> <small>({{ f.parentesco }})</small><br><small>DNI {{ f.dni || 'sin DNI' }} · {{ f.seguro }}</small></div><a class="btn sm ghost" routerLink="/seguro">Reservar</a></div>
          } @empty { <p role="status">{{ store.cargando() ? 'Cargando…' : 'Aún no registraste familiares.' }}</p> }
        </div>
      </div>
    </div></section>`,
  styles: `
    i.bi { margin-right: 8px; color: var(--brand); }
    .sep { margin-bottom: 24px; }
    .mas { margin-top: 12px; }
    .cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 16px; }
    .cab h2 { margin: 0; }
    .fam { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 0; border-top: 1px solid var(--line); }
  `,
})
export class PanelPaciente {
  protected readonly store = inject(CitasStore); protected readonly auth = inject(Auth);
  protected readonly recetas = signal<readonly Receta[]>([]); protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly confirmando = signal('');
  protected readonly proximas = computed(() => this.store.citas().filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)));
  protected readonly atendidas = computed(() => this.store.citas().filter((c) => c.estado === 'Atendida').sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).slice(0, 5));
  constructor() {
    const u = this.auth.usuario(); if (!u) return;
    this.store.cargarCitas(u.dni); this.store.cargarMedicos(); this.store.cargarSedes(); this.store.cargarFamiliares(u.dni);
    ejecutar(inject(CurarApi).recetas(u.dni), this.cargando, this.error, (l) => this.recetas.set(l));
  }
  protected medico(id: string) { return this.store.medicos().find((m) => m.id === id); }
  protected detalle(c: Cita): string {
    const m = this.medico(c.medicoId), sede = this.store.sedes().find((s) => s.id === m?.sedeId)?.nombre;
    return [c.familiarId && c.paciente ? `Para ${c.paciente}` : '', m?.especialidad, sede, c.seguro].filter(Boolean).join(' · ');
  }
  protected tieneReceta(c: Cita): boolean { return this.recetas().some((r) => r.medicoId === c.medicoId && r.fecha === c.fecha); }
  protected cancelar(id: string): void { this.store.cancelar(id); this.confirmando.set(''); }
}