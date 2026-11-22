export const config = Object.freeze({
  mode: "api",
  apiUrl: "https://clasificador-caracteres-api-v2.vercel.app/api/predict",
  maxFileBytes: 10 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
});
