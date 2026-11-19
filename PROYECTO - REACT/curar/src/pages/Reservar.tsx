import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { BotonFavorito } from '../components/BotonFavorito';
import { Campo } from '../components/Campo';
import { FieldMessage } from '../components/FieldMessage';
import { useAuth } from '../context/AuthContext';
import { useFlujo } from '../context/FlujoContext';
import { useCandado } from '../hooks/useCandado';
import { ESPECIALIDADES } from '../model/medico';
import { CAMPOS_POR_PASO, esEspecialidad, reservaSchema, type ReservaData, type ReservaInput } from '../model/reserva';
import { useCatalogo } from '../queries/catalogo';
import { useFamiliares, useHorasOcupadas, useReservarCita } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { Familiar, Seguro } from '../types/cita';
import { decimal1, diaMesLargo, isoLocal } from '../utils/formato';
import { valoracion } from '../utils/valoracion';
import './Reservar.css';

type Paso = 1 | 2 | 3 | 4 | 5;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const ANTICIPACION = 3; // regla Curar: máximo 3 días de anticipación
const SEGUROS: readonly { readonly id: Seguro; readonly icono: string; readonly clase: string }[] = [
  { id: 'EsSalud', icono: 'bi-hospital', clase: 'es' },
  { id: 'SIS', icono: 'bi-heart-pulse', clase: 'sis' },
];

const esSeguro = (s: string | null | undefined): s is Seguro => s === 'EsSalud' || s === 'SIS';

/** Vacíos estables (no crear uno nuevo en cada render). */
const SIN_FAMILIARES: readonly Familiar[] = [];
const SIN_HORAS: readonly string[] = [];

