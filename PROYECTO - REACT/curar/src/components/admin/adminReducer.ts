import type { Medico } from '../../types/cita';

export type PestanaAdmin = 'medicos' | 'citas' | 'reclamos';

/**
 * Estado de INTERFAZ del panel de administración (Lab 13 · useReducer).
 * Desde el Lab 14 los DATOS (médicos, citas, reclamos) viven en TanStack Query; aquí solo queda qué ve y
 * qué está haciendo el administrador. Varias acciones tocan varias piezas a la vez, por eso es un reducer.
 */
export interface EstadoAdmin {
  readonly pestana: PestanaAdmin;
  /** Médico en edición, 'nuevo' si es un alta, o null si el formulario está cerrado. */
  readonly edicion: Medico | 'nuevo' | null;
  /** Id del médico cuya baja espera confirmación. */
  readonly baja: string;
  /** Id de la cita que se está anulando (para desactivar solo su botón). */
  readonly anulando: string;
  readonly aviso: string;
}

export type AccionAdmin =
  | { readonly type: 'pestanaElegida'; readonly pestana: PestanaAdmin }
  | { readonly type: 'altaAbierta' }
  | { readonly type: 'edicionAbierta'; readonly medico: Medico }
  | { readonly type: 'edicionCerrada' }
  | { readonly type: 'medicoGuardado' }
  | { readonly type: 'bajaPedida'; readonly id: string }
  | { readonly type: 'bajaCancelada' }
  | { readonly type: 'bajaHecha' }
  | { readonly type: 'anulacionIniciada'; readonly id: string }
  | { readonly type: 'anulacionTerminada' };

export const ADMIN_INICIAL: EstadoAdmin = { pestana: 'medicos', edicion: null, baja: '', anulando: '', aviso: '' };

/** Reducer puro: sin llamadas a la API ni mutaciones del estado anterior. */
export function adminReducer(estado: EstadoAdmin, accion: AccionAdmin): EstadoAdmin {
  switch (accion.type) {
    case 'pestanaElegida':
      // Cambiar de pestaña cierra cualquier formulario o confirmación a medias.
      return { ...estado, pestana: accion.pestana, edicion: null, baja: '', aviso: '' };
    case 'altaAbierta':
      return { ...estado, pestana: 'medicos', edicion: 'nuevo', baja: '', aviso: '' };
    case 'edicionAbierta':
      // Abrir una edición descarta una baja pendiente: no puede haber dos acciones a medias sobre médicos.
      return { ...estado, edicion: accion.medico, baja: '', aviso: '' };
    case 'edicionCerrada':
      return { ...estado, edicion: null };
    case 'medicoGuardado':
      return { ...estado, edicion: null, aviso: 'Médico guardado.' };
    case 'bajaPedida':
      // Si se pide dar de baja al médico que se está editando, se cierra su formulario.
      return {
        ...estado, baja: accion.id, aviso: '',
        edicion: estado.edicion !== null && estado.edicion !== 'nuevo' && estado.edicion.id === accion.id ? null : estado.edicion,
      };
    case 'bajaCancelada':
      return { ...estado, baja: '' };
    case 'bajaHecha':
      return { ...estado, baja: '', aviso: 'Médico dado de baja.' };
    case 'anulacionIniciada':
      return { ...estado, anulando: accion.id };
    case 'anulacionTerminada':
      return { ...estado, anulando: '' };
  }
}
