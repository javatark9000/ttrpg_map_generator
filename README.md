# RC map generator

Generador y editor de mapas de batalla para D&D, en español, con **Material Web de Google, TypeScript y Canvas 2D**. Generación procedural local: sin React, backend, servicios de imágenes ni IA generativa.

Incluye **15 escenarios independientes**, tres temáticas, edición de terrenos y objetos, edificios con plantas adicionales y exportación PNG/JPEG/GIF. Una casilla representa **5 pies, aproximadamente 1,5 m**.

## Ejecutar y compilar

Requiere Node.js **22.12 o posterior**.

```bash
npm install
npm run dev
```

Abrir **http://127.0.0.1:5180**, o el puerto indicado por Vite. El servidor escucha solo en la máquina local. Para acceder desde otro dispositivo de la misma red: `npm run dev -- --host 0.0.0.0`.

```bash
npm run build       # Comprobación TypeScript y compilación a dist/
npm run preview     # Servir la compilación
npm run assets      # Recrear los assets incluidos en la cadena de scripts
```

Para publicar, servir `dist/` desde un alojamiento estático con HTTPS. Fuentes, imágenes y scripts se sirven localmente, sin claves ni CDNs.

**Evaluación:** `npm run build` comprueba tipos y empaquetado; no acredita el funcionamiento visual, la geometría de todas las semillas ni la interacción del editor. No se incluyen aquí resultados de pruebas automáticas funcionales. La revisión visual de escenarios, plantas y exportaciones es una comprobación manual distinta.

## Primer mapa

1. Elegir la temática global: **Vanilla**, **Dark** o **Anime**.
2. Seleccionar directamente un escenario: los edificios ya no están dentro de un selector genérico «Edificios».
3. Elegir ancho, alto y semilla; ajustar las opciones específicas del escenario.
4. Pulsar **Generar mapa**. Cambiar una opción de generación no reconstruye el mapa hasta pulsar el botón.
5. Pintar terreno o colocar objetos. Si hay varias plantas, seleccionar cuál se está editando.
6. Guardar el **JSON editable** del proyecto o exportar la **planta activa** como imagen.

Las semillas nuevas comienzan con `RC-`; la inicial es `RC-7429`. El dado prepara otra semilla, pero no genera inmediatamente. La misma configuración, temática y semilla reproduce el mismo resultado con la misma versión del generador. Actualizar el algoritmo puede cambiar una regeneración; abrir el JSON conserva el terreno y los objetos almacenados.

### Dimensiones y capacidad

- Ancho y alto enteros entre **8 y 120 casillas**, con un máximo de **6.400 casillas por planta**.
- Preajustes 4:3, 7:5, 1:1, 16:9, 3:4, 9:16 y 3:1; también dimensiones libres e intercambio de ancho/alto.
- Los exteriores calculan su geometría en las dimensiones solicitadas, sin estirar una imagen terminada.
- Los interiores muy horizontales se generan sobre el eje largo y se transforman junto con sus objetos, entradas, metadatos y plantas adicionales.
- Un tamaño válido no garantiza que quepan todas las opciones. Habitaciones, anexos, puentes naturales o elementos obligatorios pueden requerir más espacio.

Las cantidades manuales no se reducen silenciosamente. Los errores de capacidad conocidos se muestran antes de generar; las condiciones que dependen del terreno resultante pueden producir un error durante la generación. En ese caso, ampliar el mapa, cambiar la semilla o modificar explícitamente la opción indicada.

## Temáticas y objetos independientes

| Temática | Dirección artística |
| --- | --- |
| **Vanilla** | Verdes naturales, piedra cálida, madera y fantasía clásica. |
| **Dark** | Fantasía medieval cruda: ceniza, hierro, madera envejecida y vegetación sombría. |
| **Anime** | Fantasía isekai: vegetación luminosa, sombreado por celdas, cerezos y ornamentos arcanos. |

Las temáticas utilizan SVG y paletas propios, no un filtro CSS sobre la misma imagen. El arte no utiliza personajes o emblemas de franquicias.

La interfaz utiliza el diseño **Brasa**: vino/cobre, Inter y Cinzel locales, controles compactos y panel lateral adaptable. Su apariencia no cambia al elegir Vanilla/Dark/Anime ni aplica filtros a los mapas o a las imágenes exportadas.

Hay dos selectores independientes:

- **Temática del mundo:** modifica el terreno, la ambientación y los objetos que heredan el tema global. El cambio no regenera geometría ni elimina ediciones y puede deshacerse.
- **Temática del objeto**, en la biblioteca: elige la variante de los objetos que se colocarán manualmente. Permite mezclar Vanilla, Dark y Anime en una misma planta.

Los objetos procedurales **heredan** el tema del mapa. Los nuevos objetos manuales guardan su propio `theme`, incluso si coincide con el tema global, y lo conservan al cambiar de mundo. Los objetos de proyectos antiguos sin ese campo siguen heredando el tema global. El selector de biblioteca no convierte objetos que ya estaban colocados.

