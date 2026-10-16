import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { ResaltarEstado } from '../directivas/resaltar-estado';
import { Auth } from '../servicios/auth';
import type { EstadoCita } from '../modelos/cita';
type Filtro = 'Todas' | EstadoCita;
@Component({
  selector: 'app-citas', imports: [RouterLink, ResaltarEstado], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mis citas</h1>
    <p role="status" aria-live="polite">{{ store.activas() }} activas de {{ store.total() }} citas.</p>
    <div role="group" aria-label="Filtrar por estado" style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">
      @for (f of filtros; track f) { <button type="button" class="btn" [class.ghost]="filtro() !== f" [attr.aria-pressed]="filtro() === f" (click)="filtro.set(f)">{{ f }}</button> }
    </div>
    <p class="err" role="alert">{{ store.error() }}</p>
    @if (store.cargando()) { <p role="status">Cargando…</p> }
    @for (c of visibles(); track c.id) {
      <article [appResaltarEstado]="c.estado"><b>{{ c.fecha }} · {{ c.hora }}</b> — {{ c.seguro }}
       @let m = medico(c.medicoId);
       <br>{{ m?.nombre ?? c.medicoId }} · {{ m?.especialidad }}<br><small>{{ sede(m?.sedeId) }}@if (c.motivo) { · Motivo: {{ c.motivo }} }</small><br>
       <span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span>
        @if (c.estado === 'Pendiente' || c.estado === 'Confirmada') {
          @if (confirmando() === c.id) { <button class="btn" type="button" [disabled]="store.guardando()" (click)="cancelar(c.id)">Sí, cancelar</button> <button class="btn ghost" type="button" (click)="confirmando.set('')">No</button> }
          @else { <button class="btn ghost" type="button" (click)="confirmando.set(c.id)">Cancelar cita</button> } }
      </article>
    } @empty { @if (!store.cargando()) { <p class="tabla" role="status">No tienes citas en esta vista. <a routerLink="/reservar">Reserva una</a>.</p> } }
    <h2 style="margin-top:32px;font-size:24px">Mis médicos favoritos</h2>
    @for (f of store.favoritos(); track f.id) { <p class="tabla">{{ nombreMedico(f.medicoId) }} <a class="btn ghost" routerLink="/reservar" [queryParams]="{ medicoId: f.medicoId }">Reservar</a></p> } @empty { <p>Aún no tienes favoritos. Márcalos al reservar.</p> }</section>`,
})
export class Citas {
  protected readonly store = inject(CitasStore);
  protected readonly filtros: Filtro[] = ['Todas', 'Pendiente', 'Confirmada', 'Cancelada'];
  protected readonly filtro = signal<Filtro>('Todas'); protected readonly confirmando = signal('');
  protected readonly visibles = computed(() => this.store.citas().filter((c) => this.filtro() === 'Todas' || c.estado === this.filtro()));
  constructor() { const u = inject(Auth).usuario(); if (u) { this.store.cargarCitas(u.dni); this.store.cargarMedicos(); this.store.cargarSedes(); this.store.cargarFavoritos(u.dni); } }
  protected nombreMedico(id: string): string { return this.store.medicos().find((m) => m.id === id)?.nombre ?? id; }
  protected medico(id: string) { return this.store.medicos().find((m) => m.id === id); }
  protected sede(id?: string): string { return this.store.sedes().find((s) => s.id === id)?.nombre ?? 'Sede por asignar'; }
  protected cancelar(id: string): void { this.store.cancelar(id); this.confirmando.set(''); }
}
