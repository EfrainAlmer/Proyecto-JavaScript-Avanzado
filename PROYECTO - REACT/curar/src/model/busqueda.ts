import { z } from 'zod';

/** Buscador rápido del inicio (seguro, tipo de centro, especialidad y fecha). */
export const busquedaSchema = z.object({
  seguro: z.enum(['EsSalud', 'SIS']),
  centro: z.enum(['Hospitales', 'Policlínicos', 'Clínicas']),
  especialidad: z.enum(['Medicina General', 'Pediatría', 'Cardiología']),
  fecha: z.string().min(1, 'Elige una fecha para ver la disponibilidad.'),
});
export type BusquedaInput = z.input<typeof busquedaSchema>;
export type BusquedaData = z.output<typeof busquedaSchema>;

export const busquedaInicial = (): BusquedaInput => ({ seguro: 'EsSalud', centro: 'Hospitales', especialidad: 'Medicina General', fecha: '' });
