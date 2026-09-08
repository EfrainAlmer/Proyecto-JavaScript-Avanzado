"use strict";

/*
|--------------------------------------------------------------------------
| 1. CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const REGLAS_BASE = Object.freeze({
  igvPorcentaje: 18,
  descuentoClienteFrecuente: 5,
  descuentoMaximo: 50,
  envioExpresCentimos: 1500,
});


/*
|--------------------------------------------------------------------------
| 2. BANDERAS DE BITS
|--------------------------------------------------------------------------
*/

const OPCION_CLIENTE_FRECUENTE = 1 << 0; // 001
const OPCION_ENVIO_EXPRES = 1 << 1;      // 010


/*
|--------------------------------------------------------------------------
| 3. REFERENCIAS AL DOM
|--------------------------------------------------------------------------
*/

const formulario =
  document.querySelector("#formCotizacion");

const inputProducto =
  document.querySelector("#producto");

const inputPrecio =
  document.querySelector("#precio");

const inputCantidad =
  document.querySelector("#cantidad");

const inputDescuento =
  document.querySelector("#descuento");

const inputClienteFrecuente =
  document.querySelector("#clienteFrecuente");

const inputEnvioExpres =
  document.querySelector("#envioExpres");

const mensajeError =
  document.querySelector("#mensajeError");

const panelResultado =
  document.querySelector("#panelResultado");


const salidas = {
  id: document.querySelector("#idOperacion"),

  producto:
    document.querySelector("#productoResultado"),

  subtotal:
    document.querySelector("#subtotalResultado"),

  descuento:
    document.querySelector("#descuentoResultado"),

  base:
    document.querySelector("#baseResultado"),

  igv:
    document.querySelector("#igvResultado"),

  envio:
    document.querySelector("#envioResultado"),

  total:
    document.querySelector("#totalResultado"),

  banderas:
    document.querySelector("#explicacionBanderas"),
};


/*
|--------------------------------------------------------------------------
| 4. FORMATEADOR DE MONEDA
|--------------------------------------------------------------------------
*/

const formateadorMoneda =
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  });


/*
|--------------------------------------------------------------------------
| 5. BIGINT
|--------------------------------------------------------------------------
|
| BigInt se utiliza únicamente para generar un ID.
| NO se mezcla con los cálculos monetarios.
|
*/

let correlativo = 0n;

function crearIdOperacion() {

  correlativo += 1n;

  return (
    BigInt(Date.now()) * 1_000_000n
    + correlativo
  );
}


/*
|--------------------------------------------------------------------------
| 6. CONVERSIÓN DE PRECIO A CÉNTIMOS
|--------------------------------------------------------------------------
|
| Ejemplo:
|
| "19.90" -> 1990
| "250.00" -> 25000
|
*/

function convertirImporteACentimos(texto) {

  const limpio = texto.trim();

  const partes = limpio.split(".");

  if (
    limpio === "" ||
    partes.length > 2
  ) {
    throw new TypeError(
      "Ingresa un precio válido con punto decimal."
    );
  }

  const parteEntera = partes[0];

  const parteDecimal =
    partes[1] ?? "";

  if (
    parteEntera === "" ||
    parteDecimal.length > 2
  ) {
    throw new RangeError(
      "El precio admite como máximo dos decimales."
    );
  }

  const enteros =
    Number(parteEntera);

  const decimales =
    Number(
      parteDecimal.padEnd(2, "0") || "0"
    );

  if (
    !Number.isInteger(enteros) ||
    enteros < 0 ||

    !Number.isInteger(decimales) ||
    decimales < 0 ||
    decimales > 99
  ) {
    throw new TypeError(
      "El precio contiene caracteres o signos no válidos."
    );
  }

  const centimos =
    enteros * 100 + decimales;

  if (
    !Number.isSafeInteger(centimos) ||
    centimos <= 0
  ) {
    throw new RangeError(
      "El precio debe ser mayor que 0."
    );
  }

  if (centimos > 100000000) {
    throw new RangeError(
      "El precio máximo permitido es S/ 1,000,000.00."
    );
  }

  return centimos;
}


/*
|--------------------------------------------------------------------------
| 7. LECTURA Y VALIDACIÓN DE ENTEROS
|--------------------------------------------------------------------------
*/

