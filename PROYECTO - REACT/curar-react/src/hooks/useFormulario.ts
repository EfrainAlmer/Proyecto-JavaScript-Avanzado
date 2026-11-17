import { useState } from 'react';

export type Errores<T> = Partial<Record<keyof T, boolean>>;

/**
 * Estado de un formulario controlado. Los errores NO se guardan: cada página los
 * deriva en el render con una función pura `validar(valores)`.
 */
export function useFormulario<T extends object>(inicial: T) {
  const [valores, setValores] = useState<T>(inicial);
  const [tocados, setTocados] = useState<ReadonlySet<keyof T>>(() => new Set());
  const [intento, setIntento] = useState(false);

  function cambiar<K extends keyof T>(campo: K, valor: T[K]): void {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }
  function tocar(campo: keyof T): void {
    setTocados((actuales) => new Set(actuales).add(campo));
  }
  /** Equivale a `invalid && (touched || intento)` del formulario reactivo de Angular. */
  function malo(errores: Errores<T>, campo: keyof T): boolean {
    return errores[campo] === true && (intento || tocados.has(campo));
  }
  function reiniciar(nuevos: T = inicial): void {
    setValores(nuevos);
    setTocados(new Set());
    setIntento(false);
  }

  return { valores, setValores, cambiar, tocar, malo, intento, setIntento, reiniciar };
}
