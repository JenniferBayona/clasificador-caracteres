import { config } from "./config.js";

export async function predict(image, { signal } = {}) {
  signal?.throwIfAborted();

  if (!image?.naturalWidth) {
    throw new Error("Selecciona una imagen primero.");
  }

  // Conserva la proporción y limita el lado mayor a 1024 píxeles.
  const scale = Math.min(
    1,
    1024 / Math.max(image.naturalWidth, image.naturalHeight)
  );

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(
    1, Math.round(image.naturalWidth * scale)
  );

  canvas.height = Math.max(
    1, Math.round(image.naturalHeight * scale)
  );

  const context = canvas.getContext("2d");

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Convierte la imagen a JPEG antes de enviarla.
  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );

  if (!blob || blob.size > 4_000_000) {
    throw new Error(
      "No se pudo preparar la imagen. Prueba con un archivo más pequeño."
    );
  }

  signal?.throwIfAborted();

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body: blob,
    signal
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `La API respondió ${response.status}.`
    );
  }

  if (!Array.isArray(data.predictions)) {
    throw new Error("La API no devolvió predicciones válidas.");
  }

  const predictions = data.predictions
    .map(item => ({
      label: item.tagName,
      score: item.probability
    }))
    .filter(item =>
      typeof item.label === "string" &&
      Number.isFinite(item.score) &&
      item.score >= 0 &&
      item.score <= 1
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!predictions.length) {
    throw new Error("La API devolvió una lista de resultados vacía.");
  }

  return {
    simulated: false,
    predictions
  };
}
