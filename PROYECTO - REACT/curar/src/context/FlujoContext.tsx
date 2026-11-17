import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { FLUJO_INICIAL, type EstadoFlujo } from '../types/flujo';

interface FlujoValue {
  readonly flujo: EstadoFlujo;
  /** Fusiona cambios parciales sin mutar el estado actual. */
  actualizarFlujo: (cambios: Partial<EstadoFlujo>) => void;
}

const FlujoContext = createContext<FlujoValue | null>(null);

export function FlujoProvider({ children }: { readonly children: ReactNode }) {
  const [flujo, setFlujo] = useState<EstadoFlujo>(FLUJO_INICIAL);
  const actualizarFlujo = useCallback((cambios: Partial<EstadoFlujo>): void => {
    setFlujo((actual) => ({ ...actual, ...cambios }));
  }, []);
  const valor = useMemo<FlujoValue>(() => ({ flujo, actualizarFlujo }), [flujo, actualizarFlujo]);
  return <FlujoContext value={valor}>{children}</FlujoContext>;
}

export function useFlujo(): FlujoValue {
  const ctx = useContext(FlujoContext);
  if (ctx === null) throw new Error('useFlujo debe usarse dentro de <FlujoProvider>.');
  return ctx;
}
