# RC map generator

Generador y editor de mapas de batalla para D&D, en español, con **Material Web de Google + TypeScript + Canvas 2D**. Sin React, backend ni servicios de generación de imágenes.

## Ejecutar

Requiere Node.js **22.12 o posterior**.

```bash
npm install
npm run dev
```

Abrir **http://127.0.0.1:5180**, o el puerto que indique Vite. El servidor solo escucha en la máquina local. Para un teléfono de la misma red: `npm run dev -- --host 0.0.0.0`.

```bash
npm run build       # TypeScript + compilación a dist/
npm run preview     # Servir la compilación
npm test            # Pruebas del motor, temas, assets, dimensiones y migración
npx playwright install chromium
npm run test:e2e     # Pruebas de navegador y descargas reales
npm run assets      # Recrear Vanilla y sus variantes Dark/Anime
```

Publicación: servir `dist/` desde un alojamiento estático con HTTPS. Fuentes, imágenes y scripts se incluyen localmente; no se necesitan claves ni CDNs.

## Tres temáticas completas

| Temática | Dirección artística |
| --- | --- |
| **Vanilla** | La colección original: verdes naturales, piedra cálida, madera y fantasía clásica. Los 31 SVG originales se conservan sin cambios. |
| **Dark** | Fantasía medieval cruda: árboles retorcidos, follaje escaso, hierro, madera agrietada, telas reparadas, ceniza, piedra erosionada y luz de antorchas. |
| **Anime** | Fantasía japonesa isekai de reinos: sombreado por celdas, cerezos, vegetación luminosa, cristales lilas, heráldica, pociones y ornamentos arcanos. Arte original, sin personajes o emblemas de franquicias. |

Cada tema contiene **los mismos 27 objetos y 4 texturas de terreno**: **93 SVG temáticos** en total. No son filtros CSS sobre una única imagen: las variantes tienen sus propios SVG, detalles, materiales y, en los árboles, nuevas siluetas.

El selector de temática está siempre disponible sobre los paneles. Al cambiarlo:

- Se actualizan inmediatamente el mapa actual, los objetos existentes, la biblioteca, los pinceles, la previsualización de colocación y la interfaz.
- **No se pierden casillas ni objetos editados**; solo cambia su representación. El cambio se puede deshacer/rehacer.
- La generación posterior utiliza la temática elegida, incluyendo nombres y distribución de decoración.
- Guardado, apertura de proyectos, miniatura de exportación y PNG/JPEG conservan la temática.

## Escenarios y algoritmos

Los tres escenarios están disponibles en cada temática:

- **Bosque:** ruido fractal, vegetación con separación mínima, senderos, río, puente y campamento. En formato vertical, el trazado sigue el eje largo; no se estira una imagen horizontal.
- **Mazmorra:** habitaciones por BSP, particiones adaptadas al espacio disponible y conexión mediante árbol de expansión mínima. Puertas, antorchas, columnas, cofres y mobiliario.
- **Caverna:** autómatas celulares, conexión de regiones mediante flood fill, lagunas, rocas y cristales.

La geometría se crea directamente con el ancho y el alto solicitados. Los objetos conservan sus proporciones. La conectividad del **terreno** generado se comprueba en los tres escenarios; las ilustraciones son decorativas y no bloquean navegación.

### Tamaños y relaciones de aspecto

- Preajustes: **4:3, 7:5, 1:1, 16:9, 3:4, 9:16 y 3:1**, en diferentes tamaños.
- Campos independientes de **ancho** y **alto** para cualquier relación, por ejemplo 37 × 23.
- Botón para intercambiar ancho/alto y vista de la relación real simplificada.
- Entre **8 y 120 casillas por lado**, con máximo de **6.400 casillas** en total.
- Validación compartida por interfaz, generador y carga de proyectos. Se rechazan fracciones, campos vacíos y dimensiones fuera de límite.

## Uso

1. Elegir **Vanilla**, **Dark** o **Anime** y un escenario.
2. Elegir un formato o introducir ancho y alto. Una casilla representa **5 pies**, aproximadamente **1,5 m**.
3. Ajustar densidad, complejidad, agua y puntos de interés; pulsar **Generar mapa**.
4. Pintar terrenos o elegir objetos para colocarlos, escalarlos, girarlos y borrarlos.
5. Guardar el **JSON editable** o exportar una imagen **PNG/JPEG**.

