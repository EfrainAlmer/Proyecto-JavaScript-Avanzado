import { z } from 'zod';
import { ROLE_MEDICO, ROLE_PACIENTE } from '../types/cita';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CMP, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO,
} from '../utils/validacion';

/** Reglas del formulario de inicio de sesión (reemplaza a la función `validar` de Login.tsx). */
export const loginSchema = z.object({
  dni: z.string().trim().regex(PATRON_DNI, 'El DNI debe tener exactamente 8 dígitos.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginData = z.output<typeof loginSchema>;

export const ESPECIALIDADES_REGISTRO = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología'] as const;

/** Reglas del registro (paciente o médico). Reemplaza a `validar`, `noCoincide` y `errCmp` de Registro.tsx. */
export const registroSchema = z
  .object({
    rol: z.union([z.literal(ROLE_PACIENTE), z.literal(ROLE_MEDICO)]),
    correo: z.string().trim().toLowerCase().regex(PATRON_CORREO, 'Escribe un correo válido, por ejemplo nombre@gmail.com.'),
    dni: z.string().trim().regex(PATRON_DNI, 'El DNI debe tener exactamente 8 dígitos.'),
    nombre: z
      .string()
      .trim()
      .min(3, 'Escribe al menos 3 letras.')
      .max(80, 'Usa como máximo 80 caracteres.')
      .regex(PATRON_NOMBRE, 'Usa solo letras, espacios, guiones o apóstrofos.')
      .transform(capitalizarNombre), // entra "ana PÉREZ", sale "Ana Pérez"
    telefono: z.string().trim().regex(PATRON_TELEFONO, 'El celular debe tener 9 dígitos y empezar con 9.'),
    cmp: z.string().trim(),
    especialidad: z.enum(ESPECIALIDADES_REGISTRO),
    password: z.string().regex(PATRON_CLAVE, 'Mínimo 8 caracteres, con al menos una letra y un número.'),
    confirmar: z.string().min(1, 'Repite la contraseña.'),
  })
  // Reglas que dependen de más de un campo.
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmar) {
      ctx.addIssue({ code: 'custom', path: ['confirmar'], message: 'Las contraseñas no coinciden.' });
    }
    if (data.rol === ROLE_MEDICO && !PATRON_CMP.test(data.cmp)) {
      ctx.addIssue({ code: 'custom', path: ['cmp'], message: 'El código CMP debe tener 5 o 6 dígitos.' });
    }
  });

export type RegistroInput = z.input<typeof registroSchema>;
export type RegistroData = z.output<typeof registroSchema>;

export function registroInicial(): RegistroInput {
  return {
    rol: ROLE_PACIENTE, correo: '', dni: '', nombre: '', telefono: '', cmp: '',
    especialidad: 'Medicina General', password: '', confirmar: '',
  };
}

/** Código de verificación del correo. */
export const verificarSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/u, 'El código tiene 6 dígitos.'),
});
export type VerificarInput = z.input<typeof verificarSchema>;
export type VerificarData = z.output<typeof verificarSchema>;
