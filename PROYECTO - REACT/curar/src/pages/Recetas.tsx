import { Suspense, use, useEffect, useRef, useState, useEffectEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LimiteError } from '../components/LimiteError';
import { useAuth } from '../context/AuthContext';
import { recetasConsulta } from '../queries/citas';
import { mensajeHttp } from '../services/mensajeHttp';
import type { Receta } from '../types/cita';
import { fechaMedia } from '../utils/formato';

interface Peticion {
  readonly id: number;
  readonly promesa: Promise<Receta[]>;
}

/** Lee la promesa con `use`: mientras no se resuelve, React muestra el fallback del <Suspense> más cercano. */
function ListaRecetas({ promesa }: { readonly promesa: Promise<Receta[]> }) {
  const recetas = use(promesa).toReversed(); // las más recientes primero, sin mutar el arreglo recibido
  if (recetas.length === 0) return <p className="tabla" role="status">Aún no tienes recetas registradas.</p>;
  return (
    <div aria-label="Recetas" role="list">
      {recetas.map((r) => (
        <article className="tabla" role="listitem" key={r.id ?? r.fecha + r.medicamento}>
          <b>{fechaMedia(r.fecha)}</b> · Dr(a). {r.medicoNombre}<br />{r.medicamento} — {r.cantidad} envase(s)<br /><small>{r.indicaciones}</small>
        </article>
      ))}
    </div>
  );
}

export function Recetas() {
  const { usuario } = useAuth();
  const cache = useQueryClient();
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const secuencia = useRef(0);
  const dni = usuario?.dni;

  /**
   * La promesa se crea aquí (en un efecto o en un clic), NUNCA en el cuerpo del render.
   * Lab 14: sale de la caché de TanStack Query —una sola caché para ['recetas', dni]—:
   * - al entrar, `ensureQueryData` reutiliza lo que ya esté en caché (p. ej. si vienes de Mi panel);
   * - "Actualizar" y "Reintentar" fuerzan una lectura nueva con `fetchQuery` + staleTime 0.
   */
  function pedir(documento: string, forzar: boolean): void {
    const opciones = recetasConsulta(documento);
    const promesa = forzar ? cache.fetchQuery({ ...opciones, staleTime: 0 }) : cache.ensureQueryData(opciones);
    void promesa.catch(() => undefined); // también observa el rechazo de peticiones que ya no se muestran
    secuencia.current += 1;
    setPeticion({ id: secuencia.current, promesa });
  }

  // useEffectEvent: el efecto solo se repite cuando cambia `dni`; `pedir` lee siempre la caché y el estado
  // actuales sin ser dependencia. Así no hace falta suprimir la advertencia de dependencias (Lab 13).
  const pedirAlEntrar = useEffectEvent((documento: string) => pedir(documento, false));
  useEffect(() => {
    if (dni) pedirAlEntrar(dni);
  }, [dni]);

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1>Mis recetas médicas</h1>
        <button className="btn ghost" type="button" disabled={!dni} onClick={() => dni && pedir(dni, true)}>Actualizar</button>
      </div>
      {peticion && (
        // key: cada petición nueva monta un límite nuevo, así un error anterior no se queda pegado.
        <LimiteError
          key={peticion.id}
          fallback={(error) => (
            <div className="tabla" role="alert">
              <p>No se pudieron cargar tus recetas. {mensajeHttp(error)}</p>
              <button className="btn" type="button" onClick={() => dni && pedir(dni, true)}>Reintentar</button>
            </div>
          )}
        >
          <Suspense fallback={<p role="status">Cargando recetas…</p>}>
            <ListaRecetas promesa={peticion.promesa} />
          </Suspense>
        </LimiteError>
      )}
    </section>
  );
}
