import { useEffect, useState, type FormEvent } from 'react';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import type { Mensaje } from '../types/cita';

type Filtro = 'Todos' | 'Enviado' | 'Recibido';
const FILTROS: readonly Filtro[] = ['Todos', 'Enviado', 'Recibido'];

interface MensajeValores {
  readonly centro: string;
  readonly texto: string;
}
const INICIAL: MensajeValores = { centro: 'Policlínico Pincos – Surco', texto: '' };
const validar = (v: MensajeValores): Errores<MensajeValores> => ({ texto: v.texto.length < 3 || v.texto.length > 300 });

export function Mensajes() {
  const { usuario } = useAuth();
  const { cargando, error, ejecutar } = useCarga();
  const [lista, setLista] = useState<readonly Mensaje[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const form = useFormulario<MensajeValores>(INICIAL);
  const errores = validar(form.valores);
  const dni = usuario?.dni;

  useEffect(() => {
    if (dni) void ejecutar(curarApi.mensajes(dni)).then((r) => r.ok && setLista(r.valor));
  }, [dni, ejecutar]);

  const q = busqueda.trim().toLocaleLowerCase('es-PE');
  const visibles = lista.filter(
    (m) => (filtro === 'Todos' || m.tipo === filtro) && (!q || `${m.centro} ${m.texto}`.toLocaleLowerCase('es-PE').includes(q)),
  );

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    if (errores.texto || !usuario || cargando) return;
    const r = await ejecutar(curarApi.crearMensaje({
      dni: usuario.dni, centro: form.valores.centro, texto: form.valores.texto.trim(), tipo: 'Enviado', fecha: new Date().toISOString().slice(0, 10),
    }));
    if (!r.ok) return;
    setLista((l) => [r.valor, ...l]);
    form.reiniciar(INICIAL);
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mensajes</h1>
      <label style={{ maxWidth: 420 }}>Buscar
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar mensaje" />
      </label>
      <FiltroBotones
        etiqueta="Filtrar mensajes" opciones={FILTROS} seleccionado={filtro} onChange={setFiltro}
        texto={(f) => (f === 'Todos' ? 'Todos' : `${f}s`)} estilo={{ display: 'flex', gap: 8, margin: '14px 0' }}
      />
      <p className="err" role="alert">{error}</p>
      {visibles.map((m) => (
        <article className="tabla" key={m.id ?? m.fecha + m.texto}>
          <b>{m.centro}</b> <span className="pill">{m.tipo}</span> <small>{m.fecha}</small><br />{m.texto}
        </article>
      ))}
      {visibles.length === 0 && !cargando && <p className="tabla" role="status">No hay mensajes en esta vista.</p>}
      <form className="tabla" onSubmit={(e) => void enviar(e)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <h2 style={{ fontSize: 20 }}>Escribir a un centro</h2>
        <label>Centro
          <select value={form.valores.centro} onChange={(e) => form.cambiar('centro', e.target.value)}>
            <option>Policlínico Pincos – Surco</option><option>Policlínico Santa Cruz</option>
          </select>
        </label>
        <label>Mensaje
          <input value={form.valores.texto} maxLength={300} aria-invalid={form.intento && errores.texto === true} onChange={(e) => form.cambiar('texto', e.target.value)} />
        </label>
        <p className="err" role="alert">{form.intento && errores.texto && 'Escribe entre 3 y 300 caracteres.'}</p>
        <button className="btn brand" type="submit" disabled={cargando}>Enviar</button>
      </form>
    </section>
  );
}
