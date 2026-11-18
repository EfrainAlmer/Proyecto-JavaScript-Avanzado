import { z } from 'zod';

export const comentarioSchema = z.object({
  puntaje: z.enum(['1', '2', '3', '4', '5']).transform(Number), // el <select> entrega texto; la API guarda número
  texto: z.string().trim().min(3, 'Escribe entre 3 y 300 caracteres.').max(300, 'Escribe entre 3 y 300 caracteres.'),
});
export type ComentarioInput = z.input<typeof comentarioSchema>;
export type ComentarioData = z.output<typeof comentarioSchema>;

export const comentarioInicial = (): ComentarioInput => ({ puntaje: '5', texto: '' });
