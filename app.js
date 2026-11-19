import { config } from "./config.js";
import { predict } from "./predictor.js";

const byId = (id) => document.getElementById(id);
const input = byId("image-input");
const preview = byId("preview-image");
const run = byId("run-prediction");
const resultsPanel = document.querySelector(".results-panel");
const dropzone = byId("dropzone");
let currentImage = null;
let activePrediction = null;
let loadVersion = 0;
let dragDepth = 0;

function showError(message) {
  byId("file-error").textContent = message;
  byId("file-error").hidden = !message;
}

function setResultState(state) {
  for (const name of ["empty", "loading", "prediction"]) {
    byId(`${name}-results`).hidden = name !== state;
  }
  const busy = state === "loading";
  resultsPanel.setAttribute("aria-busy", String(busy));
  run.classList.toggle("is-loading", busy);
  run.querySelector(".button-loader").hidden = !busy;
  run.disabled = busy || !currentImage;
  byId("run-label").textContent = busy
  ? "Analizando imagen…"
  : state === "prediction"
    ? "Analizar otra vez"
    : "Clasificar imagen";

byId("result-status").textContent = busy
  ? "Analizando"
  : state === "prediction"
    ? "Resultado"
    : "En espera";
  byId("result-status").classList.toggle("is-complete", state === "prediction");
}

function cancelPrediction() {
  activePrediction?.abort();
  activePrediction = null;
  byId("results-announcement").textContent = "";
  setResultState("empty");
}

function releaseCurrentImage() {
  if (currentImage?.objectUrl) URL.revokeObjectURL(currentImage.objectUrl);
  currentImage = null;
}

function clearImage({ moveFocus = false } = {}) {
  loadVersion++;
  releaseCurrentImage();
  cancelPrediction();
  preview.removeAttribute("src");
  byId("image-preview").hidden = true;
  byId("dropzone-content").hidden = false;
  byId("image-meta").hidden = true;
  byId("use-sample").hidden = false;
  input.value = "";
  showError("");
  if (moveFocus) byId("choose-image").focus();
}

async function loadImage({ url, name, details, objectUrl = null }) {
  const version = ++loadVersion;
  const candidate = new Image();
  candidate.decoding = "async";
  candidate.src = url;
  cancelPrediction();
  run.disabled = true;
  showError("");
  try {
    await candidate.decode();
    if (version !== loadVersion) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      return;
    }
    if (!candidate.naturalWidth || candidate.naturalWidth * candidate.naturalHeight > config.maxImagePixels) {
      throw new Error("La imagen es demasiado grande. Usa una versión de hasta 40 megapíxeles.");
    }
    // Transferir la imagen solo tras decodificarla correctamente.
    releaseCurrentImage();
    currentImage = { element: candidate, objectUrl };
    preview.src = url;
    preview.alt = `Vista previa: ${name}`;
    byId("dropzone-content").hidden = true;
    byId("image-preview").hidden = false;
    byId("image-meta").hidden = false;
    byId("use-sample").hidden = true;
    byId("file-name").textContent = name;
    byId("file-details").textContent = `${candidate.naturalWidth} × ${candidate.naturalHeight} px · ${details}`;
    byId("results-announcement").textContent = "Imagen lista para clasificar.";
    run.disabled = false;
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (version !== loadVersion) return;
    run.disabled = !currentImage;
    showError(error.message.includes("megapíxeles") ? error.message : "No pudimos abrir la imagen. Prueba con otro archivo JPG, PNG o WEBP.");
  }
}

function chooseFile(file) {
  if (!file) return;
  if (!config.acceptedTypes.includes(file.type)) {
    showError("Ese formato no es compatible. Selecciona una imagen JPG, PNG o WEBP.");
    return;
  }
  if (file.size === 0 || file.size > config.maxFileBytes) {
    showError(file.size === 0 ? "El archivo está vacío. Selecciona otra imagen." : "La imagen supera los 10 MB. Selecciona un archivo más pequeño.");
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toLocaleString("es", { maximumFractionDigits: 1 })} MB`;
  void loadImage({ url: objectUrl, objectUrl, name: file.name, details: `${file.type.split("/")[1].toUpperCase()} · ${size}` });
}

function renderPredictions(predictions) {
  const sorted = [...predictions].sort((a, b) => b.score - a.score);
  const percentage = (score) => (score * 100).toLocaleString("es", { maximumFractionDigits: 1 });
  byId("top-label").textContent = sorted[0].label;
  const unit = document.createElement("span");
  unit.textContent = "%";
  byId("top-score").replaceChildren(document.createTextNode(percentage(sorted[0].score)), unit);
  byId("score-list").replaceChildren(...sorted.map(({ label, score }) => {
    const item = document.createElement("li");
    const row = document.createElement("div");
    row.className = "score-label";
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const scoreElement = document.createElement("strong");
    scoreElement.textContent = `${percentage(score)} %`;
    row.append(labelElement, scoreElement);
    const track = document.createElement("div");
    track.className = "score-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div");
    fill.className = "score-fill";
    fill.style.width = `${Math.max(0, Math.min(100, score * 100))}%`;
    track.append(fill);
    item.append(row, track);
    return item;
  }));
}

byId("choose-image").addEventListener("click", () => input.click());
byId("change-image").addEventListener("click", () => input.click());
input.addEventListener("change", () => {
  chooseFile(input.files[0]);
  input.value = "";
});
byId("remove-image").addEventListener("click", () => clearImage({ moveFocus: true }));
byId("use-sample").addEventListener("click", () => {
  void loadImage({ url: new URL("./assets/sample.svg", import.meta.url).href, name: "Letra A de ejemplo", details: "Carácter ilustrativo · A" });
});

for (const eventName of ["dragenter", "dragover", "dragleave", "drop"]) {
  dropzone.addEventListener(eventName, (event) => event.preventDefault());
}
dropzone.addEventListener("dragenter", () => {
  dragDepth++;
  dropzone.classList.add("is-dragging");
});
dropzone.addEventListener("dragover", (event) => { event.dataTransfer.dropEffect = "copy"; });
dropzone.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) { dragDepth = 0; dropzone.classList.remove("is-dragging"); }
});
dropzone.addEventListener("drop", (event) => {
  dragDepth = 0;
  dropzone.classList.remove("is-dragging");
  if (event.dataTransfer.files.length > 1) {
    showError("Prueba una imagen a la vez. Arrastra solo un archivo.");
    return;
  }
  chooseFile(event.dataTransfer.files[0]);
});

run.addEventListener("click", async () => {
  if (!currentImage || activePrediction) return;
  const controller = new AbortController();
  activePrediction = controller;
  const element = currentImage.element;
  showError("");
  setResultState("loading");
  byId("results-announcement").textContent = "Analizando la imagen con el modelo.";
  try {
    const result = await predict(element, { signal: controller.signal });
    if (controller.signal.aborted || activePrediction !== controller) return;
    renderPredictions(result.predictions);
    setResultState("prediction");
    byId("results-announcement").textContent = "Clasificación completada.";
  } catch (error) {
    if (controller.signal.aborted || activePrediction !== controller) return;
    setResultState("empty");
    showError(error.message || "No se pudo clasificar la imagen. Inténtalo de nuevo.");
  } finally {
    if (activePrediction === controller) activePrediction = null;
  }
});

document.querySelector(".help-link").addEventListener("click", () => { byId("como-funciona").open = true; });
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) { activePrediction?.abort(); releaseCurrentImage(); }
});
