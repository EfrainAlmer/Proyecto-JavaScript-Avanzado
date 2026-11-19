import { useState } from 'react';
import { Link } from 'react-router';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { useCandado } from '../hooks/useCandado';
import { useCitasMedico, useCambiarEstadoCita } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { EstadoCita } from '../types/cita';

type Filtro = 'Todas' | EstadoCita;
const FILTROS: readonly Filtro[] = ['Todas', 'Pendiente', 'Confirmada', 'Atendida', 'Cancelada'];

export function GestionCitas() {
  const { usuario } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('Todas');
  const [confirmando, setConfirmando] = useState('');
  const medicoId = usuario?.medicoId;
  const lectura = useCitasMedico(medicoId);
  const cambiarEstado = useCambiarEstadoCita();
  const conCandado = useCandado();
  const citasMedico = lectura.data ?? [];
  const cargando = lectura.isLoading;
  const guardando = cambiarEstado.isPending;

  const visibles = citasMedico.filter((c) => filtro === 'Todas' || c.estado === filtro);

  function marcarAtendida(id: string): void {
    void conCandado(() => cambiarEstado.mutateAsync({ id, estado: 'Atendida' })).then(() => setConfirmando(''), () => undefined);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Gestión de pacientes</h1>
      <p style={{ margin: '6px 0 16px' }}>Administra y actualiza el estado de tus citas programadas.</p>
      <FiltroBotones etiqueta="Filtrar por estado" opciones={FILTROS} seleccionado={filtro} onChange={setFiltro} estilo={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} />
      <p className="err" role="alert">{textoError(lectura.error ?? cambiarEstado.error)}</p>
      <div className="tabla" style={{ overflowX: 'auto' }}>
        <table className="table align-middle" style={{ margin: 0 }}>
          <caption className="visually-hidden">Citas del médico</caption>
          <thead><tr><th scope="col">Paciente</th><th scope="col">Fecha y hora</th><th scope="col">Seguro</th><th scope="col">Estado / acción</th></tr></thead>
          <tbody>
            {visibles.length > 0 ? (
              visibles.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.paciente ?? 'Paciente'}</b><br /><small>DNI {c.dniPaciente}</small><br /><small>Motivo: {c.motivo ?? 'No indicado'}</small></td>
                  <td>{c.fecha} a las {c.hora}</td>
                  <td>{c.seguro}</td>
                  <td>
                    {c.estado === 'Pendiente' || c.estado === 'Confirmada' ? (
                      confirmando === c.id ? (
                        <>
                          <button className="btn" type="button" disabled={guardando} onClick={() => marcarAtendida(c.id)}>Confirmar atención</button>{' '}
                          <button className="btn ghost" type="button" onClick={() => setConfirmando('')}>No</button>
                        </>
                      ) : (
                        <button className="btn ghost" type="button" onClick={() => setConfirmando(c.id)}>Marcar atendida</button>
                      )
                    ) : (
                      <span className="pill" data-estado={c.estado}>{c.estado}</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} role="status">{cargando ? 'Cargando…' : 'No hay citas programadas.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 20 }}><Link to="/panel-medico" className="btn ghost">Volver a mi panel</Link></p>
    </section>
  );
}
