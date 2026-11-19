import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { claves } from './claves';
import { curarApi } from '../services/curarApi';
import type { BorradorCita, EstadoCita, Familiar, Receta } from '../types/cita';

// ---------- Citas

export function useCitasPaciente(dni: string | undefined) {
  return useQuery({ queryKey: claves.citas.paciente(dni ?? ''), queryFn: ({ signal }) => curarApi.citas(dni ?? '', signal), enabled: Boolean(dni) });
}

export function useCitasMedico(medicoId: string | undefined) {
  return useQuery({
    queryKey: claves.citas.medico(medicoId ?? ''),
    queryFn: ({ signal }) => curarApi.citasDeMedico(medicoId ?? '', signal),
    enabled: Boolean(medicoId),
  });
}

export function useTodasCitas() {
  return useQuery({ queryKey: claves.citas.todas, queryFn: ({ signal }) => curarApi.todasCitas(signal) });
}

export function useCita(id: string) {
  return useQuery({ queryKey: claves.citas.detalle(id), queryFn: ({ signal }) => curarApi.cita(id, signal), enabled: id !== '' });
}

/** Horas ya tomadas de un médico en un día. Siempre "vieja" (staleTime 0): el cupo puede cambiar en cualquier momento. */
export function useHorasOcupadas(medicoId: string, fecha: string) {
  return useQuery({
    queryKey: claves.citas.ocupadas(medicoId, fecha),
    queryFn: ({ signal }) => curarApi.ocupadas(medicoId, fecha, signal),
    enabled: medicoId !== '' && fecha !== '',
    staleTime: 0,
  });
}

/** Tras crear o cambiar una cita se invalida el prefijo ['citas']: se refrescan TODAS las vistas de citas. */
function useInvalidarCitas() {
  const cache = useQueryClient();
  return () => cache.invalidateQueries({ queryKey: claves.citas.todas });
}

export function useReservarCita() {
  const invalidar = useInvalidarCitas();
  return useMutation({ mutationFn: (b: BorradorCita) => curarApi.crear(b), onSuccess: invalidar });
}

export function useCambiarEstadoCita() {
  const invalidar = useInvalidarCitas();
  return useMutation({
    mutationFn: ({ id, estado }: { readonly id: string; readonly estado: EstadoCita }) => curarApi.cambiarEstado(id, estado),
    onSuccess: invalidar,
  });
}

// ---------- Favoritos

export function useFavoritos(dni: string | undefined) {
  return useQuery({ queryKey: claves.favoritos(dni ?? ''), queryFn: ({ signal }) => curarApi.favoritos(dni ?? '', signal), enabled: Boolean(dni) });
}

export function useAlternarFavorito() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ dni, medicoId, favoritoId }: { readonly dni: string; readonly medicoId: string; readonly favoritoId: string | undefined }) =>
      favoritoId ? curarApi.quitarFavorito(favoritoId) : curarApi.agregarFavorito({ dni, medicoId }).then(() => undefined),
    // Se devuelve la promesa: mutateAsync espera a que la lista se haya recargado antes de resolver.
    onSuccess: (_r, { dni }) => cache.invalidateQueries({ queryKey: claves.favoritos(dni) }),
  });
}

// ---------- Familiares

export function useFamiliares(dni: string | undefined) {
  return useQuery({ queryKey: claves.familiares(dni ?? ''), queryFn: ({ signal }) => curarApi.familiares(dni ?? '', signal), enabled: Boolean(dni) });
}

export function useAgregarFamiliar() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (f: Familiar) => curarApi.agregarFamiliar(f),
    onSuccess: (_r, f) => cache.invalidateQueries({ queryKey: claves.familiares(f.dniTitular) }),
  });
}

export function useQuitarFamiliar() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { readonly id: string; readonly dniTitular: string }) => curarApi.quitarFamiliar(id),
    onSuccess: (_r, { dniTitular }) => cache.invalidateQueries({ queryKey: claves.familiares(dniTitular) }),
  });
}

// ---------- Recetas del paciente (las lee también Mis recetas con use() + ensureQueryData)

export const recetasConsulta = (dni: string) =>
  queryOptions({ queryKey: claves.recetas(dni), queryFn: ({ signal }) => curarApi.recetas(dni, signal) });

export function useRecetas(dni: string | undefined) {
  return useQuery({ ...recetasConsulta(dni ?? ''), enabled: Boolean(dni) });
}

export function useCrearReceta() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (r: Receta) => curarApi.crearReceta(r),
    onSuccess: (_r, receta) => cache.invalidateQueries({ queryKey: claves.recetas(receta.dniPaciente) }),
  });
}
