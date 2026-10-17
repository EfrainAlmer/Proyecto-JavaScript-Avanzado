import assert from "node:assert/strict";
import test from "node:test";
import { analizarArgumentos } from "../cli/argumentos.js";
import { Estudiante } from "../modelos/Estudiante.js";
import { AnalizadorAcademico } from "../servicios/AnalizadorAcademico.js";
import { redondearDos } from "../utilidades/numeros.js";

const estudiantes = [
  new Estudiante({
    codigo: "U20260001",
    nombre: "Ana Pérez",
    programa: "Ingeniería de Software",
    notas: [16, 15, 17]
  }),
  new Estudiante({
    codigo: "U20260002",
    nombre: "Luis Rojas",
    programa: "Ingeniería de Sistemas",
    notas: [10, 11, 12]
  }),
  new Estudiante({
    codigo: "U20260003",
    nombre: "María Salas",
    programa: "Ingeniería de Software",
    notas: [12, 12, 12]
  })
];

test("calcula el resumen académico", () => {
  const analizador = new AnalizadorAcademico(estudiantes);
  assert.deepEqual(analizador.resumir(), {
    total: 3,
    aprobados: 2,
    riesgo: 1,
    promedioGrupal: 13
  });
});

test("combina filtros y ordena por promedio descendente", () => {
  const analizador = new AnalizadorAcademico(estudiantes);
  const resultado = analizador.filtrar({
    programa: "software",
    estado: "aprobado",
    top: 1
  });
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0]?.codigo, "U20260001");
});

test("devuelve una lista vacía cuando no hay coincidencias", () => {
  const analizador = new AnalizadorAcademico(estudiantes);
  assert.deepEqual(analizador.filtrar({ programa: "Diseño" }), []);
});

test("redondea un caso sensible a la representación binaria", () => {
  assert.equal(redondearDos(10.165), 10.17);
});

// ---------- RETO: pruebas de las dos mejoras ----------

test("RETO 1: --min-promedio filtra y se combina con otros filtros", () => {
  const analizador = new AnalizadorAcademico(estudiantes);
  // Promedios: Ana 16, Luis 11, María 12
  assert.deepEqual(
    analizador.filtrar({ minPromedio: 12 }).map(e => e.codigo),
    ["U20260001", "U20260003"]
  );
  assert.deepEqual(
    analizador.filtrar({ minPromedio: 12, programa: "sistemas" }),
    []
  );
  assert.equal(analizador.filtrar({ minPromedio: 12.01 }).length, 1);
});

test("RETO 1: --min-promedio rechaza valores inválidos y acepta los límites", () => {
  assert.equal(analizarArgumentos(["--min-promedio", "0"]).filtros.minPromedio, 0);
  assert.equal(analizarArgumentos(["--min-promedio", "20"]).filtros.minPromedio, 20);
  assert.throws(() => analizarArgumentos(["--min-promedio", "21"]), /entre 0 y 20/);
  assert.throws(() => analizarArgumentos(["--min-promedio", "-1"]), /entre 0 y 20/);
  assert.throws(() => analizarArgumentos(["--min-promedio", "abc"]), /entre 0 y 20/);
  assert.throws(() => analizarArgumentos(["--min-promedio"]), /Falta el valor/);
});

test("RETO 2: --orden nombre ordena alfabéticamente y promedio por nota", () => {
  const analizador = new AnalizadorAcademico(estudiantes);
  assert.deepEqual(
    analizador.filtrar({ orden: "nombre" }).map(e => e.nombre),
    ["Ana Pérez", "Luis Rojas", "María Salas"]
  );
  assert.deepEqual(
    analizador.filtrar({ orden: "promedio" }).map(e => e.nombre),
    ["Ana Pérez", "María Salas", "Luis Rojas"]
  );
  // Sin indicar orden se usa promedio descendente
  assert.deepEqual(
    analizador.filtrar().map(e => e.nombre),
    ["Ana Pérez", "María Salas", "Luis Rojas"]
  );
});

test("RETO 2: --orden valida el criterio recibido", () => {
  assert.equal(analizarArgumentos(["--orden", "NOMBRE"]).filtros.orden, "nombre");
  assert.throws(() => analizarArgumentos(["--orden", "edad"]), /nombre o promedio/);
});
