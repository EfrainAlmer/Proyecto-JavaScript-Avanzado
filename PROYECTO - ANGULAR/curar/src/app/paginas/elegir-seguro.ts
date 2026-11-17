import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Seguro } from '../modelos/cita';
import { Flujo } from '../servicios/flujo';
@Component({
  selector: 'app-elegir-seguro', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>¿Con qué seguro te atiendes?</h1>
    <p style="margin:8px 0 24px">Paso 1 de 4 · Solo verás las sedes y médicos que te correspondan.</p>
    <div class="docs">@for (s of seguros; track s.id) {
      <article class="tabla"><h2 style="font-size:22px">{{ s.id }}</h2><p>{{ s.texto }}</p>
        <button class="btn" style="margin-top:12px" type="button" [attr.aria-pressed]="flujo.seguro() === s.id" (click)="elegir(s.id)">Elegir {{ s.id }}</button></article> }</div>
    <a routerLink="/" class="btn ghost" style="margin-top:20px">Volver</a></section>`,
})
export class ElegirSeguro {
  protected readonly flujo = inject(Flujo); private readonly router = inject(Router);
  protected readonly seguros: { id: Seguro; texto: string }[] = [{ id: 'EsSalud', texto: 'Para asegurados de EsSalud.' }, { id: 'SIS', texto: 'Seguro Integral de Salud.' }];
  protected elegir(s: Seguro): void { this.flujo.seguro.set(s); this.flujo.sede.set(null); void this.router.navigate(['/sede']); }
}
