import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TarjetaMedico } from '../componentes/tarjeta-medico';
import { Flujo } from '../servicios/flujo';
import { Auth } from '../servicios/auth';
import type { Seguro } from '../modelos/cita';
import { CitasStore } from '../estado/citas-store';
@Component({ selector: 'app-home', imports: [ReactiveFormsModule, RouterLink, TarjetaMedico], templateUrl: './home.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class Home {
  protected readonly store = inject(CitasStore);
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router); private readonly flujo = inject(Flujo);
  protected readonly i = signal(0);
  protected readonly n = computed(() => String(this.i() + 1).padStart(2, '0'));
  protected readonly aviso = signal('');
  protected readonly hoy = new Date().toISOString().slice(0, 10);
  protected readonly buscador = inject(FormBuilder).nonNullable.group({ seguro: 'EsSalud', centro: 'Hospitales', especialidad: 'Medicina General', fecha: '' });
  constructor() {
    this.store.cargarMedicos();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = setInterval(() => this.sig(), 6500); inject(DestroyRef).onDestroy(() => clearInterval(t)); }
  }
  protected sig(): void { this.i.update((v) => (v + 1) % 2); }
  protected buscar(): void {
    const v = this.buscador.getRawValue();
    if (!v.fecha) { this.aviso.set('Elige una fecha para ver la disponibilidad.'); return; }
    this.flujo.seguro.set(v.seguro as Seguro); this.flujo.tipo.set(v.centro); this.flujo.especialidad.set(v.especialidad); this.flujo.fecha.set(v.fecha); this.flujo.sede.set(null); void this.router.navigate(['/sede']);
  }
  protected reservar(medicoId: string): void { void this.router.navigate(['/reservar'], { queryParams: { medicoId } }); }
  protected perfil(id: string): void { void this.router.navigate(['/medicos', id]); }
}
