import { useState } from 'react';
import { Link } from 'react-router';
import { ArticuloEstado } from '../components/ArticuloEstado';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { useCandado } from '../hooks/useCandado';
import { useCatalogo } from '../queries/catalogo';
import { useCambiarEstadoCita, useCitasPaciente, useFavoritos } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { EstadoCita } from '../types/cita';

type Filtro = 'Todas' | EstadoCita;
const FILTROS: readonly Filtro[] = ['Todas', 'Pendiente', 'Confirmada', 'Cancelada'];

export function Citas() {
  const { usuario } = useAuth();
  const { medicos, sedes } = useCatalogo(); // médicos y sedes: caché de TanStack Query
  const [filtro, setFiltro] = useState<Filtro>('Todas');
  const [confirmando, setConfirmando] = useState('');
  const dni = usuario?.dni;
  const lectura = useCitasPaciente(dni);
  const lecturaFavoritos = useFavoritos(dni);
  const cambiarEstado = useCambiarEstadoCita();
  const conCandado = useCandado();

  // Derivados de la caché (antes venían precalculados del contexto).
  const citas = lectura.data ?? [];
  const favoritos = lecturaFavoritos.data ?? [];
  const total = citas.length;
  const activas = citas.filter((c) => c.estado !== 'Cancelada').length;
  const cargando = lectura.isLoading;

  const visibles = citas.filter((c) => filtro === 'Todas' || c.estado === filtro);
  const medico = (id: string) => medicos.find((m) => m.id === id);
  const nombreSede = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sede por asignar';

  function cancelarCita(id: string): void {
    // Al terminar bien, onSuccess invalida ['citas'] y esta lista (y la del médico) se recargan solas.
    void conCandado(() => cambiarEstado.mutateAsync({ id, estado: 'Cancelada' })).then(() => setConfirmando(''), () => undefined);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mis citas</h1>
      <p role="status" aria-live="polite">{activas} activas de {total} citas.</p>
      <FiltroBotones etiqueta="Filtrar por estado" opciones={FILTROS} seleccionado={filtro} onChange={setFiltro} />
      <p className="err" role="alert">{textoError(lectura.error ?? lecturaFavoritos.error)}</p>
      {cambiarEstado.error && <p className="err" role="alert">No se canceló la cita. {textoError(cambiarEstado.error)}</p>}
      {cargando && <p role="status">Cargando…</p>}
      {visibles.map((c) => {
        const m = medico(c.medicoId);
        return (
          <ArticuloEstado key={c.id} estado={c.estado}>
            <b>{c.fecha} · {c.hora}</b> — {c.seguro}
            <br />{m?.nombre ?? c.medicoId} · {m?.especialidad}
            <br /><small>{nombreSede(m?.sedeId)}{c.motivo && ` · Motivo: ${c.motivo}`}</small>
            <br />
            <span className="pill" data-estado={c.estado}>{c.estado}</span>
            {(c.estado === 'Pendiente' || c.estado === 'Confirmada') &&
              (confirmando === c.id ? (
                <>
                  {' '}<button className="btn" type="button" disabled={cambiarEstado.isPending} onClick={() => cancelarCita(c.id)}>Sí, cancelar</button>{' '}
                  <button className="btn ghost" type="button" onClick={() => setConfirmando('')}>No</button>
                </>
              ) : (
                <button className="btn ghost" type="button" onClick={() => setConfirmando(c.id)}>Cancelar cita</button>
              ))}
          </ArticuloEstado>
        );
      })}
      {visibles.length === 0 && !cargando && (
        <p className="tabla" role="status">No tienes citas en esta vista. <Link to="/reservar">Reserva una</Link>.</p>
      )}
      <h2 style={{ marginTop: 32, fontSize: 24 }}>Mis médicos favoritos</h2>
      {favoritos.length > 0 ? (
        favoritos.map((f) => (
          <p className="tabla" key={f.id ?? f.medicoId}>
            {medico(f.medicoId)?.nombre ?? f.medicoId}{' '}
            <Link className="btn ghost" to={`/reservar?medicoId=${encodeURIComponent(f.medicoId)}`}>Reservar</Link>
          </p>
        ))
      ) : (
        <p>Aún no tienes favoritos. Márcalos al reservar.</p>
      )}
    </section>
  );
}
