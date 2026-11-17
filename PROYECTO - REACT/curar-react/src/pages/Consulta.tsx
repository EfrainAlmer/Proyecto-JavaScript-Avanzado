import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { curarApi } from '../services/curarApi';
import { mensajeHttp } from '../services/mensajeHttp';
import type { Cita, Informe, Receta } from '../types/cita';
import { diaMesCompleto, hora12 } from '../utils/formato';
import { PATRON_PRESION } from '../utils/validacion';
import './Consulta.css';

interface FilaReceta {
  readonly clave: number;
  readonly medicamento: string;
  readonly cantidad: number;
  readonly indicaciones: string;
}

interface InformeValores {
  readonly presion: string;
  readonly frecuencia: string;
  readonly sintomas: string;
  readonly hallazgos: string;
  readonly diagnostico: string;
  readonly plan: string;
}

const INICIAL: InformeValores = { presion: '', frecuencia: '', sintomas: '', hallazgos: '', diagnostico: '', plan: '' };

/** Devuelve, por campo, si es inválido (los signos vitales son opcionales). */
function validar(v: InformeValores, recetas: readonly FilaReceta[]): Record<string, boolean> {
  const frecuencia = v.frecuencia.trim() === '' ? null : Number(v.frecuencia);
  const errores: Record<string, boolean> = {
    presion: v.presion !== '' && !PATRON_PRESION.test(v.presion),
    frecuencia: frecuencia !== null && (!Number.isFinite(frecuencia) || frecuencia < 30 || frecuencia > 220),
    sintomas: v.sintomas.length < 3,
    hallazgos: v.hallazgos.length < 5,
    diagnostico: v.diagnostico.length < 3,
    plan: v.plan.length < 5,
  };
  recetas.forEach((r) => {
    errores[`${r.clave}.medicamento`] = r.medicamento.length < 3;
    errores[`${r.clave}.cantidad`] = !Number.isFinite(r.cantidad) || r.cantidad < 1 || r.cantidad > 99;
    errores[`${r.clave}.indicaciones`] = r.indicaciones.length < 5;
  });
  return errores;
}

