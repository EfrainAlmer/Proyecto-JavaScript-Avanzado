import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useFormulario, type Errores } from '../hooks/useFormulario';
import { mensajeHttp } from '../services/mensajeHttp';
import { PATRON_DNI } from '../utils/validacion';

interface LoginValores {
  readonly dni: string;
  readonly password: string;
}

const validar = (v: LoginValores): Errores<LoginValores> => ({
  dni: !PATRON_DNI.test(v.dni),
  password: v.password === '',
});

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useFormulario<LoginValores>({ dni: '', password: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const errores = validar(form.valores);
  const invalido = errores.dni === true || errores.password === true;

  async function entrar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    form.setIntento(true);
    setError('');
    if (invalido || enviando) return;
    setEnviando(true);
    try {
      const resultado = await auth.ingresar(form.valores.dni, form.valores.password);
      if (resultado === 'ok') void navigate(auth.inicio());
      else if (resultado === 'pendiente') void navigate('/verificar');
      else setError('DNI o contraseña incorrectos.');
    } catch (e) {
      setError(mensajeHttp(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={(e) => void entrar(e)} noValidate>
        <h1 style={{ fontSize: 24 }}>Iniciar sesión</h1>
        <label>DNI
          <input
            value={form.valores.dni} inputMode="numeric" maxLength={8} autoComplete="username"
            aria-invalid={form.malo(errores, 'dni')}
            onChange={(e) => form.cambiar('dni', e.target.value)} onBlur={() => form.tocar('dni')}
          />
        </label>
        <p className="err" role="alert">{form.malo(errores, 'dni') && 'El DNI debe tener exactamente 8 dígitos.'}</p>
        <label>Contraseña
          <input
            value={form.valores.password} type="password" autoComplete="current-password"
            aria-invalid={form.malo(errores, 'password')}
            onChange={(e) => form.cambiar('password', e.target.value)} onBlur={() => form.tocar('password')}
          />
        </label>
        <p className="err" role="alert">{form.malo(errores, 'password') && 'Escribe tu contraseña.'}</p>
        <button className="btn brand" type="submit" disabled={enviando} style={{ width: '100%', justifyContent: 'center' }}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="err" role="alert">{error}</p>
        <p style={{ marginTop: 14, fontSize: 14 }}>¿No tienes cuenta? <Link to="/registro" className="link">Regístrate</Link></p>
      </form>
    </AuthShell>
  );
}
