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
  /** Toda escritura sobre citas invalida ['citas']: paciente, médico, admin, detalle y horas ocupadas a la vez. */
  citas: {
    todas: ['citas'] as const,
    paciente: (dni: string) => ['citas', 'paciente', dni] as const,
    medico: (medicoId: string) => ['citas', 'medico', medicoId] as const,
    detalle: (id: string) => ['citas', 'detalle', id] as const,
    ocupadas: (medicoId: string, fecha: string) => ['citas', 'ocupadas', medicoId, fecha] as const,
  },
  favoritos: (dni: string) => ['favoritos', dni] as const,
  recetas: (dni: string) => ['recetas', dni] as const,
  mensajes: (dni: string) => ['mensajes', dni] as const,
  usuarios: {
    todos: ['usuarios'] as const,
    porDni: (dni: string) => ['usuarios', dni] as const,
  },
  reclamos: ['reclamos'] as const,
  familiares: (dni: string) => ['familiares', dni] as const,
};
