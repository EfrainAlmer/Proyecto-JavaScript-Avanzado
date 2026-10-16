import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { Flujo } from '../servicios/flujo';
@Component({
  selector: 'app-elegir-sede', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Elige tu sede</h1>
    <p style="margin:8px 0 16px">Paso 2 de 4 · Seguro: <b>{{ flujo.seguro() }}</b> · <a routerLink="/seguro" class="link">cambiar</a></p>
    <div role="group" aria-label="Tipo de centro" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      @for (t of tipos; track t) { <button type="button" class="btn" [class.ghost]="tipo() !== t" [attr.aria-pressed]="tipo() === t" (click)="tipo.set(t)">{{ t }}</button> }</div>
    <p class="err" role="alert">{{ store.error() }}</p>
    <div class="docs">@for (s of sedes(); track s.id) {
      <article class="tabla"><h2 style="font-size:20px">{{ s.nombre }}</h2><span class="pill">{{ s.tipo }}</span><p style="margin:8px 0">{{ s.direccion }}</p>
        <button class="btn" type="button" (click)="elegir(s.id)">Elegir sede</button></article>
    } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando sedes…' : 'No hay sedes para ese seguro y tipo de centro.' }}</p> }</div></section>`,
})
export class ElegirSede {
  protected readonly store = inject(CitasStore); protected readonly flujo = inject(Flujo); private readonly router = inject(Router);
  protected readonly tipos = ['Todos', 'Hospitales', 'Policlínicos', 'Clínicas'];
  protected readonly tipo = signal(this.flujo.tipo() || 'Todos');
  protected readonly sedes = computed(() => this.store.sedes().filter((s) => (!this.flujo.seguro() || s.seguros.includes(this.flujo.seguro()!)) && (this.tipo() === 'Todos' || s.tipo === this.tipo())));
  constructor() { if (!this.flujo.seguro()) void this.router.navigate(['/seguro'], { replaceUrl: true }); this.store.cargarSedes(); }
  protected elegir(id: string): void { this.flujo.sede.set(id); void this.router.navigate(['/medicos']); }
}
