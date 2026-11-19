import { describe, expect, it } from 'vitest';
import { coincide, normalizar } from '../utils/texto';

describe('búsqueda sin tildes', () => {
  it('quita tildes y diéresis, pero conserva la ñ', () => {
    expect(normalizar('  Óscar HUAMÁN Güemes ')).toBe('oscar huaman guemes');
    expect(normalizar('Núñez')).toBe('nuñez');
  });

  it('encuentra con o sin tilde en ambos sentidos', () => {
    expect(coincide('Óscar Huamán Torres', 'oscar huaman')).toBe(true);
    expect(coincide('Oscar Huaman', 'Óscar')).toBe(true);
    expect(coincide('Núñez', 'nunez')).toBe(false); // la ñ es otra letra en español
    expect(coincide('Lo que sea', '   ')).toBe(true);
  });
});
