import type { Cita } from '../types/cita';

export type Resultado<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly errores: string[] };

export const PATRON_DNI = /^\d{8}$/u;
export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/u;
export const PATRON_TELEFONO = /^9\d{8}$/u;
export const PATRON_NOMBRE = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
export const PATRON_CLAVE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/u;
export const PATRON_CMP = /^\d{5,6}$/u;
export const PATRON_PRESION = /^\d{2,3}\/\d{2,3}$/u;

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string => (typeof v === 'string' ? v.trim().replace(/\s+/gu, ' ') : '');

export function validarCita(v: unknown, pos = 1): Resultado<Cita> {
  if (!esObjeto(v)) return { ok: false, errores: [`Cita ${pos}: debe ser un objeto.`] };
  const errores: string[] = [];
  const dni = texto(v['dniPaciente']);
  const hora = texto(v['hora']);
  const fecha = texto(v['fecha']);
  if (!PATRON_DNI.test(dni)) errores.push(`Cita ${pos}: DNI inválido.`);
  if (!PATRON_HORA.test(hora)) errores.push(`Cita ${pos}: hora inválida.`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(fecha)) errores.push(`Cita ${pos}: fecha inválida.`);
  if (!['EsSalud', 'SIS'].includes(texto(v['seguro']))) errores.push(`Cita ${pos}: seguro inválido.`);
  return errores.length > 0
    ? { ok: false, errores }
    : { ok: true, valor: { ...(v as unknown as Cita), dniPaciente: dni, hora, fecha } };
}

/** Carga atómica: si un registro falla, no se devuelve ninguno. */
export function cargarAtomico(datos: unknown): Resultado<Cita[]> {
  if (!Array.isArray(datos)) return { ok: false, errores: ['La raíz debe ser un arreglo.'] };
  const validas: Cita[] = [];
  const errores: string[] = [];
  datos.forEach((d, i) => {
    const r = validarCita(d, i + 1);
    if (r.ok) validas.push(r.valor);
    else errores.push(...r.errores);
  });
  if (new Set(validas.map((c) => c.id)).size !== validas.length) errores.push('Existen ids duplicados.');
  return errores.length > 0 ? { ok: false, errores } : { ok: true, valor: validas };
}

export function capitalizarNombre(t: string): string {
  return t
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('es-PE')
    .replace(/(^|[ '-])\p{L}/gu, (m) => m.toLocaleUpperCase('es-PE'));
}