La previsualización, el render estático y la animación resuelven `object.theme ?? map.config.theme`. El JSON conserva esa elección.

### Biblioteca y escala

- Navegación por **nueve familias**, una visible cada vez: Vegetación; Rocas y restos; Arquitectura y accesos; Mobiliario y decoración; Almacenaje y comercio; Campamento y equipo; Armas y herrería; Cocina y taberna; Culto y magia.
- La primera apertura elige una familia relacionada con el mapa generado; después conserva la elección manual. Un objeto compartido aparece en sus distintas familias, sin duplicar su identidad.
- La búsqueda por nombre abarca todo el catálogo, ignora mayúsculas y acentos y muestra las familias de cada resultado. Limpiarla devuelve a la familia seleccionada.
- Escala manual **25–400 %**; 100 % corresponde al tamaño natural del asset, no a una casilla para todos los objetos.
- El botón **Girar 45°** y el atajo **R** giran la próxima colocación. La escala y el giro se aplican al objeto que se va a colocar. No hay un inspector para transformar individualmente los objetos ya colocados; pueden borrarse y colocarse de nuevo.
- Se conservan los assets anteriores junto a variantes especializadas: escaleras ascendentes/descendentes, estatuas completas/quebradas, accesos de cueva y alcantarilla, viviendas por estatus y tejados singulares.
- Mercados, corrales, murallas y estantes tienen módulos combinables. Los estantes de almacén llenos y vacíos se construyen con piezas de una casilla, sin estirar una única ilustración.
- Los interiores incorporan ventanas, barras, bebidas, recepción, cocina de leña, chimenea, equipo, armas sueltas y mobiliario de herrería y templos.

El catálogo incluye **95 objetos y 4 texturas por temática**; la ampliación añade 48 objetos con versiones Vanilla, Dark y Anime. El catálogo y los tamaños se definen en `src/engine/types.ts` y `src/engine/new-assets.ts`. Los SVG existentes no se sustituyen por los especializados: por ejemplo, `stairs`, `counter`, `statue`, `bookshelf` y `weapon-rack` siguen disponibles para edición manual y compatibilidad.

## Escenarios exteriores y subterráneos

### Bosque

Hierba, vegetación con separación mínima, río, senderos, puentes y campamento.

**Caminos:** Sinuoso, Vertical, Diagonal, Recodo, Bifurcación, Encrucijada y Circuito. La semilla y la complejidad modifican las curvas; las miniaturas son esquemas orientativos.

- **Generar caminos:** al desactivarlo no se generan senderos ni puentes. El agua y la vegetación siguen disponibles; el campamento, si está activado, usa un claro de arena/tierra.
- **Caminos alternos:** añade un desvío conectado que vuelve a la ruta principal.
- **Callejones sin salida:** añade dos ramales interiores.
- Bifurcación y Circuito son parte del trazado principal, no dependen de los ramales opcionales.
- Los árboles respetan la red completa; los puentes se orientan según los cruces detectados con el río. Las conexiones de seguridad usan vados arenosos, también posibles sin caminos.

**Orientación del río:** Sin río, Aleatoria, Norte–sur, Este–oeste, Diagonal NO–SE o Diagonal NE–SO. La elección aleatoria es determinista por semilla. Se genera en coordenadas del mapa y no rotando el render. Los mapas nuevos usan orientación aleatoria por defecto.

El interruptor general **Ríos y lagunas** prevalece: si está apagado no hay río y el selector queda inactivo, sin perder su valor. En mapas pequeños o estrechos, senderos y ramales próximos pueden fusionarse al convertirlos en casillas.

Campos: `forestPaths`, `forestPathLayout`, `forestBranches`, `forestDeadEnds`, `forestRiverDirection`.

### Mazmorra

Habitaciones por partición BSP, corredores conectados mediante árbol de expansión mínima, puertas, antorchas y mobiliario.

**Cantidad automática** conserva la generación dependiente del tamaño y la complejidad. Al desactivarla se solicitan cantidades separadas:

| Categoría | Lado interior más corto |
| --- | --- |
| Pequeña | 4–8 casillas |
| Mediana | 9–12 casillas |
| Grande | 13 o más casillas |

La categoría no se mide por área ni por el lado largo: una habitación alargada puede ser pequeña. Las cuotas manuales deben sumar entre **1 y 40** habitaciones. La capacidad considera la forma del mapa y el espacio de los muros, no solo el área total.

Una combinación que no cabe en el modelo BSP se rechaza; no se rebajan tamaños ni cantidades. El encabezado muestra el número de cuartos generado. `rooms` conserva las áreas originales; pintar terreno no recalcula esos metadatos.

