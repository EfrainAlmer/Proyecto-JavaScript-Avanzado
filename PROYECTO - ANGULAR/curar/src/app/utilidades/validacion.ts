import type { Cita } from '../modelos/cita';
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: string[] };
export const PATRON_DNI = /^\d{8}$/u;
export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/u;
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string => (typeof v === 'string' ? v.trim().replace(/\s+/gu, ' ') : '');
export function validarCita(v: unknown, pos = 1): Resultado<Cita> {
  if (!esObjeto(v)) return { ok: false, errores: [`Cita ${pos}: debe ser un objeto.`] };
  const e: string[] = [], dni = texto(v['dniPaciente']), hora = texto(v['hora']), fecha = texto(v['fecha']);
  if (!PATRON_DNI.test(dni)) e.push(`Cita ${pos}: DNI inválido.`);
  if (!PATRON_HORA.test(hora)) e.push(`Cita ${pos}: hora inválida.`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(fecha)) e.push(`Cita ${pos}: fecha inválida.`);
  if (!['EsSalud', 'SIS'].includes(texto(v['seguro']))) e.push(`Cita ${pos}: seguro inválido.`);
  return e.length ? { ok: false, errores: e } : { ok: true, valor: { ...(v as unknown as Cita), dniPaciente: dni, hora, fecha } };
}
/** Carga atómica: si un registro falla, no se devuelve ninguno. */
export function cargarAtomico(datos: unknown): Resultado<Cita[]> {
  if (!Array.isArray(datos)) return { ok: false, errores: ['La raíz debe ser un arreglo.'] };
  const ok: Cita[] = [], errores: string[] = [];
  datos.forEach((d, i) => { const r = validarCita(d, i + 1); r.ok ? ok.push(r.valor) : errores.push(...r.errores); });
  if (new Set(ok.map((c) => c.id)).size !== ok.length) errores.push('Existen ids duplicados.');
  return errores.length ? { ok: false, errores } : { ok: true, valor: ok };
}

export const PATRON_TELEFONO = /^9\d{8}$/u;
export const PATRON_NOMBRE = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
export const PATRON_CLAVE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/u;
export function capitalizarNombre(t: string): string {
  return t.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es-PE').replace(/(^|[ '\-])\p{L}/gu, (m) => m.toLocaleUpperCase('es-PE'));
}
export const PATRON_CMP = /^\d{5,6}$/u;