function leerEntero(
  input,
  nombre,
  minimo,
  maximo
) {

  const valor =
    Number(input.value);

  if (
    !Number.isInteger(valor) ||
    valor < minimo ||
    valor > maximo
  ) {
    throw new RangeError(
      `${nombre} debe ser un entero entre ${minimo} y ${maximo}.`
    );
  }

  return valor;
}


/*
|--------------------------------------------------------------------------
| 8. CREACIÓN DE BANDERAS
|--------------------------------------------------------------------------
|
| OR | activa una bandera.
|
*/

function crearBanderas({
  clienteFrecuente,
  envioExpres,
}) {

  let banderas = 0;

  if (clienteFrecuente) {
    banderas |= OPCION_CLIENTE_FRECUENTE;
  }

  if (envioExpres) {
    banderas |= OPCION_ENVIO_EXPRES;
  }

  return banderas;
}


/*
|--------------------------------------------------------------------------
| 9. CONSULTAR BANDERAS
|--------------------------------------------------------------------------
|
| AND & permite comprobar si un bit está activo.
|
*/

function tieneOpcion(
  banderas,
  opcion
) {

  return (
    (banderas & opcion) !== 0
  );
}


/*
|--------------------------------------------------------------------------
| 10. SUMAR CÉNTIMOS
|--------------------------------------------------------------------------
|
| REST:
| ...valores reúne todos los argumentos.
|
*/

function sumarCentimos(...valores) {

  let total = 0;

  for (const valor of valores) {
    total += valor;
  }

  return total;
}


/*
|--------------------------------------------------------------------------
| 11. CÁLCULO PRINCIPAL
|--------------------------------------------------------------------------
|
| Esta función no modifica el DOM.
| Solo recibe datos y devuelve resultados.
|
*/

function calcularCotizacion(
  datos,
  opciones = {}
) {

  /*
   * SPREAD:
   * combina las reglas base con posibles ajustes.
   */

  const reglas = {
    ...REGLAS_BASE,
    ...opciones,
  };

  /*
   * ?? conserva 0 como valor válido.
   */

  const banderas =
    reglas.banderas ?? 0;


  /*
   * SUBTOTAL
   */

  const subtotalCentimos =
    datos.precioCentimos *
    datos.cantidad;

  if (
    !Number.isSafeInteger(
      subtotalCentimos
    )
  ) {
    throw new RangeError(
      "El subtotal excede el rango de enteros seguros."
    );
  }


  /*
   * CLIENTE FRECUENTE
   */

  const esFrecuente =
    tieneOpcion(
      banderas,
      OPCION_CLIENTE_FRECUENTE
    );


  /*
   * Descuento mínimo
   *
   * Cliente frecuente -> mínimo 5 %
   * Cliente normal -> 0 %
   */

  const descuentoMinimo =
    esFrecuente
      ? reglas.descuentoClienteFrecuente
      : 0;


  /*
   * Se conserva el mayor descuento
   * solicitado vs. mínimo requerido.
   */

  const descuentoAplicado =
    Math.min(
      Math.max(
        datos.descuento,
        descuentoMinimo
      ),
      reglas.descuentoMaximo
    );


  /*
   * DESCUENTO
   */

  const descuentoCentimos =
    Math.round(
      subtotalCentimos *
      descuentoAplicado /
      100
    );


  /*
   * BASE IMPONIBLE
   */

  const baseImponibleCentimos =
    subtotalCentimos -
    descuentoCentimos;


  /*
   * IGV
   */

  const igvCentimos =
    Math.round(
      baseImponibleCentimos *
      reglas.igvPorcentaje /
      100
    );


  /*
   * ENVÍO
   */

  const envioCentimos =
    tieneOpcion(
      banderas,
      OPCION_ENVIO_EXPRES
    )
      ? reglas.envioExpresCentimos
      : 0;


  /*
   * SPREAD
   *
   * Se crea un arreglo de componentes
   * y luego se expande con ...
   */

  const componentes = [
    baseImponibleCentimos,
    igvCentimos,
    envioCentimos,
  ];

  const totalCentimos =
    sumarCentimos(...componentes);


  /*
   * SPREAD EN OBJETO
   */

  return {
    ...datos,

    banderas,

    descuentoAplicado,

    subtotalCentimos,

    descuentoCentimos,

    baseImponibleCentimos,

    igvCentimos,

    envioCentimos,

    totalCentimos,
  };
}


/*
|--------------------------------------------------------------------------
| 12. FORMATEAR CÉNTIMOS A SOLES
|--------------------------------------------------------------------------
*/

