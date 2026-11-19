import { normalizar } from './texto';
import type { Cita, EstadoCita, Medico, Sede } from '../types/cita';

export type FiltroEstado = 'Todas' | EstadoCita;
export type Orden = 'recientes' | 'antiguas';

export interface FiltrosCitas {
  readonly texto: string;
  readonly estado: FiltroEstado;
  readonly orden: Orden;
}

/** Datos de una fila ya resueltos (médico y sede), para no buscarlos en cada render de la fila. */
export interface FilaCita {
  readonly cita: Cita;
  readonly medico: string;
  readonly sede: string;
}

/** Índices para consultar médico y sede en O(1) en lugar de recorrer la lista por cada cita. */
export function indexar(medicos: readonly Medico[], sedes: readonly Sede[]) {
  const sedesPorId = new Map(sedes.map((s) => [s.id, s.nombre]));
  const medicosPorId = new Map(medicos.map((m) => [m.id, { nombre: m.nombre, sede: sedesPorId.get(m.sedeId ?? '') ?? 'Sin asignar' }]));
  return medicosPorId;
}

/** Función pura (testeable): filtra por texto y estado y ordena por fecha + hora. No muta `citas`. */
export function filtrarCitas(
  citas: readonly Cita[],
  filtros: FiltrosCitas,
  medicosPorId: ReadonlyMap<string, { readonly nombre: string; readonly sede: string }>,
): FilaCita[] {
  const q = normalizar(filtros.texto); // una sola vez, no por cada cita
  const filas: FilaCita[] = [];
  for (const cita of citas) {
    if (filtros.estado !== 'Todas' && cita.estado !== filtros.estado) continue;
    const info = medicosPorId.get(cita.medicoId);
    const medico = info?.nombre ?? cita.medicoId;
    if (q && !normalizar(`${cita.paciente ?? ''} ${cita.dniPaciente} ${medico}`).includes(q)) continue;
    filas.push({ cita, medico, sede: info?.sede ?? 'Sin asignar' });
  }
  const signo = filtros.orden === 'recientes' ? -1 : 1;
  return filas.sort((a, b) => signo * (a.cita.fecha + a.cita.hora).localeCompare(b.cita.fecha + b.cita.hora)); // `filas` es una copia local
}
