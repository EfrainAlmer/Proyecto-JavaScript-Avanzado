import { z } from 'zod';
import { capitalizarNombre, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO } from '../utils/validacion';

export const TIPOS_RECLAMO = ['Reclamo', 'Queja'] as const;
export const SERVICIOS = ['Consulta médica', 'Reserva de citas en línea', 'Admisión y atención administrativa', 'Farmacia', 'Otro'] as const;

const texto = (min: number, max: number, mensaje: string) => z.string().trim().min(min, mensaje).max(max, mensaje);

export const reclamoSchema = z.object({
  tipo: z.enum(TIPOS_RECLAMO),
  nombre: z.string().trim().min(3, 'Escribe al menos 3 letras.').max(80, 'Usa como máximo 80 caracteres.').regex(PATRON_NOMBRE, 'Usa solo letras, espacios, guiones o apóstrofos.').transform(capitalizarNombre),
  dni: z.string().trim().regex(PATRON_DNI, 'El DNI debe tener 8 dígitos.'),
  correo: z.string().trim().toLowerCase().regex(PATRON_CORREO, 'Escribe un correo válido.'),
  telefono: z.string().trim().regex(PATRON_TELEFONO, 'El celular debe tener 9 dígitos y empezar con 9.'),
  domicilio: texto(5, 120, 'Escribe tu domicilio (5 a 120 caracteres).'),
  sedeId: z.string(),
  servicio: z.enum(SERVICIOS),
  detalle: texto(20, 1000, 'Describe lo ocurrido (20 a 1000 caracteres).'),
  pedido: texto(10, 500, 'Indica la solución que esperas (10 a 500 caracteres).'),
  acepto: z.boolean().refine(Boolean, 'Debes aceptar la declaración.'),
});
export type ReclamoInput = z.input<typeof reclamoSchema>;
export type ReclamoData = z.output<typeof reclamoSchema>;

export const reclamoInicial = (nombre = '', dni = ''): ReclamoInput => ({
  tipo: 'Reclamo', nombre, dni, correo: '', telefono: '', domicilio: '', sedeId: '', servicio: 'Consulta médica', detalle: '', pedido: '', acepto: false,
});
