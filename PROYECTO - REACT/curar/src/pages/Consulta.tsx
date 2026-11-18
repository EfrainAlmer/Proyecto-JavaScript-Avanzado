import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { InformeFields } from '../components/consulta/InformeFields';
import { RecetasFields } from '../components/consulta/RecetasFields';
import { SignosVitalesFields } from '../components/consulta/SignosVitalesFields';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { consultaInicial, consultaSchema, type ConsultaData, type ConsultaInput } from '../model/consulta';
import { curarApi } from '../services/curarApi';
import { mensajeHttp } from '../services/mensajeHttp';
import type { Cita, Informe, Receta } from '../types/cita';
import { diaMesCompleto, hora12 } from '../utils/formato';
import './Consulta.css';

export function Consulta() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const carga = useCarga(); // solo para cargar la cita
  const { ejecutar } = carga;
  const [cita, setCita] = useState<Cita | null>(null);
  const [ajena, setAjena] = useState(false);
  /** null = aún no se finaliza; número = recetas emitidas (pantalla de éxito). */
  const [emitidas, setEmitidas] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Evitan duplicar registros si hay que reintentar tras un fallo parcial.
  const informeGuardado = useRef(false);
  const recetasGuardadas = useRef(false);
  const medicoId = usuario?.medicoId;

  const methods = useForm<ConsultaInput, unknown, ConsultaData>({
    resolver: zodResolver(consultaSchema),
    defaultValues: consultaInicial(),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });
  const { handleSubmit, reset, setError, clearErrors, formState: { errors, isSubmitting } } = methods;

  useEffect(() => {
    let vigente = true;
    void ejecutar(curarApi.cita(id)).then((r) => {
      if (!vigente || !r.ok) return;
      if (r.valor.medicoId !== medicoId) {
        setAjena(true);
        return;
      }
      setCita(r.valor);
      reset(consultaInicial(r.valor.motivo)); // el motivo llega de la API: se precarga con reset
    });
    return () => {
      vigente = false;
    };
  }, [id, medicoId, ejecutar, reset]);

  async function finalizar(data: ConsultaData): Promise<void> {
    if (!cita || !usuario) return;
    clearErrors('root.server');
    const fecha = new Date().toLocaleDateString('sv-SE');
    const paciente = cita.paciente ?? '';
    const base = { citaId: cita.id, dniPaciente: cita.dniPaciente, paciente, medicoId: cita.medicoId, medicoNombre: usuario.nombre, fecha };
    const { recetas, presion, frecuencia, ...informe } = data;
    const nuevoInforme: Informe = { ...base, ...informe, ...(presion ? { presion } : {}), ...(frecuencia === undefined ? {} : { frecuencia }) };
    const lista: Receta[] = recetas.map((r) => ({ ...base, ...r }));
    try {
      if (!informeGuardado.current) {
        await curarApi.crearInforme(nuevoInforme);
        informeGuardado.current = true;
      }
      if (!recetasGuardadas.current && lista.length > 0) {
        await Promise.all(lista.map((r) => curarApi.crearReceta(r)));
        recetasGuardadas.current = true;
      }
      await curarApi.cambiarEstado(cita.id, 'Atendida');
      setEmitidas(lista.length);
      window.scrollTo(0, 0);
    } catch (e) {
      setError('root.server', { message: mensajeHttp(e) });
    }
  }

  function enfocarPrimerError(): void {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  return (
    <section className="wrap pg-consulta" style={{ padding: '32px 20px 48px' }}>
      <div className="co-top">
        <Link className="btn ghost sm co-pill" to="/panel-medico"><i className="bi bi-arrow-left" aria-hidden="true" /> Volver al panel</Link>
        <span className="co-chip">Atención médica</span>
      </div>

      {cita ? (
        emitidas !== null ? (
          <div className="co-ok" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <h1>Atención registrada</h1>
            <p>
              El informe de {cita.paciente ?? 'el paciente'} quedó guardado y la cita figura como atendida.
              {emitidas > 0 && ` Se emitió ${emitidas} ${emitidas === 1 ? 'receta' : 'recetas'}.`}
            </p>
            <div className="co-acc"><Link className="btn co-pill" to="/panel-medico">Volver al panel</Link></div>
          </div>
        ) : cita.estado === 'Atendida' || cita.estado === 'Cancelada' ? (
          <p className="tabla" role="status">Esta cita ya está {cita.estado === 'Atendida' ? 'atendida' : 'cancelada'}, por lo que no se puede iniciar una atención.</p>
        ) : (
          <>
            <article className="co-pac">
              <span className="co-badge">PACIENTE EN ATENCIÓN</span>
              <h1>{cita.paciente ?? 'Paciente'}</h1>
              <p className="co-id">DNI: {cita.dniPaciente} | {cita.seguro}</p>
              <div className="co-datos">
                <p><i className="bi bi-clock" aria-hidden="true" /> {diaMesCompleto(cita.fecha)} · {hora12(cita.hora)}</p>
                <p><i className="bi bi-chat-left-text" aria-hidden="true" /> Motivo de la cita: {cita.motivo ?? 'No indicado'}</p>
              </div>
            </article>

            {/* FormProvider comparte los métodos con los sub-formularios sin pasar props. */}
            <FormProvider {...methods}>
              <form ref={formRef} onSubmit={handleSubmit(finalizar, enfocarPrimerError)} noValidate>
                <fieldset disabled={isSubmitting} style={{ border: 0, padding: 0, margin: 0 }}>
                  <SignosVitalesFields />
                  <InformeFields />
                  <RecetasFields />
                  <p className="err" role="alert">{errors.root?.['server']?.message}</p>
                  <div className="co-barra">
                    <Link className="btn ghost co-pill" to="/panel-medico">Cancelar</Link>
                    <button className="btn co-pill co-final" type="submit">{isSubmitting ? 'Guardando…' : 'Finalizar atención'}</button>
                  </div>
                </fieldset>
              </form>
            </FormProvider>
          </>
        )
      ) : (
        <p className="tabla" role="status">{carga.cargando ? 'Cargando cita…' : ajena ? 'Esta cita no pertenece a tu agenda.' : carga.error || 'No encontramos la cita.'}</p>
      )}
    </section>
  );
}
