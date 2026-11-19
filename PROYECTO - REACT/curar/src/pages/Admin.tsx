import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { MedicoForm } from '../components/admin/MedicoForm';
import { SupervisionCitas } from '../components/admin/SupervisionCitas';
import { useCatalogo, useEliminarMedico, useGuardarMedico } from '../queries/catalogo';
import { mensajeHttp } from '../services/mensajeHttp';
import { useCarga } from '../hooks/useCarga';
import { medicoInicial, type MedicoData, type MedicoInput } from '../model/medico';
import { curarApi } from '../services/curarApi';
import { HORARIO_BASE, type Cita, type Medico, type Reclamo, type UsuarioApi } from '../types/cita';
import { coincide } from '../utils/texto';
import { isoLocal } from '../utils/formato';

type Tab = 'medicos' | 'citas' | 'reclamos';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [
  { id: 'medicos', n: 'Directorio de Médicos' },
  { id: 'citas', n: 'Supervisión de Citas' },
  { id: 'reclamos', n: 'Libro de Reclamaciones' },
];

const colorReclamo = (e: Reclamo['estado']): string => (e === 'Recibido' ? 'Pendiente' : e === 'En revisión' ? 'Confirmada' : 'Atendida');

export function Admin() {
  const { medicos, sedes } = useCatalogo(); // médicos y sedes: caché de TanStack Query
  // Escrituras con useMutation: al terminar bien invalidan ['medicos'] y TODAS las vistas de médicos se recargan.
  const guardarMedico = useGuardarMedico();
  const eliminarMedico = useEliminarMedico();
  const errorEscritura = guardarMedico.error ?? eliminarMedico.error;
  const { cargando, error, ejecutar } = useCarga();
  const [tab, setTab] = useState<Tab>('medicos');
  const [usuarios, setUsuarios] = useState<readonly UsuarioApi[]>([]);
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [reclamos, setReclamos] = useState<readonly Reclamo[]>([]);
  const [aviso, setAviso] = useState('');
  const [qMed, setQMed] = useState('');
  const [editando, setEditando] = useState<Medico | 'nuevo' | null>(null);
  const [borrando, setBorrando] = useState('');
  const [anulando, setAnulando] = useState('');
  // Cambiar de pestaña puede pintar miles de filas: como transición, la pestaña actual sigue respondiendo.
  const [cambiandoTab, startTransition] = useTransition();
  const hoyIso = isoLocal(new Date());

  useEffect(() => {
    void ejecutar(Promise.all([curarApi.todosUsuarios(), curarApi.todasCitas(), curarApi.reclamos()])).then((r) => {
      if (!r.ok) return;
      const [u, c, rec] = r.valor;
      setUsuarios(u);
      setCitas(c);
      setReclamos(rec);
    });
  }, [ejecutar]);

  // Estadísticas y listas: derivadas en cada render.
  const medicosActivos = medicos.filter((m) => m.estado !== 'Inactivo').length;
  const totalPacientes = usuarios.filter((u) => u.rol === 1).length;
  const citasHoy = citas.filter((c) => c.fecha === hoyIso && c.estado !== 'Cancelada').length;
  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'Respondido').length;
  // Directorio (125 médicos): la búsqueda usa el texto diferido y se recalcula solo si cambia.
  const qMedDiferido = useDeferredValue(qMed);
  const medicosFiltrados = useMemo(() => {
    return medicos.filter((m) => coincide(`${m.nombre} ${m.cmp ?? ''} ${m.especialidad}`, qMedDiferido));
  }, [medicos, qMedDiferido]);

  const sedeDe = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sin asignar';

  function nuevo(): void {
    setEditando('nuevo');
  }
  function editar(m: Medico): void {
    setEditando(m);
  }
  const valoresIniciales = (): MedicoInput =>
    editando === null || editando === 'nuevo'
      ? medicoInicial()
      : { nombre: editando.nombre, especialidad: editando.especialidad as MedicoInput['especialidad'], cmp: editando.cmp ?? '', sedeId: editando.sedeId ?? '', estado: editando.estado ?? 'Activo' };
  const cmpRepetido = (cmp: string): string | null =>
    editando === 'nuevo' && medicos.some((m) => m.id === `m${cmp}`) ? 'Ya existe un médico con ese CMP.' : null;

  async function guardar(data: MedicoData): Promise<void> {
    setAviso('');
    if (!editando) return;
    const centro = sedes.find((s) => s.id === data.sedeId)?.tipo ?? 'Por asignar';
    if (guardarMedico.isPending) return;
    const nuevo = editando === 'nuevo';
    const medico: Medico = nuevo
      ? { id: `m${data.cmp}`, ...data, calificacion: 0, centro, horario: [...HORARIO_BASE] }
      : { ...editando, ...data, centro };
    try {
      await guardarMedico.mutateAsync({ medico, nuevo });
      setEditando(null);
      setAviso('Médico guardado.');
    } catch {
      // guardarMedico.error lo muestra arriba; el formulario sigue abierto para reintentar.
    }
  }

  async function eliminar(id: string): Promise<void> {
    try {
      await eliminarMedico.mutateAsync(id);
      setBorrando('');
      setAviso('Médico dado de baja.');
    } catch {
      // eliminarMedico.error lo muestra arriba.
    }
  }

  // Estable entre renders (useCallback): así las filas memorizadas de SupervisionCitas no se re-renderizan todas.
  const anularCita = useCallback((id: string): void => {
    setAnulando(id);
    void ejecutar(curarApi.cancelar(id)).then((r) => {
      if (r.ok) setCitas((l) => l.map((c) => (c.id === id ? r.valor : c)));
      setAnulando('');
    });
  }, [ejecutar]);

  async function avanzarReclamo(rec: Reclamo): Promise<void> {
    if (!rec.id || rec.estado === 'Respondido') return;
    const estado = rec.estado === 'Recibido' ? 'En revisión' : 'Respondido';
    const r = await ejecutar(curarApi.actualizarReclamo(rec.id, { estado }));
    if (r.ok) setReclamos((l) => l.map((x) => (x.id === r.valor.id ? r.valor : x)));
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <div className="panel-head">
        <div><h1>Panel de Administración General</h1><p>Control central de personal, citas y gobernanza pública.</p></div>
        <button className="btn" type="button" onClick={() => { setTab('medicos'); nuevo(); }}>+ Registrar Médico</button>
      </div>
      <p className="err" role="alert">{error}{errorEscritura ? ` ${mensajeHttp(errorEscritura)}` : ''}</p>
      <p role="status" aria-live="polite">{aviso}</p>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><div className="stat"><small>Médicos activos</small><strong>{medicosActivos}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat ok"><small>Pacientes registrados</small><strong>{totalPacientes}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat warn"><small>Citas programadas (hoy)</small><strong>{citasHoy}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat bad"><small>Reclamos pendientes</small><strong>{reclamosPendientes}</strong></div></div>
      </div>
      <div role="tablist" aria-label="Secciones" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={`btn${tab === t.id ? '' : ' ghost'}`} aria-selected={tab === t.id} onClick={() => startTransition(() => setTab(t.id))}>{t.n}</button>
        ))}
      </div>
      {cambiandoTab && <p role="status">Cargando sección…</p>}

      {tab === 'medicos' && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 12 }}>
            <label style={{ minWidth: 260 }}>Buscar médico<input type="search" value={qMed} onChange={(e) => setQMed(e.target.value)} /></label>
          </div>
          {editando && (
            <MedicoForm
              // key: al cambiar de médico se monta un formulario nuevo con sus valores iniciales.
              key={editando === 'nuevo' ? 'nuevo' : editando.id}
              titulo={editando === 'nuevo' ? 'Registrar nuevo médico' : 'Editar médico'}
              valoresIniciales={valoresIniciales()}
              sedes={sedes}
              cmpRepetido={cmpRepetido}
              onGuardar={guardar}
              onCancelar={() => setEditando(null)}
            />
          )}
          <div className="tabla" style={{ overflowX: 'auto' }}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Médicos registrados</h2>
            <table className="table align-middle" style={{ margin: 0 }}>
              <caption className="visually-hidden">Directorio médico</caption>
              <thead><tr><th scope="col">Médico</th><th scope="col">CMP</th><th scope="col">Especialidad</th><th scope="col">Sede</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
              <tbody>
                {medicosFiltrados.length > 0 ? (
                  medicosFiltrados.map((m) => (
                    <tr key={m.id}>
                      <td><b>{m.nombre}</b></td><td>{m.cmp ?? '—'}</td><td>{m.especialidad}</td><td>{sedeDe(m.sedeId)}</td>
                      <td><span className="pill" data-estado={m.estado ?? 'Activo'}>{m.estado ?? 'Activo'}</span></td>
                      <td>
                        <button className="btn sm ghost" type="button" onClick={() => editar(m)}>Editar</button>{' '}
                        {borrando === m.id ? (
                          <>
                            <button className="btn sm" type="button" disabled={cargando} onClick={() => void eliminar(m.id)}>Confirmar baja</button>{' '}
                            <button className="btn sm ghost" type="button" onClick={() => setBorrando('')}>No</button>
                          </>
                        ) : (
                          <button className="btn sm ghost" type="button" onClick={() => setBorrando(m.id)}>Dar de baja</button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6}>Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'citas' && <SupervisionCitas citas={citas} medicos={medicos} sedes={sedes} anulando={anulando} onAnular={anularCita} />}

      {tab === 'reclamos' && (
        <div className="tabla" style={{ overflowX: 'auto' }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Libro de Reclamaciones (Ley N° 29733)</h2>
          <table className="table align-middle" style={{ margin: 0 }}>
            <caption className="visually-hidden">Reclamos y quejas</caption>
            <thead><tr><th scope="col">N° de hoja</th><th scope="col">Usuario / DNI</th><th scope="col">Motivo</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
            <tbody>
              {reclamos.length > 0 ? (
                reclamos.map((r) => (
                  <tr key={r.id ?? r.codigo}>
                    <td><b>{r.codigo}</b><br /><small>{r.fecha}</small></td>
                    <td>{r.nombre}<br /><small>DNI {r.dni}</small></td>
                    <td><span className="pill">{r.tipo}</span> {r.servicio}<br /><small>{r.detalle}</small></td>
                    <td><span className="pill" data-estado={colorReclamo(r.estado)}>{r.estado}</span></td>
                    <td>
                      {r.estado === 'Recibido' && <button className="btn sm" type="button" disabled={cargando} onClick={() => void avanzarReclamo(r)}>Iniciar revisión</button>}
                      {r.estado === 'En revisión' && <button className="btn sm" type="button" disabled={cargando} onClick={() => void avanzarReclamo(r)}>Marcar respondido</button>}
                      {r.estado === 'Respondido' && '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5}>{cargando ? 'Cargando…' : 'Aún no hay reclamos registrados.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
