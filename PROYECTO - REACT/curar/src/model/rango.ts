import { z } from 'zod';

/**
 * Reto obligatorio del Lab 12: reglas entre campos con fechaInicio y fechaFin.
 *
 * Política de comparación: son FECHAS DE CALENDARIO SIN HORA en formato 'YYYY-MM-DD' (lo que entrega
 * <input type="date">). No se convierten a Date para comparar, porque `new Date('2026-11-19')` se interpreta
 * en UTC y en Lima (UTC-5) cae en el día anterior. En ese formato, el orden de texto ES el orden cronológico.
 * El mismo día es un intervalo válido (fin = inicio).
 */
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** true si 'YYYY-MM-DD' existe en el calendario (rechaza 2026-02-30). */
export function esFechaReal(valor: string): boolean {
  const m = PATRON_FECHA.exec(valor);
  if (!m) return false;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, dia));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia;
}

const fecha = (vacia: string) => z.string().trim().min(1, vacia).refine(esFechaReal, 'Usa una fecha válida (AAAA-MM-DD).');

export const rangoFechasSchema = z
  .object({
    fechaInicio: fecha('Elige la fecha de inicio.'),
    fechaFin: fecha('Elige la fecha final.'),
  })
  // Regla entre campos: el error se asocia a fechaFin, que es el campo que el usuario debe corregir.
  .superRefine((d, ctx) => {
    if (d.fechaFin < d.fechaInicio) {
      ctx.addIssue({ code: 'custom', path: ['fechaFin'], message: 'La fecha final no puede ser anterior a la de inicio.' });
    }
  });

export type RangoFechasInput = z.input<typeof rangoFechasSchema>;
export type RangoFechasData = z.output<typeof rangoFechasSchema>;

export const rangoInicial = (): RangoFechasInput => ({ fechaInicio: '', fechaFin: '' });

/** Filtro puro: ¿la fecha cae dentro del intervalo cerrado [inicio, fin]? */
export const dentroDelRango = (fecha: string, r: RangoFechasData): boolean => fecha >= r.fechaInicio && fecha <= r.fechaFin;
