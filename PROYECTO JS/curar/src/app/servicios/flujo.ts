import { Injectable, signal } from '@angular/core';
import type { Seguro } from '../modelos/cita';
/** Estado del flujo de reserva: seguro → sede → médicos → perfil → reservar. */
@Injectable({ providedIn: 'root' })
export class Flujo {
  readonly seguro = signal<Seguro | null>(null);
  readonly tipo = signal('');
  readonly sede = signal<string | null>(null);
  readonly especialidad = signal('');
  readonly fecha = signal('');
}
