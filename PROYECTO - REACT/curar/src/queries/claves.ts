/**
 * Claves de TanStack Query, jerárquicas (regla 4 del md): invalidar un prefijo actualiza todas las vistas que cuelgan de él.
 * Ej.: invalidar ['medicos'] refresca el directorio, el buscador y el perfil ['medicos', 'm1'] a la vez.
 */
export const claves = {
  medicos: {
    todos: ['medicos'] as const,
    detalle: (id: string) => ['medicos', id] as const,
  },
  sedes: ['sedes'] as const,
  comentarios: ['comentarios'] as const,
};
