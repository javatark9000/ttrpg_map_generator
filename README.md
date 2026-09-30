# Astra · Map Studio

Generador y editor de mapas de batalla cuadriculados para D&D, completamente en el navegador. Interfaz en español con **Material Web de Google**, sin React, sin backend y sin servicios de generación de imágenes.

## Ejecutar

Requiere Node.js **22.12 o posterior**.

```bash
npm install
npm run dev
```

Abrir **http://127.0.0.1:5180** (o la dirección que indique Vite si ese puerto está ocupado).

```bash
npm run build       # Verificación TypeScript + compilación a dist/
npm run preview     # Servir la compilación de producción
npm test            # 20 pruebas unitarias del motor y validación de proyectos
npx playwright install chromium
npm run test:e2e     # 6 pruebas de navegador, incluyendo descargas reales
npm run assets      # Recrear los 31 assets SVG originales y el favicon
```

Para publicar, servir `dist/` desde cualquier alojamiento de archivos estáticos con HTTPS. Las fuentes, imágenes y scripts están incluidos: no se necesitan claves API ni CDNs. El servidor de desarrollo solo escucha en la máquina local; para probar desde un teléfono de tu red, usar `npm run dev -- --host 0.0.0.0`.

## Qué incluye

- **Bosques:** vegetación con separación mínima, ruido fractal de terreno, senderos sinuosos, un río con puente transitable y campamento.
- **Mazmorras:** habitaciones BSP, corredores conectados con un árbol de expansión mínima, suelo de piedra, puertas, antorchas, altares y mobiliario.
- **Cavernas:** autómatas celulares, conexión de regiones por flood fill, lagunas, rocas y cristales luminosos.
- Semillas reproducibles y controles de densidad, complejidad, agua y puntos de interés.
- Cuatro tamaños, desde **24 × 18** hasta **64 × 48** casillas. Los proyectos importados admiten dimensiones enteras de 16 a 80 por lado.
- **27 objetos SVG** originales y **4 texturas de terreno**; no hay imágenes generadas por servicios externos.
- Cuadrícula opcional, iluminación ambiental, sombras, texturas, costas suavizadas y viñeta.
- Editor de terreno con seis pinceles y tres tamaños; colocación, escala, rotación y borrado de objetos.
- Zoom, desplazamiento, ajuste del lienzo, coordenadas y atajos.
- Deshacer/rehacer, hasta 30 pasos. Regenerar o importar un mapa reemplaza el historial.
- Guardado automático del último proyecto en `localStorage` y guardado/apertura manual de JSON.
- Exportación **PNG** o **JPEG**, con o sin cuadrícula, a **50, 100 o 150 píxeles por casilla**. JPEG usa calidad 94 %.
- Diseño adaptable a móvil, navegación por teclado, controles etiquetados y respeto a movimiento reducido.

## Uso

1. Elegir un escenario, un tamaño y una semilla. El dado prepara una semilla nueva.
2. Ajustar los controles y pulsar **Generar mapa**. La misma semilla y configuración generan el mismo mapa.
3. Usar las herramientas flotantes para pintar terreno o borrar objetos; elegir ilustraciones en **Objetos** para colocarlas.
4. Guardar el **proyecto JSON** si se quiere conservar una copia editable.
5. Pulsar **Exportar mapa**. La imagen contiene el mapa completo, sin controles, coordenadas externas ni marcas de agua; no depende del zoom actual.

Para mesas virtuales, exportar sin cuadrícula y configurar en la mesa el mismo número de casillas. Una casilla representa **5 pies**, aproximadamente **1,5 m**. Los píxeles por casilla determinan el tamaño del archivo, no un tamaño físico de impresión: establecer la escala de impresión en la aplicación correspondiente.

### Atajos

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

## Arquitectura

```text
src/
  main.ts                   Interfaz Material Web y coordinación del editor
  style.css                 Tema, componentes y diseño adaptable
  viewport.ts               Cámara, navegación y gestos de edición
  icons.ts                  Iconos SVG de la interfaz
  engine/
    types.ts                Configuración, casillas y catálogo de objetos
    random.ts               PRNG con semilla y ruido de valor fractal
    generate.ts             BSP, autómatas, vegetación y conectividad
    generate.worker.ts      Generación fuera del hilo de interfaz
    render.ts               Renderizado Canvas 2D por capas y exportación
    storage.ts              Validación estricta de proyectos JSON
    generate.test.ts        Pruebas del motor y persistencia
public/assets/              27 objetos y 4 texturas SVG originales
scripts/create-assets.mjs   Fuente reproducible de las ilustraciones
tests/editor.spec.ts        Pruebas de integración Playwright
```

La geometría del mapa se guarda como datos independientes de su imagen. El renderizador usa el mismo pipeline para la vista y la exportación. El ruido se muestrea en coordenadas del mundo para mantener el mismo paisaje a distintas resoluciones. El generador trabaja en un Web Worker; el renderizado y la exportación usan Canvas 2D en el hilo principal.

## Límites y decisiones

- Máximo **40 megapíxeles** por exportación para contener el consumo de memoria. La resolución más alta no está disponible en todos los tamaños; el cuadro de exportación explica cómo reducirla. Las exportaciones grandes pueden tardar unos segundos.
- Los SVG son ilustraciones de vista superior, no modelos 3D. Se pueden editar directamente o recrear desde el script.
- La conectividad se valida sobre el **terreno** generado. Los objetos son decorativos, no bloqueadores de navegación; la colocación manual y los pinceles pueden crear obstáculos o zonas desconectadas. Revisar el mapa según el encuentro.
- Las casillas de río bajo el puente son transitables. No se modelan reglas de movimiento, cobertura, niebla de guerra ni encuentros.
- Agua se desactiva en el panel para mazmorras: el generador de ese escenario no la utiliza. Se puede pintar agua manualmente.
- PNG/JPEG son imágenes planas: para volver a editar, conservar el JSON. El guardado del navegador es una comodidad, no una copia de seguridad.
- Archivos de proyecto: máximo 5 MB, hasta 20.000 objetos, validación de tipos, dimensiones y valores antes de renderizar.
- Material Web (`@material/web`) no es Angular Material. El proyecto usa sus Web Components directamente; su estado de mantenimiento debe tenerse en cuenta al actualizar dependencias.
- Probado automáticamente en Chromium. Otros navegadores modernos requieren soporte para Web Components, Canvas 2D, Web Workers y `HTMLDialogElement`.

## Assets

Ver [`public/assets/README.md`](public/assets/README.md). Las ilustraciones se han creado específicamente para este proyecto. Las tipografías Cormorant Garamond y DM Sans se sirven localmente mediante Fontsource y conservan sus licencias originales.
