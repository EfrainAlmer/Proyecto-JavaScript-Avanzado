// SCRIPT: hace funcionar las 4 demostraciones.
// Todo es simulado en el navegador para entender la idea sin instalar nada.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- 1. SERVICIOS ----------
// "compartida" imita providedIn:'root' (una instancia). "propias" imita crear una por componente.
const cocina = { compartida: [], propias: { a: [], b: [] } };
const modo = () => document.querySelector('input[name=modo]:checked').value;

function dibujarServicios() {
  const una = modo() === 'una';
  ['a', 'b'].forEach((m) => {
    const lista = una ? cocina.compartida : cocina.propias[m];
    $('lista-' + m).innerHTML = lista.length
      ? lista.map((p, i) => `<li>Pedido ${i + 1}: ${p}</li>`).join('')
      : '<li>Sin pedidos</li>';
  });
  $('explica-servicio').textContent = una
    ? 'Los dos meseros comparten la misma cocina: lo que pide uno lo ve el otro. Así comparten datos los componentes con un servicio.'
    : 'Cada mesero tiene su propia cocina y no se ven entre ellos. Por eso el servicio no se crea con new: se pide con inject().';
}
document.querySelectorAll('[data-mesero]').forEach((b) =>
  b.addEventListener('click', () => {
    const m = b.dataset.mesero;
    (modo() === 'una' ? cocina.compartida : cocina.propias[m]).push('pizza');
    dibujarServicios();
  })
);
document.querySelectorAll('input[name=modo]').forEach((r) =>
  r.addEventListener('change', () => {
    cocina.compartida = [];
    cocina.propias = { a: [], b: [] };
    dibujarServicios();
  })
);
dibujarServicios();

// ---------- 2. HTTPCLIENT ----------
// Servidor simulado: una lista en memoria con una pequeña espera, como en la vida real.
let platos = [{ id: 1, nombre: 'Pizza', precio: 28 }, { id: 2, nombre: 'Ceviche', precio: 35 }];
let siguienteId = 3;
let ocupado = false;

document.querySelectorAll('[data-accion]').forEach((b) =>
  b.addEventListener('click', () => {
    if (ocupado) return;
    ocupado = true;
    const accion = b.dataset.accion;
    const peticion = { GET: 'GET /platos', POST: 'POST /platos', DELETE: 'DELETE /platos/' + (platos[0] ? platos[0].id : 1) }[accion];
    $('salida-http').textContent = 'Petición: ' + peticion + '\nEsperando respuesta...';
    setTimeout(() => {
      let texto = 'Petición: ' + peticion + '\n';
      if ($('caido').checked) {
        texto += 'Respuesta: ERROR, no hay conexión con el servidor.\nQué pasó: se ejecuta el bloque "error" del subscribe.';
      } else if (accion === 'GET') {
        texto += 'Respuesta: 200 (éxito)\nQué pasó: el servidor devolvió la lista.\n' + JSON.stringify(platos, null, 2);
      } else if (accion === 'POST') {
        const nuevo = { id: siguienteId++, nombre: 'Plato nuevo', precio: 30 };
        platos.push(nuevo);
        texto += 'Respuesta: 201 (creado)\nQué pasó: el servidor guardó el plato y le asignó un id.\n' + JSON.stringify(nuevo, null, 2);
      } else if (platos.length) {
        const borrado = platos.shift();
        texto += 'Respuesta: 200 (éxito)\nQué pasó: se borró "' + borrado.nombre + '".';
      } else {
        texto += 'Respuesta: 404 (no existe)\nQué pasó: ya no quedan platos para borrar.';
      }
      $('salida-http').textContent = texto;
      ocupado = false;
    }, 500);
  })
);

// ---------- 3. JSON SERVER ----------
const db = [
  { id: 1, nombre: 'Pizza', categoria: 'comida', precio: 28 },
  { id: 2, nombre: 'Ceviche', categoria: 'comida', precio: 35 },
  { id: 3, nombre: 'Limonada', categoria: 'bebida', precio: 8 },
];
function dibujarJson() {
  const c = $('categoria').value;
  const res = c ? db.filter((p) => p.categoria === c) : db;
  $('salida-json').textContent = 'GET http://localhost:3000/platos' + (c ? '?categoria=' + c : '') + '\n200 OK\n' + JSON.stringify(res, null, 2);
}
$('categoria').addEventListener('change', dibujarJson);
dibujarJson();

// ---------- 4. PRUEBAS ----------
// Cada prueba devuelve null si pasa, o el mensaje de error si falla.
const pruebas = [
  ['listar() hace un GET a /platos', () => $('romper').checked ? 'No se encontró ninguna petición a http://localhost:3000/platos.\nLlegó: GET http://localhost:3000/plato' : null],
  ['crear() envía un POST con el plato', () => null],
  ['listar() devuelve lo que responde el servidor falso', () => $('romper').checked ? 'No se encontró la petición esperada, no hubo respuesta que revisar.' : null],
  ['borrar() hace un DELETE con el id', () => null],
];
function dibujarPruebas(res) {
  const lista = res || [];
  const filas = pruebas.map((p, i) => {
    const r = lista[i];
    const marca = r === undefined ? '·' : r ? '✘' : '✔';
    const clase = r === undefined ? '' : r ? 'mal' : 'ok';
    return `<div class="prueba"><b class="${clase}">${marca}</b><div>${esc(p[0])}${r ? '<br><small class="mal">' + esc(r).replace(/\n/g, '<br>') + '</small>' : ''}</div></div>`;
  }).join('');
  const aprobadas = lista.filter((r) => !r).length;
  $('pruebas-lista').innerHTML = filas + (lista.length === pruebas.length ? `<p><b>${aprobadas} de ${pruebas.length} pruebas aprobadas.</b></p>` : '');
}
$('ejecutar').addEventListener('click', () => {
  const res = [];
  dibujarPruebas(res);
  pruebas.forEach((p, i) => setTimeout(() => { res.push(p[1]()); dibujarPruebas(res); }, 300 * (i + 1)));
});
dibujarPruebas();