Campo actual: `dungeonRooms: { small, medium, large }`, o `null` para automático. Los proyectos antiguos con `roomCount > 0` muestran su cantidad anterior y la conservan al regenerar hasta elegir explícitamente cantidades por tamaño o modo automático. No se genera agua procedural en mazmorras.

### Caverna

Autómatas celulares forman el suelo entre roca; se conectan las regiones iniciales y pueden añadirse lagunas, cristales, estalagmitas y campamento.

**Simas** (`caveChasms`):

- **Sin simas** (`none`).
- **Con rodeo seguro** (`safe`): los cortes se aceptan solo si sigue existiendo un recorrido por tierra, independientemente de los puentes.
- **Pueden dividir la cueva** (`dividing`): se permiten regiones separadas. La entrada queda protegida, pero no se promete acceso a todas las islas.

**Puentes naturales** (`caveNaturalBridges`) añade pasos de suelo pétreo sobre las grietas; no son el SVG de puente de madera. El control queda inactivo sin simas. Si no cabe una sima o un cruce natural con las condiciones elegidas, se informa del error. Activar puentes no obliga a conectar todas las regiones del modo divisorio.

Las simas usan terreno **`void`**, oscuro y no transitable, distinto del agua. También se puede pintar manualmente.

### Ruinas

Recintos deteriorados, plazas, vegetación, escombros, arcos y estatuas.

- **Distribución:** Cuadrícula, Patio central, Dispersa o Aleatoria (`ruinLayout`).
- **Elementos:** Simples, Estándar o Monumentales (`ruinFeatures`). Modifica la planificación y la variedad de elementos; la colocación concreta depende del espacio y de **Puntos de interés**.
- **Deterioro** (`ruinDecay`) controla pérdida de muros y recuperación del pavimento por la hierba.
- **Accesos secretos decorativos** (`ruinSecretPassages`) coloca señales en muros adecuados. Si el deterioro no deja un soporte válido, la generación puede pedir otra configuración.
- El agua se busca en zonas libres, con posición, orientación y borde determinados por semilla, sin ocupar recintos o accesos reservados. Puede fallar si no queda espacio.

**Las escaleras y vestigios de niveles superiores no crean plantas. Los accesos secretos no excavan ni enlazan túneles y el muro sigue siendo no transitable.** Se conserva la conectividad del terreno normal.

### Pueblo

Vista exterior con casas, calles, plaza y edificios singulares.

- **Trazado:** Plaza central, Calles en cuadrícula o Calle principal (`villageLayout`).
- **Cuadras:** Pequeñas, Mixtas o Grandes (`villageBlockSize`). Las mixtas tienen longitudes variables determinadas por semilla.
- **Ocupación del pueblo:** usa `density` para seleccionar parcelas; no es un segundo control de vegetación equivalente.
- **Estatus de viviendas:** porcentajes Humildes, Comunes y Acomodadas (`villageWealth`), que deben sumar **100 %**. Se convierten en cantidades enteras sobre las casas realmente colocadas, por lo que una muestra pequeña no reproduce porcentajes exactos.
- **Edificios obligatorios:** Mercado, Taberna, Templo y Rancho (`villageRequiredBuildings`). Sin selección se eligen automáticamente según espacio y ocupación. Con selección explícita se reservan parcelas compatibles o se rechaza la configuración; los obligatorios prevalecen sobre una densidad baja.
- Mercado y plaza pueden compartir parcela. Los ranchos incluyen corrales modulares con acceso.
- El estanque es opcional cuando hay terreno disponible; no desplaza un edificio obligatorio.

Las viviendas y edificios son exteriores techados, no enlaces a interiores interactivos.

### Montaña

Roca, grava, vegetación alpina y nieve opcional (`mountainSnow`). No hay una simulación física de elevación.

- **Generar camino** (`mountainPaths`) puede desactivarse.
- **Forma del camino** (`mountainPathLayout`): Paso, Zigzag, Cresta, Bifurcación o Aleatoria.
- Sin camino se conserva una región natural transitable conectada; no se añaden corredores artificiales disfrazados de grava. Las plataformas aisladas se cierran con roca y la entrada se elige sobre terreno accesible.
- Las lagunas se buscan en lugares libres sin cortar la región jugable. Si no hay un emplazamiento compatible, se solicita ampliar el mapa o desactivar el agua.
- **Entradas de cueva** (`mountainCaveEntrances`): cantidad exacta, con 0 para ninguna. Se orientan hacia terreno abierto y se comprueba la capacidad; no se reduce la solicitud en silencio.

Las entradas de cueva son puntos independientes: **no generan otro mapa ni una planta subterránea**. Nieve, hierba y grava son transitables; roca sólida y agua no.

### Ciudad

Vista exterior urbana con calles de piedra, manzanas, barrios residenciales/comerciales y parcelas más densas que las del pueblo.

