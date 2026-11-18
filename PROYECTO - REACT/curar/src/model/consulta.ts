import { z } from 'zod';
import { PATRON_PRESION } from '../utils/validacion';

/** Un medicamento de la receta (cada fila del FormArray). */
export const medicamentoSchema = z.object({
  medicamento: z.string().trim().min(3, 'Escribe el medicamento (mínimo 3 letras).'),
  cantidad: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/u, 'Usa un número entero entre 1 y 99.')
    .transform(Number)
    .pipe(z.number().min(1, 'Usa un número entero entre 1 y 99.')),
  indicaciones: z.string().trim().min(5, 'Escribe las indicaciones (mínimo 5 letras).'),
});

/** Informe de atención + receta opcional. Los signos vitales son opcionales: vacío es válido. */
export const consultaSchema = z.object({
  presion: z
    .string()
    .trim()
    .refine((v) => v === '' || PATRON_PRESION.test(v), 'Usa el formato 120/80.')
    .transform((v) => (v === '' ? undefined : v)),
  frecuencia: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d{2,3}$/u.test(v) && Number(v) >= 30 && Number(v) <= 220), 'Entre 30 y 220 lpm.')
    .transform((v) => (v === '' ? undefined : Number(v))), // entra string, sale number | undefined
  sintomas: z.string().trim().min(3, 'Describe los síntomas (mínimo 3 letras).'),
  hallazgos: z.string().trim().min(5, 'Describe los hallazgos (mínimo 5 letras).'),
  diagnostico: z.string().trim().min(3, 'Escribe el diagnóstico (mínimo 3 letras).'),
  plan: z.string().trim().min(5, 'Escribe el plan (mínimo 5 letras).'),
  recetas: z.array(medicamentoSchema).max(10, 'Como máximo 10 medicamentos por receta.'),
});

export type ConsultaInput = z.input<typeof consultaSchema>;
export type ConsultaData = z.output<typeof consultaSchema>;

export const MEDICAMENTO_VACIO: ConsultaInput['recetas'][number] = { medicamento: '', cantidad: '1', indicaciones: '' };

export function consultaInicial(motivo = ''): ConsultaInput {
  return { presion: '', frecuencia: '', sintomas: motivo, hallazgos: '', diagnostico: '', plan: '', recetas: [] };
}

/** La receta suelta de Agenda reutiliza las reglas de un medicamento de la consulta. */
export type MedicamentoInput = z.input<typeof medicamentoSchema>;
export type MedicamentoData = z.output<typeof medicamentoSchema>;