export function Consulta() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { cargando, error, setError, ejecutar } = useCarga();
  const [cita, setCita] = useState<Cita | null>(null);
  const [valores, setValores] = useState<InformeValores>(INICIAL);
  const [recetas, setRecetas] = useState<readonly FilaReceta[]>([]);
  const [tocados, setTocados] = useState<ReadonlySet<string>>(() => new Set());
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [ajena, setAjena] = useState(false);
  const [nRecetas, setNRecetas] = useState(0);
  const siguienteClave = useRef(0);
  // Evitan duplicar registros si hay que reintentar tras un fallo.
  const informeGuardado = useRef(false);
  const recetasGuardadas = useRef(false);
  const medicoId = usuario?.medicoId;

  useEffect(() => {
    let vigente = true;
    void ejecutar(curarApi.cita(id)).then((r) => {
      if (!vigente || !r.ok) return;
      if (r.valor.medicoId !== medicoId) {
        setAjena(true);
        return;
      }
      setCita(r.valor);
      setValores((actual) => ({ ...actual, sintomas: r.valor.motivo ?? '' }));
    });
    return () => {
      vigente = false;
    };
  }, [id, medicoId, ejecutar]);

  const errores = validar(valores, recetas);
  const invalido = Object.values(errores).some(Boolean);
  const malo = (campo: string): boolean => errores[campo] === true && (intento || tocados.has(campo));
  const tocar = (campo: string): void => setTocados((actuales) => new Set(actuales).add(campo));
  const cambiar = (campo: keyof InformeValores, valor: string): void => setValores((actual) => ({ ...actual, [campo]: valor }));
  const cambiarReceta = (clave: number, cambios: Partial<Omit<FilaReceta, 'clave'>>): void =>
    setRecetas((l) => l.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)));

  function agregar(): void {
    siguienteClave.current += 1;
    const clave = siguienteClave.current;
    setRecetas((l) => [...l, { clave, medicamento: '', cantidad: 1, indicaciones: '' }]);
  }

  async function finalizar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    setIntento(true);
    if (!cita || !usuario || guardando) return;
    if (invalido) return;
    const fecha = new Date().toLocaleDateString('sv-SE');
    const paciente = cita.paciente ?? '';
    const presion = valores.presion.trim();
    const informe: Informe = {
      citaId: cita.id, dniPaciente: cita.dniPaciente, paciente, medicoId: cita.medicoId, medicoNombre: usuario.nombre, fecha,
      ...(presion ? { presion } : {}), ...(valores.frecuencia.trim() !== '' ? { frecuencia: Number(valores.frecuencia) } : {}),
      sintomas: valores.sintomas.trim(), hallazgos: valores.hallazgos.trim(), diagnostico: valores.diagnostico.trim(), plan: valores.plan.trim(),
    };
    const lista: Receta[] = recetas.map((r) => ({
      citaId: cita.id, dniPaciente: cita.dniPaciente, paciente, medicoId: cita.medicoId, medicoNombre: usuario.nombre, fecha,
      medicamento: r.medicamento.trim(), cantidad: r.cantidad, indicaciones: r.indicaciones.trim(),
    }));
    setGuardando(true);
    setError('');
    try {
      if (!informeGuardado.current) {
        await curarApi.crearInforme(informe);
        informeGuardado.current = true;
      }
      if (!recetasGuardadas.current && lista.length > 0) {
        await Promise.all(lista.map((r) => curarApi.crearReceta(r)));
        recetasGuardadas.current = true;
      }
      await curarApi.cambiarEstado(cita.id, 'Atendida');
      setNRecetas(lista.length);
      setListo(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setError(mensajeHttp(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="wrap pg-consulta" style={{ padding: '32px 20px 48px' }}>
      <div className="co-top">
        <Link className="btn ghost sm co-pill" to="/panel-medico"><i className="bi bi-arrow-left" aria-hidden="true" /> Volver al panel</Link>
        <span className="co-chip">Atención médica</span>
      </div>

      {cita ? (
        listo ? (
          <div className="co-ok" role="status">
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <h1>Atención registrada</h1>
            <p>
              El informe de {cita.paciente ?? 'el paciente'} quedó guardado y la cita figura como atendida.
              {nRecetas > 0 && ` Se emitió ${nRecetas} ${nRecetas === 1 ? 'receta' : 'recetas'}.`}
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

            <form onSubmit={(e) => void finalizar(e)} noValidate>
              <section className="co-sec" aria-labelledby="t-vitales">
                <h2 id="t-vitales"><i className="bi bi-heart-pulse" aria-hidden="true" /> Signos vitales <small>(opcional)</small></h2>
                <div className="co-grid">
                  <label>Presión arterial (mmHg)
                    <input value={valores.presion} placeholder="120/80" inputMode="numeric" aria-invalid={malo('presion')} onChange={(e) => cambiar('presion', e.target.value)} onBlur={() => tocar('presion')} />
                  </label>
                  <label>Frecuencia cardíaca (lpm)
                    <input type="number" value={valores.frecuencia} placeholder="72" min={30} max={220} aria-invalid={malo('frecuencia')} onChange={(e) => cambiar('frecuencia', e.target.value)} onBlur={() => tocar('frecuencia')} />
                  </label>
                </div>
                {(malo('presion') || malo('frecuencia')) && <p className="err" role="alert">Presión con formato 120/80 y frecuencia entre 30 y 220.</p>}
              </section>

              <section className="co-sec" aria-labelledby="t-informe">
                <h2 id="t-informe"><i className="bi bi-journal-medical" aria-hidden="true" /> Informe de atención</h2>
                <label>Síntomas y motivo de consulta
                  <textarea rows={3} value={valores.sintomas} aria-invalid={malo('sintomas')} onChange={(e) => cambiar('sintomas', e.target.value)} onBlur={() => tocar('sintomas')} />
                </label>
                <label>Hallazgos del examen
                  <textarea rows={3} value={valores.hallazgos} placeholder="Qué encontró en la evaluación" aria-invalid={malo('hallazgos')} onChange={(e) => cambiar('hallazgos', e.target.value)} onBlur={() => tocar('hallazgos')} />
                </label>
                <label>Diagnóstico
                  <input value={valores.diagnostico} placeholder="Ej. Cefalea tensional" aria-invalid={malo('diagnostico')} onChange={(e) => cambiar('diagnostico', e.target.value)} onBlur={() => tocar('diagnostico')} />
                </label>
                <label>Plan e indicaciones
                  <textarea rows={3} value={valores.plan} placeholder="Tratamiento, controles, recomendaciones" aria-invalid={malo('plan')} onChange={(e) => cambiar('plan', e.target.value)} onBlur={() => tocar('plan')} />
                </label>
              </section>

              <section className="co-sec" aria-labelledby="t-receta">
                <h2 id="t-receta"><i className="bi bi-prescription2" aria-hidden="true" /> Receta médica <small>(opcional)</small></h2>
                <div>
                  {recetas.length > 0 ? (
                    recetas.map((r, i) => (
                      <div className="co-med" key={r.clave}>
                        <label>Medicamento
                          <input value={r.medicamento} placeholder="Ej. Paracetamol 500 mg" aria-invalid={malo(`${r.clave}.medicamento`)} onChange={(e) => cambiarReceta(r.clave, { medicamento: e.target.value })} onBlur={() => tocar(`${r.clave}.medicamento`)} />
                        </label>
                        <label>Cantidad (envases)
                          <input type="number" value={r.cantidad} min={1} max={99} aria-invalid={malo(`${r.clave}.cantidad`)} onChange={(e) => cambiarReceta(r.clave, { cantidad: e.target.valueAsNumber })} onBlur={() => tocar(`${r.clave}.cantidad`)} />
                        </label>
                        <label className="co-ind">Indicaciones
                          <input value={r.indicaciones} placeholder="Ej. Una tableta cada 8 horas por 3 días" aria-invalid={malo(`${r.clave}.indicaciones`)} onChange={(e) => cambiarReceta(r.clave, { indicaciones: e.target.value })} onBlur={() => tocar(`${r.clave}.indicaciones`)} />
                        </label>
                        <button type="button" className="btn ghost co-quitar" aria-label={`Quitar medicamento ${i + 1}`} onClick={() => setRecetas((l) => l.filter((x) => x.clave !== r.clave))}>
                          <i className="bi bi-trash" aria-hidden="true" /> Quitar
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="co-vacio">Sin medicamentos. Agrega uno si el paciente necesita receta.</p>
                  )}
                </div>
                <button type="button" className="btn ghost co-pill" onClick={agregar}><i className="bi bi-plus-lg" aria-hidden="true" /> Agregar medicamento</button>
              </section>

              <p className="err" role="alert">{intento && invalido && 'Completa los campos marcados: síntomas (3+ letras), hallazgos (5+), diagnóstico (3+), plan (5+) y los datos de cada medicamento.'}</p>
              <p className="err" role="alert">{error}</p>

              <div className="co-barra">
                <Link className="btn ghost co-pill" to="/panel-medico">Cancelar</Link>
                <button className="btn co-pill co-final" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Finalizar atención'}</button>
              </div>
            </form>
          </>
        )
      ) : (
        <p className="tabla" role="status">{cargando ? 'Cargando cita…' : ajena ? 'Esta cita no pertenece a tu agenda.' : error || 'No encontramos la cita.'}</p>
      )}
    </section>
  );
}
