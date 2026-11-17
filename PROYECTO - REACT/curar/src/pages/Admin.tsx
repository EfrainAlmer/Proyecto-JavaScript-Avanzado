import { useEffect, useState, type FormEvent } from 'react';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import { HORARIO_BASE, type Cita, type Medico, type Reclamo, type UsuarioApi } from '../types/cita';
import { isoLocal } from '../utils/formato';
import { capitalizarNombre, PATRON_CMP, PATRON_NOMBRE } from '../utils/validacion';

type Tab = 'medicos' | 'citas' | 'reclamos';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [
  { id: 'medicos', n: 'Directorio de Médicos' },
  { id: 'citas', n: 'Supervisión de Citas' },
  { id: 'reclamos', n: 'Libro de Reclamaciones' },
];

interface MedicoValores {
  readonly nombre: string;
  readonly especialidad: string;
  readonly cmp: string;
  readonly sedeId: string;
  readonly estado: 'Activo' | 'Inactivo';
}
const INICIAL: MedicoValores = { nombre: '', especialidad: 'Medicina General', cmp: '', sedeId: '', estado: 'Activo' };
const validar = (v: MedicoValores): Errores<MedicoValores> => ({
  nombre: v.nombre.length < 5 || !PATRON_NOMBRE.test(v.nombre),
  cmp: !PATRON_CMP.test(v.cmp),
});

const colorReclamo = (e: Reclamo['estado']): string => (e === 'Recibido' ? 'Pendiente' : e === 'En revisión' ? 'Confirmada' : 'Atendida');

export function Admin() {
  const { medicos, sedes, setMedicos, cargarMedicos, cargarSedes } = useCitas();
  const { cargando, error, setError, ejecutar } = useCarga();
  const [tab, setTab] = useState<Tab>('medicos');
  const [usuarios, setUsuarios] = useState<readonly UsuarioApi[]>([]);
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [reclamos, setReclamos] = useState<readonly Reclamo[]>([]);
  const [aviso, setAviso] = useState('');
  const [qMed, setQMed] = useState('');
  const [editando, setEditando] = useState<Medico | 'nuevo' | null>(null);
  const [borrando, setBorrando] = useState('');
  const form = useFormulario<MedicoValores>(INICIAL);
  const errores = validar(form.valores);
  const invalido = errores.nombre === true || errores.cmp === true;
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
    form.reiniciar(INICIAL);
    setEditando('nuevo');
  }
  function editar(m: Medico): void {
    form.reiniciar({ nombre: m.nombre, especialidad: m.especialidad, cmp: m.cmp ?? '', sedeId: m.sedeId ?? '', estado: m.estado ?? 'Activo' });
    setEditando(m);
  }

  async function guardar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    setAviso('');
    if (invalido || !editando || cargando) return;
    const v = form.valores;
    const centro = sedes.find((s) => s.id === v.sedeId)?.tipo ?? 'Por asignar';
    const nombre = capitalizarNombre(v.nombre);
    const cerrar = (): void => {
      setEditando(null);
      setAviso('Médico guardado.');
    };
    if (editando === 'nuevo') {
      const id = `m${v.cmp}`;
      if (medicos.some((m) => m.id === id)) {
        setError('Ya existe un médico con ese CMP.');
        return;
      }
      const r = await ejecutar(curarApi.altaMedico({ id, nombre, especialidad: v.especialidad, calificacion: 0, centro, horario: [...HORARIO_BASE], sedeId: v.sedeId, cmp: v.cmp, estado: v.estado }));
      if (!r.ok) return;
      setMedicos((l) => [...l, r.valor]);
      cerrar();
    } else {
      const r = await ejecutar(curarApi.guardarMedico({ ...editando, nombre, especialidad: v.especialidad, centro, sedeId: v.sedeId, cmp: v.cmp, estado: v.estado }));
      if (!r.ok) return;
      setMedicos((l) => l.map((x) => (x.id === r.valor.id ? r.valor : x)));
      cerrar();
    }
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
            <form className="tabla" onSubmit={(e) => void guardar(e)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
              <h2 style={{ fontSize: 20 }}>{editando === 'nuevo' ? 'Registrar nuevo médico' : 'Editar médico'}</h2>
              <label>Nombre completo
                <input value={form.valores.nombre} aria-invalid={form.malo(errores, 'nombre')} onChange={(e) => form.cambiar('nombre', e.target.value)} onBlur={() => form.tocar('nombre')} />
              </label>
              <label>Especialidad
                <select value={form.valores.especialidad} onChange={(e) => form.cambiar('especialidad', e.target.value)}>
                  <option>Medicina General</option><option>Pediatría</option><option>Cardiología</option><option>Ginecología</option><option>Geriatría</option>
                </select>
              </label>
              <label>Código CMP (solo se valida el formato)
                <input value={form.valores.cmp} inputMode="numeric" maxLength={6} aria-invalid={form.malo(errores, 'cmp')} onChange={(e) => form.cambiar('cmp', e.target.value)} onBlur={() => form.tocar('cmp')} />
              </label>
              <label>Sede
                <select value={form.valores.sedeId} onChange={(e) => form.cambiar('sedeId', e.target.value)}>
                  <option value="">Sin asignar</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </label>
              <label>Estado
                <select value={form.valores.estado} onChange={(e) => form.cambiar('estado', e.target.value as MedicoValores['estado'])}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </label>
              <p className="err" role="alert">{form.intento && invalido && 'Nombre (5+ letras) y CMP de 5 o 6 dígitos son obligatorios.'}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn brand" type="submit" disabled={cargando}>Guardar</button>
                <button className="btn ghost" type="button" onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </form>
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
