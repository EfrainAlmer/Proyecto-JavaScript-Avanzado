import { Component, type ReactNode } from 'react';

interface LimiteErrorProps {
  /** Qué mostrar si algo de dentro falla (por ejemplo, una promesa rechazada leída con `use`). */
  readonly fallback: (error: unknown) => ReactNode;
  readonly children: ReactNode;
}

interface LimiteErrorEstado {
  readonly fallo: { readonly error: unknown } | null;
}

/**
 * ErrorBoundary: React aún no ofrece un hook para esto, por eso es el único componente de clase del proyecto.
 * Para "reintentar", el padre le cambia la `key` y React monta uno nuevo, sin error.
 */
export class LimiteError extends Component<LimiteErrorProps, LimiteErrorEstado> {
  override state: LimiteErrorEstado = { fallo: null };

  static getDerivedStateFromError(error: unknown): LimiteErrorEstado {
    return { fallo: { error } };
  }

  override render(): ReactNode {
    return this.state.fallo ? this.props.fallback(this.state.fallo.error) : this.props.children;
  }
}
