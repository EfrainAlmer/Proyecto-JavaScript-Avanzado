import { useOptimistic, useState, useTransition, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAlternarFavorito, useFavoritos } from '../queries/citas';
import { mensajeHttp } from '../services/mensajeHttp';

interface BotonFavoritoProps {
  readonly medicoId: string;
  readonly className: (esFavorito: boolean) => string;
  readonly children: (esFavorito: boolean) => ReactNode;
}

/**
 * Favorito con UI optimista: la estrella cambia AL INSTANTE y, si la API falla, vuelve sola a su valor real.
 * No usa <form action> (useActionState/useFormStatus) porque en Reservar vive dentro de un formulario de
 * React Hook Form, y el md prohíbe mezclarlos; basta con useOptimistic + una transición.
 */
export function BotonFavorito({ medicoId, className, children }: BotonFavoritoProps) {
  const { usuario } = useAuth();
  const favoritos = useFavoritos(usuario?.dni);
  const alternarFavorito = useAlternarFavorito();
  const [aviso, setAviso] = useState('');
  const [pendiente, startTransition] = useTransition();

  // Valor real (confirmado por la API) y valor visible (puede adelantarse mientras la transición está en curso).
  const existente = favoritos.data?.find((f) => f.medicoId === medicoId);
  const esFavorito = existente !== undefined;
  const [favoritoVisible, fijarOptimista] = useOptimistic(esFavorito);

  function alternar(): void {
    if (!usuario || pendiente) return;
    setAviso('');
    startTransition(async () => {
      fijarOptimista(!esFavorito); // se ve ya; React lo descarta al terminar la transición
      try {
        // Lab 14: useMutation; resuelve cuando ['favoritos', dni] ya se recargó, así la estrella no "rebota".
        await alternarFavorito.mutateAsync({ dni: usuario.dni, medicoId, favoritoId: existente?.id });
      } catch (e) {
        setAviso(`No se pudo actualizar el favorito. ${mensajeHttp(e)}`);
      }
      // Si salió bien: la caché ya tiene la lista nueva, así que el valor real coincide con el optimista.
      // Si falló: el valor real no cambió y la estrella vuelve sola a como estaba.
    });
  }

  return (
    <>
      <button type="button" className={className(favoritoVisible)} aria-pressed={favoritoVisible} aria-busy={pendiente} onClick={alternar}>
        {children(favoritoVisible)}
      </button>
      {aviso && <span className="err" role="alert">{aviso}</span>}
    </>
  );
}
