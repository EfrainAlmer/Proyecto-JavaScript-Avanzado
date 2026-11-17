import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import type { EstadoCita } from '../modelos/cita';
import { Auth } from '../servicios/auth';
type Filtro = 'Todas' | EstadoCita;
@Component({
  selector: 'app-gestion-citas', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Gestión de pacientes</h1>
    <p style="margin:6px 0 16px">Administra y actualiza el estado de tus citas programadas.</p>
    <div role="group" aria-label="Filtrar por estado" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      @for (f of filtros; track f) { <button type="button" class="btn" [class.ghost]="filtro() !== f" [attr.aria-pressed]="filtro() === f" (click)="filtro.set(f)">{{ f }}</button> }</div>
    <p class="err" role="alert">{{ store.error() }}</p>
    <div class="tabla" style="overflow-x:auto"><table class="table align-middle" style="margin:0">
      <caption class="visually-hidden">Citas del médico</caption>
      <thead><tr><th scope="col">Paciente</th><th scope="col">Fecha y hora</th><th scope="col">Seguro</th><th scope="col">Estado / acción</th></tr></thead>
      <tbody>@for (c of visibles(); track c.id) {
        <tr><td><b>{{ c.paciente ?? 'Paciente' }}</b><br><small>DNI {{ c.dniPaciente }}</small><br><small>Motivo: {{ c.motivo ?? 'No indicado' }}</small></td><td>{{ c.fecha }} a las {{ c.hora }}</td><td>{{ c.seguro }}</td>
          <td>@if (c.estado === 'Pendiente' || c.estado === 'Confirmada') {
              @if (confirmando() === c.id) { <button class="btn" type="button" [disabled]="store.guardando()" (click)="atender(c.id)">Confirmar atención</button> <button class="btn ghost" type="button" (click)="confirmando.set('')">No</button> }
              @else { <button class="btn ghost" type="button" (click)="confirmando.set(c.id)">Marcar atendida</button> }
            } @else { <span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span> }</td></tr>
      } @empty { <tr><td colspan="4" role="status">{{ store.cargando() ? 'Cargando…' : 'No hay citas programadas.' }}</td></tr> }</tbody></table></div>
    <p style="margin-top:20px"><a routerLink="/panel-medico" class="btn ghost">Volver a mi panel</a></p></section>`,
})
export class GestionCitas {
  protected readonly store = inject(CitasStore);
  protected readonly filtros: Filtro[] = ['Todas', 'Pendiente', 'Confirmada', 'Atendida', 'Cancelada'];
  protected readonly filtro = signal<Filtro>('Todas'); protected readonly confirmando = signal('');
  protected readonly visibles = computed(() => this.store.citasMedico().filter((c) => this.filtro() === 'Todas' || c.estado === this.filtro()));
  constructor() { const id = inject(Auth).usuario()?.medicoId; if (id) this.store.cargarCitasMedico(id); }
  protected atender(id: string): void { this.store.atender(id); this.confirmando.set(''); }
}
