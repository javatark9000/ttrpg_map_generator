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

Cada tema contiene **los mismos 47 objetos y 4 texturas de terreno**: **153 SVG temáticos** en total. No son filtros CSS sobre una única imagen: las variantes tienen sus propios SVG, detalles, materiales y, en los árboles, nuevas siluetas.

El selector de temática está siempre disponible sobre los paneles. Al cambiarlo:

- Se actualizan inmediatamente el mapa actual, los objetos existentes, la biblioteca, los pinceles, la previsualización de colocación y la interfaz.
- **No se pierden casillas ni objetos editados**; solo cambia su representación. El cambio se puede deshacer/rehacer.
- La generación posterior utiliza la temática elegida, incluyendo nombres y distribución de decoración.
- Guardado, apertura de proyectos, miniatura de exportación y PNG/JPEG/GIF conservan la temática.

## Escenarios y algoritmos

Los siete escenarios están disponibles en cada temática:

- **Bosque:** ruido fractal, vegetación con separación mínima, redes de senderos configurables, río, puentes orientados según los cruces y campamento. El trazado elegido conserva su orientación incluso en mapas verticales; no se estira ni se gira una imagen horizontal.
- **Mazmorra:** habitaciones por BSP con cantidad automática o exacta, particiones adaptadas al espacio disponible y conexión mediante árbol de expansión mínima. Puertas, antorchas, columnas, cofres y mobiliario.
- **Caverna:** autómatas celulares, conexión de regiones mediante flood fill, lagunas, rocas y cristales.
- **Ruinas:** recintos de piedra parcialmente destruidos, arcos, columnas rotas, escombros y vegetación. El control **Deterioro** determina la pérdida de muros y la recuperación del suelo por la hierba.
- **Pueblo:** parcelas con casas y comercios techados, puertas accesibles, calles, plazas, pozos y mercados. Tres trazados: **Plaza central**, **Calles en cuadrícula** y **Calle principal**. La densidad cambia la ocupación de las parcelas; con agua activada se reserva un estanque cuando el tamaño lo permite.
- **Montaña:** pasos sinuosos entre roca sólida, grava, vegetación alpina, campamentos y lagunas. **Nieve en las cumbres** permite alternar un paisaje nevado y otro sin nieve.
- **Edificios:** interiores sin techo con distribución y mobiliario específicos del tipo seleccionado. Los formatos muy alargados orientan el plano sobre el eje largo.

La geometría se crea directamente con el ancho y el alto solicitados. Los objetos conservan sus proporciones. La conectividad del **terreno** generado se comprueba en los siete escenarios; las ilustraciones son decorativas y no bloquean navegación.

### Tipos de edificio

Seleccionar **Edificios → Tipo de edificio**, elegir el tamaño y pulsar **Generar mapa**. El botón **Interior compacto · 24 × 18** prepara un tamaño recomendado sin reemplazar el mapa hasta generar.

| Tipo | Distribución y elementos |
| --- | --- |
| **Casa** | Sala común, estudio, dormitorios y cocina; subdivisiones adicionales en planos amplios. |
| **Taberna** | Salón con mesas y bancos, barra, cocina y despensa. |
| **Posada** | Pasillo de acceso, habitaciones amuebladas y recepción cuando hay espacio. |
| **Herrería** | Taller de piedra, fragua, fuego animado, yunques y armero. |
| **Templo** | Nave con bancos y columnas, santuario, altar animado y estatuas. |
| **Biblioteca** | Pasillos de estanterías y zona de lectura con mesas y libros. |
| **Almacén** | Zonas de carga, cajas, barriles, sacos y corredor de servicio. |
| **Cuartel** | Camas, armería y sala de oficiales. |

Se adaptan a los límites de 8–120 casillas por lado; en planos pequeños la distribución se simplifica. El agua procedural no se aplica a edificios o mazmorras, pero puede pintarse manualmente. Los interiores domésticos usan madera; herrerías, templos y almacenes usan piedra. Los puntos de interés controlan los elementos principales y las luces; las puertas estructurales permanecen. La cantidad exacta de cuartos sigue siendo una opción exclusiva de Mazmorra.

Los pueblos son **vistas exteriores**, no una colección de interiores interactivos: no se abre automáticamente otro mapa al pulsar un tejado. Para un interior detallado se genera un escenario Edificios por separado. La conectividad corresponde al terreno; muebles y tejados son ilustraciones. La montaña no simula alturas físicas: nieve y grava son transitables, mientras roca sólida, muros y agua no lo son.

### Cantidad de cuartos en mazmorras

Al seleccionar **Mazmorra** aparece **Cuartos de la mazmorra**:

