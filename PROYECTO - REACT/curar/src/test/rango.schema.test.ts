import { describe, expect, it } from 'vitest';
import { dentroDelRango, esFechaReal, rangoFechasSchema } from '../model/rango';

const errorDe = (entrada: object, campo: string): string | undefined => {
  const r = rangoFechasSchema.safeParse(entrada);
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === campo)?.message;
};

describe('rangoFechasSchema (reto obligatorio Lab 12)', () => {
  it('acepta un intervalo correcto y entrega solo datos validados', () => {
    const r = rangoFechasSchema.safeParse({ fechaInicio: ' 2026-10-01 ', fechaFin: '2026-11-19', extra: 'x' });
    expect(r.success && r.data).toEqual({ fechaInicio: '2026-10-01', fechaFin: '2026-11-19' });
  });

  it('acepta el mismo día como intervalo de un día', () => {
    expect(rangoFechasSchema.safeParse({ fechaInicio: '2026-11-19', fechaFin: '2026-11-19' }).success).toBe(true);
    expect(dentroDelRango('2026-11-19', { fechaInicio: '2026-11-19', fechaFin: '2026-11-19' })).toBe(true);
  });

  it('rechaza un intervalo invertido y asocia el error a fechaFin', () => {
    expect(errorDe({ fechaInicio: '2026-11-19', fechaFin: '2026-11-18' }, 'fechaFin')).toBe('La fecha final no puede ser anterior a la de inicio.');
    expect(errorDe({ fechaInicio: '2026-11-19', fechaFin: '2026-11-18' }, 'fechaInicio')).toBeUndefined();
  });

  it('rechaza fechas vacías o inexistentes en el calendario', () => {
    expect(errorDe({ fechaInicio: '', fechaFin: '2026-11-19' }, 'fechaInicio')).toBe('Elige la fecha de inicio.');
    expect(errorDe({ fechaInicio: '2026-11-01', fechaFin: '   ' }, 'fechaFin')).toBe('Elige la fecha final.');
    expect(esFechaReal('2026-02-30')).toBe(false);
    expect(esFechaReal('2028-02-29')).toBe(true);
  });
});
