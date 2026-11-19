import type { Cita, Familiar, Favorito, Medico, Sede } from '../types/cita';

/** Estado del almacén de citas (equivale al antiguo `CitasStore` de Angular). */
export interface EstadoCitas {
  readonly medicos: readonly Medico[];
  readonly citas: readonly Cita[];
  readonly sedes: readonly Sede[];
  readonly citasMedico: readonly Cita[];
  readonly familiares: readonly Familiar[];
  readonly favoritos: readonly Favorito[];
  /** Cargas en curso. Un contador (no un booleano) para que dos cargas simultáneas no se pisen. */
  readonly cargas: number;
  readonly guardando: boolean;
  readonly error: string;
}

/** Colecciones que se reemplazan completas al cargarlas desde la API. */
type Colecciones = Pick<EstadoCitas, 'medicos' | 'citas' | 'sedes' | 'citasMedico' | 'familiares' | 'favoritos'>;

/** Una acción `cargado` por colección, con el tipo de datos correcto para cada una. */
type AccionCargado = { [K in keyof Colecciones]: { readonly type: 'cargado'; readonly coleccion: K; readonly datos: Colecciones[K] } }[keyof Colecciones];

export type AccionCitas =
  | { readonly type: 'cargaIniciada' }
  | AccionCargado
  | { readonly type: 'cargaFallida'; readonly error: string }
  | { readonly type: 'guardadoIniciado' }
  | { readonly type: 'guardadoFallido'; readonly error: string }
  | { readonly type: 'citaCreada'; readonly cita: Cita }
  | { readonly type: 'citaActualizada'; readonly cita: Cita }
  | { readonly type: 'favoritoAgregado'; readonly favorito: Favorito }
  | { readonly type: 'favoritoQuitado'; readonly id: string }
  | { readonly type: 'familiarAgregado'; readonly familiar: Familiar }
  | { readonly type: 'familiarQuitado'; readonly id: string }
  | { readonly type: 'medicoGuardado'; readonly medico: Medico }
  | { readonly type: 'medicoEliminado'; readonly id: string }
  | { readonly type: 'errorFijado'; readonly error: string };

export const ESTADO_INICIAL: EstadoCitas = {
  medicos: [], citas: [], sedes: [], citasMedico: [], familiares: [], favoritos: [], cargas: 0, guardando: false, error: '',
};

const reemplazar = <T extends { readonly id?: string }>(lista: readonly T[], nuevo: T): T[] => lista.map((x) => (x.id === nuevo.id ? nuevo : x));
const terminarGuardado = (s: EstadoCitas): EstadoCitas => ({ ...s, guardando: false });

/** Reducer puro: no llama a la API, no muta `estado` y siempre devuelve un objeto nuevo si algo cambia. */
export function citasReducer(estado: EstadoCitas, accion: AccionCitas): EstadoCitas {
  switch (accion.type) {
    case 'cargaIniciada':
      return { ...estado, cargas: estado.cargas + 1, error: '' };
    case 'cargado':
      return { ...estado, [accion.coleccion]: accion.datos, cargas: Math.max(0, estado.cargas - 1) };
    case 'cargaFallida':
      return { ...estado, cargas: Math.max(0, estado.cargas - 1), error: accion.error };
    case 'guardadoIniciado':
      return { ...estado, guardando: true, error: '' };
    case 'guardadoFallido':
      return { ...estado, guardando: false, error: accion.error };
    case 'citaCreada':
      return terminarGuardado({ ...estado, citas: [...estado.citas, accion.cita] });
    case 'citaActualizada':
      // Una cita puede estar en la lista del paciente y en la del médico: se actualiza en ambas en una sola transición.
      return terminarGuardado({ ...estado, citas: reemplazar(estado.citas, accion.cita), citasMedico: reemplazar(estado.citasMedico, accion.cita) });
    case 'favoritoAgregado':
      return terminarGuardado({ ...estado, favoritos: [...estado.favoritos, accion.favorito] });
    case 'favoritoQuitado':
      return terminarGuardado({ ...estado, favoritos: estado.favoritos.filter((f) => f.id !== accion.id) });
    case 'familiarAgregado':
      return terminarGuardado({ ...estado, familiares: [...estado.familiares, accion.familiar] });
    case 'familiarQuitado':
      return terminarGuardado({ ...estado, familiares: estado.familiares.filter((f) => f.id !== accion.id) });
    case 'medicoGuardado': {
      const existe = estado.medicos.some((m) => m.id === accion.medico.id);
      return { ...estado, medicos: existe ? reemplazar(estado.medicos, accion.medico) : [...estado.medicos, accion.medico] };
    }
    case 'medicoEliminado':
      return { ...estado, medicos: estado.medicos.filter((m) => m.id !== accion.id) };
    case 'errorFijado':
      return estado.error === accion.error ? estado : { ...estado, error: accion.error };
  }
}
