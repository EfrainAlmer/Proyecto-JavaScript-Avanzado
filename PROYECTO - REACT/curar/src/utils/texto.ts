const LOCALE = 'es-PE';

/**
 * Prepara un texto para buscar: minúsculas y sin tildes ni diéresis, pero conservando la ñ.
 * "Óscar Huamán" → "oscar huaman"; "Núñez" → "nuñez".
 * NFD separa cada letra de su marca (ó = o + ´); se borran las marcas salvo la virgulilla (U+0303)
 * y NFC vuelve a unir n + ˜ en ñ.
 */
export function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase(LOCALE)
    .normalize('NFD')
    .replace(/[̀-̂̄-ͯ]/gu, '')
    .normalize('NFC')
    .trim();
}

/** ¿Contiene `texto` a `busqueda`, ignorando mayúsculas y tildes? Una búsqueda vacía coincide con todo. */
export const coincide = (texto: string, busqueda: string): boolean => {
  const q = normalizar(busqueda);
  return q === '' || normalizar(texto).includes(q);
};
