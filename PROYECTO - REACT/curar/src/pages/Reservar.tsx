import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useFlujo } from '../context/FlujoContext';
import { useCarga } from '../hooks/useCarga';
import { curarApi } from '../services/curarApi';
import type { Seguro } from '../types/cita';
import { decimal1, diaMesLargo, isoLocal } from '../utils/formato';
import { valoracion } from '../utils/valoracion';
import './Reservar.css';

type Paso = 1 | 2 | 3 | 4 | 5;

const ESPECIALIDADES = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'] as const;
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const ANTICIPACION = 3; // regla Curar: máximo 3 días de anticipación
const SEGUROS: readonly { readonly id: Seguro; readonly icono: string; readonly clase: string }[] = [
  { id: 'EsSalud', icono: 'bi-hospital', clase: 'es' },
  { id: 'SIS', icono: 'bi-heart-pulse', clase: 'sis' },
];

const esSeguro = (s: string | null | undefined): s is Seguro => s === 'EsSalud' || s === 'SIS';

export function Reservar() {
  const { usuario } = useAuth();
  const { flujo } = useFlujo();
  const { medicos, sedes, activos, familiares, favoritos, cargando, guardando, error, setError, cargarMedicos, cargarSedes, cargarFavoritos, cargarFamiliares, alternarFavorito, reservar } = useCitas();
  const [params] = useSearchParams();
  const medicoParam = params.get('medicoId');
  const paraParam = params.get('para');
  const seguroParam = params.get('seguro');
  const fechaParam = params.get('fecha');

  const hoy = useMemo(() => isoLocal(new Date()), []);
  const ahora = useMemo(() => new Date().toTimeString().slice(0, 5), []);
  const dias = useMemo(
    () => Array.from({ length: ANTICIPACION + 1 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return { iso: isoLocal(d), n: DIAS[d.getDay()], num: d.getDate(), etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `En ${i} días`, bloqueado: d.getDay() === 0 }; // domingos sin atención
    }),
    [],
  );

  const [paso, setPaso] = useState<Paso>(1);
  const [perfilId, setPerfilId] = useState('');
  const [seguro, setSeguro] = useState<Seguro>(flujo.seguro ?? 'EsSalud');
  const [especialidad, setEspecialidad] = useState<string>((ESPECIALIDADES as readonly string[]).includes(flujo.especialidad) ? flujo.especialidad : 'Medicina General');
  const [para, setPara] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [dia, setDia] = useState(dias.find((d) => !d.bloqueado)?.iso ?? '');
  const [hora, setHora] = useState('');
  const [motivo, setMotivo] = useState('');
  const [intento, setIntento] = useState(false);
  const [ocupadas, setOcupadas] = useState<readonly string[]>([]);
  const horas = useCarga();
  const { ejecutar: ejecutarHoras } = horas;
  const precargado = useRef(false);
  const paraAplicado = useRef(false);

  useEffect(() => {
    setError('');
    cargarMedicos();
    cargarSedes();
  }, [setError, cargarMedicos, cargarSedes]);

  const dni = usuario?.dni;
  useEffect(() => {
    if (!dni) return;
    cargarFavoritos(dni);
    cargarFamiliares(dni);
  }, [dni, cargarFavoritos, cargarFamiliares]);

  // ?medicoId=… (perfil, favoritos o buscador público) salta directo al paso 4, cuando ya hay datos cargados.
  useEffect(() => {
    if (precargado.current || !medicoParam || medicos.length === 0 || sedes.length === 0) return;
    precargado.current = true;
    const m = medicos.find((x) => x.id === medicoParam);
    if (!m) return;
    const s = sedes.find((x) => x.id === m.sedeId);
    setSeguro((actual) => (esSeguro(seguroParam) ? seguroParam : s && !s.seguros.includes(actual) ? (s.seguros[0] ?? actual) : actual));
    setEspecialidad(m.especialidad);
    setSedeId(m.sedeId ?? '');
    setMedicoId(m.id);
    const f = fechaParam ?? flujo.fecha;
    const d = dias.find((x) => x.iso === f && !x.bloqueado);
    if (d) setDia(d.iso);
    setPaso(4);
  }, [medicoParam, medicos, sedes, seguroParam, fechaParam, flujo.fecha, dias]);

  // ?para=<id de familiar>
  useEffect(() => {
    const f = familiares.find((x) => x.id === paraParam);
    if (paraAplicado.current || !f) return;
    paraAplicado.current = true;
    setPara(f.id ?? '');
    if (!medicoParam && esSeguro(f.seguro)) setSeguro(f.seguro);
  }, [familiares, paraParam, medicoParam]);

  // Horas libres reales = horario del médico − citas activas de ese día.
  useEffect(() => {
    setOcupadas([]);
    if (!medicoId || !dia) return;
    let vigente = true;
    void ejecutarHoras(curarApi.ocupadas(medicoId, dia)).then((r) => {
      if (vigente && r.ok) setOcupadas(r.valor);
    });
    return () => {
      vigente = false;
    };
  }, [medicoId, dia, ejecutarHoras]);

  // Escape cierra el perfil.
  useEffect(() => {
    if (!perfilId) return;
    const alTecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPerfilId('');
    };
    document.addEventListener('keydown', alTecla);
    return () => document.removeEventListener('keydown', alTecla);
  }, [perfilId]);

  // Estado derivado: nada de esto se guarda en useState.
  const perfil = medicos.find((m) => m.id === perfilId);
  const sedesDisponibles = sedes.filter((s) => s.seguros.includes(seguro) && activos.some((m) => m.sedeId === s.id && m.especialidad === especialidad));
  const medicosDisponibles = activos.filter((m) => m.sedeId === sedeId && m.especialidad === especialidad);
  const medico = medicos.find((m) => m.id === medicoId);
  const sede = sedes.find((s) => s.id === sedeId);
  const familiar = familiares.find((f) => f.id === para);
  const libres = (medico?.horario ?? []).toSorted().filter((h) => !ocupadas.includes(h) && !(dia === hoy && h <= ahora));
  const esFav = (id: string): boolean => favoritos.some((f) => f.medicoId === id);
  const nombreSede = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sede por asignar';
  const motivoCorto = motivo.trim().length < 3;

  function reiniciar(): void {
    setSedeId('');
    setMedicoId('');
    setHora('');
  }
  function elegirSeguro(s: Seguro): void {
    if (s !== seguro) {
      setSeguro(s);
      reiniciar();
    }
  }
  function elegirEspecialidad(e: string): void {
    if (e !== especialidad) {
      setEspecialidad(e);
      reiniciar();
    }
  }
  function elegirPara(id: string): void {
    setPara(id);
    const f = familiares.find((x) => x.id === id);
    if (f && esSeguro(f.seguro)) elegirSeguro(f.seguro);
  }
  function elegirSede(id: string): void {
    if (id !== sedeId) {
      setSedeId(id);
      setMedicoId('');
      setHora('');
    }
  }
  function elegirMedico(id: string): void {
    setMedicoId(id);
    setHora('');
  }
  function elegirDia(d: string): void {
    setDia(d);
    setHora('');
  }
  function ir(p: Paso): void {
    if (p === 2 && !sedeId && sedesDisponibles.length === 1) setSedeId(sedesDisponibles[0]?.id ?? ''); // una sola opción: ya queda elegida
    if (p === 3 && !medicoId && medicosDisponibles.length === 1) setMedicoId(medicosDisponibles[0]?.id ?? '');
    setError('');
    setPaso(p);
    window.scrollTo(0, 0);
  }
  function confirmar(): void {
    setIntento(true);
    const motivoLimpio = motivo.trim();
    if (!usuario || !medico || !dia || !hora || motivoLimpio.length < 3) return;
    if (!libres.includes(hora)) {
      setError('Esa hora ya no está disponible. Elige otra.');
      setHora('');
      return;
    }
    reservar(
      {
        dniPaciente: usuario.dni, paciente: familiar?.nombre ?? usuario.nombre, medicoId: medico.id, seguro, fecha: dia, hora,
        motivo: motivoLimpio, ...(familiar?.id ? { familiarId: familiar.id } : {}),
      },
      () => {
        setPaso(5);
        window.scrollTo(0, 0);
      },
    );
  }
  function nueva(): void {
    reiniciar();
    setMotivo('');
    setIntento(false);
    setPaso(1);
    window.scrollTo(0, 0);
  }

  return (
    <section className="wrap pg-reservar" style={{ padding: '32px 20px 48px' }}>
      <div className="top">
        <Link className="btn ghost sm pillbtn" to="/panel"><i className="bi bi-arrow-left" /> Volver a mis citas</Link>
        <span className="chip">Reserva de Cita</span>
      </div>
      <div className="panel-card card">
        <h1>Reserva de cita médica</h1>
        {paso < 5 && <p className="visually-hidden" role="status">Paso {paso} de 4</p>}

        {paso === 1 && (
          <>
            <h2 className="step">Paso 1: Seleccione su seguro y especialidad</h2>
            {familiares.length > 0 && (
              <label className="campo">¿Para quién es la cita?
                <select value={para} onChange={(e) => elegirPara(e.target.value)}>
                  <option value="">Para mí ({usuario?.nombre})</option>
                  {familiares.map((f) => <option key={f.id} value={f.id}>{f.nombre} ({f.parentesco})</option>)}
                </select>
              </label>
            )}
            <div className="seg" role="group" aria-label="Seguro">
              {SEGUROS.map((s) => (
                <button key={s.id} type="button" className={`opt${seguro === s.id ? ' on' : ''}`} aria-pressed={seguro === s.id} onClick={() => elegirSeguro(s.id)}>
                  <i className={`bi ${s.icono} ${s.clase}`} aria-hidden="true" /><b>{s.id}</b>
                </button>
              ))}
            </div>
            <label className="campo">Especialidad médica
              <select className="big" value={especialidad} onChange={(e) => elegirEspecialidad(e.target.value)}>
                {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <div className="nav"><button className="btn pillbtn der" type="button" onClick={() => ir(2)}>Siguiente →</button></div>
          </>
        )}

        {paso === 2 && (
          <>
            <h2 className="step">Paso 2: Seleccione la sede o centro de salud</h2>
            <div className="lista" role="group" aria-label="Sede o centro de salud">
              {sedesDisponibles.length > 0 ? (
                sedesDisponibles.map((s) => (
                  <button key={s.id} type="button" className={`fila${sedeId === s.id ? ' on' : ''}`} aria-pressed={sedeId === s.id} onClick={() => elegirSede(s.id)}>
                    <span className="radio" aria-hidden="true" />
                    <span><b>{s.nombre}</b><small>{s.direccion}</small></span>
                  </button>
                ))
              ) : (
                <p className="tabla" role="status">{cargando ? 'Cargando sedes…' : `No hay sedes con ${seguro} que atiendan ${especialidad}. Vuelve atrás y prueba otra combinación.`}</p>
              )}
            </div>
            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => ir(1)}>← Anterior</button>
              <button className="btn pillbtn der" type="button" disabled={!sedeId} onClick={() => ir(3)}>Siguiente →</button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h2 className="step">Paso 3: Seleccione al profesional de la salud</h2>
            <div className="lista">
              {medicosDisponibles.length > 0 ? (
                medicosDisponibles.map((m) => (
                  <div className="medfila" key={m.id}>
                    <button type="button" className={`fila${medicoId === m.id ? ' on' : ''}`} aria-pressed={medicoId === m.id} onClick={() => elegirMedico(m.id)}>
                      <span><b>Dr(a). {m.nombre}</b><small>CMP: {m.cmp ?? 's/n'} | {m.especialidad} (★ {decimal1(m.calificacion)})</small></span>
                      {medicoId === m.id && <span className="sel">Seleccionado</span>}
                    </button>
                    <button type="button" className="accion" onClick={() => setPerfilId(m.id)}><i className="bi bi-person-circle" aria-hidden="true" /> Ver perfil</button>
                    <button type="button" className={`accion${esFav(m.id) ? ' fav' : ''}`} aria-pressed={esFav(m.id)} disabled={guardando} onClick={() => dni && alternarFavorito(dni, m.id)}>
                      <i className={esFav(m.id) ? 'bi bi-star-fill' : 'bi bi-star'} aria-hidden="true" /> Favorito
                    </button>
                  </div>
                ))
              ) : (
                <p className="tabla" role="status">{cargando ? 'Cargando médicos…' : `No hay médicos de ${especialidad} en esta sede.`}</p>
              )}
            </div>
            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => ir(2)}>← Anterior</button>
              <button className="btn pillbtn der" type="button" disabled={!medicoId} onClick={() => ir(4)}>Siguiente →</button>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <h2 className="step">Paso 4: Escoge fecha y hora</h2>
            <div className="alert alert-warning py-2 px-3 small mb-3" role="note">
              <i className="bi bi-info-circle-fill me-1" /><strong>Regla Curar:</strong> Solo se permite agendar citas con un máximo de <strong>3 días de anticipación</strong>.
            </div>
            {medico && <p className="resumen">Dr(a). {medico.nombre} · {sede?.nombre} · {seguro}</p>}

            <p className="etq">Días disponibles:</p>
            <div className="dias" role="group" aria-label="Días disponibles">
              {dias.map((d) => (
                <button key={d.iso} type="button" className={`dia${dia === d.iso ? ' on' : ''}`} disabled={d.bloqueado} aria-pressed={dia === d.iso} onClick={() => elegirDia(d.iso)}>
                  <strong>{d.n} {d.num}</strong><small>{d.bloqueado ? 'Bloqueado' : d.etiqueta}</small>
                </button>
              ))}
            </div>

            <p className="etq">Horarios libres:</p>
            <div className="horas" role="group" aria-label="Horarios libres">
              {libres.length > 0 ? (
                libres.map((h) => (
                  <button key={h} type="button" className={`hora${hora === h ? ' on' : ''}`} aria-pressed={hora === h} onClick={() => setHora(h)}>{h}</button>
                ))
              ) : (
                <p className="tabla" role="status" style={{ gridColumn: '1/-1', margin: 0 }}>{horas.cargando ? 'Buscando horarios…' : 'No hay horarios libres este día. Elige otro día.'}</p>
              )}
            </div>
            <p className="err" role="alert">{horas.error}</p>

            <label className="campo">Motivo de consulta
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder="Ej. Dolor de cabeza" aria-invalid={intento && motivoCorto} />
            </label>
            <p className="err" role="alert">
              {intento && !hora ? 'Elige un horario.' : intento && motivoCorto ? 'Escribe el motivo de tu consulta (mínimo 3 letras).' : ''}
            </p>
            <p className="err" role="alert">{error}</p>

            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => ir(3)}>← Anterior</button>
              <button className="btn pillbtn confirmar der" type="button" disabled={guardando || horas.cargando} onClick={confirmar}>{guardando ? 'Reservando…' : 'Confirmar Reserva'}</button>
            </div>
          </>
        )}

        {paso === 5 && (
          <div className="ok" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <h2>¡Cita confirmada exitosamente!</h2>
            <p>Se ha agregado a tus citas pendientes.</p>
            {medico && (
              <div className="tabla ficha">
                <b>Dr(a). {medico.nombre}</b>
                <span>{medico.especialidad} · {sede?.nombre}</span>
                <span>{diaMesLargo(dia)} · {hora}</span>
                <span>Paciente: {familiar?.nombre ?? usuario?.nombre} · {seguro}</span>
              </div>
            )}
            <div className="nav centro">
              <Link className="btn pillbtn" to="/citas">Ver mis citas</Link>
              <Link className="btn ghost pillbtn" to="/panel">Volver a mi panel</Link>
              <button className="btn ghost pillbtn" type="button" onClick={nueva}>Reservar otra cita</button>
            </div>
          </div>
        )}
      </div>

      {perfil && (
        <div className="overlay" onClick={() => setPerfilId('')}>
          <div className="ventana" role="dialog" aria-modal="true" aria-labelledby="perfil-tit" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="cerrar" aria-label="Cerrar perfil" onClick={() => setPerfilId('')}>✕</button>
            <div className="cab">
              {perfil.foto ? <img className="foto" src={perfil.foto} alt={`Foto de ${perfil.nombre}`} width={96} height={96} /> : <div className="avatar" style={{ width: 96, height: 96 }} />}
              <div>
                <h2 id="perfil-tit" style={{ fontSize: 24 }}>Dr(a). {perfil.nombre}</h2>
                <p>{perfil.especialidad} · CMP {perfil.cmp ?? 's/n'}</p>
                <p className="stars">★ {decimal1(perfil.calificacion)} · {valoracion(perfil.calificacion)}</p>
              </div>
            </div>
            <h3>Formación y experiencia</h3>
            <p>{perfil.universidad ?? 'No registrada'}</p>
            <p>{perfil.experiencia ?? 'Sin información adicional.'}</p>
            <h3>Reconocimientos</h3>
            {(perfil.reconocimientos ?? []).length > 0 ? (perfil.reconocimientos ?? []).map((r) => <p key={r}>★ {r}</p>) : <p>Aún no hay reconocimientos registrados.</p>}
            <h3>Sede y horario</h3>
            <p>{nombreSede(perfil.sedeId)}</p>
            <p>Horario: {perfil.horario.join(' · ')}</p>
          </div>
        </div>
      )}
    </section>
  );
}
