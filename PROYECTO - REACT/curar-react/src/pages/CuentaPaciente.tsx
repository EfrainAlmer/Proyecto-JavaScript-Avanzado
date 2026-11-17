import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { curarApi } from '../services/curarApi';
import { PERM_RECETAR, PERM_RESERVAR, tienePermiso, type UsuarioApi } from '../types/cita';
import { mesAnio } from '../utils/formato';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CORREO, PATRON_NOMBRE, PATRON_TELEFONO } from '../utils/validacion';

type Tab = 'resumen' | 'perfil';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [{ id: 'resumen', n: 'Resumen' }, { id: 'perfil', n: 'Mi perfil' }];

interface PerfilValores {
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string;
  readonly seguro: string;
}
interface ClaveValores {
  readonly actual: string;
  readonly nueva: string;
  readonly confirmar: string;
}
const PERFIL_INICIAL: PerfilValores = { nombre: '', correo: '', telefono: '', seguro: 'SIS' };
const CLAVE_INICIAL: ClaveValores = { actual: '', nueva: '', confirmar: '' };

const validarPerfil = (v: PerfilValores): Errores<PerfilValores> => ({
  nombre: v.nombre.length < 5 || !PATRON_NOMBRE.test(v.nombre),
  correo: !PATRON_CORREO.test(v.correo),
  telefono: !PATRON_TELEFONO.test(v.telefono),
});
const validarClave = (v: ClaveValores): Errores<ClaveValores> => ({
  actual: v.actual === '',
  nueva: !PATRON_CLAVE.test(v.nueva),
  confirmar: v.confirmar === '' || v.nueva !== v.confirmar,
});

