import { memo, useDeferredValue, useMemo, useState, useTransition } from 'react';
import { Campo } from '../Campo';
import type { Cita, Medico, Sede } from '../../types/cita';
import { filtrarCitas, indexar, type FilaCita as Fila, type FiltroEstado, type Orden } from '../../utils/filtrarCitas';
import { fechaHora } from '../../utils/formato';

const ESTADOS: readonly FiltroEstado[] = ['Todas', 'Pendiente', 'Confirmada', 'Atendida', 'Cancelada'];
const POR_PAGINA = 25; // con 50, la pestaña medía 19 000 px en móvil

interface FilaCitaProps {
  readonly fila: Fila;
  readonly anulando: boolean;
  readonly onAnular: (id: string) => void;
}

/**
 * Fila memorizada: solo se vuelve a renderizar si cambian SUS props.
 * Requiere que `onAnular` sea estable (useCallback en el padre); si no, memo no sirve de nada.
 */
const FilaCita = memo(function FilaCita({ fila: { cita: c, medico, sede }, anulando, onAnular }: FilaCitaProps) {
  return (
    <tr>
      <td data-label="Fecha / hora">{fechaHora(c.fecha, c.hora)}</td>
      <td data-label="Paciente">{c.paciente ?? 'Paciente'}<br /><small>DNI {c.dniPaciente}</small></td>
      <td data-label="Médico / sede">{medico}<br /><small>{sede}</small></td>
      <td data-label="Estado"><span className="pill" data-estado={c.estado}>{c.estado}</span></td>
      <td data-label="Acción">
        {c.estado === 'Pendiente' || c.estado === 'Confirmada'
          ? <button className="btn sm ghost" type="button" disabled={anulando} onClick={() => onAnular(c.id)}>Anular cita</button>
          : '—'}
      </td>
    </tr>
  );
});

/** Estado de la LECTURA de citas (lo entrega TanStack Query desde Admin). */
export interface LecturaCitas {
  readonly cargando: boolean;
  readonly actualizando: boolean;
  readonly hayDatos: boolean;
  readonly error: string;
  /** Hora (HH:MM:SS) de la última respuesta correcta; '' si aún no hay datos. */
  readonly actualizadoA: string;
}

interface SupervisionCitasProps {
  readonly lectura: LecturaCitas;
  readonly onActualizar: () => void;
  readonly onCancelarConsulta: () => void;
  readonly citas: readonly Cita[];
  readonly medicos: readonly Medico[];
  readonly sedes: readonly Sede[];
  readonly anulando: string;
  readonly onAnular: (id: string) => void;
}

export function SupervisionCitas({ lectura, onActualizar, onCancelarConsulta, citas, medicos, sedes, anulando, onAnular }: SupervisionCitasProps) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<FiltroEstado>('Todas');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [isPending, startTransition] = useTransition();

  // El input se actualiza al instante; la búsqueda pesada usa una copia "atrasada" del texto.
  const textoDiferido = useDeferredValue(texto);

  // Índice de médicos/sedes: solo se reconstruye si cambian esas listas, no en cada tecla.
  const medicosPorId = useMemo(() => indexar(medicos, sedes), [medicos, sedes]);

  // Filtrar y ordenar ~3000 citas: se recalcula solo cuando cambian sus entradas.
  const filas = useMemo(
    () => filtrarCitas(citas, { texto: textoDiferido, estado, orden }, medicosPorId),
    [citas, textoDiferido, estado, orden, medicosPorId],
  );

  const actualizando = texto !== textoDiferido || isPending;
  const visibles = filas.slice(0, limite);

  return (
    <div className="tabla" style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Monitoreo global de citas</h2>
        {/* Como el Panel del md: Actualizar relee la API; Cancelar aborta la petición en curso (AbortSignal). */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn sm ghost" type="button" onClick={onActualizar} disabled={lectura.actualizando}>Actualizar</button>
          <button className="btn sm ghost" type="button" onClick={onCancelarConsulta} disabled={!lectura.actualizando}>Cancelar consulta</button>
        </div>
      </div>
      {lectura.error && <p className="err" role="alert">No se pudieron leer las citas. {lectura.error}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 12 }}>
        <Campo label="Buscar paciente, DNI o médico" className="flex-grow-1">
          {/* El setState del input controlado NUNCA va dentro de startTransition (regla del md). */}
          {(a11y) => <input type="search" value={texto} onChange={(e) => { setTexto(e.target.value); setLimite(POR_PAGINA); }} {...a11y} />}
        </Campo>
        <Campo label="Estado">
          {(a11y) => (
            <select value={estado} onChange={(e) => { const v = e.target.value as FiltroEstado; startTransition(() => { setEstado(v); setLimite(POR_PAGINA); }); }} {...a11y}>
              {ESTADOS.map((e) => <option key={e}>{e}</option>)}
            </select>
          )}
        </Campo>
        <button className="btn ghost" type="button" aria-pressed={orden === 'antiguas'} onClick={() => startTransition(() => setOrden((o) => (o === 'recientes' ? 'antiguas' : 'recientes')))}>
          {orden === 'recientes' ? 'Más recientes primero' : 'Más antiguas primero'}
        </button>
      </div>
      <p role="status" aria-live="polite">
        {lectura.cargando
          ? 'Cargando citas…'
          : !lectura.hayDatos && !lectura.actualizando
            ? 'Sin consulta activa. Pulsa Actualizar.'
            : lectura.actualizando
              ? 'Actualizando citas…'
              : actualizando
                ? 'Actualizando resultados…'
                : `${filas.length} citas encontradas. Se muestran ${visibles.length}.${lectura.actualizadoA ? ` Actualizado a las ${lectura.actualizadoA}.` : ''}`}
      </p>
      <table className="table align-middle t-apilada" style={{ margin: 0, opacity: actualizando ? 0.6 : 1 }}>
        <caption className="visually-hidden">Citas</caption>
        <thead><tr><th scope="col">Fecha / Hora</th><th scope="col">Paciente</th><th scope="col">Médico / Sede</th><th scope="col">Estado</th><th scope="col">Acción admin</th></tr></thead>
        <tbody>
          {visibles.length > 0
            ? visibles.map((f) => <FilaCita key={f.cita.id} fila={f} anulando={anulando === f.cita.id} onAnular={onAnular} />)
            : <tr><td colSpan={5}>Sin coincidencias.</td></tr>}
        </tbody>
      </table>
      {visibles.length < filas.length && (
        <button className="btn ghost" type="button" style={{ marginTop: 12 }} onClick={() => startTransition(() => setLimite((l) => l + POR_PAGINA))}>
          Mostrar {Math.min(POR_PAGINA, filas.length - visibles.length)} más
        </button>
      )}
    </div>
  );
}
