import { config } from "./config.js";

/**
 * Contrato del adaptador: Promise<{ simulated: boolean,
 * predictions: Array<{ label: string, score: number }> }>.
 * `image` es un HTMLImageElement completamente cargado.
 * `score` se expresa entre 0 y 1.
 *
 * Al incorporar el modelo se reemplaza este proveedor y se actualizan
 * los textos de demostración en index.html y app.js. La carga, vista
 * previa y presentación de resultados se pueden conservar.
 * No se deben cambiar solo las etiquetas para aparentar predicciones reales.
 */
export async function predict(image, { signal } = {}) {
  signal?.throwIfAborted();
  if (config.mode !== "demo") {
    throw new Error("El adaptador del modelo real todavía no está implementado.");
  }
  if (!image?.naturalWidth) {
    throw new Error("Selecciona una imagen antes de probar la demostración.");
  }
  await new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Prueba cancelada", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 800);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  signal?.throwIfAborted();
  // Valores fijos de demostración: NO dependen del contenido de la imagen.
  return {
    simulated: true,
    predictions: [
      { label: "A", score: 0.82 },
      { label: "H", score: 0.13 },
      { label: "R", score: 0.05 },
    ],
  };
}