export function Reservar() {
  const { usuario } = useAuth();
  const { flujo } = useFlujo();
  const { medicos, sedes, activos, cargando: cargandoCatalogo } = useCatalogo(); // médicos y sedes: caché de TanStack Query
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

  // Estado de PANTALLA (no son datos de la reserva): qué paso se ve, qué perfil está abierto y las horas ocupadas que vienen de la API.
  const [paso, setPaso] = useState<Paso>(1);
  const [perfilId, setPerfilId] = useState('');
  const precargado = useRef(false);
  // Referencias al DOM para mover el foco sin provocar re-renderizados (equivalen a @ViewChild).
  const tituloPaso = useRef<HTMLHeadingElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const disparadorPerfil = useRef<HTMLElement | null>(null);
  const pasoAnterior = useRef<Paso>(1);
  const paraAplicado = useRef(false);

  // Única fuente de verdad de los datos de la reserva (antes eran 8 useState).
  const { register, control, handleSubmit, setValue, getValues, trigger, setError, reset, formState: { errors } } = useForm<ReservaInput, unknown, ReservaData>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      para: '',
      seguro: flujo.seguro ?? 'EsSalud',
      especialidad: esEspecialidad(flujo.especialidad) ? flujo.especialidad : 'Medicina General',
      sedeId: '', medicoId: '',
      dia: dias.find((d) => !d.bloqueado)?.iso ?? '',
      hora: '', motivo: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // Los valores que la pantalla necesita para pintarse (equivale a valueChanges).
  const [seguro, especialidad, para, sedeId, medicoId, dia, hora] = useWatch({
    control,
    name: ['seguro', 'especialidad', 'para', 'sedeId', 'medicoId', 'dia', 'hora'],
  });

  // Lab 14: datos remotos desde la caché de TanStack Query (antes: CitasContext + efectos de carga).
  const dni = usuario?.dni;
  const familiares = useFamiliares(dni).data ?? SIN_FAMILIARES;
  // Horas ocupadas = dato externo que depende de lo elegido: la clave cambia con médico y día.
  const horasOcupadas = useHorasOcupadas(medicoId, dia);
  const ocupadas = horasOcupadas.data ?? SIN_HORAS;
  const reservarCita = useReservarCita();
  const conCandado = useCandado();

  // ?medicoId=… salta directo al paso 4 cuando ya hay datos cargados (sincroniza la URL con el formulario una sola vez).
  useEffect(() => {
    if (precargado.current || !medicoParam || medicos.length === 0 || sedes.length === 0) return;
    precargado.current = true;
    const m = medicos.find((x) => x.id === medicoParam);
    if (!m) return;
    const s = sedes.find((x) => x.id === m.sedeId);
    const actual = getValues('seguro');
    const seguroNuevo = esSeguro(seguroParam) ? seguroParam : s && !s.seguros.includes(actual) ? (s.seguros[0] ?? actual) : actual;
    const f = fechaParam ?? flujo.fecha;
    const d = dias.find((x) => x.iso === f && !x.bloqueado);
    reset({
      ...getValues(),
      seguro: seguroNuevo,
      especialidad: esEspecialidad(m.especialidad) ? m.especialidad : getValues('especialidad'),
      sedeId: m.sedeId ?? '',
      medicoId: m.id,
      ...(d ? { dia: d.iso } : {}),
    });
    setPaso(4);
  }, [medicoParam, medicos, sedes, seguroParam, fechaParam, flujo.fecha, dias, getValues, reset]);

  // ?para=<id de familiar>
  useEffect(() => {
    const f = familiares.find((x) => x.id === paraParam);
    if (paraAplicado.current || !f) return;
    paraAplicado.current = true;
    setValue('para', f.id ?? '');
    if (!medicoParam && esSeguro(f.seguro)) setValue('seguro', f.seguro);
  }, [familiares, paraParam, medicoParam, setValue]);

  // Modal accesible: al abrir, el foco va al botón Cerrar; Escape cierra; al cerrar, el foco vuelve a quien lo abrió.
  useEffect(() => {
    if (!perfilId) return;
    botonCerrar.current?.focus();
    const alTecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPerfilId('');
    };
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('keydown', alTecla);
      disparadorPerfil.current?.focus();
    };
  }, [perfilId]);

  // Al cambiar de paso, el foco va al título del paso nuevo: un lector de pantalla anuncia dónde está la persona.
  useEffect(() => {
    if (pasoAnterior.current === paso) return; // en el montaje (y en el doble montaje de StrictMode) no se mueve el foco
    pasoAnterior.current = paso;
    tituloPaso.current?.focus();
  }, [paso]);

  // Estado derivado de los valores observados.
  const perfil = medicos.find((m) => m.id === perfilId);
  const sedesDisponibles = sedes.filter((s) => s.seguros.includes(seguro) && activos.some((m) => m.sedeId === s.id && m.especialidad === especialidad));
  const medicosDisponibles = activos.filter((m) => m.sedeId === sedeId && m.especialidad === especialidad);
  const medico = medicos.find((m) => m.id === medicoId);
  const sede = sedes.find((s) => s.id === sedeId);
  const familiar = familiares.find((f) => f.id === para);
  const libres = (medico?.horario ?? []).toSorted().filter((h) => !ocupadas.includes(h) && !(dia === hoy && h <= ahora));
  const nombreSede = (id?: string): string => sedes.find((s) => s.id === id)?.nombre ?? 'Sede por asignar';

  function abrirPerfil(id: string, disparador: HTMLElement): void {
    disparadorPerfil.current = disparador;
    setPerfilId(id);
  }

  /** Cambiar algo de un paso invalida lo elegido en los pasos siguientes. */
  function limpiarDesde(campo: 'sedeId' | 'medicoId' | 'hora'): void {
    const orden = ['sedeId', 'medicoId', 'hora'] as const;
    orden.slice(orden.indexOf(campo)).forEach((c) => setValue(c, ''));
  }
  function elegirSeguro(s: Seguro): void {
    if (s === getValues('seguro')) return;
    setValue('seguro', s);
    limpiarDesde('sedeId');
  }
  function elegirSede(id: string): void {
    if (id === getValues('sedeId')) return;
    setValue('sedeId', id, { shouldValidate: true });
    limpiarDesde('medicoId');
  }
  function elegirMedico(id: string): void {
    setValue('medicoId', id, { shouldValidate: true });
    limpiarDesde('hora');
  }
  function elegirDia(d: string): void {
    setValue('dia', d);
    limpiarDesde('hora');
  }

  async function ir(p: Paso): Promise<void> {
    // Avanzar exige que el paso actual sea válido; retroceder, no.
    if (p > paso && paso <= 4) {
      const ok = await trigger([...CAMPOS_POR_PASO[paso as 1 | 2 | 3 | 4]]);
      if (!ok) return;
    }
    if (p === 2 && !getValues('sedeId') && sedesDisponibles.length === 1) setValue('sedeId', sedesDisponibles[0]?.id ?? ''); // una sola opción: ya queda elegida
    if (p === 3 && !getValues('medicoId') && medicosDisponibles.length === 1) setValue('medicoId', medicosDisponibles[0]?.id ?? '');
    reservarCita.reset(); // limpia un error de escritura anterior al cambiar de paso
    setPaso(p);
    window.scrollTo(0, 0);
  }

  async function confirmar(data: ReservaData): Promise<void> {
    if (!usuario || !medico) return;
    // Candado: dos clics rápidos solo envían UN POST (isPending tarda un render en desactivar el botón).
    await conCandado(async () => {
      // Justo antes de reservar se vuelve a leer quién tomó qué hora: alguien pudo reservarla mientras tanto.
      const tomadas = (await horasOcupadas.refetch()).data ?? [];
      if (tomadas.includes(data.hora) || !libres.includes(data.hora)) {
        setError('hora', { message: 'Esa hora ya no está disponible. Elige otra.' });
        setValue('hora', '');
        return;
      }
      await reservarCita.mutateAsync({
        dniPaciente: usuario.dni, paciente: familiar?.nombre ?? usuario.nombre, medicoId: data.medicoId, seguro: data.seguro,
        fecha: data.dia, hora: data.hora, motivo: data.motivo, ...(familiar?.id ? { familiarId: familiar.id } : {}),
      });
      // Regla 1 del md: si el POST salió bien pero la recarga de ['citas'] falla, el recibo se conserva igual.
      setPaso(5);
      window.scrollTo(0, 0);
    }).catch(() => undefined); // el error de escritura queda en reservarCita.error
  }

  function nueva(): void {
    reset({ ...getValues(), sedeId: '', medicoId: '', hora: '', motivo: '' });
    reservarCita.reset();
    setPaso(1);
    window.scrollTo(0, 0);
  }

  return (
    <section className="wrap pg-reservar" style={{ padding: '32px 20px 48px' }}>
      <div className="top">
        <Link className="btn ghost sm pillbtn" to="/panel"><i className="bi bi-arrow-left" /> Volver a mis citas</Link>
        <span className="chip">Reserva de Cita</span>
      </div>
      <form className="panel-card card" onSubmit={handleSubmit(confirmar)} noValidate>
        <h1>Reserva de cita médica</h1>
        {paso < 5 && <p className="visually-hidden" role="status">Paso {paso} de 4</p>}

        {paso === 1 && (
          <>
            <h2 className="step" ref={tituloPaso} tabIndex={-1}>Paso 1: Seleccione su seguro y especialidad</h2>
            {familiares.length > 0 && (
              <label className="campo">¿Para quién es la cita?
                <select
                  {...register('para', {
                    // Al elegir un familiar se usa su seguro.
                    onChange: (e: { target: { value: string } }) => {
                      const f = familiares.find((x) => x.id === e.target.value);
                      if (f && esSeguro(f.seguro)) elegirSeguro(f.seguro);
                    },
                  })}
                >
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
              <select className="big" {...register('especialidad', { onChange: () => limpiarDesde('sedeId') })}>
                {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
              </select>
            </label>
            <div className="nav"><button className="btn pillbtn der" type="button" onClick={() => void ir(2)}>Siguiente →</button></div>
          </>
        )}

        {paso === 2 && (
          <>
            <h2 className="step" ref={tituloPaso} tabIndex={-1}>Paso 2: Seleccione la sede o centro de salud</h2>
            <div className="lista" role="group" aria-label="Sede o centro de salud">
              {sedesDisponibles.length > 0 ? (
                sedesDisponibles.map((s) => (
                  <button key={s.id} type="button" className={`fila${sedeId === s.id ? ' on' : ''}`} aria-pressed={sedeId === s.id} onClick={() => elegirSede(s.id)}>
                    <span className="radio" aria-hidden="true" />
                    <span><b>{s.nombre}</b><small>{s.direccion}</small></span>
                  </button>
                ))
              ) : (
                <p className="tabla" role="status">{cargandoCatalogo ? 'Cargando sedes…' : `No hay sedes con ${seguro} que atiendan ${especialidad}. Vuelve atrás y prueba otra combinación.`}</p>
              )}
            </div>
            <FieldMessage id="sede-error" message={errors.sedeId?.message} />
            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => void ir(1)}>← Anterior</button>
              <button className="btn pillbtn der" type="button" disabled={!sedeId} onClick={() => void ir(3)}>Siguiente →</button>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h2 className="step" ref={tituloPaso} tabIndex={-1}>Paso 3: Seleccione al profesional de la salud</h2>
            <div className="lista">
              {medicosDisponibles.length > 0 ? (
                medicosDisponibles.map((m) => (
                  <div className="medfila" key={m.id}>
                    <button type="button" className={`fila${medicoId === m.id ? ' on' : ''}`} aria-pressed={medicoId === m.id} onClick={() => elegirMedico(m.id)}>
                      <span><b>Dr(a). {m.nombre}</b><small>CMP: {m.cmp ?? 's/n'} | {m.especialidad} (★ {decimal1(m.calificacion)})</small></span>
                      {medicoId === m.id && <span className="sel">Seleccionado</span>}
                    </button>
                    <button type="button" className="accion" onClick={(e) => abrirPerfil(m.id, e.currentTarget)}><i className="bi bi-person-circle" aria-hidden="true" /> Ver perfil</button>
                    <BotonFavorito medicoId={m.id} className={(fav) => `accion${fav ? ' fav' : ''}`}>
                      {(fav) => <><i className={fav ? 'bi bi-star-fill' : 'bi bi-star'} aria-hidden="true" /> Favorito</>}
                    </BotonFavorito>
                  </div>
                ))
              ) : (
                <p className="tabla" role="status">{cargandoCatalogo ? 'Cargando médicos…' : `No hay médicos de ${especialidad} en esta sede.`}</p>
              )}
            </div>
            <FieldMessage id="medico-error" message={errors.medicoId?.message} />
            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => void ir(2)}>← Anterior</button>
              <button className="btn pillbtn der" type="button" disabled={!medicoId} onClick={() => void ir(4)}>Siguiente →</button>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <h2 className="step" ref={tituloPaso} tabIndex={-1}>Paso 4: Escoge fecha y hora</h2>
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
                  <button key={h} type="button" className={`hora${hora === h ? ' on' : ''}`} aria-pressed={hora === h} onClick={() => setValue('hora', h, { shouldValidate: true })}>{h}</button>
                ))
              ) : (
                <p className="tabla" role="status" style={{ gridColumn: '1/-1', margin: 0 }}>{horasOcupadas.isFetching ? 'Buscando horarios…' : 'No hay horarios libres este día. Elige otro día.'}</p>
              )}
            </div>
            <FieldMessage id="hora-error" message={errors.hora?.message} />
            <p className="err" role="alert">{textoError(horasOcupadas.error)}</p>

            <Campo className="campo" label="Motivo de consulta" error={errors.motivo?.message}>{(a11y) => <input maxLength={120} placeholder="Ej. Dolor de cabeza" {...a11y} {...register('motivo')} />}</Campo>
            {reservarCita.error && <p className="err" role="alert">No se registró la cita. {textoError(reservarCita.error)}</p>}

            <div className="nav">
              <button className="btn ghost pillbtn" type="button" onClick={() => void ir(3)}>← Anterior</button>
              <button className="btn pillbtn confirmar der" type="submit" disabled={reservarCita.isPending || horasOcupadas.isFetching}>{reservarCita.isPending ? 'Reservando…' : 'Confirmar Reserva'}</button>
            </div>
          </>
        )}

        {paso === 5 && (
          <div className="ok" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <h2 ref={tituloPaso} tabIndex={-1}>¡Cita confirmada exitosamente!</h2>
            <p>Se ha agregado a tus citas pendientes.{reservarCita.data && <> N.º de cita: <b>{reservarCita.data.id}</b>.</>}</p>
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
      </form>

      {perfil && (
        <div className="overlay" onClick={() => setPerfilId('')}>
          <div className="ventana" role="dialog" aria-modal="true" aria-labelledby="perfil-tit" onClick={(e) => e.stopPropagation()}>
            <button ref={botonCerrar} type="button" className="cerrar" aria-label="Cerrar perfil" onClick={() => setPerfilId('')}>✕</button>
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
