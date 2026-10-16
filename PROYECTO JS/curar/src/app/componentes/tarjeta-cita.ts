import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Cita } from '../modelos/cita';

@Component({
  selector: 'app-tarjeta-cita',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="cita" [attr.data-estado]="cita().estado">
      <div class="cuando">
        <strong>{{ cita().hora }}</strong>
        <span>{{ cita().fecha | date: 'EEE d MMM' }}</span>
      </div>
      <div class="info">
        <h3>{{ titulo() }}</h3>
        @if (subtitulo()) { <p class="sub">{{ subtitulo() }}</p> }
        @if (cita().motivo) { <p class="motivo">Motivo: {{ cita().motivo }}</p> }
      </div>
      <div class="lado">
        <span class="pill" [attr.data-estado]="cita().estado">{{ cita().estado }}</span>
        <div class="acciones"><ng-content /></div>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; margin-top: 12px; }
    .cita { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; background: var(--card); border: 1px solid var(--line); border-left: 6px solid var(--line); border-radius: var(--r-md); padding: 16px 20px; }
    .cita[data-estado='Pendiente'] { border-left-color: #E0A100; }
    .cita[data-estado='Confirmada'] { border-left-color: #2F7BEA; }
    .cita[data-estado='Atendida'] { border-left-color: #198754; }
    .cita[data-estado='Cancelada'] { border-left-color: #B3261E; opacity: .75; }
    .cuando { text-align: center; min-width: 76px; padding-right: 20px; border-right: 1px solid var(--line); }
    .cuando strong { display: block; font-size: 24px; line-height: 1.1; }
    .cuando span { font-size: 13px; color: var(--slate-text); text-transform: capitalize; }
    h3 { font-size: 18px; }
    .sub, .motivo { font-size: 14px; color: var(--slate-text); margin-top: 2px; }
    .lado { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .acciones { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .acciones:empty { display: none; }
    @media (max-width: 700px) {
      .cita { grid-template-columns: auto 1fr; }
      .lado { grid-column: 1 / -1; align-items: flex-start; }
      .acciones { justify-content: flex-start; }
    }
  `,
})
export class TarjetaCita {
  readonly cita = input.required<Cita>();
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
}