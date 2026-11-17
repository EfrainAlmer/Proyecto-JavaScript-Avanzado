import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Receta } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
@Component({
  selector: 'app-recetas', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mis recetas médicas</h1>
    <p class="err" role="alert">{{ error() }}</p>
    @if (cargando()) { <p role="status">Cargando…</p> }
    @for (r of recetas(); track r.id) {
      <article class="tabla"><b>{{ r.fecha }}</b> · Dr(a). {{ r.medicoNombre }}<br>{{ r.medicamento }} — {{ r.cantidad }} envase(s)<br><small>{{ r.indicaciones }}</small></article>
    } @empty { @if (!cargando()) { <p class="tabla" role="status">Aún no tienes recetas registradas.</p> } }</section>`,
})
export class Recetas {
  protected readonly recetas = signal<readonly Receta[]>([]); protected readonly cargando = signal(false); protected readonly error = signal('');
  constructor() { const u = inject(Auth).usuario(); if (u) ejecutar(inject(CurarApi).recetas(u.dni), this.cargando, this.error, (l) => this.recetas.set([...l].reverse())); }
}
