import { useState } from 'react';
import { Link } from 'react-router';
import { TarjetaCita } from '../components/TarjetaCita';
import { useAuth } from '../context/AuthContext';
import { useCandado } from '../hooks/useCandado';
import { useCatalogo } from '../queries/catalogo';
import { useCitasPaciente, useFamiliares, useRecetas, useCambiarEstadoCita } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { Cita } from '../types/cita';
import { fechaMedia } from '../utils/formato';
import './PanelPaciente.css';

export function PanelPaciente() {
  const { usuario } = useAuth();
  const { medicos, sedes } = useCatalogo(); // médicos y sedes: caché de TanStack Query
  const [confirmando, setConfirmando] = useState('');
  const dni = usuario?.dni;
  // Cuatro lecturas independientes de la caché; ningún useEffect ni useState para guardarlas.
  const lecturaCitas = useCitasPaciente(dni);
  const lecturaFamiliares = useFamiliares(dni);
  const lecturaRecetas = useRecetas(dni);
  const cambiarEstado = useCambiarEstadoCita();
  const conCandado = useCandado();
  const citas = lecturaCitas.data ?? [];
  const familiares = lecturaFamiliares.data ?? [];
  const recetas = lecturaRecetas.data ?? [];
  const cargandoStore = lecturaCitas.isLoading || lecturaFamiliares.isLoading;
  const errorLectura = lecturaCitas.error ?? lecturaFamiliares.error ?? lecturaRecetas.error;

  // Derivados (se calculan al vuelo; `sort` actúa sobre copias producidas por `filter`).
  const proximas = citas
    .filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada')
    .toSorted((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const atendidas = citas
    .filter((c) => c.estado === 'Atendida')
    .toSorted((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
    .slice(0, 5);

  const medico = (id: string) => medicos.find((m) => m.id === id);
  const detalle = (c: Cita): string => {
    const m = medico(c.medicoId);
    const sede = sedes.find((s) => s.id === m?.sedeId)?.nombre;
    return [c.familiarId && c.paciente ? `Para ${c.paciente}` : '', m?.especialidad, sede, c.seguro].filter(Boolean).join(' · ');
  };
  const tieneReceta = (c: Cita): boolean => recetas.some((r) => r.medicoId === c.medicoId && r.fecha === c.fecha);

  function cancelarCita(id: string): void {
    void conCandado(() => cambiarEstado.mutateAsync({ id, estado: 'Cancelada' })).then(() => setConfirmando(''), () => undefined);
  }

  return (
    <section className="wrap pg-panel-paciente" style={{ padding: '48px 20px' }}>
      <div className="panel-head">
        <div><h1>Hola, {usuario?.nombre}</h1><p>Tus citas, recetas y familiares en un solo lugar.</p></div>
        <Link className="btn" to="/reservar"><i className="bi bi-calendar-plus" /> Reservar nueva cita</Link>
      </div>
      <p className="err" role="alert">{textoError(errorLectura)}</p>
      {cambiarEstado.error && <p className="err" role="alert">No se canceló la cita. {textoError(cambiarEstado.error)}</p>}
      <div className="row g-3 mb-4">
        <div className="col-md-4"><div className="stat"><small>Citas activas</small><strong>{proximas.length}</strong></div></div>
        <div className="col-md-4"><div className="stat ok"><small>Recetas disponibles</small><strong>{recetas.length}</strong></div></div>
        <div className="col-md-4"><div className="stat violet"><small>Familiares registrados</small><strong>{familiares.length}</strong></div></div>
      </div>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="panel-card sep">
            <h2><i className="bi bi-calendar-check" />Próximas citas</h2>
            {proximas.length > 0 ? (
              proximas.slice(0, 3).map((c) => (
                <TarjetaCita key={c.id} cita={c} titulo={`Dr(a). ${medico(c.medicoId)?.nombre ?? c.medicoId}`} subtitulo={detalle(c)}>
                  {confirmando === c.id ? (
                    <>
                      <button className="btn sm" type="button" disabled={cambiarEstado.isPending} onClick={() => cancelarCita(c.id)}>Sí, cancelar</button>
                      <button className="btn sm ghost" type="button" onClick={() => setConfirmando('')}>No</button>
                    </>
                  ) : (
                    <button className="btn sm ghost" type="button" onClick={() => setConfirmando(c.id)}>Cancelar cita</button>
                  )}
                </TarjetaCita>
              ))
            ) : (
              <p role="status">{cargandoStore ? 'Cargando…' : 'No tienes citas próximas.'} <Link to="/seguro" className="link">Reserva una</Link>.</p>
            )}
            <p className="mas"><Link to="/citas" className="link">Ver todas mis citas</Link></p>
          </div>
          <div className="panel-card">
            <h2><i className="bi bi-clock-history" />Historial de atenciones</h2>
            <div className="table-responsive">
              <table className="table align-middle t-apilada">
                <thead><tr><th scope="col">Fecha</th><th scope="col">Médico</th><th scope="col">Motivo</th><th scope="col"><span className="visually-hidden">Receta</span></th></tr></thead>
                <tbody>
                  {atendidas.length > 0 ? (
                    atendidas.map((c) => {
                      const m = medico(c.medicoId);
                      return (
                        <tr key={c.id}>
                          <td data-label="Fecha" style={{ whiteSpace: 'nowrap' }}>{fechaMedia(c.fecha)}</td>
                          <td data-label="Médico">Dr(a). {m?.nombre ?? c.medicoId}<br /><small>{m?.especialidad}</small></td>
                          <td data-label="Motivo">{c.motivo ?? 'Consulta médica'}</td>
                          <td>{tieneReceta(c) && <Link className="btn sm ghost" to="/recetas"><i className="bi bi-file-earmark-text" /> Ver receta</Link>}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={4}>{cargandoStore ? 'Cargando…' : 'Aún no tienes atenciones registradas.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mas"><Link to="/historial" className="link">Ver historial completo</Link></p>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="panel-card">
            <div className="cab"><h2><i className="bi bi-people" />Mis familiares</h2><Link className="btn sm ghost" to="/familiares">+ Agregar</Link></div>
            {familiares.length > 0 ? (
              familiares.map((f) => (
                <div className="fam" key={f.id ?? f.dni + f.nombre}>
                  <div><b>{f.nombre}</b> <small>({f.parentesco})</small><br /><small>DNI {f.dni || 'sin DNI'} · {f.seguro}</small></div>
                  <Link className="btn sm ghost" to="/seguro">Reservar</Link>
                </div>
              ))
            ) : (
              <p role="status">{cargandoStore ? 'Cargando…' : 'Aún no registraste familiares.'}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
