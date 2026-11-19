/**
 * Contrato de la API (Lab 14). Toda respuesta HTTP entra como `unknown` y se valida aquí en tiempo de ejecución.
 * Las interfaces de `types/cita.ts` solo existen al compilar; estos esquemas comprueban que el servidor
 * realmente envió esa forma. Un 200 OK con datos fuera del contrato lanza ApiError('format').
 */
import { z } from 'zod';
import type {
  Cita, Comentario, Familiar, Favorito, Informe, Medico, Mensaje, Receta, Reclamo, Sede, UsuarioApi,
} from '../types/cita';

/** Prefijo que el proxy de Vite reenvía a json-server (ver vite.config.ts). */
export const API = '/api';
/** Límite de espera por petición. */
export const TIMEOUT = 6000;

// ---------- Errores

export type TipoFallo = 'http' | 'timeout' | 'network' | 'format';

export class ApiError extends Error {
  readonly kind: TipoFallo;
  readonly status: number | undefined;
  constructor(kind: TipoFallo, status?: number) {
    super(status ? `HTTP ${status}` : kind);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export const errorCancelado = (): DOMException => new DOMException('Consulta cancelada.', 'AbortError');
/** DOMException no siempre hereda de Error (p. ej. en jsdom), por eso se mira el nombre y no `instanceof`. */
export const esCancelacion = (e: unknown): boolean => typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError';

// ---------- Esquemas (cada uno se comprueba contra su interfaz con `z.ZodType<Interfaz>`)

const id = z.string().min(1);
const seguro = z.enum(['EsSalud', 'SIS']);
const estadoCita = z.enum(['Pendiente', 'Confirmada', 'Atendida', 'Cancelada']);
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

export const medicoSchema: z.ZodType<Medico> = z.object({
  id, nombre: z.string().min(1), especialidad: z.string().min(1), calificacion: z.number().min(0).max(5), centro: z.string(),
  horario: z.array(z.string()), sedeId: z.string().optional(), cmp: z.string().optional(), estado: z.enum(['Activo', 'Inactivo']).optional(),
  universidad: z.string().optional(), experiencia: z.string().optional(), reconocimientos: z.array(z.string()).optional(), foto: z.string().optional(),
});

export const citaSchema: z.ZodType<Cita> = z.object({
  id, dniPaciente: z.string(), medicoId: z.string(), seguro, fecha: fechaIso, hora: z.string(), estado: estadoCita,
  motivo: z.string().optional(), paciente: z.string().optional(), familiarId: z.string().optional(),
});

export const sedeSchema: z.ZodType<Sede> = z.object({
  id, nombre: z.string(), tipo: z.string(), direccion: z.string(), telefono: z.string().optional(), seguros: z.array(seguro),
});

export const usuarioSchema: z.ZodType<UsuarioApi> = z.object({
  id: z.string().optional(), dni: z.string(), nombre: z.string(), correo: z.string().optional(), telefono: z.string().optional(),
  rol: z.number().int(), password: z.string(), medicoId: z.string().optional(), cmp: z.string().optional(),
  verificado: z.boolean().optional(), creadoEn: z.string().optional(), seguro: z.string().optional(),
});

export const recetaSchema: z.ZodType<Receta> = z.object({
  id: z.string().optional(), citaId: z.string().optional(), dniPaciente: z.string(), paciente: z.string().optional(), medicoId: z.string(),
  medicoNombre: z.string(), fecha: z.string(), medicamento: z.string(), cantidad: z.number(), indicaciones: z.string(),
});

export const mensajeSchema: z.ZodType<Mensaje> = z.object({
  id: z.string().optional(), dni: z.string(), centro: z.string(), texto: z.string(), tipo: z.enum(['Enviado', 'Recibido']), fecha: z.string(),
});

export const favoritoSchema: z.ZodType<Favorito> = z.object({ id: z.string().optional(), dni: z.string(), medicoId: z.string() });

export const familiarSchema: z.ZodType<Familiar> = z.object({
  id: z.string().optional(), dniTitular: z.string(), nombre: z.string(), parentesco: z.string(), dni: z.string(), seguro: z.string(),
});

export const comentarioSchema: z.ZodType<Comentario> = z.object({
  id: z.string().optional(), sedeId: z.string(), autor: z.string(), texto: z.string(), puntaje: z.number().int().min(1).max(5), fecha: z.string(),
});

export const reclamoSchema: z.ZodType<Reclamo> = z.object({
  id: z.string().optional(), codigo: z.string(), tipo: z.enum(['Reclamo', 'Queja']), nombre: z.string(), dni: z.string(), correo: z.string(),
  telefono: z.string(), domicilio: z.string(), sede: z.string(), servicio: z.string(), detalle: z.string(), pedido: z.string(), fecha: z.string(),
  estado: z.enum(['Recibido', 'En revisión', 'Respondido']),
});

export const informeSchema: z.ZodType<Informe> = z.object({
  id: z.string().optional(), citaId: z.string(), dniPaciente: z.string(), paciente: z.string(), medicoId: z.string(), medicoNombre: z.string(),
  fecha: z.string(), presion: z.string().optional(), frecuencia: z.number().optional(), sintomas: z.string(), hallazgos: z.string(),
  diagnostico: z.string(), plan: z.string(),
});

/** Valida `valor` contra `esquema`; si no cumple, la respuesta se trata como fallo de formato. */
export function decodificar<T>(esquema: z.ZodType<T>, valor: unknown): T {
  const r = esquema.safeParse(valor);
  if (!r.success) throw new ApiError('format');
  return r.data;
}