- **Densidad urbana** (`cityDensity`) controla parcelas ocupadas.
- **Comercio en los distritos** (`cityDistrictBalance`) es el porcentaje global de parcelas ocupadas destinadas a comercio; el resto es residencial. Se redondea a edificios enteros y se agrupa espacialmente, sin un editor manual de distritos.
- **Estatus general de las casas** (`houseStatus`): Humildes, Comunes o Acomodadas. Pueblo usa su reparto porcentual propio.
- **Callejones** (`cityAlleys`): Ninguno, Pocos o Muchos.
- **Ancho de calles** (`cityStreetWidth`): Estrechas, Estándar o Anchas.
- **Accesos de alcantarilla** (`citySewers`): señales visibles en calles, no una red subterránea.
- **Murallas urbanas** (`cityWalls`): opcionales y desactivadas por defecto, con tramos, esquinas y puertas.

Las plazas se reservan cuando caben. No se simulan población, tráfico, interiores ni agua procedural en este escenario.

## Ocho escenarios de interiores

**Casa, Taberna, Posada, Herrería, Templo, Biblioteca, Almacén y Cuartel** se seleccionan directamente. Cada uno tiene su propio generador, no una decoración distinta sobre un plano genérico.

Las ventanas son **estrictamente decorativas**: no abren huecos transitables, no crean fuentes de luz ni calculan visibilidad. Se sitúan sobre muros exteriores procurando evitar puertas, esquinas y particiones. Los muebles conservan proporciones por asset; no se aplica un factor global para simular todos sus tamaños.

El agua procedural no se aplica a interiores, aunque puede pintarse manualmente. La densidad afecta mobiliario secundario según el escenario; no elimina las funciones obligatorias de una casa, taberna, posada o herrería. Almacén y Cuartel tienen controles de contenido propios.

### Casa

**Plantilla** (`houseLayout`): Compacta, Con pasillo, Con patio o Aleatoria. La opción aleatoria elige entre plantillas compatibles con las dimensiones y dormitorios solicitados.

- Compacta combina sala y cocina con uno o dos dormitorios.
- Con pasillo separa las estancias alrededor de una circulación central.
- Con patio reserva un espacio abierto rodeado por las habitaciones; requiere un plano amplio, de al menos 18 × 18.
- **Dormitorios** (`houseBedrooms`): automático con 0, o cantidad manual validada contra la plantilla y las dimensiones.
- Camas y cocina de leña son equipamiento básico; chimenea y mostradores se colocan según la plantilla, con respaldo de muro y accesos libres.

El botón **Interior compacto · 24 × 18** prepara dimensiones, sin reemplazar el mapa hasta generar. Casa crea una sola planta.

### Taberna

Salón con mesas, barra modular con paso de servicio, cocina y bodega. La barra y el equipamiento esencial permanecen incluso con densidad cero.

- **Estado del salón** (`tavernCondition`): Ordenado o Pelea reciente. El desorden mueve muebles y añade bebidas caídas dentro de sus espacios, sin rediseñar la arquitectura ni ocupar los pasos reservados.
- **Escaleras a planta superior** (`tavernUpperStairs`): añade una capa real con alojamiento privado, sala de lectura y rellano. No duplica el salón de la planta baja.

### Posada

Entrada, recepción y pasillo se reservan antes de dividir las habitaciones.

- **Habitaciones para huéspedes** (`innRoomCount`) es una cantidad exacta; **no incluye recepción ni servicios**.
- Las habitaciones individuales, dobles o familiares se distribuyen según los espacios disponibles. No se garantiza que en cualquier tamaño aparezcan las tres clases.
- Cada habitación tiene acceso al corredor, camas y cofre. La densidad añade mobiliario secundario.
- **Escaleras a planta superior** (`innUpperStairs`) crea una segunda capa y reparte el **total solicitado entre ambas plantas**, no la misma cantidad por piso.

El mínimo geométrico es 8 × 11 en la orientación de generación, o 8 × 12 con segunda planta; la cantidad concreta puede requerir más espacio. No se reduce la petición si no cabe.

### Herrería

Taller con horno y yunque, recepción de pedidos y almacén de materiales. Incluye herramientas, piezas fundidas, armas, armadura y estantería de pedidos según el espacio disponible.

- **Posición del horno** (`smithyForgeLayout`): Contra la pared o Central, reservando espacio de trabajo alrededor.
- **Habitaciones adicionales** (`smithyExtraRoomCount`): cantidad exacta; taller, recepción y almacén son obligatorios y **no cuentan** en esa cifra.
- En mapas pequeños las funciones básicas pueden ser zonas abiertas; los anexos requieren espacio propio y acceso a corredores.

El horno es un asset estático. La llama, cuando corresponde a los puntos de interés, utiliza una hoguera separada.

### Templo

Cinco estilos arquitectónicos independientes de la temática Vanilla/Dark/Anime (`templeStyle`):

