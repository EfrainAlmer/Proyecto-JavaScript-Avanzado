import { useCallback, useState } from 'react';
import { ejecutar as ejecutarGlobal, type Salida } from '../services/carga';

/** Estado local de carga/error para una página, con el mismo patrón que `ejecutar` del servicio. */
export function useCarga() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const ejecutar = useCallback(
    <T,>(promesa: Promise<T>): Promise<Salida<T>> => ejecutarGlobal(promesa, setCargando, setError),
    [],
  );
  return { cargando, error, setError, ejecutar };
}
