import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import type { Comentario, Sede } from '../types/cita';

const TIPOS = ['Todos', 'Hospitales', 'Policlínicos', 'Clínicas'] as const;

interface ComentarioValores {
  readonly puntaje: string;
  readonly texto: string;
}
const INICIAL: ComentarioValores = { puntaje: '5', texto: '' };
const validar = (v: ComentarioValores): Errores<ComentarioValores> => ({ texto: v.texto.length < 3 || v.texto.length > 300 });

const urlMapa = (s: Sede): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.nombre} ${s.direccion}`)}`;

export function Centros() {
  const { usuario } = useAuth();
  const { sedes, activos, cargando: cargandoStore, error: errorStore, cargarSedes, cargarMedicos } = useCitas();
  const { cargando, error, ejecutar } = useCarga();
  const [tipo, setTipo] = useState<string>('Todos');
  const [sel, setSel] = useState('');
  const [comentarios, setComentarios] = useState<readonly Comentario[]>([]);
  const form = useFormulario<ComentarioValores>(INICIAL);
  const errores = validar(form.valores);

  useEffect(() => {
    cargarSedes();
    cargarMedicos();
    void ejecutar(curarApi.comentarios()).then((r) => r.ok && setComentarios(r.valor));
  }, [cargarSedes, cargarMedicos, ejecutar]);

  const visibles = sedes.filter((s) => tipo === 'Todos' || s.tipo === tipo);
  const delSel = comentarios.filter((c) => c.sedeId === sel);

  const especialidades = (id: string): string => {
    const e = [...new Set(activos.filter((m) => m.sedeId === id).map((m) => m.especialidad))];
    return e.length > 0 ? e.join(', ') : 'Por definir';
  };
  const promedio = (id: string): string => {
    const l = comentarios.filter((c) => c.sedeId === id);
    return l.length > 0 ? `★ ${(l.reduce((suma, c) => suma + c.puntaje, 0) / l.length).toFixed(1)} (${l.length} opiniones)` : 'Sin calificaciones';
  };

  async function comentar(evento: FormEvent, sedeId: string): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    if (errores.texto || !usuario || cargando) return;
    const r = await ejecutar(curarApi.crearComentario({
      sedeId, autor: usuario.nombre.split(' ')[0] ?? 'Paciente', texto: form.valores.texto.trim(),
      puntaje: Number(form.valores.puntaje), fecha: new Date().toISOString().slice(0, 10),
    }));
    if (!r.ok) return;
    setComentarios((l) => [r.valor, ...l]);
    form.reiniciar(INICIAL);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Centros de salud</h1>
      <p style={{ margin: '6px 0 16px' }}>Hospitales, policlínicos y clínicas con su ubicación, especialidades, contacto y calificaciones.</p>
      <div role="group" aria-label="Tipo de centro" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TIPOS.map((t) => (
          <button key={t} type="button" className={`btn${tipo === t ? '' : ' ghost'}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t}</button>
        ))}
      </div>
      <p className="err" role="alert">{errorStore}{error}</p>
      <div className="docs">
        {visibles.length === 0 ? (
          <p className="tabla" role="status">{cargandoStore ? 'Cargando centros…' : 'No hay centros de este tipo.'}</p>
        ) : (
          visibles.map((s) => (
            <article className="tabla" key={s.id}>
              <h2 style={{ fontSize: 20 }}>{s.nombre}</h2>
              <span className="pill">{s.tipo}</span>
              <p style={{ marginTop: 8 }}>
                <b>Ubicación:</b> {s.direccion}<br />
                <a className="link" target="_blank" rel="noopener" href={urlMapa(s)}>Ver en el mapa ↗</a>
              </p>
              <p><b>Contacto:</b> {s.telefono ?? 'No disponible'}</p>
              <p><b>Seguros:</b> {s.seguros.join(' · ')}</p>
              <p><b>Especialidades:</b> {especialidades(s.id)}</p>
              <p><b>Calificación:</b> {promedio(s.id)}</p>
              <button className="btn ghost" type="button" aria-expanded={sel === s.id} onClick={() => setSel(sel === s.id ? '' : s.id)}>
                {sel === s.id ? 'Ocultar comentarios' : 'Ver comentarios'}
              </button>
            </article>
          ))
        )}
      </div>
      {sel && (
        <div className="tabla" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 20 }}>Comentarios y calificaciones</h2>
          {delSel.length > 0 ? (
            delSel.map((c) => (
              <p key={c.id ?? `${c.autor}${c.fecha}${c.texto}`}><b>{c.autor}</b> · {'★'.repeat(c.puntaje)} · <small>{c.fecha}</small><br />{c.texto}</p>
            ))
          ) : (
            <p>Aún no hay comentarios.</p>
          )}
          {usuario ? (
            <form onSubmit={(e) => void comentar(e, sel)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 520, marginTop: 12 }}>
              <label>Calificación
                <select value={form.valores.puntaje} onChange={(e) => form.cambiar('puntaje', e.target.value)}>
                  <option value="5">5 · Excelente</option><option value="4">4 · Muy buena</option><option value="3">3 · Regular</option><option value="2">2 · Mala</option><option value="1">1 · Muy mala</option>
                </select>
              </label>
              <label>Tu comentario
                <input value={form.valores.texto} maxLength={300} aria-invalid={form.intento && errores.texto === true} onChange={(e) => form.cambiar('texto', e.target.value)} />
              </label>
              <p className="err" role="alert">{form.intento && errores.texto && 'Escribe entre 3 y 300 caracteres.'}</p>
              <button className="btn brand" type="submit" disabled={cargando}>Publicar comentario</button>
            </form>
          ) : (
            <p><Link to="/login" className="link">Inicia sesión</Link> para comentar.</p>
          )}
        </div>
      )}
    </section>
  );
}
