import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import type { Receta } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
type Tipo = 'Todos' | 'Atención' | 'Receta';
interface Item { readonly id: string; readonly fecha: string; readonly tipo: 'Atención' | 'Receta'; readonly paciente: string; readonly medico: string; readonly detalle: string }
@Component({
  selector: 'app-historial', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Historial médico</h1>
    <p style="margin:6px 0 16px">Atenciones recibidas y recetas emitidas, de la más reciente a la más antigua.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:16px">
      <div role="group" aria-label="Tipo de registro" style="display:flex;gap:8px">
        @for (t of tipos; track t) { <button type="button" class="btn" [class.ghost]="tipo() !== t" [attr.aria-pressed]="tipo() === t" (click)="tipo.set(t)">{{ t }}</button> }</div>
      <label style="min-width:220px">Paciente<select [value]="quien()" (change)="quien.set($any($event.target).value)"><option value="">Todos</option>
        @for (n of nombres(); track n) { <option [selected]="n === quien()">{{ n }}</option> }</select></label></div>
    <p class="err" role="alert">{{ store.error() }}{{ error() }}</p>
    @for (i of visibles(); track i.id) {
      <article class="tabla"><span class="pill">{{ i.tipo }}</span> <b>{{ i.fecha }}</b> · {{ i.paciente }}<br>{{ i.medico }}<br><small>{{ i.detalle }}</small></article>
    } @empty { <p class="tabla" role="status">{{ cargando() || store.cargando() ? 'Cargando…' : 'Aún no hay registros en tu historial.' }}</p> }
    <p style="margin-top:16px"><a routerLink="/recetas" class="btn ghost">Ver solo recetas</a></p></section>`,
})
export class Historial {
  protected readonly store = inject(CitasStore);
  protected readonly tipos: Tipo[] = ['Todos', 'Atención', 'Receta'];
  protected readonly tipo = signal<Tipo>('Todos'); protected readonly quien = signal('');
  protected readonly recetas = signal<readonly Receta[]>([]); protected readonly cargando = signal(false); protected readonly error = signal('');
  private readonly items = computed<Item[]>(() => {
    const nombreMedico = (id: string): string => this.store.medicos().find((m) => m.id === id)?.nombre ?? id;
    const atenciones = this.store.citas().filter((c) => c.estado === 'Atendida').map((c): Item => ({ id: `c${c.id}`, fecha: c.fecha, tipo: 'Atención', paciente: c.paciente ?? 'Titular', medico: nombreMedico(c.medicoId), detalle: c.motivo ?? 'Consulta médica' }));
    const recetas = this.recetas().map((r): Item => ({ id: `r${r.id ?? r.fecha + r.medicamento}`, fecha: r.fecha, tipo: 'Receta', paciente: r.paciente || 'Titular', medico: `Dr(a). ${r.medicoNombre}`, detalle: `${r.medicamento} — ${r.cantidad} envase(s). ${r.indicaciones}` }));
    return [...atenciones, ...recetas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  });
  protected readonly nombres = computed(() => [...new Set(this.items().map((i) => i.paciente))]);
  protected readonly visibles = computed(() => this.items().filter((i) => (this.tipo() === 'Todos' || i.tipo === this.tipo()) && (!this.quien() || i.paciente === this.quien())));
  constructor() {
    const u = inject(Auth).usuario(); if (!u) return;
    this.store.cargarMedicos(); this.store.cargarCitas(u.dni);
    ejecutar(inject(CurarApi).recetas(u.dni), this.cargando, this.error, (l) => this.recetas.set(l));
  }
}
