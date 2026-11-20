// Genera datos de demostración masivos para Curar (médicos y citas) a partir de api/base.json.
// Uso:  npm run datos            → escribe api/seed.json y api/db.json
//       npm run datos -- 200 5000 → 200 médicos extra y 5000 citas
// Es determinista: con los mismos números produce siempre los mismos datos (semilla fija).
import { readFileSync, writeFileSync } from 'node:fs';

const [medicosExtra = 120, totalCitas = 3000] = process.argv.slice(2).map(Number);

/** Generador pseudoaleatorio con semilla (mulberry32): mismos datos en cada ejecución. */
function crearAzar(semilla) {
  let t = semilla >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAzar(2026);
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
const entero = (min, max) => min + Math.floor(azar() * (max - min + 1));

const NOMBRES = ['Lucía', 'Mateo', 'Valeria', 'Santiago', 'Camila', 'Diego', 'Sofía', 'Gabriel', 'Ximena', 'Adrián', 'Daniela', 'Joaquín', 'Mariana', 'Sebastián', 'Fernanda', 'Rodrigo', 'Andrea', 'Luis', 'Carmen', 'Jorge', 'Rosa', 'Miguel', 'Patricia', 'César', 'Milagros', 'Óscar', 'Gloria', 'Raúl', 'Elena', 'Víctor'];
const APELLIDOS = ['Quispe', 'Flores', 'Sánchez', 'Rodríguez', 'García', 'Huamán', 'Mamani', 'Rojas', 'Torres', 'Chávez', 'Ramírez', 'Mendoza', 'Vargas', 'Castillo', 'Gutiérrez', 'Ccori', 'Paredes', 'Salazar', 'Espinoza', 'Díaz', 'Ríos', 'Cárdenas', 'Huaman', 'Vílchez', 'Palomino'];
const ESPECIALIDADES = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'];
const UNIVERSIDADES = ['Universidad Nacional Mayor de San Marcos', 'Universidad Peruana Cayetano Heredia', 'Universidad Nacional de San Agustín', 'Universidad Privada de Ciencias Aplicadas', 'Universidad Nacional de Trujillo'];
const HORAS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:15', '14:00', '15:00', '15:30', '16:00', '16:30'];
const MOTIVOS = ['Control general', 'Dolor de cabeza', 'Fiebre persistente', 'Control de presión', 'Dolor abdominal', 'Chequeo anual', 'Tos y resfriado', 'Control de diabetes', 'Dolor de espalda', 'Resultados de análisis', 'Control prenatal', 'Mareos'];

const nombrePersona = () => `${elegir(NOMBRES)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
const iso = (d) => d.toLocaleDateString('sv-SE');

const base = JSON.parse(readFileSync('api/base.json', 'utf8'));
const sedes = base.sedes;

// ---- Médicos
const cmpUsados = new Set(base.medicos.map((m) => m.cmp));
const nuevosMedicos = Array.from({ length: medicosExtra }, (_, i) => {
  let cmp;
  do cmp = String(entero(10000, 99999)); while (cmpUsados.has(cmp));
  cmpUsados.add(cmp);
  const especialidad = ESPECIALIDADES[i % ESPECIALIDADES.length];
  const sede = elegir(sedes);
  const horario = HORAS.filter(() => azar() < 0.45);
  return {
    id: `m${cmp}`, nombre: nombrePersona(), especialidad, calificacion: Math.round((3.5 + azar() * 1.5) * 10) / 10,
    centro: sede.tipo, sedeId: sede.id, cmp, estado: azar() < 0.92 ? 'Activo' : 'Inactivo',
    universidad: elegir(UNIVERSIDADES), experiencia: `${entero(3, 30)} años en ${especialidad.toLowerCase()}.`,
    reconocimientos: [], horario: horario.length >= 3 ? horario : HORAS.slice(0, 4),
  };
});
// Fotos de demostración (public/medicos/m6–m8.jpg) para tres médicos generados. Sus ids no cambian entre
// ejecuciones porque el azar usa semilla fija; las citas sí, porque se calculan desde la fecha de hoy.
const FOTOS = { m80024: '/medicos/m6.jpg', m91523: '/medicos/m7.jpg', m19296: '/medicos/m8.jpg' };
const medicos = [...base.medicos, ...nuevosMedicos.map((m) => (FOTOS[m.id] ? { ...m, foto: FOTOS[m.id] } : m))];

// ---- Citas: de hace 3 meses a dentro de 1 mes, sin domingos y sin repetir médico + fecha + hora.
const hoy = new Date();
const hoyIso = iso(hoy);
const desde = new Date(hoy); desde.setMonth(desde.getMonth() - 3);
const dias = [];
for (let d = new Date(hoy); d >= desde; d.setDate(d.getDate() - 1)) if (d.getDay() !== 0) dias.push(iso(d));
for (let d = new Date(hoy), i = 0; i < 30; i += 1) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) dias.push(iso(d)); }

const ocupado = new Set(base.citas.map((c) => `${c.medicoId}|${c.fecha}|${c.hora}`));
const nuevasCitas = [];
for (let intentos = 0; nuevasCitas.length < totalCitas && intentos < totalCitas * 20; intentos += 1) {
  const medico = azar() < 0.1 ? medicos[0] : elegir(medicos); // el Dr. Espinola (m1, cuenta demo) recibe ~10 %
  const fecha = elegir(dias);
  const hora = elegir(medico.horario);
  const clave = `${medico.id}|${fecha}|${hora}`;
  if (ocupado.has(clave)) continue;
  ocupado.add(clave);
  const p = azar();
  const estado = fecha < hoyIso ? (p < 0.72 ? 'Atendida' : 'Cancelada') : p < 0.6 ? 'Pendiente' : p < 0.9 ? 'Confirmada' : 'Cancelada';
  nuevasCitas.push({
    id: `g${String(nuevasCitas.length + 1).padStart(5, '0')}`, dniPaciente: String(entero(10000000, 79999999)), paciente: nombrePersona(),
    medicoId: medico.id, seguro: azar() < 0.5 ? 'EsSalud' : 'SIS', fecha, hora, estado, motivo: elegir(MOTIVOS),
  });
}

const datos = { ...base, medicos, citas: [...base.citas, ...nuevasCitas] };
const texto = `${JSON.stringify(datos, null, 2)}\n`;
writeFileSync('api/seed.json', texto);
writeFileSync('api/db.json', texto);
console.log(`Listo: ${medicos.length} médicos y ${datos.citas.length} citas en api/seed.json y api/db.json.`);
