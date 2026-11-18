import { z } from 'zod';
import { ESPECIALIDADES } from './medico';

/**
 * Datos de la reserva (asistente de 4 pasos). Un solo formulario para todos los pasos:
 * cada paso muestra unos campos, pero los valores viven en react-hook-form durante todo el recorrido.
 */
export const reservaSchema = z.object({
  para: z.string(), // '' = para mí; si no, id del familiar
  seguro: z.enum(['EsSalud', 'SIS']),
  especialidad: z.enum(ESPECIALIDADES),
  sedeId: z.string().min(1, 'Elige una sede.'),
  medicoId: z.string().min(1, 'Elige un profesional.'),
  dia: z.string().min(1, 'Elige un día.'),
  hora: z.string().min(1, 'Elige un horario.'),
  motivo: z.string().trim().min(3, 'Escribe el motivo de tu consulta (mínimo 3 letras).').max(120, 'Usa como máximo 120 caracteres.'),
});
export type ReservaInput = z.input<typeof reservaSchema>;
export type ReservaData = z.output<typeof reservaSchema>;

/** Campos que debe tener válidos cada paso antes de avanzar al siguiente. */
export const CAMPOS_POR_PASO = {
  1: ['para', 'seguro', 'especialidad'],
  2: ['sedeId'],
  3: ['medicoId'],
  4: ['dia', 'hora', 'motivo'],
} as const satisfies Record<1 | 2 | 3 | 4, readonly (keyof ReservaInput)[]>;

export const esEspecialidad = (v: string): v is ReservaInput['especialidad'] => (ESPECIALIDADES as readonly string[]).includes(v);
