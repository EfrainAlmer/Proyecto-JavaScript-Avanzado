import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { mensajeHttp } from '../services/mensajeHttp';
import { ROLE_MEDICO, ROLE_PACIENTE } from '../types/cita';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CMP, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO } from '../utils/validacion';

interface RegistroValores {
  readonly correo: string;
  readonly dni: string;
  readonly nombre: string;
  readonly telefono: string;
  readonly password: string;
  readonly confirmar: string;
  readonly cmp: string;
  readonly especialidad: string;
}

const INICIAL: RegistroValores = { correo: '', dni: '', nombre: '', telefono: '', password: '', confirmar: '', cmp: '', especialidad: 'Medicina General' };

const validar = (v: RegistroValores): Errores<RegistroValores> => ({
  correo: !PATRON_CORREO.test(v.correo),
  dni: !PATRON_DNI.test(v.dni),
  nombre: v.nombre.length < 3 || v.nombre.length > 80 || !PATRON_NOMBRE.test(v.nombre),
  telefono: !PATRON_TELEFONO.test(v.telefono),
  password: !PATRON_CLAVE.test(v.password),
  confirmar: v.confirmar === '',
});

export function Registro() {
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useFormulario<RegistroValores>(INICIAL);
  const [rol, setRol] = useState<number>(ROLE_PACIENTE);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const v = form.valores;
  const errores = validar(v);
  const noCoincide = v.password !== v.confirmar;
  // Derivados: no se guardan en estado.
  const errCmp = form.intento && rol === ROLE_MEDICO && !PATRON_CMP.test(v.cmp);
  const invalido = Object.values(errores).some(Boolean) || noCoincide;

  function campo(nombre: keyof RegistroValores) {
    return {
      value: v[nombre],
      'aria-invalid': form.malo(errores, nombre),
      onChange: (e: { target: { value: string } }) => form.cambiar(nombre, e.target.value),
      onBlur: () => form.tocar(nombre),
    };
  }

  async function enviar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    if (paso === 1) {
      if (!errores.correo) setPaso(2);
      else form.tocar('correo');
      return;
    }
    form.setIntento(true);
    setError('');
    const cmpInvalido = rol === ROLE_MEDICO && !PATRON_CMP.test(v.cmp);
    if (invalido || cmpInvalido || enviando) return;
    setEnviando(true);
    try {
      const ok = await auth.registrar({
        dni: v.dni, nombre: capitalizarNombre(v.nombre), correo: v.correo.trim().toLowerCase(), telefono: v.telefono,
        password: v.password, rol, cmp: v.cmp, especialidad: v.especialidad,
      });
      if (ok) void navigate('/verificar');
      else setError('Ya existe una cuenta con ese DNI.');
    } catch (e) {
      setError(mensajeHttp(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={(e) => void enviar(e)} noValidate>
        {paso === 1 ? (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 400 }}>Crea una cuenta.</h1>
            <p style={{ color: 'var(--slate-text)', marginBottom: 14 }}>Vamos a ponerte en marcha.</p>
            <div role="group" aria-label="Tipo de cuenta" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button type="button" className={`btn${rol === ROLE_PACIENTE ? '' : ' ghost'}`} aria-pressed={rol === ROLE_PACIENTE} onClick={() => setRol(ROLE_PACIENTE)}>Soy paciente</button>
              <button type="button" className={`btn${rol === ROLE_MEDICO ? '' : ' ghost'}`} aria-pressed={rol === ROLE_MEDICO} onClick={() => setRol(ROLE_MEDICO)}>Soy médico</button>
            </div>
            <label>Correo electrónico
              <input type="email" placeholder="nombre@gmail.com" autoComplete="email" {...campo('correo')} />
            </label>
            <p className="err" role="alert">{form.malo(errores, 'correo') && 'Escribe un correo válido, por ejemplo nombre@gmail.com.'}</p>
            <button className="btn" type="submit" disabled={errores.correo} style={{ width: '100%', justifyContent: 'center' }}>Siguiente</button>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 400 }}>Completa tus datos</h1>
            <label>DNI<input inputMode="numeric" maxLength={8} {...campo('dni')} /></label>
            <p className="err" role="alert">{form.malo(errores, 'dni') && 'El DNI debe tener exactamente 8 dígitos.'}</p>
            <label>Nombres y apellidos<input autoComplete="name" {...campo('nombre')} /></label>
            <p className="err" role="alert">{form.malo(errores, 'nombre') && 'Usa solo letras, espacios, guiones o apóstrofos.'}</p>
            <label>Celular<input inputMode="numeric" maxLength={9} placeholder="9XXXXXXXX" {...campo('telefono')} /></label>
            <p className="err" role="alert">{form.malo(errores, 'telefono') && 'El celular debe tener 9 dígitos y empezar con 9.'}</p>
            {rol === ROLE_MEDICO && (
              <>
                <label>Código CMP (colegiatura)
                  <input inputMode="numeric" maxLength={6} value={v.cmp} aria-invalid={errCmp} onChange={(e) => form.cambiar('cmp', e.target.value)} />
                </label>
                <p className="err" role="alert">{errCmp && 'El código CMP debe tener 5 o 6 dígitos.'}</p>
                <label>Especialidad
                  <select value={v.especialidad} onChange={(e) => form.cambiar('especialidad', e.target.value)}>
                    <option>Medicina General</option><option>Pediatría</option><option>Cardiología</option><option>Ginecología</option>
                  </select>
                </label>
              </>
            )}
            <label>Contraseña<input type="password" autoComplete="new-password" {...campo('password')} /></label>
            <p className="err" role="alert">{form.malo(errores, 'password') && 'Mínimo 8 caracteres, con al menos una letra y un número.'}</p>
            <label>Repite la contraseña
              <input type="password" autoComplete="new-password" value={v.confirmar} onChange={(e) => form.cambiar('confirmar', e.target.value)} onBlur={() => form.tocar('confirmar')} />
            </label>
            <p className="err" role="alert">{form.intento && noCoincide && 'Las contraseñas no coinciden.'}</p>
            <button className="btn brand" type="submit" disabled={enviando} style={{ width: '100%', justifyContent: 'center' }}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
            <button className="link" type="button" onClick={() => setPaso(1)}>← Cambiar correo</button>
            <p className="err" role="alert">{error}</p>
          </>
        )}
        <p style={{ marginTop: 14, fontSize: 14 }}>¿Ya tienes cuenta? <Link to="/login" className="link">Inicia sesión</Link></p>
      </form>
    </AuthShell>
  );
}
