import { readFile } from "node:fs/promises";
import { Estudiante } from "../modelos/Estudiante.js";
import { validarEstudiante } from "../utilidades/validacion.js";
export async function cargarEstudiantes(ruta) {
    const contenido = await readFile(ruta, "utf8");
    let datos;
    try {
        datos = JSON.parse(contenido);
    }
    catch (error) {
        const detalle = error instanceof Error ? error.message : String(error);
        throw new SyntaxError(`El archivo no contiene JSON válido: ${detalle}`);
    }
    if (!Array.isArray(datos)) {
        throw new TypeError("La raíz del archivo JSON debe ser un arreglo.");
    }
    const estudiantes = [];
    const errores = [];
    datos.forEach((registro, indice) => {
        const resultado = validarEstudiante(registro, indice + 1);
        if (resultado.ok) {
            estudiantes.push(new Estudiante(resultado.valor));
        }
        else {
            errores.push(...resultado.errores);
        }
    });
    const codigos = estudiantes.map(estudiante => estudiante.codigo);
    if (new Set(codigos).size !== codigos.length) {
        errores.push("Existen códigos duplicados en el archivo.");
    }
    if (errores.length > 0) {
        throw new TypeError(errores.join("\n"));
    }
    return estudiantes;
}
//# sourceMappingURL=repositorioJson.js.map