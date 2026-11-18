import { z } from 'zod';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CORREO, PATRON_NOMBRE, PATRON_TELEFONO } from '../utils/validacion';

export const SEGUROS_CUENTA = ['SIS', 'EsSalud', 'Particular'] as const;

export const perfilSchema = z.object({
  nombre: z.string().trim().min(5, 'Escribe tu nombre completo (5+ letras).').regex(PATRON_NOMBRE, 'Usa solo letras, espacios, guiones o apóstrofos.').transform(capitalizarNombre),
  correo: z.string().trim().toLowerCase().regex(PATRON_CORREO, 'Escribe un correo válido.'),
  telefono: z.string().trim().regex(PATRON_TELEFONO, 'El celular debe tener 9 dígitos y empezar con 9.'),
  seguro: z.enum(SEGUROS_CUENTA),
});
export type PerfilInput = z.input<typeof perfilSchema>;
export type PerfilData = z.output<typeof perfilSchema>;
export const perfilInicial = (): PerfilInput => ({ nombre: '', correo: '', telefono: '', seguro: 'SIS' });

export const claveSchema = z
  .object({
    actual: z.string().min(1, 'Escribe tu contraseña actual.'),
    nueva: z.string().regex(PATRON_CLAVE, 'Mínimo 8 caracteres, con al menos una letra y un número.'),
    confirmar: z.string().min(1, 'Repite la nueva contraseña.'),
  })
  .superRefine((d, ctx) => {
    if (d.nueva !== d.confirmar) ctx.addIssue({ code: 'custom', path: ['confirmar'], message: 'Las contraseñas no coinciden.' });
  });
export type ClaveInput = z.input<typeof claveSchema>;
export type ClaveData = z.output<typeof claveSchema>;
export const claveInicial = (): ClaveInput => ({ actual: '', nueva: '', confirmar: '' });
