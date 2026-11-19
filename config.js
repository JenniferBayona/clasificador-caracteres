// La interfaz está desacoplada del proveedor de predicciones.
// Mantén "demo" hasta implementar y validar el adaptador del modelo real.
export const config = Object.freeze({
  mode: "demo",
  maxFileBytes: 10 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
});
