import { useEffect, useState, type FormEvent } from 'react';
import { ArticuloEstado } from '../components/ArticuloEstado';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import type { Cita, EstadoCita } from '../types/cita';

interface RecetaValores {
  readonly medicamento: string;
  readonly cantidad: number;
  readonly indicaciones: string;
}
const INICIAL: RecetaValores = { medicamento: '', cantidad: 1, indicaciones: '' };

const validar = (v: RecetaValores): Errores<RecetaValores> => ({
  medicamento: v.medicamento.length < 3,
  cantidad: !Number.isFinite(v.cantidad) || v.cantidad < 1 || v.cantidad > 99,
  indicaciones: v.indicaciones.length < 5,
});

export function Agenda() {
  const { usuario } = useAuth();
  const { cargando, error, setError, ejecutar } = useCarga();
  const [citas, setCitas] = useState<readonly Cita[]>([]);
  const [receta, setReceta] = useState<Cita | null>(null);
  const [aviso, setAviso] = useState('');
  const form = useFormulario<RecetaValores>(INICIAL);
  const errores = validar(form.valores);
  const invalido = Object.values(errores).some(Boolean);
  const medicoId = usuario?.medicoId;

  useEffect(() => {
    if (!medicoId) {
      setError('Tu cuenta no tiene un perfil médico asociado.');
      return;
    }
    void ejecutar(curarApi.citasDeMedico(medicoId)).then((r) => r.ok && setCitas(r.valor));
  }, [medicoId, ejecutar, setError]);

  const pendientes = citas.filter((c) => c.estado === 'Pendiente').length;

  async function cambiar(c: Cita, estado: EstadoCita): Promise<void> {
    if (cargando) return;
    const r = await ejecutar(curarApi.cambiarEstado(c.id, estado));
    if (r.ok) setCitas((l) => l.map((x) => (x.id === c.id ? r.valor : x)));
  }

  async function emitir(evento: FormEvent, c: Cita): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    setAviso('');
    if (invalido || !usuario || cargando) return;
    const v = form.valores;
    const r = await ejecutar(curarApi.crearReceta({
      dniPaciente: c.dniPaciente, paciente: c.paciente ?? '', medicoId: c.medicoId, medicoNombre: usuario.nombre,
      fecha: new Date().toISOString().slice(0, 10), medicamento: v.medicamento.trim(), cantidad: v.cantidad, indicaciones: v.indicaciones.trim(),
    }));
    if (!r.ok) return;
    setAviso('Receta emitida.');
    setReceta(null);
    form.reiniciar(INICIAL);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mi agenda</h1>
      <p role="status" aria-live="polite">{pendientes} citas pendientes de {citas.length}.</p>
      <p className="err" role="alert">{error}</p>
      {cargando && <p role="status">Cargando…</p>}
      {citas.map((c) => (
        <ArticuloEstado key={c.id} estado={c.estado}>
          <b>{c.fecha} · {c.hora}</b> — {c.paciente ?? 'Paciente'} · DNI {c.dniPaciente} · {c.seguro} <small>· Motivo: {c.motivo ?? 'No indicado'}</small>{' '}
          <span className="pill" data-estado={c.estado}>{c.estado}</span>
          {c.estado === 'Pendiente' && <button className="btn" type="button" disabled={cargando} onClick={() => void cambiar(c, 'Confirmada')}>Confirmar</button>}
          {(c.estado === 'Pendiente' || c.estado === 'Confirmada') && <button className="btn ghost" type="button" disabled={cargando} onClick={() => void cambiar(c, 'Cancelada')}>Cancelar</button>}
          {(c.estado === 'Confirmada' || c.estado === 'Atendida') && <button className="btn ghost" type="button" onClick={() => setReceta(c)}>Emitir receta</button>}
        </ArticuloEstado>
      ))}
      {citas.length === 0 && !cargando && <p className="tabla" role="status">No tienes citas programadas.</p>}
      {receta && (
        <form className="tabla" onSubmit={(e) => void emitir(e, receta)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
          <h2 style={{ fontSize: 20 }}>Receta para el DNI {receta.dniPaciente}</h2>
          <label>Medicamento
            <input value={form.valores.medicamento} aria-invalid={form.malo(errores, 'medicamento')} onChange={(e) => form.cambiar('medicamento', e.target.value)} onBlur={() => form.tocar('medicamento')} />
          </label>
          <label>Cantidad (envases)
            <input type="number" min={1} max={99} value={form.valores.cantidad} aria-invalid={form.malo(errores, 'cantidad')} onChange={(e) => form.cambiar('cantidad', e.target.valueAsNumber)} onBlur={() => form.tocar('cantidad')} />
          </label>
          <label>Indicaciones
            <input value={form.valores.indicaciones} aria-invalid={form.malo(errores, 'indicaciones')} onChange={(e) => form.cambiar('indicaciones', e.target.value)} onBlur={() => form.tocar('indicaciones')} />
          </label>
          <p className="err" role="alert">{form.intento && invalido && 'Completa medicamento (3+ letras), cantidad entre 1 y 99 e indicaciones (5+ letras).'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn brand" type="submit" disabled={cargando}>Guardar receta</button>
            <button className="btn ghost" type="button" onClick={() => setReceta(null)}>Cancelar</button>
          </div>
        </form>
      )}
      <p role="status" aria-live="polite">{aviso}</p>
    </section>
  );
}
