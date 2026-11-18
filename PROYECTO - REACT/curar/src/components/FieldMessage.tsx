interface FieldMessageProps {
  readonly id: string;
  readonly message?: string | undefined;
}

/** Mensaje de error de un campo. No ocupa espacio si no hay error. */
export function FieldMessage({ id, message }: FieldMessageProps) {
  if (!message) return null;
  return <p id={id} className="err" role="alert">{message}</p>;
}