| Estilo | Organización y elementos |
| --- | --- |
| **Basílica romana** | Nave longitudinal, ábside, altar, columnas y bancos; posibles capillas o estancias laterales. |
| **Mezquita** | Sala de oración, mihrab, alfombras y minbar cuando cabe; patio y fuente de ablución según tamaño y anexos. |
| **Sinagoga** | Sala con arca de la Torá y bimá, circulación central y posibles salas de estudio o vestíbulo. |
| **Mandir** | Santuario, conexión estrecha y sala de columnas; espacios rituales y de servicio según dimensiones. |
| **Pagoda** | Núcleo central y circulación perimetral, con alas o estancias auxiliares cuando caben. |

- **Solo gran salón** (`templeMainHallOnly`) desactiva los anexos; el salón siempre existe. No cancela por sí solo las cámaras secretas ni la transición de nivel, que tienen controles propios.
- **Habitaciones secretas** (`templeSecretRooms`) crea cámaras y accesos en el terreno. A diferencia de Ruinas, aquí son espacios reales del plano, aunque no hay mecánicas de descubrimiento o puertas interactivas. Requieren al menos 14 × 12 en el plano orientado.
- **Transición de nivel** (`templeTransition`): Sin otra planta, Planta superior o Sótano. Crea como máximo una planta adicional en esta generación.
- La planta superior es una galería alrededor de un **vacío central no transitable**; no una copia completa del salón. El sótano tiene una distribución ceremonial y de servicio diferente.

Los estilos y las combinaciones de anexos/secretos/galería tienen requisitos geométricos propios. Se informa cuando no cabe una opción solicitada; no se transforma silenciosamente en otro estilo.

### Almacén

Entrada de carga, corredor central de dos casillas, pasillos transversales, estanterías modulares y mercancía en zonas laterales. Los soportes interiores se distribuyen en las líneas de estantes cuando el tamaño lo permite.

- **Distribución de estantes** (`warehouseShelfLayout`): Filas paralelas, Perimetral, Mixta o Aleatoria.
- **Volumen de mercancía** (`warehouseFill`): modifica la probabilidad de estantes llenos y la carga suelta. No es una cuota exacta de estantes ni cambia su ubicación.
- Al 0 % permanecen los estantes vacíos; al 100 % no se rellenan los pasillos con mercancía.

### Biblioteca

Escenario independiente que conserva la distribución clásica: estanterías, circulación y zona de lectura. Se incorporan ventanas decorativas y se mantienen las escalas por asset.

**Su rediseño está aplazado:** no hay nuevos tipos de sala ni un selector exclusivo de distribución. Densidad, complejidad y puntos de interés conservan su función anterior.

### Cuartel

Camas de barraca, equipo, armas sueltas y zona de oficiales cuando hay espacio.

- **Disposición de literas** (`barracksBedLayout`): Junto a muros, Perpendiculares, En filas o Aleatoria. Aleatoria elige una disposición coherente para el conjunto, no una orientación diferente por cama.
- **Volumen de equipo** (`barracksContents`) es el control propio de camas, muebles, armas y morrales; no depende de la densidad general.
- Lanzas y espadas sustituyen a los armeros en este generador; el asset de armero sigue en la biblioteca.
- Al 0 % puede quedar el edificio sin ese contenido, conservando estructura, ventanas y las luces que correspondan a puntos de interés.

## Plantas dentro del mismo proyecto

Taberna, Posada y Templo pueden generar una planta adicional con sus opciones específicas. El selector **Planta** aparece junto a las acciones de vista cuando existen varias.

- Pintar, colocar y borrar afecta **solo a la planta activa**.
- Cada planta conserva terreno, objetos, entrada y, cuando corresponde, metadatos de habitaciones.
- Deshacer/rehacer guarda instantáneas del proyecto completo, no únicamente una imagen de la planta visible.
- El tema global y los ajustes de iluminación son compartidos por el proyecto; no hay un tema global o panel de iluminación independiente por piso.
- Guardar JSON conserva todas las plantas y la seleccionada.
- **PNG, JPEG, GIF y miniatura exportan únicamente la planta activa.** Para obtener varias imágenes, cambiar de planta y exportar cada una.
- Las escaleras ilustran las transiciones; se cambia de planta con el selector, no pulsando el dibujo.

En JSON, la planta baja sigue en `terrain`, `objects`, `spawn` y `rooms` de la raíz. `layers` contiene **solo plantas adicionales**, con `id`, `name`, `elevation`, `terrain`, `objects`, `spawn` y `rooms` opcional. `activeLayer: 0` designa la planta baja; `1..N`, `layers[index - 1]`. Todas comparten dimensiones y temática global.

El formato admite hasta **ocho plantas adicionales**, pero el editor no ofrece crear arbitrariamente ocho pisos: los generadores actuales crean las capas descritas arriba. El vacío de una galería se dibuja como vacío; no compone una vista transparente del piso inferior.

