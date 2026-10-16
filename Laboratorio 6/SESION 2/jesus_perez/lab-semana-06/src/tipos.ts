export type EstadoAcademico = "aprobado" | "riesgo";

// RETO: criterios de orden permitidos (unión literal)
export type CriterioOrden = "promedio" | "nombre";

export interface EstudianteEntrada {
  codigo: string;
  nombre: string;
  programa: string;
  notas: number[];
}

export interface FiltrosEstudiantes {
  estado?: EstadoAcademico;
  programa?: string;
  top?: number;
  minPromedio?: number; // RETO: filtro --min-promedio
  orden?: CriterioOrden; // RETO: orden configurable --orden
}

export interface ResumenAcademico {
  total: number;
  aprobados: number;
  riesgo: number;
  promedioGrupal: number;
}

export type ResultadoValidacion<T> =
  | { ok: true; valor: T }
  | { ok: false; errores: string[] };
