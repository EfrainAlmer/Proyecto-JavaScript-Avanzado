import { z } from 'zod';

export const CENTROS_MENSAJE = ['Policlínico Pincos – Surco', 'Policlínico Santa Cruz'] as const;

export const mensajeSchema = z.object({
  centro: z.enum(CENTROS_MENSAJE),
  texto: z.string().trim().min(3, 'Escribe entre 3 y 300 caracteres.').max(300, 'Escribe entre 3 y 300 caracteres.'),
});
export type MensajeInput = z.input<typeof mensajeSchema>;
export type MensajeData = z.output<typeof mensajeSchema>;

export const mensajeInicial = (): MensajeInput => ({ centro: CENTROS_MENSAJE[0], texto: '' });