- **Cantidad automática** mantiene la generación BSP anterior, dependiente del tamaño y la complejidad.
- Desactivar esa opción permite introducir la **cantidad exacta** de cuartos, desde 1 hasta el límite indicado para el tamaño actual (máximo manual: 40).
- Cada cuarto tiene al menos **4 × 4 casillas** y una separación de muros. La división BSP reserva capacidad para cumplir la cantidad solicitada en cualquier semilla, no simplemente un número de intentos de colocación.
- Si el mapa es demasiado pequeño para la cantidad elegida, aparece una explicación y se desactiva Generar; no se reduce la cantidad en silencio.
- El encabezado muestra el número generado. La propiedad `rooms` del JSON conserva las áreas originales; pintar manualmente no recalcula ese conteo.

### Trazados del bosque

Al seleccionar **Bosque** aparece **Diseña el recorrido**, con siete miniaturas seleccionables:

**Sinuoso · Vertical · Diagonal · Recodo · Bifurcación · Encrucijada · Circuito**.

Las miniaturas muestran el esquema del recorrido. La semilla y la complejidad modifican sus curvas; las dimensiones se aplican directamente a la geometría. El trazado vertical une norte y sur, el sinuoso oeste y este, y los otros esquemas crean esquinas, cruces o anillos.

Tres casillas permiten controlar la red:

- **Generar caminos:** desactivarla elimina todos los senderos y puentes, sin desactivar el agua, la vegetación o el campamento. El campamento pasa a ser un claro de tierra.
- **Caminos alternos:** añade un desvío conectado que vuelve a la ruta principal.
- **Callejones sin salida:** añade dos ramales conectados cuyo extremo termina en el interior del bosque.

Las dos opciones secundarias son independientes. Al apagar los caminos se deshabilitan sus controles, pero se conserva la selección para volver a activarlos. La bifurcación y el circuito pertenecen al trazado principal y no desaparecen al desactivar los caminos secundarios. En mapas muy pequeños o estrechos, algunas curvas o ramales pueden quedar próximos o fusionarse al rasterizarlos en casillas.

Los árboles respetan la red completa. Los puentes se ubican en los cruces reales con el río; las conexiones de seguridad restantes usan vados arenosos, sin inventar rutas principales adicionales. Pulsa **Generar mapa** para aplicar un cambio de trazado o cantidad de cuartos. Todas estas opciones funcionan en Vanilla, Dark y Anime, y se guardan en el JSON y en el navegador.

### Tamaños y relaciones de aspecto

- Preajustes: **4:3, 7:5, 1:1, 16:9, 3:4, 9:16 y 3:1**, en diferentes tamaños.
- Campos independientes de **ancho** y **alto** para cualquier relación, por ejemplo 37 × 23.
- Botón para intercambiar ancho/alto y vista de la relación real simplificada.
- Entre **8 y 120 casillas por lado**, con máximo de **6.400 casillas** en total.
- Validación compartida por interfaz, generador y carga de proyectos. Se rechazan fracciones, campos vacíos y dimensiones fuera de límite.

## Uso

1. Elegir **Vanilla**, **Dark** o **Anime** y un escenario.
2. Elegir un formato o introducir ancho y alto. Una casilla representa **5 pies**, aproximadamente **1,5 m**.
3. Elegir las opciones del escenario: cantidad de cuartos, caminos, deterioro, trazado del pueblo, nieve o tipo de edificio. Ajustar densidad, complejidad, agua y puntos de interés; pulsar **Generar mapa**.
4. Pintar terrenos o elegir objetos para colocarlos, escalarlos, girarlos y borrarlos.
5. Guardar el **JSON editable** o exportar una imagen **PNG/JPEG** o un **GIF animado**.

Las semillas nuevas comienzan con **`RC-`**; la inicial es `RC-7429`. El dado prepara otra semilla. También se permiten semillas escritas manualmente. Una misma configuración, temática y semilla produce el mismo mundo.

### Editor y atajos

- Diez terrenos: hierba, sendero, agua, piedra, muro, roca sólida, arena, madera, nieve y grava; tres tamaños de pincel.
- 47 objetos por temática, con filtros Naturaleza, Aventura y Construcción.
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

## Agua, magia y vegetación animadas

Las animaciones comparten un **bucle determinista de 2,4 segundos**, con fases distintas por objeto para evitar movimientos sincronizados. Funcionan en los siete escenarios y las tres temáticas, también con agua pintada y objetos colocados manualmente.