## Editor y navegación

Terrenos disponibles: hierba, sendero, agua, suelo de piedra, muro, roca sólida, arena, madera, nieve, grava y sima/vacío. Pinceles de uno, dos o tres casillas; zoom, desplazamiento, coordenadas y ajuste a pantalla.

La previsualización del editor reduce automáticamente sus píxeles por casilla en mapas grandes o muy alargados para mantener la interacción fluida. Esto no modifica la geometría, el JSON ni la resolución elegida al exportar. Durante una pincelada se muestra una superposición ligera y el terreno se recompone al soltar el puntero. Colocar o borrar objetos actualiza solo su capa cacheada, sin reconstruir terreno, texturas e iluminación; si la animación está activa, la capa estática que no se muestra se sincroniza al pausarla o al abrir la exportación.

El historial permite hasta **30 pasos**. Regenerar o abrir otro proyecto reinicia el historial. El último proyecto se guarda automáticamente en este navegador; conviene descargar también el JSON como copia de seguridad.

| Acción | Atajo |
| --- | --- |
| Desplazar | V |
| Pintar terreno | B |
| Borrar objetos | E |
| Girar el objeto que se va a colocar 45° | R |
| Mostrar/ocultar cuadrícula | G |
| Ajustar a pantalla | F |
| Acercar/alejar | + / − o rueda |
| Deshacer | Ctrl/Cmd + Z |
| Rehacer | Ctrl/Cmd + Shift + Z o Ctrl/Cmd + Y |
| Desplazar con cualquier herramienta | Alt + arrastrar, botón derecho o central |

### Qué significa «transitable»

La navegación lógica depende del **terreno**: muro, roca sólida, agua y vacío no son transitables; los demás terrenos sí. Las ilustraciones de árboles, tejados, muebles y puentes no son obstáculos de colisión. Algunos generadores reservan sus huellas para mantener una composición legible, pero eso no introduce navegación de personajes.

Los escenarios construyen o reparan sus recorridos según sus reglas. La excepción explícita es **Caverna con simas divisorias**, que puede mantener zonas desconectadas. La edición manual puede desconectar cualquier mapa; no se repara automáticamente al pintar.

## Iluminación editable

La pestaña **Iluminación** modifica el mapa visible sin regenerar terreno ni objetos:

- Interruptor general y luz solar independiente.
- Intensidad, calidez y origen de la luz: 0° norte, 90° este, 180° sur, 270° oeste. Las sombras se proyectan en sentido opuesto.
- Haces: interruptor, intensidad, anchura y cantidad.
- Sombras solares: interruptor, intensidad, longitud y suavidad.
- Viñeta y halos de fuego/magia con intensidades independientes; 0 elimina el efecto correspondiente.
- Restablecer ajustes y deshacer/rehacer. Un arrastre de deslizador ocupa un paso de historial.

Bosque fragmenta los haces entre las copas; Ruinas los recorta por sus estructuras. Pueblo, Ciudad y Montaña usan luz ambiental y sombras, **sin haces**. Mazmorra, Caverna y los interiores no usan sol directo; conservan viñeta y halos. Los valores de controles inactivos no se borran.

Es una **aproximación 2D** con huellas y alturas estimadas, no iluminación física 3D. Las máscaras de sombras se combinan sin acumular oscuridad en sus solapamientos. Los haces se dibujan sobre el terreno y debajo de los objetos. El sombreado propio de los SVG y las sombras de contacto permanecen al apagar las sombras solares. Las ventanas no añaden efectos de luz o visibilidad.

La luz solar es estática, incluso en GIF. Se cachea con el terreno; sus máscaras tienen un máximo de 1024 px por lado y se muestrean en coordenadas del mundo. No hay movimiento de nubes ni barridos solares.

Los ajustes se guardan en `lighting`, se conservan al regenerar o cambiar de temática y se incluyen en las exportaciones. Abrir otro proyecto usa sus propios ajustes. **Atmósfera** es el interruptor general guardado en el proyecto; apagarlo no borra los valores individuales.

## Animación

Agua y determinados objetos comparten un bucle determinista de **2,4 segundos**, con fases distintas por objeto:

| Elemento | Movimiento |
| --- | --- |
| Agua | Ondas suaves. |
| Antorchas y hogueras | Llamas, brasas y luz fluctuante. |
| Cristales y altar arcano | Pulsación, destellos, runas y partículas. |
| Nenúfares y juncos | Balanceo y ondas o flexión suave. |
| Árboles, arbustos y flores | Movimiento sutil del follaje; pétalos en las variantes correspondientes. |
| Setas | Bioluminiscencia opcional, inicialmente desactivada. |

