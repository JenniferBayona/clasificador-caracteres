const WEB_ORIGIN = "https://jenniferbayona.github.io";
const MAX_BYTES = 4_000_000;

export default {
  async fetch(request) {
    const headers = {
      "Access-Control-Allow-Origin": WEB_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };

    const json = (body, status = 200) =>
      Response.json(body, { status, headers });

    const origin = request.headers.get("origin");

    if (origin && origin !== WEB_ORIGIN) {
      return json({ error: "Origen no permitido." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return json({ error: "Método no permitido." }, 405);
    }

    const key = process.env.CUSTOM_VISION_KEY?.trim();
    const url = process.env.CUSTOM_VISION_URL?.trim();

    if (!key || !url) {
      return json({
        error: "Faltan las variables de entorno de Azure."
      }, 503);
    }

    if (request.method === "GET") {
      return json({ status: "ok", message: "API activa." });
    }

    const type = request.headers
      .get("content-type")?.split(";")[0].trim();

    if (type !== "application/octet-stream") {
      return json({
        error: "Envía la imagen como application/octet-stream."
      }, 415);
    }

    try {
      const image = await request.arrayBuffer();

      if (!image.byteLength || image.byteLength > MAX_BYTES) {
        return json({
          error: "La imagen debe tener entre 1 byte y 4 MB."
        }, 400);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Prediction-Key": key,
          "Content-Type": "application/octet-stream"
        },
        body: image,
        signal: AbortSignal.timeout(20_000)
      });

      if (!response.ok) {
        return json({
          error: `Azure respondió ${response.status}. Revisa la clave, la URL y la publicación del modelo.`,
          azureStatus: response.status
        }, response.status === 429 ? 429 : 502);
      }

      const result = await response.json();

      if (!Array.isArray(result.predictions) ||
          !result.predictions.length) {
        return json({
          error: "Azure devolvió una respuesta sin predicciones."
        }, 502);
      }

      return json(result);
    } catch (error) {
      return json({
        error: error.name === "TimeoutError"
          ? "Azure tardó demasiado. Intenta otra vez."
          : "No fue posible completar la consulta a Azure."
      }, 502);
    }
  }
};
