import { useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCandado } from '../hooks/useCandado';
import { useCatalogo } from '../queries/catalogo';
import { useCitasMedico, useCambiarEstadoCita } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';
import type { Cita, EstadoCita } from '../types/cita';
import { fechaCompleta, fechaCorta, hora24, isoLocal } from '../utils/formato';
import { ordenarAgenda, porAtenderDesde } from '../utils/agenda';
import { usePaginado } from '../hooks/usePaginado';
import { MostrarMas } from '../components/MostrarMas';
import { coincide } from '../utils/texto';
import './PanelMedico.css';

type Filtro = 'Todas' | 'Pendiente' | 'Confirmada' | 'Atendida';
const FILTROS: readonly { readonly id: Filtro; readonly texto: string }[] = [
  { id: 'Todas', texto: 'Todas' },
  { id: 'Pendiente', texto: 'Pendientes' },
  { id: 'Confirmada', texto: 'Confirmadas' },
  { id: 'Atendida', texto: 'Atendidas' },
];

/** Solo la primera letra: con text-transform: capitalize salía "19 De Noviembre". */
const mayuscula = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

const saludoDe = (fecha: Date): string => {
  const h = fecha.getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

/** Arreglo vacío estable: `?? []` crearía uno nuevo en cada render e invalidaría los useMemo de abajo. */
const SIN_CITAS: readonly Cita[] = [];

export function PanelMedico() {
  const { usuario } = useAuth();
  const { medicos, sedes } = useCatalogo(); // médicos y sedes: caché de TanStack Query
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('Todas');
  const [confirmando, setConfirmando] = useState('');
  const [hoy] = useState(() => new Date());
  const hoyIso = isoLocal(hoy);
  const medicoId = usuario?.medicoId;
  const lectura = useCitasMedico(medicoId);
  const cambiarEstado = useCambiarEstadoCita();
  const conCandado = useCandado();
  const citasMedico = lectura.data ?? SIN_CITAS;
  const cargando = lectura.isLoading;
  const guardando = cambiarEstado.isPending;
  const error = textoError(lectura.error ?? cambiarEstado.error);

  // Lee la consulta actual sin que el listener dependa de ella (Lab 13); recarga con TanStack Query (Lab 14).
  const refrescarAgenda = useEffectEvent(() => {
    if (medicoId) void lectura.refetch();
  });

  // Al volver a esta pestaña, la agenda se recarga: otra persona pudo reservar o cancelar mientras tanto.
  useEffect(() => {
    const alCambiarVisibilidad = (): void => {
      if (document.visibilityState === 'visible') refrescarAgenda();
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }, []);

  // Estado derivado: todo se calcula a partir de citasMedico + filtros.
  const miMedico = medicos.find((m) => m.id === medicoId);
  const miSede = sedes.find((s) => s.id === miMedico?.sedeId)?.nombre ?? 'Sede por asignar';
  const paraHoy = citasMedico.filter((c) => c.fecha === hoyIso && c.estado !== 'Cancelada').length;
  const cuenta = (e: EstadoCita): number => citasMedico.filter((c) => c.estado === e).length;
  // Con cientos de citas por médico, la búsqueda usa el texto diferido y el resultado se memoriza.
  const qDiferida = useDeferredValue(q);
  const visibles = useMemo(
    () => ordenarAgenda(citasMedico.filter((c) => (filtro === 'Todas' || c.estado === filtro) && coincide(`${c.paciente ?? ''} ${c.dniPaciente}`, qDiferida)), hoyIso),
    [citasMedico, filtro, qDiferida, hoyIso],
  );
  // Bloques de 10: el panel muestra lo próximo; el resto se carga a demanda.
  const pagina = usePaginado(visibles, `${filtro}|${qDiferida}`, 10);
  // No depende de la búsqueda: escribir en el buscador no lo recalcula. Solo cuenta citas de hoy en adelante.
  const porAtender = useMemo(() => porAtenderDesde(citasMedico, hoyIso), [citasMedico, hoyIso]);
  const siguiente = porAtender[0];
  const restantes = Math.max(0, porAtender.length - 1);
  const diaDe = (fecha: string): string => (fecha === hoyIso ? 'Hoy' : fechaCorta(fecha));

  function confirmar(id: string): void {
    void conCandado(() => cambiarEstado.mutateAsync({ id, estado: 'Confirmada' })).catch(() => undefined);
  }

  function cancelar(id: string): void {
    void conCandado(() => cambiarEstado.mutateAsync({ id, estado: 'Cancelada' })).then(() => setConfirmando(''), () => undefined);
  }

  return (
    <section className="wrap pg-panel-medico" style={{ padding: '32px 20px 48px' }}>
      <header className="pm-cab">
        <div>
          <h1 className="pm-saludo">{saludoDe(hoy)}, Dr(a). {usuario?.nombre}</h1>
          <p className="pm-sub">
            {miMedico && <><span className="pm-cmp">CMP: {miMedico.cmp ?? 's/n'}</span> Servicio de {miMedico.especialidad} · {miSede}</>}
          </p>
        </div>
        <div className="pm-fecha"><i className="bi bi-calendar3" aria-hidden="true" /> {mayuscula(fechaCompleta(hoy))}</div>
      </header>

      <div className="pm-stats" role="list">
        <article className="pm-stat" role="listitem"><p>Citas para hoy</p><strong>{paraHoy}</strong></article>
        <article className="pm-stat" role="listitem"><p>Pendientes</p><strong className="pend">{cuenta('Pendiente')}</strong></article>
        <article className="pm-stat" role="listitem"><p>Confirmadas</p><strong className="conf">{cuenta('Confirmada')}</strong></article>
        <article className="pm-stat" role="listitem"><p>Atendidas</p><strong className="aten">{cuenta('Atendida')}</strong></article>
      </div>

      <p className="err" role="alert">{error}</p>

      <div className="pm-cols">
        <section className="pm-card" aria-labelledby="agenda-tit">
          <div className="pm-card-cab">
            <h2 id="agenda-tit"><i className="bi bi-list-check" aria-hidden="true" /> Agenda y Gestión de Citas</h2>
            <input className="pm-buscar" type="search" name="buscar" placeholder="Buscar DNI o paciente…" aria-label="Buscar por DNI o paciente" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="pm-filtros" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.id} type="button" className={`pm-chip${filtro === f.id ? ' on' : ''}`} data-f={f.id} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.texto}</button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className="tabla" role="status">{cargando ? 'Cargando…' : 'No hay citas para esta vista.'}</p>
          ) : (
            pagina.visibles.map((c) => (
              <article className="pm-cita" key={c.id} data-estado={c.estado}>
                <div className="pm-hora">
                  <strong>{hora24(c.hora)}</strong>
                  <small>{diaDe(c.fecha)}</small>
                  <span className="pill" data-estado={c.estado}>{c.estado}</span>
                </div>
                <div className="pm-pac">
                  <b>{c.paciente ?? 'Paciente'}</b>
                  <span>DNI {c.dniPaciente} · <em className="pm-seg">{c.seguro}</em></span>
                  <small>Motivo: {c.motivo ?? 'No indicado'}</small>
                </div>
                <div className="pm-acc">
                  {(c.estado === 'Pendiente' || c.estado === 'Confirmada') &&
                    (confirmando === `c:${c.id}` ? (
                      <>
                        <button className="btn pm-b pm-rojo" type="button" disabled={guardando} onClick={() => cancelar(c.id)}>Sí, cancelar</button>
                        <button className="btn ghost pm-b" type="button" onClick={() => setConfirmando('')}>No</button>
                      </>
                    ) : (
                      <>
                        {/* Pendiente → Confirmar (pasa a la pestaña Confirmadas); solo una cita confirmada se atiende. */}
                        {c.estado === 'Pendiente' ? (
                          <button className="btn pm-b" type="button" disabled={guardando} onClick={() => confirmar(c.id)}>Confirmar</button>
                        ) : (
                          <Link className="btn pm-b" to={`/consulta/${encodeURIComponent(c.id)}`}>Atender</Link>
                        )}
                        <button className="btn ghost pm-b pm-cancelar" type="button" onClick={() => setConfirmando(`c:${c.id}`)}>Cancelar</button>
                      </>
                    ))}
                  {c.estado === 'Atendida' && (
                    <Link className="btn ghost pm-b" to="/agenda"><i className="bi bi-file-earmark-text" aria-hidden="true" /> Ver receta</Link>
                  )}
                </div>
              </article>
            ))
          )}
          <MostrarMas paginado={pagina} unidad="citas" />
        </section>

        <aside className="pm-lado">
          <article className="pm-sig" aria-live="polite">
            {siguiente ? (
              <>
                <span className="pm-badge">SIGUIENTE PACIENTE</span>
                <h2>{siguiente.paciente ?? 'Paciente'}</h2>
                <p className="pm-sig-id">DNI: {siguiente.dniPaciente} | {siguiente.seguro}</p>
                <div className="pm-sig-datos">
                  <p><i className="bi bi-clock" aria-hidden="true" /> {diaDe(siguiente.fecha)} · {hora24(siguiente.hora)}</p>
                  <p><i className="bi bi-chat-left-text" aria-hidden="true" /> Motivo: {siguiente.motivo ?? 'No indicado'}</p>
                </div>
                {confirmando === `a:${siguiente.id}` ? (
                  <Link className="btn brand pm-sig-b1" to={`/consulta/${encodeURIComponent(siguiente.id)}`}><i className="bi bi-clipboard2-pulse" aria-hidden="true" /> Iniciar atención</Link>
                ) : (
                  <button className="btn brand pm-sig-b1" type="button" onClick={() => setConfirmando(`a:${siguiente.id}`)}><i className="bi bi-clipboard2-pulse" aria-hidden="true" /> Iniciar atención</button>
                )}
                <Link className="pm-sig-b2" to="/agenda"><i className="bi bi-prescription2" aria-hidden="true" /> Emitir receta médica</Link>
                {restantes > 0 && <small className="pm-sig-mas">Después de este: {restantes} {restantes === 1 ? 'paciente más' : 'pacientes más'} por atender.</small>}
              </>
            ) : (
              <>
                <span className="pm-badge pm-badge-off">SIN PENDIENTES</span>
                <h2>No tienes pacientes pendientes</h2>
                <p className="pm-sig-id">Cuando haya nuevas citas aparecerán aquí.</p>
              </>
            )}
          </article>
          <p style={{ marginTop: 16 }}>
            <Link to="/gestion-citas" className="btn ghost">Gestión de citas</Link>{' '}
            <Link to="/agenda" className="btn ghost">Agenda y recetas</Link>
          </p>
        </aside>
      </div>
    </section>
  );
}