La animación se aplica también a elementos pintados o colocados manualmente y respeta la temática individual de cada objeto. Los nuevos assets de arquitectura, muebles y rituales son **estáticos**: una ilustración de horno, chimenea o brasero no obtiene automáticamente el comportamiento de una hoguera. No hay animaciones de apertura de puertas/cofres ni de uso de escaleras.

- **Animación** pausa/reanuda la vista sin modificar el proyecto.
- Se respeta la preferencia de movimiento reducido; la animación se suspende con la pestaña oculta o diálogos abiertos.
- Los mapas sin elementos animables no mantienen un ciclo continuo de repintado.
- **Setas bioluminiscentes** es una preferencia de sesión para la vista animada y el GIF: no se guarda en JSON ni al recargar y no afecta PNG/JPEG.
- **Atmósfera** controla iluminación y halos, no las ondas, llamas, runas o el balanceo.
- Terreno, iluminación, objetos estáticos y sprites animados se cachean; no se regenera el mapa ni se decodifican SVG cada fotograma. La vista reduce moderadamente la frecuencia de animación en mapas grandes; la exportación GIF conserva sus 24 fotogramas de 100 ms. Los objetos se componen en orden de profundidad.

## Exportación

### PNG y JPEG

Exportación estática de la **planta activa completa**, independiente del zoom, con o sin cuadrícula y a **25, 50, 100 o 150 píxeles por casilla**. PNG sin pérdida; JPEG al 94 %. Sin controles del editor, coordenadas externas ni marcas de agua.

Límite de **40 megapíxeles por imagen**. Una combinación superior muestra un error; elegir menor resolución. Los píxeles por casilla no fijan por sí solos el tamaño físico de impresión: ajustar la escala en la aplicación de impresión o mesa virtual.

### GIF animado

**Exportar mapa → Formato → GIF · Animado en bucle** genera 24 fotogramas de 100 ms, repetición infinita y paleta global de hasta 256 colores.

- Exporta la planta activa, su temática global, los temas individuales, la iluminación y la cuadrícula elegida.
- Anima los elementos presentes aunque la vista del editor esté pausada. Si esa planta no tiene elementos animables, no habrá movimiento.
- Límite de **1 megapíxel y 1600 px por lado**. Los píxeles por casilla se reducen automáticamente a un entero y el diálogo indica la resolución efectiva.
- Ejemplo: 40 × 30 a 100 px por casilla se reduce a **1120 × 840 px**, 28 px por casilla.
- La miniatura es estática. Las setas solo emiten luz si está activada su preferencia de sesión.
- Se muestra progreso y se puede cancelar cerrando el diálogo; se termina el worker y se liberan sus capas.

La codificación usa `gifenc` (MIT) en un Web Worker, transfiriendo un fotograma a la vez. La transparencia de los píxeles sin cambios reduce el tamaño. Todo ocurre localmente; no se envían mapas a servidores. La compatibilidad de reproducción depende de la mesa virtual de destino.

**Las imágenes no conservan el proyecto editable ni todas las plantas. Guardar también el JSON.**

## Guardado, formato y migración

Los proyectos se descargan como `nombre.tematica.rc.json`, mantienen **versión 2** y contienen configuración, geometría, objetos, plantas y ajustes de iluminación.

Al abrir archivos anteriores:

- Versión 1 sin temática se interpreta como Vanilla y se migra a versión 2.
- `biome: "building"` se convierte al escenario directo indicado por `buildingType`; si faltaba, Casa. El formato nuevo ya no necesita `buildingType`.
- Las opciones nuevas ausentes reciben valores predeterminados. **No se regenera ni sustituye el terreno o los objetos guardados.**
- Si falta `forestRiverDirection`, se incorpora **`north-south`**, conservando la intención anterior; los mapas nuevos usan `random`.
- Un `roomCount` antiguo se conserva como configuración de compatibilidad. No se adivinan cuotas por tamaños a partir del terreno; la interfaz actual usa `dungeonRooms` para nuevas generaciones manuales.
- Sin `layers` el proyecto tiene únicamente planta baja; sin `activeLayer` se selecciona esa planta.
- Sin `object.theme`, el objeto hereda la temática del mapa. Sin ajustes de iluminación se utilizan los predeterminados.

La validez del archivo se separa de la capacidad para **volver a generarlo**: un mapa antiguo conserva su geometría aunque sus opciones no quepan bajo las nuevas reglas. Generar otra vez sí aplica las validaciones actuales.

La importación limita el archivo a **5 MB**, los objetos a **20.000 entre todas las plantas** y las capas adicionales a ocho. Se validan terrenos, dimensiones, configuración, posiciones, escalas, temáticas, metadatos y planta activa. Las escalas válidas no se recortan silenciosamente.

El guardado local utiliza `rc-map-v2`. También se puede recuperar la clave anterior `astra-map-v1`, escribiendo la copia migrada sin eliminar el registro original. El almacenamiento del navegador puede fallar o borrarse: no reemplaza una copia descargada.