| Elemento | Movimiento |
|---|---|
| Agua | Ondas suaves |
| Antorchas y hogueras | Llamas, brasas y luz fluctuante |
| Cristales | Pulsación luminosa y destellos sobre sus facetas |
| Altar arcano | Runas que se iluminan progresivamente, arco de luz y partículas |
| Nenúfares | Balanceo leve, pequeña rotación y ondas alrededor cuando están sobre agua |
| Juncos | Oscilación del extremo superior, con las bases fijas |
| Robles, pinos, robles otoñales y arbustos | Balanceo sutil de la parte superior, conservando troncos y bases |
| Flores | Balanceo y pétalos discretos; más visibles en Anime |
| Roble otoñal de Anime | Pétalos de cerezo además del movimiento de la copa |
| Setas | Bioluminiscencia opcional, desactivada de forma predeterminada |

La opción **Dale personalidad → Setas bioluminiscentes** se aplica inmediatamente a la vista animada y al GIF. Es una preferencia de renderizado de la sesión, como la atmósfera: no modifica el JSON ni el historial, no se guarda al recargar y no altera PNG/JPEG. Con la animación pausada se muestra la ilustración estática original.

Rocas, huesos, troncos caídos, muebles, cofres, puertas, puentes, escaleras y demás estructuras permanecen estáticos. No se añaden ciclos de apertura/cierre ni interacciones con cofres o puertas.

- **Animación**, junto a Cuadrícula y Atmósfera, permite pausar o reanudar la vista sin modificar el mapa ni su historial.
- Se respeta la preferencia de **movimiento reducido** del sistema: la vista comienza pausada y puede activarse explícitamente.
- El movimiento se suspende cuando la pestaña está oculta y durante los diálogos. Los mapas sin agua ni objetos animables no mantienen un ciclo de repintado.
- **Atmósfera** controla los halos, pero no desactiva las ondas, llamas, runas, destellos ni el balanceo.
- La vista animada utiliza capas y sprites rasterizados en caché y una resolución acotada; no regenera terreno o ruido en cada fotograma. Cada sprite se comparte entre objetos del mismo tipo. Objetos y efectos se dibujan en orden de profundidad: los árboles y estructuras superiores ocultan las llamas, runas o partículas que quedan debajo. Los SVG originales siguen siendo estáticos y no se han modificado.
- Las animaciones se reconstruyen a partir del terreno, objetos y semilla del JSON existente: no hace falta migrar ni guardar fotogramas. La pausa es una opción de vista, no una propiedad del proyecto.

## Exportación y proyectos anteriores

**PNG** sin pérdida o **JPEG** al 94 %, con/sin cuadrícula, a **25, 50, 100 o 150 píxeles por casilla**. Estas dos opciones siguen siendo estáticas. Se exporta el mapa completo, con su temática y relación de aspecto, independientemente del zoom. No se añaden controles, coordenadas externas ni marcas de agua.

Máximo **40 megapíxeles por imagen** para contener el uso de memoria. Una combinación de tamaño/resolución que exceda el límite muestra un error; elegir menos píxeles por casilla. Los píxeles por casilla no fijan el tamaño físico de impresión: ajustar la escala en la aplicación de impresión o mesa virtual.

### GIF animado

En **Exportar mapa → Formato → GIF · Animado en bucle**, Descargar imagen genera un GIF real con **24 fotogramas de 100 ms**, repetición infinita y una paleta global de hasta **256 colores** para reducir el parpadeo de color. Conserva las ondas, llamas, halos, magia y vegetación animadas, la temática, la cuadrícula elegida y la relación de aspecto. Siempre anima los elementos presentes, aunque la vista del editor esté pausada; las setas solo emiten luz si su opción está activada. Sin agua ni objetos animables, los fotogramas no tienen movimiento.

La exportación GIF tiene un límite propio de **1 megapíxel y 1600 píxeles por lado**. Los píxeles por casilla se reducen automáticamente a un entero si hace falta, y el diálogo indica las dimensiones reales antes de descargar. Por ejemplo, 40 × 30 casillas a 100 px se exportan como **1120 × 840 px** (28 px por casilla). Para impresión o mayor resolución, usar PNG/JPEG. La miniatura del diálogo es estática.

La codificación se realiza localmente mediante `gifenc` (MIT) en un **Web Worker**, transfiriendo un fotograma a la vez. Los fotogramas posteriores conservan los píxeles sin cambios mediante transparencia y solo actualizan las zonas animadas, reduciendo el tamaño sin dejar estelas. Se muestra el progreso y puede cancelarse con Volver al mapa, la X o Escape; se termina el worker y se liberan las capas. No se suben mapas a servidores. La compatibilidad de reproducción depende de la mesa virtual donde se importe el archivo.

Los proyectos nuevos se guardan como `nombre.tematica.rc.json`, con versión 2 y `config.theme`. Los archivos antiguos de versión 1 se abren como **Vanilla** si no tenían temática, **sin alterar casillas, posiciones, objetos ni semillas anteriores**. También se recupera el último mapa guardado bajo la clave anterior del navegador, y se escribe una copia migrada en `rc-map-v2`; el registro anterior no se borra.