function formatearCentimos(
  centimos
) {

  return formateadorMoneda.format(
    centimos / 100
  );
}


/*
|--------------------------------------------------------------------------
| 13. MANEJO DE ERRORES
|--------------------------------------------------------------------------
*/

function limpiarError() {

  mensajeError.textContent = "";

  mensajeError.hidden = true;
}


function mostrarError(mensaje) {

  mensajeError.textContent =
    mensaje;

  mensajeError.hidden = false;
}


/*
|--------------------------------------------------------------------------
| 14. MOSTRAR RESULTADO
|--------------------------------------------------------------------------
*/

function mostrarResultado(resultado) {

  /*
   * BigInt -> String
   */

  salidas.id.value =
    crearIdOperacion().toString();


  salidas.producto.textContent =
    `${resultado.producto} × ${resultado.cantidad}`;


  salidas.subtotal.value =
    formatearCentimos(
      resultado.subtotalCentimos
    );


  salidas.descuento.value =
    `-${formatearCentimos(
      resultado.descuentoCentimos
    )} (${resultado.descuentoAplicado} %)`;

  salidas.base.value =
    formatearCentimos(
      resultado.baseImponibleCentimos
    );

  salidas.igv.value =
    formatearCentimos(
      resultado.igvCentimos
    );

  salidas.envio.value =
    formatearCentimos(
      resultado.envioCentimos
    );

  salidas.total.value =
    formatearCentimos(
      resultado.totalCentimos
    );


  /*
   * Consultamos nuevamente
   * las banderas.
   */

  const frecuente =
    tieneOpcion(
      resultado.banderas,
      OPCION_CLIENTE_FRECUENTE
    );

  const expres =
    tieneOpcion(
      resultado.banderas,
      OPCION_ENVIO_EXPRES
    );


  salidas.banderas.textContent =
    `Banderas ${
      resultado.banderas
        .toString(2)
        .padStart(2, "0")
    }: ` +
    `cliente frecuente ${
      frecuente ? "sí" : "no"
    }; ` +
    `envío express ${
      expres ? "sí" : "no"
    }.`;

  panelResultado.hidden = false;
}


/*
|--------------------------------------------------------------------------
| 15. EVENTO SUBMIT
|--------------------------------------------------------------------------
*/

function manejarEnvio(evento) {

  evento.preventDefault();

  limpiarError();

  try {

    /*
     * PRODUCTO
     */

    const producto =
      inputProducto.value.trim();

    if (producto === "") {

      throw new TypeError(
        "Escribe el nombre del producto o servicio."
      );
    }


    /*
     * PRECIO
     */

    const precioCentimos =
      convertirImporteACentimos(
        inputPrecio.value
      );


    /*
     * CANTIDAD
     */

    const cantidad =
      leerEntero(
        inputCantidad,
        "La cantidad",
        1,
        10000
      );


    /*
     * DESCUENTO
     */

    const descuento =
      leerEntero(
        inputDescuento,
        "El descuento",
        0,
        50
      );


    /*
     * BANDERAS
     */

    const banderas =
      crearBanderas({
        clienteFrecuente:
          inputClienteFrecuente.checked,

        envioExpres:
          inputEnvioExpres.checked,
      });


    /*
     * DATOS
     */

    const datos = {
      producto,
      precioCentimos,
      cantidad,
      descuento,
    };


    /*
     * CALCULAR
     */

    const resultado =
      calcularCotizacion(
        datos,
        { banderas }
      );


    /*
     * MOSTRAR
     */

    mostrarResultado(resultado);

  } catch (error) {

    panelResultado.hidden = true;

    mostrarError(
      error instanceof Error
        ? error.message
        : "Ocurrió un error inesperado."
    );
  }
}


/*
|--------------------------------------------------------------------------
| 16. RESET
|--------------------------------------------------------------------------
*/

function manejarReinicio() {

  limpiarError();

  panelResultado.hidden = true;

  queueMicrotask(() => {
    inputProducto.focus();
  });
}


/*
|--------------------------------------------------------------------------
| 17. EVENTOS
|--------------------------------------------------------------------------
*/

formulario.addEventListener(
  "submit",
  manejarEnvio
);

formulario.addEventListener(
  "reset",
  manejarReinicio
);


/*
|--------------------------------------------------------------------------
| 18. FOCUS INICIAL
|--------------------------------------------------------------------------
*/

inputProducto.focus();