## Estructura del código

```text
src/
  main.ts                       Interfaz, controles, edición, historial y exportación
  viewport.ts                   Cámara, navegación y previsualización
  asset-families.ts              Familias del catálogo y correspondencia inicial por escenario
  lighting-panel.ts             Controles de iluminación
  *.css                         Estilos, temáticas y adaptación de interfaz
  engine/
    types.ts                    Modelo de mapa, configuración y catálogo original
    new-assets.ts               Catálogo ampliado, tamaños y alturas de sombra
    themes.ts                   Paletas y rutas de SVG por temática
    dimensions.ts               Límites, formatos y relaciones de aspecto
    editor-resolution.ts        Presupuesto adaptativo de píxeles para la previsualización
    scenario-options.ts         Validación compartida y opciones de escenarios
    random.ts                   PRNG con semilla y ruido fractal
    generate.ts                 Validación, mapa base y orientación de interiores
    generate.worker.ts          Generación fuera del hilo principal
    scenario-painter.ts         Primitivas de terreno y colocación
    scenarios/
      index.ts                  Registro de los 15 generadores
      connectivity.ts           Transitabilidad y regiones de terreno
      forest.ts / forest-paths.ts
      dungeon.ts / dungeon-rooms.ts
      cave.ts / ruins.ts / village.ts / mountain.ts / city.ts
      house.ts / tavern.ts / inn.ts / smithy.ts / temple.ts
      library.ts / warehouse.ts / barracks.ts
      forest/ dungeon/ cave/ ruins/ village/ mountain/ city/ house/
                                Ayudas específicas de geometría por escenario
    map-layers.ts               Selección de datos y vista de la planta activa
    render.ts                   Renderizado compartido por vista y exportación
    lighting-settings.ts        Perfiles, valores y validación de iluminación
    lighting.ts                 Luz ambiental y máscaras de sombras 2D
    animation.ts                Composición animada de la planta activa
    animated-objects.ts          Sprites por temática y efectos
    animation-settings.ts       Bucle y límites de resolución
    export-gif.ts               Exportación secuencial y cancelación
    gif-encoder.ts / gif.worker.ts
                                Paleta y codificación fuera del hilo principal
    storage.ts                  Validación y migración sin regenerar geometría
public/assets/
  vanilla/ dark/ anime/          SVG de objetos y texturas por temática
  *.svg                         Originales y compatibilidad
public/fonts/
  Inter.ttf / Cinzel.ttf         Fuentes locales con sus licencias SIL OFL
scripts/
  create-assets.mjs              Colección original
  create-expansion-assets.mjs    Primera ampliación de arquitectura y paisaje
  create-assets-expanded-worlds.mjs
                                Assets especializados y módulos nuevos
  create-theme-assets.mjs        Variantes temáticas
```

La generación procedural y la codificación GIF se ejecutan en workers separados. El dibujo Canvas 2D y la exportación estática permanecen en el hilo principal. El ruido visual se muestrea en coordenadas del mundo para conservar el paisaje al cambiar resolución.

La guía del diseño Brasa está en `docs/diseno/GUIA_DISENO_BRASA_ASTRA.md`, con el resultado de implementación en `docs/diseno/ESTADO_IMPLEMENTACION_BRASA.md`. Los planes y decisiones de la ampliación están en `docs/change-plans/`. Algunos documentos describen propuestas o estados previos: el código y este README describen la interfaz actual. `legacy_documentation` queda fuera del alcance de esta revisión documental.

## Límites de alcance

- No hay movimiento de personajes, reglas de cobertura, niebla de guerra, encuentros, tráfico ni simulación física 3D.
- Objetos decorativos y transitabilidad del terreno son conceptos distintos; editar manualmente puede romper la conectividad.
- Ruinas no tiene capas funcionales ni túneles secretos. Montaña no enlaza sus cuevas y Ciudad no genera alcantarillado subterráneo.
- Los tejados de Pueblo/Ciudad no abren interiores: seleccionar el escenario interior correspondiente y generar otro mapa por separado.
- Las plantas se seleccionan en el editor; no hay navegación automática por escaleras, composición entre pisos ni creación libre de plantas.
- Las opciones más exigentes pueden no caber en mapas pequeños o estrechos. Las figuras principales no son una promesa de que todo adorno opcional aparezca en cada semilla.
- Las exportaciones grandes y las búsquedas de capacidad complejas pueden tardar. Un build correcto no sustituye una revisión manual del resultado.
- Biblioteca conserva su diseño anterior; su ampliación de salas y opciones queda aplazada.

`@material/web` es Material Web, no Angular Material; considerar su mantenimiento al actualizar dependencias. Inter y Cinzel se sirven desde `public/fonts/`, con sus licencias SIL Open Font License 1.1. No se cargan fuentes desde CDNs ni mediante Fontsource.
