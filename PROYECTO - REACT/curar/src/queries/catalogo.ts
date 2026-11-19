import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from './claves';
import { curarApi } from '../services/curarApi';
import { mensajeHttp } from '../services/mensajeHttp';
import type { Comentario, Medico, Sede } from '../types/cita';

/** Arreglo vacío estable: `data ?? []` crearía uno nuevo en cada render y rompería los useMemo que dependen de él. */
const VACIO: readonly never[] = Object.freeze([]);

// ---------- Opciones reutilizables (las usan los hooks y también ensureQueryData / prefetch)

export const medicosConsulta = () =>
  queryOptions({ queryKey: claves.medicos.todos, queryFn: ({ signal }) => curarApi.medicos(signal), staleTime: 60_000 });

export const sedesConsulta = () =>
  queryOptions({ queryKey: claves.sedes, queryFn: ({ signal }) => curarApi.sedes(signal), staleTime: 5 * 60_000 });

// ---------- Lecturas

/** Fuera del componente: la misma función en cada render, así `select` no recalcula sin necesidad. */
const soloActivos = (lista: Medico[]): Medico[] => lista.filter((m) => m.estado !== 'Inactivo');

export function useMedicos() {
  return useQuery(medicosConsulta());
}
export function useMedicosActivos() {
  return useQuery({ ...medicosConsulta(), select: soloActivos });
}
export function useSedes() {
  return useQuery(sedesConsulta());
}

/** Perfil de un médico. Mientras llega, muestra el que ya esté en la lista (sin parpadeo de "Cargando"). */
export function useMedico(id: string) {
  const cache = useQueryClient();
  return useQuery({
    queryKey: claves.medicos.detalle(id),
    queryFn: ({ signal }) => curarApi.medico(id, signal),
    placeholderData: () => cache.getQueryData(medicosConsulta().queryKey)?.find((m) => m.id === id),
    enabled: id !== '',
  });
}

export interface Catalogo {
  readonly medicos: readonly Medico[];
  readonly activos: readonly Medico[];
  readonly sedes: readonly Sede[];
  readonly cargando: boolean;
  readonly error: string;
}

/** Médicos + sedes, para las pantallas que necesitan ambos. Las dos consultas comparten caché con el resto de la app. */
export function useCatalogo(): Catalogo {
  const medicos = useMedicos();
  const activos = useMedicosActivos();
  const sedes = useSedes();
  const fallo = medicos.error ?? sedes.error;
  return {
    medicos: medicos.data ?? VACIO,
    activos: activos.data ?? VACIO,
    sedes: sedes.data ?? VACIO,
    cargando: medicos.isPending || sedes.isPending,
    error: fallo ? mensajeHttp(fallo) : '',
  };
}

// ---------- Escrituras (Admin): al terminar bien, se invalida el prefijo ['medicos'] → lista, buscador y perfiles se actualizan.

export function useGuardarMedico() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ medico, nuevo }: { readonly medico: Medico; readonly nuevo: boolean }) =>
      nuevo ? curarApi.altaMedico(medico) : curarApi.guardarMedico(medico),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.medicos.todos }),
  });
}

export function useEliminarMedico() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => curarApi.eliminarMedico(id),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.medicos.todos }),
  });
}

// ---------- Comentarios de sedes

export function useComentarios() {
  return useQuery({ queryKey: claves.comentarios, queryFn: ({ signal }) => curarApi.comentarios(signal) });
}

export function useCrearComentario() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (c: Comentario) => curarApi.crearComentario(c),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.comentarios }),
  });
}
