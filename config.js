export const config = Object.freeze({
  mode: "model",
  maxFileBytes: 10 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
});
