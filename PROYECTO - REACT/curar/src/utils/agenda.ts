import type { Cita } from '../types/cita';

const momento = (c: Cita): string => `${c.fecha} ${c.hora}`;

/**
 * Orden de agenda: primero lo que viene (de hoy en adelante, de la más cercana a la más lejana) y después
 * el historial (de la más reciente a la más antigua). Ordenar todo ascendente dejaba al inicio citas de meses atrás.
 * Devuelve un arreglo nuevo: no muta la entrada.
 */
export function ordenarAgenda(citas: readonly Cita[], hoyIso: string): Cita[] {
  const proximas = citas.filter((c) => c.fecha >= hoyIso).toSorted((a, b) => momento(a).localeCompare(momento(b)));
  const pasadas = citas.filter((c) => c.fecha < hoyIso).toSorted((a, b) => momento(b).localeCompare(momento(a)));
  return [...proximas, ...pasadas];
}

/** Siguiente cita por atender: la más cercana de hoy en adelante que siga Pendiente o Confirmada. */
export const porAtenderDesde = (citas: readonly Cita[], hoyIso: string): Cita[] =>
  citas
    .filter((c) => (c.estado === 'Pendiente' || c.estado === 'Confirmada') && c.fecha >= hoyIso)
    .toSorted((a, b) => momento(a).localeCompare(momento(b)));
