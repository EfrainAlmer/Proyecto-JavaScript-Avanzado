import type { Seguro } from './cita';

/** Estado del flujo de reserva: seguro → sede → médicos → perfil → reservar. */
export interface EstadoFlujo {
  readonly seguro: Seguro | null;
  readonly tipo: string;
  readonly sede: string | null;
  readonly especialidad: string;
  readonly fecha: string;
}

export const FLUJO_INICIAL: EstadoFlujo = { seguro: null, tipo: '', sede: null, especialidad: '', fecha: '' };
