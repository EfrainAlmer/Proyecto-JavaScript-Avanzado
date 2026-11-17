import { createContext, useCallback, useContext, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { ejecutar, type Salida } from '../services/carga';
import { curarApi } from '../services/curarApi';
import type { BorradorCita, Cita, Familiar, Favorito, Medico, Sede } from '../types/cita';

export interface CitasValue {
  readonly medicos: readonly Medico[];
  readonly citas: readonly Cita[];
  readonly sedes: readonly Sede[];
  readonly citasMedico: readonly Cita[];
  readonly familiares: readonly Familiar[];
  readonly favoritos: readonly Favorito[];
  readonly cargando: boolean;
  readonly guardando: boolean;
  readonly error: string;
  // Valores derivados: se calculan en cada render, no se guardan en el estado.
  readonly total: number;
  readonly activas: number;
  readonly activos: readonly Medico[];
  setError: (mensaje: string) => void;
  setMedicos: Dispatch<SetStateAction<readonly Medico[]>>;
  cargarMedicos: () => void;
  cargarSedes: () => void;
  cargarCitas: (dni: string) => void;
  cargarCitasMedico: (id: string) => void;
  cargarFamiliares: (dni: string) => void;
  cargarFavoritos: (dni: string) => void;
  alternarFavorito: (dni: string, medicoId: string) => void;
  reservar: (borrador: BorradorCita, ok: () => void) => void;
  cancelar: (id: string) => void;
  atender: (id: string) => void;
  cancelarMedico: (id: string) => void;
  agregarFamiliar: (familiar: Familiar) => Promise<Salida<Familiar>>;
  quitarFamiliar: (id: string) => Promise<Salida<unknown>>;
}

const CitasContext = createContext<CitasValue | null>(null);

/** Reemplaza la cita `id` por la versión devuelta por la API, sin mutar la lista. */
const reemplazar = (lista: readonly Cita[], actualizada: Cita): Cita[] => lista.map((c) => (c.id === actualizada.id ? actualizada : c));

export function CitasProvider({ children }: { readonly children: ReactNode }) {
  const [medicos, setMedicos] = useState<readonly Medico[]>([]);
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [sedes, setSedes] = useState<readonly Sede[]>([]);
  const [citasMedico, setCitasMedico] = useState<readonly Cita[]>([]);
  const [familiares, setFamiliares] = useState<readonly Familiar[]>([]);
  const [favoritos, setFavoritos] = useState<readonly Favorito[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardandoEstado] = useState(false);
  const [error, setError] = useState('');

  // Las referencias se actualizan de inmediato: evitan envíos duplicados aunque React aún no haya re-renderizado.
  const guardandoRef = useRef(false);
  const medicosPedidos = useRef(false);
  const sedesPedidas = useRef(false);
  const favoritosRef = useRef<readonly Favorito[]>([]);
  favoritosRef.current = favoritos;

  const setGuardando = useCallback((valor: boolean): void => {
    guardandoRef.current = valor;
    setGuardandoEstado(valor);
  }, []);

  const cargarMedicos = useCallback((): void => {
    if (medicosPedidos.current) return;
    medicosPedidos.current = true;
    void ejecutar(curarApi.medicos(), setCargando, setError).then((r) => {
      if (r.ok) setMedicos(r.valor);
      else medicosPedidos.current = false;
    });
  }, []);

  const cargarSedes = useCallback((): void => {
    if (sedesPedidas.current) return;
    sedesPedidas.current = true;
    void ejecutar(curarApi.sedes(), setCargando, setError).then((r) => {
      if (r.ok) setSedes(r.valor);
      else sedesPedidas.current = false;
    });
  }, []);

  const cargarCitas = useCallback((dni: string): void => {
    void ejecutar(curarApi.citas(dni), setCargando, setError).then((r) => r.ok && setCitas(r.valor));
  }, []);
  const cargarCitasMedico = useCallback((id: string): void => {
    void ejecutar(curarApi.citasDeMedico(id), setCargando, setError).then((r) => r.ok && setCitasMedico(r.valor));
  }, []);
  const cargarFamiliares = useCallback((dni: string): void => {
    void ejecutar(curarApi.familiares(dni), setCargando, setError).then((r) => r.ok && setFamiliares(r.valor));
  }, []);
  const cargarFavoritos = useCallback((dni: string): void => {
    void ejecutar(curarApi.favoritos(dni), setCargando, setError).then((r) => r.ok && setFavoritos(r.valor));
  }, []);

  const alternarFavorito = useCallback((dni: string, medicoId: string): void => {
    if (guardandoRef.current) return;
    const existente = favoritosRef.current.find((f) => f.medicoId === medicoId);
    if (existente?.id) {
      const id = existente.id;
      void ejecutar(curarApi.quitarFavorito(id), setGuardando, setError).then((r) => r.ok && setFavoritos((l) => l.filter((f) => f.id !== id)));
    } else {
      void ejecutar(curarApi.agregarFavorito({ dni, medicoId }), setGuardando, setError).then((r) => r.ok && setFavoritos((l) => [...l, r.valor]));
    }
  }, [setGuardando]);

  const reservar = useCallback((borrador: BorradorCita, ok: () => void): void => {
    if (guardandoRef.current) return; // evita duplicados mientras hay una solicitud en curso
    void ejecutar(curarApi.crear(borrador), setGuardando, setError).then((r) => {
      if (!r.ok) return;
      setCitas((l) => [...l, r.valor]);
      ok();
    });
  }, [setGuardando]);

  const cancelar = useCallback((id: string): void => {
    if (guardandoRef.current) return;
    void ejecutar(curarApi.cancelar(id), setGuardando, setError).then((r) => r.ok && setCitas((l) => reemplazar(l, r.valor)));
  }, [setGuardando]);

  const cambiarEstadoMedico = useCallback((id: string, estado: 'Atendida' | 'Cancelada'): void => {
    if (guardandoRef.current) return;
    void ejecutar(curarApi.cambiarEstado(id, estado), setGuardando, setError).then((r) => r.ok && setCitasMedico((l) => reemplazar(l, r.valor)));
  }, [setGuardando]);
  const atender = useCallback((id: string): void => cambiarEstadoMedico(id, 'Atendida'), [cambiarEstadoMedico]);
  const cancelarMedico = useCallback((id: string): void => cambiarEstadoMedico(id, 'Cancelada'), [cambiarEstadoMedico]);

  const agregarFamiliar = useCallback(async (familiar: Familiar): Promise<Salida<Familiar>> => {
    const r = await ejecutar(curarApi.agregarFamiliar(familiar), setGuardando, setError);
    if (r.ok) setFamiliares((l) => [...l, r.valor]);
    return r;
  }, [setGuardando]);

  const quitarFamiliar = useCallback(async (id: string): Promise<Salida<unknown>> => {
    const r = await ejecutar(curarApi.quitarFamiliar(id), setGuardando, setError);
    if (r.ok) setFamiliares((l) => l.filter((f) => f.id !== id));
    return r;
  }, [setGuardando]);

  const valor = useMemo<CitasValue>(
    () => ({
      medicos, citas, sedes, citasMedico, familiares, favoritos, cargando, guardando, error,
      // Estado derivado: se calcula a partir de medicos/citas, sin useState ni useEffect.
      total: citas.length,
      activas: citas.filter((c) => c.estado !== 'Cancelada').length,
      activos: medicos.filter((m) => m.estado !== 'Inactivo'),
      setError, setMedicos, cargarMedicos, cargarSedes, cargarCitas, cargarCitasMedico, cargarFamiliares, cargarFavoritos,
      alternarFavorito, reservar, cancelar, atender, cancelarMedico, agregarFamiliar, quitarFamiliar,
    }),
    [medicos, citas, sedes, citasMedico, familiares, favoritos, cargando, guardando, error,
     cargarMedicos, cargarSedes, cargarCitas, cargarCitasMedico, cargarFamiliares, cargarFavoritos,
     alternarFavorito, reservar, cancelar, atender, cancelarMedico, agregarFamiliar, quitarFamiliar],
  );

  return <CitasContext value={valor}>{children}</CitasContext>;
}

export function useCitas(): CitasValue {
  const ctx = useContext(CitasContext);
  if (ctx === null) throw new Error('useCitas debe usarse dentro de <CitasProvider>.');
  return ctx;
}
