import { config } from "./config.js";
import { predict } from "./predictor.js";

const section = document.createElement("section");
section.className = "panel";
section.style.marginTop = "24px";
section.setAttribute("aria-labelledby", "batch-title");

section.innerHTML = `
  <div class="panel-header">
    <h2 id="batch-title">Clasificar un dataset</h2>
  </div>

  <div style="padding:24px">
    <p>
      Selecciona varias imágenes o una carpeta.
      Cada imagen debe contener un solo carácter.
    </p>

    <p>
      Las imágenes se enviarán a Azure Custom Vision
      cuando pulses Procesar dataset.
    </p>

    <input
      id="batch-files"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      hidden
    >

    <input
      id="batch-folder"
      type="file"
      webkitdirectory
      multiple
      hidden
    >

    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0">
      <button
        id="batch-choose"
        class="button button-secondary"
        type="button"
      >
        Seleccionar imágenes
      </button>

      <button
        id="batch-choose-folder"
        class="button button-secondary"
        type="button"
      >
        Seleccionar carpeta
      </button>

      <button
        id="batch-run"
        class="button button-primary"
        style="width:auto"
        type="button"
        disabled
      >
        Procesar dataset
      </button>

      <button
        id="batch-stop"
        class="button button-secondary"
        type="button"
        disabled
      >
        Detener
      </button>

      <button
        id="batch-csv"
        class="button button-secondary"
        type="button"
        disabled
      >
        Descargar CSV
      </button>
    </div>

    <p
      id="batch-status"
      role="status"
      aria-live="polite"
    >
      No hay imágenes seleccionadas.
    </p>

    <progress
      id="batch-progress"
      value="0"
      max="1"
      style="width:100%;margin:12px 0"
      aria-label="Progreso del dataset"
    ></progress>

    <div style="overflow-x:auto;max-height:420px">
      <table
        style="width:100%;border-collapse:collapse;text-align:left"
      >
        <caption class="sr-only">
          Resultados por imagen del dataset
        </caption>

        <thead>
          <tr>
            <th>Archivo</th>
            <th>Predicción</th>
            <th>Puntuación</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody id="batch-rows"></tbody>
      </table>
    </div>
  </div>
`;

document.getElementById("como-funciona").before(section);

const el = id => document.getElementById(`batch-${id}`);

let records = [];
let controller = null;

function controls() {
  for (const id of ["choose", "choose-folder", "files", "folder"]) {
    el(id).disabled = Boolean(controller);
  }

  el("run").disabled = Boolean(controller) || !records.length;
  el("stop").disabled = !controller;

  el("csv").disabled =
    Boolean(controller) ||
    !records.some(record => record.status !== "Pendiente");
}

function show(record, status) {
  record.status = status;

  record.cells[1].textContent = record.label || "—";

  record.cells[2].textContent = Number.isFinite(record.score)
    ? `${(record.score * 100).toLocaleString("es", {
        maximumFractionDigits: 1
      })} %`
    : "—";

  record.cells[3].textContent = status;
}

function selectFiles(fileList) {
  if (controller) return;

  const all = Array.from(fileList);

  const images = all.filter(file =>
    config.acceptedTypes.includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  );

  el("rows").replaceChildren();

  records = images.map(file => {
    const row = el("rows").insertRow();

    const cells = Array.from(
      { length: 4 },
      () => row.insertCell()
    );

    for (const cell of cells) {
      cell.style.padding = "12px 8px";
      cell.style.borderBottom = "1px solid #d9e2f0";
      cell.style.overflowWrap = "anywhere";
    }

    const record = {
      file,
      name: file.webkitRelativePath || file.name,
      cells
    };

    cells[0].textContent = record.name;
    show(record, "Pendiente");

    return record;
  });

  el("progress").max = records.length || 1;
  el("progress").value = 0;

  el("status").textContent =
    `${records.length} imágenes seleccionadas. ` +
    `Archivos de otros formatos omitidos: ${all.length - images.length}.`;

  controls();
}

el("choose").onclick = () => el("files").click();

el("choose-folder").onclick = () => el("folder").click();

for (const id of ["files", "folder"]) {
  el(id).onchange = () => {
    if (el(id).files.length) {
      selectFiles(el(id).files);
    }

    el(id).value = "";
  };
}

el("stop").onclick = () => controller?.abort();

el("run").onclick = async () => {
  if (controller || !records.length) return;

  controller = new AbortController();

  const { signal } = controller;

  controls();

  let completed = 0;
  let successes = 0;
  let errors = 0;
  let stopped = false;

  el("progress").value = 0;

  for (const record of records) {
    record.label = null;
    record.score = null;
    show(record, "Pendiente");
  }

  try {
    for (const record of records) {
      if (signal.aborted) {
        stopped = true;
        break;
      }

      show(record, "Procesando");

      el("status").textContent =
        `Procesando ${completed + 1} de ${records.length}: ` +
        record.name;

      let objectUrl;

      try {
        if (
          !record.file.size ||
          record.file.size > config.maxFileBytes
        ) {
          throw new Error("Archivo vacío o mayor de 10 MB.");
        }

        objectUrl = URL.createObjectURL(record.file);

        const image = new Image();
        image.src = objectUrl;

        await image.decode();
        signal.throwIfAborted();

        if (
          !image.naturalWidth ||
          !image.naturalHeight ||
          image.naturalWidth * image.naturalHeight >
            config.maxImagePixels
        ) {
          throw new Error(
            "Imagen inválida o mayor de 40 megapíxeles."
          );
        }

        const result = await predict(image, { signal });

        signal.throwIfAborted();

        const best = result.predictions[0];

        record.label = best.label;
        record.score = best.score;

        show(record, "Completado");
        successes++;

      } catch (error) {
        if (signal.aborted) {
          show(record, "Cancelado");
          stopped = true;
          break;
        }

        show(record, `Error: ${error.message}`);
        errors++;

        if (/\b(401|403|404|429)\b/.test(error.message)) {
          stopped = true;
        }

      } finally {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      }

      completed++;
      el("progress").value = completed;

      if (stopped) break;
    }

  } finally {
    const state = stopped || signal.aborted
      ? "Lote detenido"
      : "Lote finalizado";

    el("status").textContent =
      `${state}. ` +
      `Procesadas: ${completed}/${records.length}. ` +
      `Clasificadas: ${successes}. Errores: ${errors}.`;

    controller = null;
    controls();
  }
};

el("csv").onclick = () => {
  const quote = value => {
    let text = String(value ?? "");

    if (/^\s*[=+@-]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replaceAll('"', '""')}"`;
  };

  const rows = [
    ["Archivo", "Predicción", "Puntuación (%)", "Estado"],

    ...records
      .filter(record => record.status !== "Pendiente")
      .map(record => [
        record.name,
        record.label,
        Number.isFinite(record.score)
          ? (record.score * 100).toFixed(6)
          : "",
        record.status
      ])
  ];

  const csv =
    "\uFEFF" +
    rows
      .map(row => row.map(quote).join(";"))
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8"
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download = "resultados_caracteres.csv";

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

window.addEventListener(
  "pagehide",
  () => controller?.abort()
);
