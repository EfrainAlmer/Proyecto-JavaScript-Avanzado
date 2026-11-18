import { z } from 'zod';
import { capitalizarNombre, PATRON_CMP, PATRON_NOMBRE } from '../utils/validacion';

export const ESPECIALIDADES = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'] as const;
export const ESTADOS_MEDICO = ['Activo', 'Inactivo'] as const;

/** Alta o edición de un médico desde el panel de administración. */
export const medicoSchema = z.object({
  nombre: z.string().trim().min(5, 'Escribe el nombre completo (5+ letras).').regex(PATRON_NOMBRE, 'Usa solo letras, espacios, guiones o apóstrofos.').transform(capitalizarNombre),
  especialidad: z.enum(ESPECIALIDADES),
  cmp: z.string().trim().regex(PATRON_CMP, 'El CMP debe tener 5 o 6 dígitos.'),
  sedeId: z.string(), // '' = sin asignar
  estado: z.enum(ESTADOS_MEDICO),
});
export type MedicoInput = z.input<typeof medicoSchema>;
export type MedicoData = z.output<typeof medicoSchema>;

export const medicoInicial = (): MedicoInput => ({ nombre: '', especialidad: 'Medicina General', cmp: '', sedeId: '', estado: 'Activo' });
