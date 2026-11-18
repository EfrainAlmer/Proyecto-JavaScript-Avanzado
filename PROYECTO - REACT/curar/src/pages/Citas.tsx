import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArticuloEstado } from '../components/ArticuloEstado';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import type { EstadoCita } from '../types/cita';

type Filtro = 'Todas' | EstadoCita;
const FILTROS: readonly Filtro[] = ['Todas', 'Pendiente', 'Confirmada', 'Cancelada'];

export function Citas() {
  const { usuario } = useAuth();
  const { citas, medicos, sedes, favoritos, total, activas, cargando, guardando, error, cargarCitas, cargarMedicos, cargarSedes, cargarFavoritos, cancelar } = useCitas();
  const [filtro, setFiltro] = useState<Filtro>('Todas');
  const [confirmando, setConfirmando] = useState('');
  const dni = usuario?.dni;

  useEffect(() => {
    if (!dni) return;
    cargarCitas(dni);
    cargarMedicos();
    cargarSedes();
    cargarFavoritos(dni);
  }, [dni, cargarCitas, cargarMedicos, cargarSedes, cargarFavoritos]);

  const visibles = citas.filter((c) => filtro === 'Todas' || c.estado === filtro);
  const medico = (id: string) => medicos.find((m) => m.id === id);
  const nombreSede = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sede por asignar';

  function cancelarCita(id: string): void {
    cancelar(id);
    setConfirmando('');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mis citas</h1>
      <p role="status" aria-live="polite">{activas} activas de {total} citas.</p>
      <FiltroBotones etiqueta="Filtrar por estado" opciones={FILTROS} seleccionado={filtro} onChange={setFiltro} />
      <p className="err" role="alert">{error}</p>
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
                  {' '}<button className="btn" type="button" disabled={guardando} onClick={() => cancelarCita(c.id)}>Sí, cancelar</button>{' '}
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
