import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { Flujo } from '../servicios/flujo';
@Component({
  selector: 'app-medicos', imports: [RouterLink, DecimalPipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Buscar médicos</h1>
    <p style="margin:8px 0 16px">Paso 3 de 4 · {{ flujo.seguro() }} · {{ nombreSede() }} · <a routerLink="/sede" class="link">cambiar sede</a></p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
      <label>Nombre del médico<input type="search" [value]="nombre()" (input)="nombre.set($any($event.target).value)" placeholder="Ej. Franco Espinola"></label>
      <label>Especialidad<select [value]="esp()" (change)="esp.set($any($event.target).value)"><option value="">Todas</option>
        @for (e of especialidades; track e) { <option [selected]="e === esp()">{{ e }}</option> }</select></label></div>
    <p class="err" role="alert">{{ store.error() }}</p>
    <div class="docs">
      @for (m of visibles(); track m.id) {
        <article class="doccard">
          <div class="ph">
            @if (m.foto) {
              <img [src]="m.foto" alt="" width="800" height="600" loading="lazy">
            } @else {
              <div class="avatar"></div>
            }
          </div>
          <div class="t"><h3>{{ m.nombre }}</h3>
            <small>{{ m.especialidad }} · CMP {{ m.cmp ?? 's/n' }}</small><small>Horario: {{ m.horario[0] }} – {{ m.horario[m.horario.length - 1] }}</small>
            <div class="stars">★ {{ m.calificacion | number: '1.1-1' }}</div>
            <a class="btn ghost" style="margin:12px 8px 0 0" [routerLink]="['/medicos', m.id]">Ver perfil</a>
            <a class="btn" style="margin-top:12px" routerLink="/reservar" [queryParams]="{ medicoId: m.id }">Reservar</a></div>
        </article>
      } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando médicos…' : 'No se encontraron médicos en esta sede con esos filtros.' }}</p> }
    </div></section>`,
})
export class Medicos {
  protected readonly store = inject(CitasStore); protected readonly flujo = inject(Flujo); private readonly router = inject(Router);
  protected readonly especialidades = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'];
  protected readonly nombre = signal(''); protected readonly esp = signal(this.flujo.especialidad());
  protected readonly nombreSede = computed(() => this.store.sedes().find((s) => s.id === this.flujo.sede())?.nombre ?? '');
  protected readonly visibles = computed(() => { const q = this.nombre().trim().toLocaleLowerCase('es-PE');
    return this.store.activos().filter((m) => m.sedeId === this.flujo.sede() && (!this.esp() || m.especialidad === this.esp()) && (!q || m.nombre.toLocaleLowerCase('es-PE').includes(q))); });
  constructor() {
    if (!this.flujo.seguro()) void this.router.navigate(['/seguro'], { replaceUrl: true });
    else if (!this.flujo.sede()) void this.router.navigate(['/sede'], { replaceUrl: true });
    this.store.cargarMedicos(); this.store.cargarSedes();
  }
}