import { describe, expect, it } from 'vitest';
import { consultaInicial, consultaSchema } from '../model/consulta';

const valida = { ...consultaInicial('Dolor de cabeza'), hallazgos: 'Sin hallazgos', diagnostico: 'Cefalea', plan: 'Reposo y control' };

describe('consultaSchema', () => {
  it('signos vitales vacíos son válidos y salen como undefined', () => {
    const r = consultaSchema.safeParse(valida);
    expect(r.success && r.data.frecuencia).toBeUndefined();
    expect(r.success && r.data.presion).toBeUndefined();
  });

  it('frecuencia: entra texto, sale número; fuera de rango es error', () => {
    const r = consultaSchema.safeParse({ ...valida, frecuencia: '72' });
    expect(r.success && r.data.frecuencia).toBe(72);
    expect(consultaSchema.safeParse({ ...valida, frecuencia: '300' }).success).toBe(false);
  });

  it('valida cada medicamento y convierte la cantidad a número', () => {
    const r = consultaSchema.safeParse({ ...valida, recetas: [{ medicamento: 'Paracetamol', cantidad: '2', indicaciones: 'Cada 8 horas' }] });
    expect(r.success && r.data.recetas[0]?.cantidad).toBe(2);
    const mal = consultaSchema.safeParse({ ...valida, recetas: [{ medicamento: 'Pa', cantidad: '0', indicaciones: 'x' }] });
    expect(mal.error?.issues.map((i) => i.path.join('.'))).toEqual(['recetas.0.medicamento', 'recetas.0.cantidad', 'recetas.0.indicaciones']);
  });
});