export function CuentaPaciente() {
  const auth = useAuth();
  const { citas, cargarCitas } = useCitas();
  const { cargando, error, ejecutar } = useCarga();
  const [tab, setTab] = useState<Tab>('resumen');
  const [u, setU] = useState<UsuarioApi | null>(null);
  const [okPerfil, setOkPerfil] = useState('');
  const [okClave, setOkClave] = useState('');
  const [errPerfil, setErrPerfil] = useState('');
  const [errClave, setErrClave] = useState('');
  const perfil = useFormulario<PerfilValores>(PERFIL_INICIAL);
  const clave = useFormulario<ClaveValores>(CLAVE_INICIAL);
  const { reiniciar: reiniciarPerfil } = perfil;
  const erroresPerfil = validarPerfil(perfil.valores);
  const erroresClave = validarClave(clave.valores);
  const perfilInvalido = Object.values(erroresPerfil).some(Boolean);
  const claveInvalida = Object.values(erroresClave).some(Boolean);
  const dni = auth.usuario?.dni;

  useEffect(() => {
    if (!dni) return;
    cargarCitas(dni);
    void ejecutar(curarApi.usuarios(dni)).then((r) => {
      const x = r.ok ? r.valor[0] : undefined;
      if (!x) return;
      setU(x);
      reiniciarPerfil({ nombre: x.nombre, correo: x.correo ?? '', telefono: x.telefono ?? '', seguro: x.seguro ?? 'SIS' });
    });
  }, [dni, cargarCitas, ejecutar, reiniciarPerfil]);

  // Derivados
  const rol = auth.usuario?.rol ?? 0;
  const permisos = [
    { t: 'Reservar citas médicas', a: tienePermiso(rol, PERM_RESERVAR) },
    { t: 'Emitir recetas digitales', a: tienePermiso(rol, PERM_RECETAR) },
  ];
  const proximas = citas
    .filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada')
    .toSorted((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 3);

  async function guardarPerfil(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    perfil.setIntento(true);
    setOkPerfil('');
    setErrPerfil('');
    if (perfilInvalido || !u?.id || cargando) return;
    const v = perfil.valores;
    const nombre = capitalizarNombre(v.nombre);
    const correo = v.correo.trim().toLowerCase();
    const usado = await ejecutar(curarApi.correoUsado(correo, String(u.dni)));
    if (!usado.ok) return;
    if (usado.valor) {
      setErrPerfil('Ese correo ya está registrado por otra cuenta.');
      return;
    }
    const r = await ejecutar(curarApi.actualizarUsuario(u.id, { nombre, correo, telefono: v.telefono, seguro: v.seguro }));
    if (!r.ok) return;
    setU(r.valor);
    auth.renombrar(r.valor.nombre);
    setOkPerfil('Tus datos se actualizaron correctamente.');
  }

  async function guardarClave(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    clave.setIntento(true);
    setOkClave('');
    setErrClave('');
    if (claveInvalida || !u?.id || cargando) return;
    if (String(u.password) !== clave.valores.actual) {
      setErrClave('La contraseña actual no es correcta.');
      return;
    }
    const r = await ejecutar(curarApi.actualizarUsuario(u.id, { password: clave.valores.nueva }));
    if (!r.ok) return;
    setU(r.valor);
    clave.reiniciar(CLAVE_INICIAL);
    setOkClave('Contraseña actualizada.');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mi cuenta</h1>
      <div role="tablist" aria-label="Secciones de mi cuenta" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={`btn${tab === t.id ? '' : ' ghost'}`} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.n}</button>
        ))}
      </div>
      <p className="err" role="alert">{error}</p>
      {tab === 'resumen' ? (
        u ? (
          <div className="docs">
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Ficha de identificación</h2>
              <p><b>DNI</b> {u.dni}</p>
              <p><b>Correo</b> {u.correo}</p>
              <p><b>Celular</b> {u.telefono}</p>
              <p><b>Cobertura</b> {u.seguro ?? 'No especificada'}</p>
              <p><b>Miembro desde</b> {u.creadoEn ? mesAnio(new Date(u.creadoEn)) : '—'}</p>
            </article>
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Próximas citas</h2>
              {proximas.length > 0 ? (
                proximas.map((c) => (
                  <p key={c.id}>{c.fecha} · {c.hora} — {c.seguro} <span className="pill" data-estado={c.estado}>{c.estado}</span></p>
                ))
              ) : (
                <p>Aún no tienes citas. <Link to="/seguro" className="link">Reserva una</Link>.</p>
              )}
            </article>
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Permisos</h2>
              {permisos.map((p) => <p key={p.t}>{p.a ? '✓' : '✕'} {p.t}</p>)}
            </article>
          </div>
        ) : (
          <p role="status">Cargando tu información…</p>
        )
      ) : (
        <div className="docs">
          <form className="tabla" onSubmit={(e) => void guardarPerfil(e)} noValidate style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Editar datos personales</h2>
            <label>Nombre completo
              <input value={perfil.valores.nombre} aria-invalid={perfil.malo(erroresPerfil, 'nombre')} onChange={(e) => perfil.cambiar('nombre', e.target.value)} onBlur={() => perfil.tocar('nombre')} />
            </label>
            <label>Correo electrónico
              <input type="email" value={perfil.valores.correo} aria-invalid={perfil.malo(erroresPerfil, 'correo')} onChange={(e) => perfil.cambiar('correo', e.target.value)} onBlur={() => perfil.tocar('correo')} />
            </label>
            <label>Celular
              <input value={perfil.valores.telefono} inputMode="numeric" maxLength={9} aria-invalid={perfil.malo(erroresPerfil, 'telefono')} onChange={(e) => perfil.cambiar('telefono', e.target.value)} onBlur={() => perfil.tocar('telefono')} />
            </label>
            <label>Seguro
              <select value={perfil.valores.seguro} onChange={(e) => perfil.cambiar('seguro', e.target.value)}>
                <option>SIS</option><option>EsSalud</option><option>Particular</option>
              </select>
            </label>
            <p className="err" role="alert">
              {perfil.intento && perfilInvalido && 'Revisa nombre (5+ letras), correo y celular de 9 dígitos que empiece con 9. '}{errPerfil}
            </p>
            <button className="btn brand" type="submit" disabled={cargando}>Guardar cambios</button>
            <p role="status" aria-live="polite">{okPerfil}</p>
          </form>
          <form className="tabla" onSubmit={(e) => void guardarClave(e)} noValidate style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Cambiar contraseña</h2>
            <label>Contraseña actual
              <input type="password" autoComplete="current-password" value={clave.valores.actual} onChange={(e) => clave.cambiar('actual', e.target.value)} />
            </label>
            <label>Nueva contraseña
              <input type="password" autoComplete="new-password" value={clave.valores.nueva} aria-invalid={clave.malo(erroresClave, 'nueva')} onChange={(e) => clave.cambiar('nueva', e.target.value)} onBlur={() => clave.tocar('nueva')} />
            </label>
            <label>Repite la nueva contraseña
              <input type="password" autoComplete="new-password" value={clave.valores.confirmar} onChange={(e) => clave.cambiar('confirmar', e.target.value)} />
            </label>
            <p className="err" role="alert">
              {clave.intento && claveInvalida && 'Mínimo 8 caracteres con letras y números, y ambas deben coincidir. '}{errClave}
            </p>
            <button className="btn brand" type="submit" disabled={cargando}>Actualizar contraseña</button>
            <p role="status" aria-live="polite">{okClave}</p>
          </form>
        </div>
      )}
    </section>
  );
}
