import { describe, expect, it } from 'vitest';
import { comentarioSchema } from '../model/comentario';
import { claveSchema } from '../model/cuenta';
import { familiarInicial, familiarSchema } from '../model/familiar';
import { reclamoInicial, reclamoSchema } from '../model/reclamo';

describe('esquemas de los formularios simples', () => {
  it('comentario: el puntaje entra como texto y sale como número', () => {
    const r = comentarioSchema.safeParse({ puntaje: '4', texto: 'Buena atención' });
    expect(r.success && r.data.puntaje).toBe(4);
  });

  it('familiar: DNI vacío es válido; si se escribe, debe tener 8 dígitos', () => {
    const base = { ...familiarInicial(), nombre: 'luis pérez' };
    const r = familiarSchema.safeParse(base);
    expect(r.success && r.data.nombre).toBe('Luis Pérez');
    expect(familiarSchema.safeParse({ ...base, dni: '123' }).success).toBe(false);
  });

  it('clave: la confirmación debe coincidir', () => {
    const r = claveSchema.safeParse({ actual: 'x', nueva: 'abc12345', confirmar: 'abc12346' });
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['confirmar']);
  });

  it('reclamo: exige aceptar la declaración', () => {
    const datos = { ...reclamoInicial('Ana Pérez', '12345678'), correo: 'a@b.pe', telefono: '912345678', domicilio: 'Av. Lima 123', detalle: 'x'.repeat(20), pedido: 'y'.repeat(10) };
    expect(reclamoSchema.safeParse(datos).error?.issues.map((i) => i.path.join('.'))).toEqual(['acepto']);
    expect(reclamoSchema.safeParse({ ...datos, acepto: true }).success).toBe(true);
  });
});
