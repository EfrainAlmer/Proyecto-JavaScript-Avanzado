import { useEffect, useState } from 'react';
import { MedicoForm } from '../components/admin/MedicoForm';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import { medicoInicial, type MedicoData, type MedicoInput } from '../model/medico';
import { curarApi } from '../services/curarApi';
import { HORARIO_BASE, type Cita, type Medico, type Reclamo, type UsuarioApi } from '../types/cita';
import { isoLocal } from '../utils/formato';

type Tab = 'medicos' | 'citas' | 'reclamos';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [
  { id: 'medicos', n: 'Directorio de Médicos' },
  { id: 'citas', n: 'Supervisión de Citas' },
  { id: 'reclamos', n: 'Libro de Reclamaciones' },
];

const colorReclamo = (e: Reclamo['estado']): string => (e === 'Recibido' ? 'Pendiente' : e === 'En revisión' ? 'Confirmada' : 'Atendida');

export function Admin() {
  const { medicos, sedes, setMedicos, cargarMedicos, cargarSedes } = useCitas();
  const { cargando, error, ejecutar } = useCarga();
  const [tab, setTab] = useState<Tab>('medicos');
  const [usuarios, setUsuarios] = useState<readonly UsuarioApi[]>([]);
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [reclamos, setReclamos] = useState<readonly Reclamo[]>([]);
  const [aviso, setAviso] = useState('');
  const [qMed, setQMed] = useState('');
  const [editando, setEditando] = useState<Medico | 'nuevo' | null>(null);
  const [borrando, setBorrando] = useState('');
  const hoyIso = isoLocal(new Date());

  useEffect(() => {
    cargarMedicos();
    cargarSedes();
    void ejecutar(Promise.all([curarApi.todosUsuarios(), curarApi.todasCitas(), curarApi.reclamos()])).then((r) => {
      if (!r.ok) return;
      const [u, c, rec] = r.valor;
      setUsuarios(u);
      setCitas(c);
      setReclamos(rec);
    });
  }, [cargarMedicos, cargarSedes, ejecutar]);

  // Estadísticas y listas: derivadas en cada render.
  const medicosActivos = medicos.filter((m) => m.estado !== 'Inactivo').length;
  const totalPacientes = usuarios.filter((u) => u.rol === 1).length;
  const citasHoy = citas.filter((c) => c.fecha === hoyIso && c.estado !== 'Cancelada').length;
  const reclamosPendientes = reclamos.filter((r) => r.estado !== 'Respondido').length;
  const q = qMed.trim().toLocaleLowerCase('es-PE');
  const medicosFiltrados = medicos.filter((m) => !q || m.nombre.toLocaleLowerCase('es-PE').includes(q));

  const sedeDe = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sin asignar';
  const nombreMedico = (id: string): string => medicos.find((m) => m.id === id)?.nombre ?? id;
  const sedeDeMedico = (id: string): string => sedeDe(medicos.find((m) => m.id === id)?.sedeId);

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
    if (editando === 'nuevo') {
      const r = await ejecutar(curarApi.altaMedico({ id: `m${data.cmp}`, ...data, calificacion: 0, centro, horario: [...HORARIO_BASE] }));
      if (!r.ok) return;
      setMedicos((l) => [...l, r.valor]);
    } else {
      const r = await ejecutar(curarApi.guardarMedico({ ...editando, ...data, centro }));
      if (!r.ok) return;
      setMedicos((l) => l.map((x) => (x.id === r.valor.id ? r.valor : x)));
    }
    setEditando(null);
    setAviso('Médico guardado.');
  }

  async function eliminar(id: string): Promise<void> {
    const r = await ejecutar(curarApi.eliminarMedico(id));
    if (!r.ok) return;
    setMedicos((l) => l.filter((m) => m.id !== id));
    setBorrando('');
    setAviso('Médico dado de baja.');
  }

  async function cancelarCita(id: string): Promise<void> {
    const r = await ejecutar(curarApi.cancelar(id));
    if (r.ok) setCitas((l) => l.map((c) => (c.id === id ? r.valor : c)));
  }

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
      <p className="err" role="alert">{error}</p>
      <p role="status" aria-live="polite">{aviso}</p>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3"><div className="stat"><small>Médicos activos</small><strong>{medicosActivos}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat ok"><small>Pacientes registrados</small><strong>{totalPacientes}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat warn"><small>Citas programadas (hoy)</small><strong>{citasHoy}</strong></div></div>
        <div className="col-6 col-md-3"><div className="stat bad"><small>Reclamos pendientes</small><strong>{reclamosPendientes}</strong></div></div>
      </div>
      <div role="tablist" aria-label="Secciones" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={`btn${tab === t.id ? '' : ' ghost'}`} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.n}</button>
        ))}
      </div>

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

      {tab === 'citas' && (
        <div className="tabla" style={{ overflowX: 'auto' }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Monitoreo global de citas</h2>
          <table className="table align-middle" style={{ margin: 0 }}>
            <caption className="visually-hidden">Citas</caption>
            <thead><tr><th scope="col">Fecha / Hora</th><th scope="col">Paciente</th><th scope="col">Médico / Sede</th><th scope="col">Estado</th><th scope="col">Acción admin</th></tr></thead>
            <tbody>
              {citas.length > 0 ? (
                citas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fecha} · {c.hora}</td>
                    <td>{c.paciente ?? 'Paciente'}<br /><small>DNI {c.dniPaciente}</small></td>
                    <td>{nombreMedico(c.medicoId)}<br /><small>{sedeDeMedico(c.medicoId)}</small></td>
                    <td><span className="pill" data-estado={c.estado}>{c.estado}</span></td>
                    <td>
                      {c.estado === 'Pendiente' || c.estado === 'Confirmada'
                        ? <button className="btn sm ghost" type="button" disabled={cargando} onClick={() => void cancelarCita(c.id)}>Anular cita</button>
                        : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5}>No hay citas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
