import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import type { Salida } from '../services/carga';
import { curarApi } from '../services/curarApi';
import { mensajeHttp } from '../services/mensajeHttp';
import type { BorradorCita, Cita, Familiar, Favorito } from '../types/cita';
import { citasReducer, ESTADO_INICIAL, type AccionCitas } from './citasReducer';

export interface CitasValue {
  readonly citas: readonly Cita[];
  readonly citasMedico: readonly Cita[];
  readonly familiares: readonly Familiar[];
  readonly favoritos: readonly Favorito[];
  readonly cargando: boolean;
  readonly guardando: boolean;
  readonly error: string;
  // Valores derivados: se calculan del estado, no se guardan.
  readonly total: number;
  readonly activas: number;
  setError: (mensaje: string) => void;
  cargarCitas: (dni: string) => void;
  cargarCitasMedico: (id: string) => void;
  cargarFamiliares: (dni: string) => void;
  cargarFavoritos: (dni: string) => void;
  /** Devuelve `null` si la API confirmó el cambio, o el mensaje de error (el botón optimista lo muestra junto a la estrella). */
  alternarFavorito: (dni: string, medicoId: string) => Promise<string | null>;
  reservar: (borrador: BorradorCita, ok: () => void) => void;
  cancelar: (id: string) => void;
  atender: (id: string) => void;
  cancelarMedico: (id: string) => void;
  agregarFamiliar: (familiar: Familiar) => Promise<Salida<Familiar>>;
  quitarFamiliar: (id: string) => Promise<Salida<unknown>>;
}

const CitasContext = createContext<CitasValue | null>(null);

export function CitasProvider({ children }: { readonly children: ReactNode }) {
  const [estado, dispatch] = useReducer(citasReducer, ESTADO_INICIAL);

  // Las referencias cambian al instante (no esperan al re-render): evitan peticiones duplicadas.
  const guardandoRef = useRef(false);

  /** Carga una colección: cargaIniciada → cargado | cargaFallida. */
  const cargar = useCallback(async <T,>(promesa: Promise<T>, accionExito: (datos: T) => AccionCitas): Promise<boolean> => {
    dispatch({ type: 'cargaIniciada' });
    try {
      dispatch(accionExito(await promesa));
      return true;
    } catch (e) {
      dispatch({ type: 'cargaFallida', error: mensajeHttp(e) });
      return false;
    }
  }, []);

  /**
   * Guarda algo en la API: guardadoIniciado → acción de éxito | guardadoFallido. Ignora clics repetidos.
   * Con `errorGlobal: false` el mensaje no se publica en `error` del contexto: lo muestra quien llamó (evita avisos duplicados).
   */
  const guardar = useCallback(async <T,>(
    promesa: () => Promise<T>,
    accionExito: (valor: T) => AccionCitas,
    { errorGlobal = true }: { readonly errorGlobal?: boolean } = {},
  ): Promise<Salida<T> & { readonly error?: string }> => {
    if (guardandoRef.current) return { ok: false, error: 'Hay otra operación en curso.' };
    guardandoRef.current = true;
    dispatch({ type: 'guardadoIniciado' });
    try {
      const valor = await promesa();
      dispatch(accionExito(valor));
      return { ok: true, valor };
    } catch (e) {
      const error = mensajeHttp(e);
      dispatch({ type: 'guardadoFallido', error: errorGlobal ? error : '' });
      return { ok: false, error };
    } finally {
      guardandoRef.current = false;
    }
  }, []);

  const cargarCitas = useCallback((dni: string): void => {
    void cargar(curarApi.citas(dni), (datos) => ({ type: 'cargado', coleccion: 'citas', datos }));
  }, [cargar]);
  const cargarCitasMedico = useCallback((id: string): void => {
    void cargar(curarApi.citasDeMedico(id), (datos) => ({ type: 'cargado', coleccion: 'citasMedico', datos }));
  }, [cargar]);
  const cargarFamiliares = useCallback((dni: string): void => {
    void cargar(curarApi.familiares(dni), (datos) => ({ type: 'cargado', coleccion: 'familiares', datos }));
  }, [cargar]);
  const cargarFavoritos = useCallback((dni: string): void => {
    void cargar(curarApi.favoritos(dni), (datos) => ({ type: 'cargado', coleccion: 'favoritos', datos }));
  }, [cargar]);

  const { favoritos } = estado;
  const alternarFavorito = useCallback(async (dni: string, medicoId: string): Promise<string | null> => {
    const existente = favoritos.find((f) => f.medicoId === medicoId);
    const r = existente?.id
      ? await guardar(() => curarApi.quitarFavorito(existente.id ?? ''), () => ({ type: 'favoritoQuitado', id: existente.id ?? '' }), { errorGlobal: false })
      : await guardar(() => curarApi.agregarFavorito({ dni, medicoId }), (favorito) => ({ type: 'favoritoAgregado', favorito }), { errorGlobal: false });
    return r.ok ? null : (r.error ?? 'Error desconocido.');
  }, [favoritos, guardar]);

  const reservar = useCallback((borrador: BorradorCita, ok: () => void): void => {
    void guardar(() => curarApi.crear(borrador), (cita) => ({ type: 'citaCreada', cita })).then((r) => r.ok && ok());
  }, [guardar]);

  const cambiarEstado = useCallback((id: string, nuevo: 'Atendida' | 'Cancelada'): void => {
    void guardar(() => curarApi.cambiarEstado(id, nuevo), (cita) => ({ type: 'citaActualizada', cita }));
  }, [guardar]);
  const cancelar = useCallback((id: string): void => cambiarEstado(id, 'Cancelada'), [cambiarEstado]);
  const atender = useCallback((id: string): void => cambiarEstado(id, 'Atendida'), [cambiarEstado]);

  const agregarFamiliar = useCallback(
    (familiar: Familiar) => guardar(() => curarApi.agregarFamiliar(familiar), (f) => ({ type: 'familiarAgregado', familiar: f })),
    [guardar],
  );
  const quitarFamiliar = useCallback(
    (id: string) => guardar(() => curarApi.quitarFamiliar(id), () => ({ type: 'familiarQuitado', id })),
    [guardar],
  );

  const setError = useCallback((error: string): void => dispatch({ type: 'errorFijado', error }), []);

  const valor = useMemo<CitasValue>(
    () => ({
      citas: estado.citas, citasMedico: estado.citasMedico,
      familiares: estado.familiares, favoritos: estado.favoritos, guardando: estado.guardando, error: estado.error,
      // Derivados del estado del reducer.
      cargando: estado.cargas > 0,
      total: estado.citas.length,
      activas: estado.citas.filter((c) => c.estado !== 'Cancelada').length,
      setError, cargarCitas, cargarCitasMedico, cargarFamiliares, cargarFavoritos, alternarFavorito,
      reservar, cancelar, atender, cancelarMedico: cancelar, agregarFamiliar, quitarFamiliar,
    }),
    [estado, setError, cargarCitas, cargarCitasMedico, cargarFamiliares, cargarFavoritos, alternarFavorito,
     reservar, cancelar, atender, agregarFamiliar, quitarFamiliar],
  );

  return <CitasContext value={valor}>{children}</CitasContext>;
}

export function useCitas(): CitasValue {
  const ctx = useContext(CitasContext);
  if (ctx === null) throw new Error('useCitas debe usarse dentro de <CitasProvider>.');
  return ctx;
}