Las semillas nuevas comienzan con **`RC-`**; la inicial es `RC-7429`. El dado prepara otra semilla. También se permiten semillas escritas manualmente. Una misma configuración, temática y semilla produce el mismo mundo.

### Editor y atajos

- Seis terrenos, tres tamaños de pincel, 27 objetos por temática.
- Zoom, desplazamiento, coordenadas y ajuste a pantalla.
- Deshacer/rehacer, hasta 30 pasos; regenerar o abrir otro proyecto reinicia el historial.
- Guardado automático del último mapa en este navegador.
- Diseño adaptable a móvil y controles Material Web accesibles por teclado.

| Acción | Atajo |
| --- | --- |
| Desplazar | V |
| Pintar terreno | B |
| Borrar objetos | E |
| Girar objeto 45° | R |
| Mostrar/ocultar cuadrícula | G |
| Ajustar a pantalla | F |
| Acercar/alejar | + / − o rueda |
| Deshacer | Ctrl/Cmd + Z |
| Rehacer | Ctrl/Cmd + Shift + Z o Ctrl/Cmd + Y |
| Desplazar con cualquier herramienta | Alt + arrastrar, botón derecho o central |

## Exportación y proyectos anteriores

**PNG** sin pérdida o **JPEG** al 94 %, con/sin cuadrícula, a **50, 100 o 150 píxeles por casilla**. Se exporta el mapa completo, con su temática y relación de aspecto, independientemente del zoom. No se añaden controles, coordenadas externas ni marcas de agua.

Máximo **40 megapíxeles por imagen** para contener el uso de memoria. Una combinación de tamaño/resolución que exceda el límite muestra un error; elegir menos píxeles por casilla. Los píxeles por casilla no fijan el tamaño físico de impresión: ajustar la escala en la aplicación de impresión o mesa virtual.

Los proyectos nuevos se guardan como `nombre.tematica.rc.json`, con versión 2 y `config.theme`. Los archivos antiguos de versión 1 se abren como **Vanilla** si no tenían temática, **sin alterar casillas, posiciones, objetos ni semillas anteriores**. También se recupera el último mapa guardado bajo la clave anterior del navegador, y se escribe una copia migrada en `rc-map-v2`; el registro anterior no se borra.

Los archivos JSON se validan antes de renderizar: máximo 5 MB y 20.000 objetos. PNG/JPEG son imágenes planas; conservar el JSON para continuar editando. El guardado local no sustituye una copia de seguridad.

## Estructura

```text
src/
  main.ts                    Interfaz y coordinación del editor
  style.css / themes.css     Estilos, adaptación y temáticas de interfaz
  viewport.ts                Cámara, navegación y previsualización de objetos
  engine/
    types.ts                 Modelo, temática y catálogo de objetos
    themes.ts                Paletas y configuración de los tres mundos
    dimensions.ts            Formatos, límites y relaciones de aspecto
    random.ts                PRNG con semilla y ruido fractal
    generate.ts              Generación, orientación y conectividad
    generate.worker.ts       Generación en Web Worker
    render.ts                Renderizado por capas y exportación temática
    storage.ts               Validación y migración de proyectos
public/assets/
  vanilla/                   31 SVG originales, preservados exactamente
  dark/                      31 variantes medievales oscuras
  anime/                     31 variantes isekai
  *.svg                      Originales conservados para compatibilidad
scripts/
  create-assets.mjs          Fuente original de Vanilla
  create-theme-assets.mjs    Variantes Dark/Anime y copia de Vanilla
```

La vista y la exportación comparten el renderizador. El ruido se muestrea en coordenadas del mundo para conservar el paisaje al cambiar resolución. La generación se ejecuta en un Web Worker; Canvas 2D y exportación, en el hilo principal.

## Verificación y límites

Pruebas automatizadas en Chromium: selección de temas, historial, biblioteca, carga y render de **los 93 SVG**, guardado/recarga, migración, formularios de tamaño, descarga PNG/JPEG y vista móvil. Las pruebas del motor cubren semillas, los nueve cruces de tema/escenario y formatos de hasta **1:15 / 15:1**.

La edición manual puede desconectar zonas. No hay reglas de cobertura, niebla de guerra, encuentros ni navegación de personajes. El agua procedural no se utiliza en mazmorras, aunque se puede pintar manualmente. Las exportaciones grandes pueden tardar varios segundos.

`@material/web` es Material Web, no Angular Material; considerar su estado de mantenimiento al actualizar dependencias. Las fuentes Cormorant Garamond y DM Sans mantienen sus licencias originales y se sirven mediante Fontsource.
