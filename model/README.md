# Modelo pendiente

El caso de uso es clasificación de un único carácter por imagen, con 36 clases:
los 10 dígitos `0-9` y las 26 letras mayúsculas `A-Z`, sin `Ñ`.
Las etiquetas definitivas se tomarán de la exportación del modelo respetando
su orden de salida.

Este borrador todavía no incluye un modelo. No coloques un `.pb` aquí esperando
que el navegador lo ejecute: la exportación para Python necesita un servidor
Python o una conversión compatible.

Cuando esté entrenado, revisaremos el ZIP y elegiremos entre:

- **TensorFlow.js:** alojar `model.json`, los fragmentos de pesos y las etiquetas
  aquí, y sustituir el proveedor de `../predictor.js`. Hay que validar nombres
  de entradas y salidas, preprocesamiento, orden de etiquetas y tipo de modelo.
- **Python:** mantener los pesos en un servidor separado y conectar un endpoint
  de predicción desde `../predictor.js`. GitHub Pages solo alojaría la interfaz.

El orden de las clases debe coincidir exactamente con el de las salidas del
modelo: no ordenar alfabéticamente las etiquetas antes de asociarlas con los
pesos. Las tres clases visibles A, H y R son solo datos de demostración.

La página recibe un carácter por imagen. No incluye segmentación de palabras,
lectura de texto completo ni detección de varios caracteres en una imagen.
