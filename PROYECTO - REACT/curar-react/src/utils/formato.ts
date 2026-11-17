const LOCALE = 'es-PE';

/** Convierte 'YYYY-MM-DD' en una fecha local (evita el desfase de zona horaria de new Date('YYYY-MM-DD')). */
export function aFechaLocal(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  const [y = 1970, m = 1, d = 1] = valor.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function partes(fecha: Date, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(LOCALE, opciones).formatToParts(fecha)) resultado[p.type] = p.value;
  return resultado;
}

const sinPunto = (t: string | undefined): string => (t ?? '').replace(/\.$/u, '');

/** "mar 17 nov" (equivale a EEE d MMM) */
export function fechaCorta(valor: string | Date): string {
  const f = aFechaLocal(valor);
  const p = partes(f, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${sinPunto(p['weekday'])} ${p['day']} ${sinPunto(p['month'])}`;
}

/** "17 nov 2026" (equivale a d MMM y) */
export function fechaMedia(valor: string | Date): string {
  const p = partes(aFechaLocal(valor), { day: 'numeric', month: 'short', year: 'numeric' });
  return `${p['day']} ${sinPunto(p['month'])} ${p['year']}`;
}

/** "noviembre 2026" (equivale a MMMM y) */
export function mesAnio(valor: string | Date): string {
  const p = partes(aFechaLocal(valor), { month: 'long', year: 'numeric' });
  return `${p['month']} ${p['year']}`;
}

/** "martes 17 de noviembre" */
export function diaMesLargo(valor: string | Date): string {
  const p = partes(aFechaLocal(valor), { weekday: 'long', day: 'numeric', month: 'long' });
  return `${p['weekday']} ${p['day']} de ${p['month']}`;
}

/** "martes 17 noviembre" (equivale a EEEE d MMMM) */
export function diaMesCompleto(valor: string | Date): string {
  const p = partes(aFechaLocal(valor), { weekday: 'long', day: 'numeric', month: 'long' });
  return `${p['weekday']} ${p['day']} ${p['month']}`;
}

/** "martes, 17 de noviembre 2026" */
export function fechaCompleta(valor: string | Date): string {
  const p = partes(aFechaLocal(valor), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${p['weekday']}, ${p['day']} de ${p['month']} ${p['year']}`;
}

export const decimal1 = (n: number): string => n.toFixed(1);

export function hora12(h: string): string {
  const [hh = '0', mm = '00'] = h.split(':');
  const n = Number(hh);
  return `${n % 12 || 12}:${mm} ${n < 12 ? 'AM' : 'PM'}`;
}

/** Fecha ISO local (YYYY-MM-DD). */
export const isoLocal = (d: Date): string => d.toLocaleDateString('sv-SE');
