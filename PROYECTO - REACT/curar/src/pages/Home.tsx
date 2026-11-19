import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TarjetaMedico } from '../components/TarjetaMedico';
import { useAuth } from '../context/AuthContext';
import { useCatalogo } from '../queries/catalogo';
import { useFlujo } from '../context/FlujoContext';
import { busquedaInicial, busquedaSchema, type BusquedaData, type BusquedaInput } from '../model/busqueda';
import { isoLocal } from '../utils/formato';

const TOTAL_SLIDES = 2;

export function Home() {
  const { usuario } = useAuth();
  // Lab 14: los médicos vienen de la caché de TanStack Query (antes: CitasContext + cargarMedicos en un efecto).
  const { activos, cargando, error } = useCatalogo();
  // Con más de 100 médicos, el inicio muestra solo los 8 mejor calificados; se recalcula solo si cambia la lista.
  const destacados = useMemo(() => activos.toSorted((a, b) => b.calificacion - a.calificacion).slice(0, 8), [activos]);
  const { actualizarFlujo } = useFlujo();
  const navigate = useNavigate();
  const [indice, setIndice] = useState(0);
  // Pausa mientras el puntero o el foco están sobre el carrusel (WCAG 2.2.2: el movimiento automático debe poder detenerse).
  const [pausado, setPausado] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BusquedaInput, unknown, BusquedaData>({
    resolver: zodResolver(busquedaSchema),
    defaultValues: busquedaInicial(),
  });
  const hoy = isoLocal(new Date());

  // Lee `pausado` reciente en cada tic sin que el temporizador dependa de él.
  const avanzar = useEffectEvent(() => {
    if (!pausado) setIndice((actual) => (actual + 1) % TOTAL_SLIDES);
  });

  // Carrusel automático (sistema externo: un temporizador), salvo que la persona prefiera menos movimiento.
  // Se instala UNA vez: pausar o reanudar no lo reinicia gracias a useEffectEvent.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const temporizador = setInterval(() => avanzar(), 6500);
    return () => clearInterval(temporizador);
  }, []);

  function buscar(data: BusquedaData): void {
    actualizarFlujo({ seguro: data.seguro, tipo: data.centro, especialidad: data.especialidad, fecha: data.fecha, sede: null });
    void navigate('/sede');
  }

  const cta = usuario ? null : (
    <div className="cta">
      <Link className="btn" to="/registro">Crear cuenta</Link>
      <Link className="btn ghost" to="/login">Ya tengo cuenta</Link>
    </div>
  );

  return (
    <>
      <div
        className="hero" id="inicio" aria-roledescription="carrusel" aria-label="Presentación de Curar"
        onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}
        onFocus={() => setPausado(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPausado(false); // el foco salió del carrusel
        }}
      >
        <div className={`slide s1${indice === 0 ? ' on' : ''}`} aria-hidden={indice !== 0} inert={indice !== 0}>
          <svg className="art" viewBox="0 0 400 400" aria-hidden="true">
            <g fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2">
              <path d="M200 20 360 80v120c0 90-70 150-160 190C110 350 40 290 40 200V80z" fill="#fff" fillOpacity=".12" />
              <path d="M200 70 320 112v88c0 66-50 110-120 142-70-32-120-76-120-142v-88z" fill="#fff" fillOpacity=".14" />
              <path d="M200 120 280 148v52c0 44-32 74-80 96-48-22-80-52-80-96v-52z" fill="#fff" fillOpacity=".2" />
            </g>
            <rect x="150" y="150" width="100" height="100" rx="26" fill="#000B33" />
            <path d="M190 172h20v18h18v20h-18v18h-20v-18h-18v-20h18z" fill="#fff" />
          </svg>
          <div className="wrap copy">
            <h1>Tu cita médica, sin colas ni vueltas.</h1>
            <p>Reserva con EsSalud o SIS, elige tu sede y revisa la disponibilidad de tu médico desde el celular.</p>
            {cta}
          </div>
        </div>

        <div className={`slide s2${indice === 1 ? ' on' : ''}`} aria-hidden={indice !== 1} inert={indice !== 1}>
          <div className="mock" aria-hidden="true">
            <div className="doc">
              <div className="avatar" />
              <div><b>Dr. Franco Espinola</b><br /><small>Medicina General · Hospital Central</small></div>
            </div>
            <div className="hours">
              <span className="off">08:00</span><span>09:30</span><span className="pick">10:00</span><span>11:15</span><span className="off">12:00</span><span>15:30</span>
            </div>
          </div>
          <div className="wrap copy">
            <h1>Mira cuándo atiende tu médico, en tiempo real.</h1>
            <p>Elige fecha y hora libres, confirma tu cita y guarda a tus médicos favoritos.</p>
            {cta}
          </div>
        </div>

        <div className="finder">
          <form onSubmit={handleSubmit(buscar)} noValidate>
            <label>Seguro
              <select {...register('seguro')}><option>EsSalud</option><option>SIS</option></select>
            </label>
            <label>Tipo de centro
              <select {...register('centro')}><option>Hospitales</option><option>Policlínicos</option><option>Clínicas</option></select>
            </label>
            <label>Especialidad
              <select {...register('especialidad')}><option>Medicina General</option><option>Pediatría</option><option>Cardiología</option></select>
            </label>
            <label>Fecha
              <input type="date" min={hoy} aria-invalid={Boolean(errors.fecha)} {...register('fecha')} />
            </label>
            <button className="btn" type="submit">Ver disponibilidad</button>
          </form>
          <p id="result" role="status" aria-live="polite">{errors.fecha?.message}</p>
        </div>
      </div>

      <section>
        <div className="wrap">
          <div className="mission">
            <h2>Gestionar una cita en el sector público no debería tomar medio día. <span>Curar lo reduce a cuatro pasos desde tu celular.</span></h2>
            <p>La mayoría de hogares peruanos ya tiene un celular con internet. Diseñamos para pantallas pequeñas, letra legible y pocos toques, pensando también en personas mayores que necesitan atención rápida.</p>
          </div>
          <div className="stats" role="list">
            <div role="listitem"><b>4</b><span>pasos para reservar</span></div>
            <div role="listitem"><b>94<i>%</i></b><span>de hogares con un celular con internet*</span></div>
            <div role="listitem"><b>3</b><span>tipos de centro: hospital, policlínico, clínica</span></div>
            <div role="listitem"><b>2</b><span>seguros: EsSalud y SIS</span></div>
          </div>
          <p className="sources">*Más de 94 % de hogares con al menos un dispositivo móvil con acceso a internet (Osiptel/Erestel, datos a 2023).</p>
        </div>
      </section>

      <section id="reserva" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="sec">Reserva en cuatro pasos</h2>
          <ol className="steps">
            <li><b>1</b><h3>Elige tu seguro</h3><p>EsSalud o SIS, para mostrarte solo lo que te corresponde.</p></li>
            <li><b>2</b><h3>Elige tu sede</h3><p>Hospitales, policlínicos o clínicas cercanas.</p></li>
            <li><b>3</b><h3>Elige a tu médico</h3><p>Revisa su perfil, calificación y reconocimientos.</p></li>
            <li><b>4</b><h3>Escoge fecha y hora</h3><p>Confirma y recibe tu cita en “Mis citas”.</p></li>
          </ol>
        </div>
      </section>

      <section id="servicios" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="panel">
            <div><h2>Tú te atiendes. Nosotros ordenamos el resto.</h2><p>Todo lo que necesitas antes y después de la consulta, en un solo lugar.</p></div>
            <div className="feat">
              <article><span className="ic"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></svg></span><h3>Mis citas</h3><p>Reserva, reprograma y revisa tu historial de citas con fecha y médico.</p></article>
              <article><span className="ic"><svg viewBox="0 0 24 24"><path d="M9 3h6v4H9zM6 7h12v14H6zM12 11v6M9 14h6" /></svg></span><h3>Recetas médicas</h3><p>Fecha, médico, medicamento y cantidad, ordenados para consultar cuando los necesites.</p></article>
              <article><span className="ic"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" /></svg></span><h3>Médicos favoritos</h3><p>Guarda a quien te atendió bien y vuelve a reservar con un toque.</p></article>
              <article><span className="ic"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" /></svg></span><h3>Mensajes</h3><p>Escribe a tu centro de salud y filtra entre enviados y recibidos.</p></article>
            </div>
          </div>
        </div>
      </section>

      <section id="medicos" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="sec">Conoce a los médicos</h2>
          <div className="docs">
            {destacados.length === 0 ? (
              <p role="status">{cargando ? 'Cargando médicos…' : 'Aún no hay médicos disponibles.'}</p>
            ) : (
              destacados.map((m) => (
                <TarjetaMedico
                  key={m.id}
                  medico={m}
                  onReservar={(id) => void navigate(`/reservar?medicoId=${encodeURIComponent(id)}`)}
                  onPerfil={(id) => void navigate(`/medicos/${encodeURIComponent(id)}`)}
                />
              ))
            )}
          </div>
          {activos.length > destacados.length && <p style={{ marginTop: 16 }}><Link className="btn ghost" to="/seguro">Ver los {activos.length} médicos</Link></p>}
          <p className="note" role="alert">{error}</p>
        </div>
      </section>

      <section id="perfiles" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="roles">
            <div className="role"><h3>Soy paciente</h3><p>Crea tu cuenta con tu DNI y reserva tu primera cita hoy.</p><Link className="btn" to="/registro">Crear cuenta</Link></div>
            <div className="role dark"><h3>Soy médico</h3><p>Ingresa con tu código de colegiatura (CMP) para gestionar tu agenda y programar citas.</p><Link className="btn brand" to="/login">Ingresar como médico</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