Los proyectos de versión 2 anteriores a los nuevos controles reciben valores predeterminados únicamente para las opciones ausentes: cuartos automáticos, caminos sinuosos activados y ramales opcionales desactivados. Su terreno, objetos y ediciones guardadas no se regeneran ni se modifican durante esta migración. Las opciones son `roomCount` (0 = automático), `forestPaths`, `forestPathLayout`, `forestBranches` y `forestDeadEnds`. La ampliación añade `buildingType` (por defecto `house`), `ruinDecay` (55), `villageLayout` (`square`) y `mountainSnow` (true); los campos ausentes se completan sin regenerar el mapa. Los valores desconocidos o fuera de rango se rechazan.

Los archivos JSON se validan antes de renderizar: máximo 5 MB y 20.000 objetos. PNG/JPEG/GIF no conservan capas editables; conservar el JSON para continuar editando. El guardado local no sustituye una copia de seguridad.

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
    generate.ts              Coordinación de escenarios y conectividad
    dungeon-rooms.ts         BSP automático o con cuota exacta de cuartos
    forest-paths.ts          Trazados, curvas, rutas alternas y callejones
    forest.ts                Terreno, puentes y decoración sobre la red
    landscapes.ts            Ruinas, pueblos y montaña
    buildings.ts             Ocho tipos de interiores y su mobiliario
    scenario-painter.ts      Primitivas de pintura y colocación acotada
    scenario-options.ts      Catálogo de miniaturas y validación compartida
    generate.worker.ts       Generación en Web Worker
    render.ts                Renderizado por capas y exportación temática
    animation.ts             Ondas y composición animada en orden de profundidad
    animated-objects.ts      Sprites compartidos, vegetación, magia y pétalos
    animation-settings.ts    Duración, fotogramas y límites de resolución
    export-gif.ts            Exportación secuencial, progreso y cancelación
    gif-encoder.ts           Paleta global y codificación GIF
    gif.worker.ts            Codificación fuera del hilo principal
    storage.ts               Validación y migración de proyectos
public/assets/
  vanilla/                   51 SVG; los 31 originales permanecen intactos
  dark/                      51 variantes medievales oscuras
  anime/                     51 variantes isekai
  *.svg                      Originales conservados para compatibilidad
scripts/
  create-assets.mjs          Fuente original de Vanilla
  create-expansion-assets.mjs 20 objetos nuevos de arquitectura y paisaje
  create-theme-assets.mjs    Variantes Dark/Anime y copia de Vanilla
```

La vista y la exportación comparten el renderizador. El ruido se muestrea en coordenadas del mundo para conservar el paisaje al cambiar resolución. La generación y la codificación GIF se ejecutan en Web Workers separados; el dibujo Canvas 2D y las exportaciones estáticas permanecen en el hilo principal.

## Verificación y límites

Pruebas automatizadas en Chromium: selección de temas, historial, biblioteca, carga y render de **los 153 SVG**, guardado/recarga, migración, formularios de tamaño, descarga PNG/JPEG/GIF y vista móvil. Las pruebas de animación verifican pausa, movimiento reducido, ondas bajo los puentes, ciclos cerrados, cancelación y recuperación ante errores del worker. También comprueban cada objeto animado en las tres temáticas, las bases inmóviles de las plantas, la oclusión por estructuras, la bioluminiscencia opcional y la conservación de los movimientos nuevos en GIF. Los GIF se decodifican con un lector independiente (`omggif`) para comprobar dimensiones, fotogramas distintos, duración y repetición infinita. Las pruebas del motor cubren semillas, los 21 cruces de tema/escenario y los ocho tipos de edificio en cada temática y formatos de hasta **1:15 / 15:1**. También verifican cantidades exactas de cuartos, capacidad, ausencia de solapamientos, conectividad de las redes, los siete trazados, opciones secundarias independientes y generación sin caminos. Las pruebas de navegador comprueban las miniaturas, casillas, validación dinámica, persistencia y controles móviles.

Los nuevos controles, terrenos, objetos y tipos de edificio también se verifican en guardado/recarga, edición, historial, exportación PNG/GIF y móvil.

La edición manual puede desconectar zonas. No hay reglas de cobertura, niebla de guerra, encuentros ni navegación de personajes. El agua procedural no se utiliza en mazmorras o edificios, aunque se puede pintar manualmente. Las exportaciones grandes pueden tardar varios segundos.

`@material/web` es Material Web, no Angular Material; considerar su estado de mantenimiento al actualizar dependencias. Las fuentes Cormorant Garamond y DM Sans mantienen sus licencias originales y se sirven mediante Fontsource.
