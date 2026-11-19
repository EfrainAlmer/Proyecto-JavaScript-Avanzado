import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { curarApi } from '../services/curarApi';
import type { Mensaje, Reclamo, UsuarioApi } from '../types/cita';
import { claves } from './claves';

// ---------- Usuarios

export function useUsuarios() {
  return useQuery({ queryKey: claves.usuarios.todos, queryFn: ({ signal }) => curarApi.todosUsuarios(signal) });
}

/** La cuenta de una persona (json-server la busca por DNI, por eso devuelve una lista). */
export function useUsuario(dni: string | undefined) {
  return useQuery({
    queryKey: claves.usuarios.porDni(dni ?? ''),
    queryFn: async ({ signal }) => (await curarApi.usuarios(dni ?? '', signal))[0] ?? null,
    enabled: Boolean(dni),
  });
}

export function useActualizarUsuario() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { readonly id: string; readonly cambios: Partial<UsuarioApi> }) => curarApi.actualizarUsuario(id, cambios),
    // ['usuarios'] cubre la cuenta propia (['usuarios', dni]) y el conteo de pacientes del admin.
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.usuarios.todos }),
  });
}

// ---------- Mensajes

export function useMensajes(dni: string | undefined) {
  return useQuery({ queryKey: claves.mensajes(dni ?? ''), queryFn: ({ signal }) => curarApi.mensajes(dni ?? '', signal), enabled: Boolean(dni) });
}

export function useCrearMensaje() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (m: Mensaje) => curarApi.crearMensaje(m),
    onSuccess: (_r, m) => cache.invalidateQueries({ queryKey: claves.mensajes(m.dni) }),
  });
}

// ---------- Libro de Reclamaciones

export function useReclamos() {
  return useQuery({ queryKey: claves.reclamos, queryFn: ({ signal }) => curarApi.reclamos(signal) });
}

/** Al registrar una hoja, el panel del admin la ve sin recargar (misma clave ['reclamos']). */
export function useCrearReclamo() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (r: Reclamo) => curarApi.crearReclamo(r),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.reclamos }),
  });
}

export function useActualizarReclamo() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { readonly id: string; readonly cambios: Partial<Reclamo> }) => curarApi.actualizarReclamo(id, cambios),
    onSuccess: () => cache.invalidateQueries({ queryKey: claves.reclamos }),
  });
}
