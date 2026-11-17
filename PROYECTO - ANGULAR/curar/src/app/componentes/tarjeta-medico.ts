import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Medico } from '../modelos/cita';
import { ValoracionPipe } from '../pipes/valoracion.pipe';
@Component({
  selector: 'app-tarjeta-medico', imports: [DecimalPipe, ValoracionPipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="doccard"><div class="ph">@if (medico().foto) { <img [src]="medico().foto" alt="" width="800" height="600" loading="lazy"> } @else { <div class="avatar"></div> }</div><div class="t">
    <h3>{{ medico().nombre }}</h3><small>{{ medico().especialidad }} · {{ medico().centro }}</small>
    <div class="stars" [attr.aria-label]="'Calificación ' + medico().calificacion + ' de 5'">★ {{ medico().calificacion | number: '1.1-1' }} · {{ medico().calificacion | valoracion }}</div>
       <div class="acciones"><button class="btn ghost" type="button" [attr.aria-label]="'Ver perfil de ' + medico().nombre" (click)="perfil.emit(medico().id)">Ver perfil</button><button class="btn" type="button" [attr.aria-label]="'Reservar con ' + medico().nombre" (click)="reservar.emit(medico().id)">Reservar</button></div></div></article>`,
})
export class TarjetaMedico { readonly medico = input.required<Medico>(); readonly reservar = output<string>(); readonly perfil = output<string>(); }
