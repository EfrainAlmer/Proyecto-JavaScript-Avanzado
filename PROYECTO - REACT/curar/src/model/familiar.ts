import { z } from 'zod';
import { capitalizarNombre, PATRON_DNI, PATRON_NOMBRE } from '../utils/validacion';

export const PARENTESCOS = ['Hijo/a', 'Cónyuge', 'Padre', 'Madre', 'Hermano/a', 'Otro'] as const;
export const SEGUROS_FAMILIAR = ['SIS', 'EsSalud', 'Particular'] as const;

export const familiarSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'Escribe al menos 3 letras.')
    .max(80, 'Usa como máximo 80 caracteres.')
    .regex(PATRON_NOMBRE, 'Usa solo letras, espacios, guiones o apóstrofos.')
    .transform(capitalizarNombre),
  parentesco: z.enum(PARENTESCOS),
  // Opcional (p. ej. menores sin documento), pero si se escribe debe tener 8 dígitos.
  dni: z.string().trim().refine((v) => v === '' || PATRON_DNI.test(v), 'Si pones DNI, debe tener 8 dígitos.'),
  seguro: z.enum(SEGUROS_FAMILIAR),
});
export type FamiliarInput = z.input<typeof familiarSchema>;
export type FamiliarData = z.output<typeof familiarSchema>;

export const familiarInicial = (): FamiliarInput => ({ nombre: '', parentesco: 'Hijo/a', dni: '', seguro: 'SIS' });
