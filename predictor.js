import { config } from "./config.js";

let resourcesPromise = null;

function loadResources() {
  if (!resourcesPromise) {
    resourcesPromise = (async () => {
      const tf = window.tf;

      if (!tf) {
        throw new Error("No se pudo cargar TensorFlow.js.");
      }

      const response = await fetch(
        new URL("./model/labels.txt", import.meta.url)
      );

      if (!response.ok) {
        throw new Error("No se encontró model/labels.txt.");
      }

      const labels = (await response.text())
        .trim()
        .split(/\r?\n/)
        .map(label => label.trim());

      if (labels.length !== 36) {
        throw new Error("labels.txt debe contener las 36 clases.");
      }

      await tf.ready();

      const model = await tf.loadGraphModel(
        new URL("./model/model.json", import.meta.url).href
      );

      return { tf, model, labels };
    })().catch(error => {
      resourcesPromise = null;
      throw error;
    });
  }

  return resourcesPromise;
}

export async function predict(image, { signal } = {}) {
  signal?.throwIfAborted();

  if (config.mode !== "model") {
    throw new Error('Cambia mode a "model" en config.js.');
  }

  if (!image?.naturalWidth) {
    throw new Error("Selecciona una imagen primero.");
  }

  const { tf, model, labels } = await loadResources();
  signal?.throwIfAborted();

  const input = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(image, 3);
    const [height, width] = pixels.shape;
    const side = Math.min(height, width);

    const y = (height - side) / (2 * height);
    const x = (width - side) / (2 * width);

    return tf.image.cropAndResize(
      pixels.toFloat().expandDims(0),
      [[y, x, 1 - y, 1 - x]],
      [0],
      [300, 300]
    );
  });

  let output;

  try {
    output = model.execute(input, "model_output");
    const scores = Array.from(await output.data());

    signal?.throwIfAborted();

    if (scores.length !== labels.length) {
      throw new Error("Las salidas no coinciden con las etiquetas.");
    }

    const predictions = labels
      .map((label, index) => ({
        label,
        score: scores[index]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      simulated: false,
      predictions
    };
  } finally {
    input.dispose();
    output?.dispose();
  }
}
