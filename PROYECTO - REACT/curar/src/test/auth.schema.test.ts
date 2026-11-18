import { describe, expect, it } from 'vitest';
import { loginSchema } from '../model/auth';

describe('loginSchema', () => {
  it('acepta un DNI de 8 dígitos y una contraseña', () => {
    expect(loginSchema.safeParse({ dni: '12345678', password: 'abc12345' }).success).toBe(true);
  });

  it('quita espacios del DNI antes de validarlo', () => {
    const r = loginSchema.safeParse({ dni: ' 12345678 ', password: 'x' });
    expect(r.success && r.data.dni).toBe('12345678');
  });

  it('rechaza un DNI de 7 dígitos con el mensaje correcto', () => {
    const r = loginSchema.safeParse({ dni: '1234567', password: 'x' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('El DNI debe tener exactamente 8 dígitos.');
  });

  it('exige la contraseña y no altera sus espacios', () => {
    expect(loginSchema.safeParse({ dni: '12345678', password: '' }).success).toBe(false);
    const r = loginSchema.safeParse({ dni: '12345678', password: ' clave ' });
    expect(r.success && r.data.password).toBe(' clave ');
  });
});

import { registroInicial, registroSchema } from '../model/auth';
import { ROLE_MEDICO } from '../types/cita';

describe('registroSchema', () => {
  const valido = { ...registroInicial(), correo: ' Ana@Gmail.com ', dni: '12345678', nombre: 'ana pérez', telefono: '912345678', password: 'abc12345', confirmar: 'abc12345' };

  it('transforma: nombre capitalizado y correo en minúsculas (input ≠ output)', () => {
    const r = registroSchema.safeParse(valido);
    expect(r.success && r.data.nombre).toBe('Ana Pérez');
    expect(r.success && r.data.correo).toBe('ana@gmail.com');
  });

  it('marca el error de contraseñas distintas en el campo confirmar', () => {
    const r = registroSchema.safeParse({ ...valido, confirmar: 'otra1234' });
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['confirmar']);
  });

  it('exige CMP solo si el rol es médico', () => {
    expect(registroSchema.safeParse(valido).success).toBe(true);
    const r = registroSchema.safeParse({ ...valido, rol: ROLE_MEDICO });
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['cmp']);
    expect(registroSchema.safeParse({ ...valido, rol: ROLE_MEDICO, cmp: '12345' }).success).toBe(true);
  });
});
