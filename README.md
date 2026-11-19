# Clasificador de caracteres — Vision Lab

Página web de demostración para un modelo de Custom Vision que clasificará
una imagen con **un único carácter**. Las **36 clases** previstas son los
**10 dígitos del 0 al 9** y las **26 letras mayúsculas de la A a la Z, sin Ñ**.
Las etiquetas se leerán de la exportación final respetando su orden de salida.

**Todavía no hay un modelo conectado.** El botón muestra siempre el ejemplo
`A: 82 %`, `H: 13 %`, `R: 5 %`, independientemente de la imagen. Los resultados
están identificados como simulados. No se está reconociendo el carácter.

## Publicar en GitHub sin instalar programas

1. Descomprime `clasificador-caracteres-github.zip` en tu computador.
2. Inicia sesión en GitHub y crea un repositorio llamado, por ejemplo,
   `clasificador-caracteres`. Si usas GitHub Free, elige **Public** para Pages.
   Activa **Add README** y termina con **Create repository**.
3. En la pestaña **Code**, selecciona **Add file → Upload files**.
4. Abre la carpeta que descomprimiste y arrastra **todo su contenido** a la
   pantalla de carga, incluidas las carpetas `assets` y `model`. Conserva esa
   estructura. `index.html` tiene que quedar en la raíz del repositorio.
   **No subas el ZIP ni una carpeta contenedora adicional.**
5. Escribe un mensaje como `Agregar borrador del clasificador`, selecciona
   **Commit directly to the main branch** y confirma con **Commit changes**.
   Si prefieres una rama nueva, crea y combina su pull request antes de seguir.
6. Abre **Settings → Pages**. En **Build and deployment**, selecciona:

   | Campo | Valor |
   | --- | --- |
   | Source | Deploy from a branch |
   | Branch | main |
   | Folder | /(root) |

7. Pulsa **Save**. La publicación puede tardar hasta 10 minutos. En esa misma
   sección aparecerá **Visit site** para abrir tu página.
8. Prueba **Usar ejemplo con la letra A** y **Probar demostración**. Debe
   aparecer el aviso de valores ficticios. También puedes cargar otra imagen.

La página publicada normalmente tendrá el formato
`https://TU-USUARIO.github.io/clasificador-caracteres/`. Sustituye el usuario
y el nombre del repositorio por los tuyos. La dirección exacta la da GitHub.

## Archivos que deben quedar en el repositorio

| Archivo o carpeta | Función |
| --- | --- |
| index.html | Página principal; debe estar en la raíz |
| styles.css | Estilos y adaptación a celular |
| app.js | Carga, vista previa y presentación de resultados |
| predictor.js | Predicciones ficticias; futura conexión al modelo |
| config.js | Configuración del modo demostración |
| assets/ | Icono e imagen de ejemplo |
| model/ | Indicaciones para incorporar el modelo después |
| README.md | Esta guía |
| .nojekyll | Indica que estos archivos ya son un sitio estático |

El archivo `.nojekyll` puede estar oculto en el explorador de tu computador.
La estructura actual tampoco necesita un proceso de compilación.

## Cuando termine el entrenamiento

Para ejecutar todo en GitHub Pages, usaremos una exportación compatible con
**TensorFlow.js**. Una exportación de TensorFlow para Python no se ejecuta
directamente en GitHub Pages: requeriría un servidor Python aparte o una
conversión que validemos para ese modelo.

Con la exportación final se reemplazará el proveedor de `predictor.js`, se
validará el preprocesamiento y el orden real de las etiquetas, y se actualizarán
los textos de demostración. No basta con copiar `model.pb` o cambiar `mode`.

## Probar en tu computador

Si tienes Python instalado, abre una terminal en esta carpeta y ejecuta:

```sh
python -m http.server 8000
```

Visita `http://localhost:8000`. No abras `index.html` con doble clic: los módulos
JavaScript necesitan servirse mediante HTTP.

