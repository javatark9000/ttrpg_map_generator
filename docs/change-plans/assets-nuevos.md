# Inventario de assets nuevos

Cada asset debe existir en Vanilla, Dark y Anime, compartir identificador y tener una huella visual coherente con la cuadrícula de 1,5 m.

## Transiciones y exteriores

- `stairs-down`: gradas hacia un nivel subterráneo.
- `stairs-up`: gradas hacia un nivel superior.
- `cave-entrance`: entrada o salida de cueva.
- `sewer-entrance`: acceso específico de alcantarilla.
- Módulos de muralla urbana para la opción de Ciudad.
- `statue-complete`: estatua completa.
- `statue-broken`: estatua incompleta.
- `market-structure`: estructura de mercado.
- `roof-tavern`: techo de taberna.
- `roof-temple`: techo de templo.
- `roof-ranch`: techo de rancho.
- `corral`: cerca o módulo de corral.
- Casas de varios tamaños y niveles visuales de estatus. **El usuario elegirá el estatus general del mapa.**

## Interiores

- `window`: ventana para muros interiores.
- Barriles: revisar el asset existente antes de crear otro identificador.
- `drinks`: bebidas y recipientes.
- `bar-counter`: barra de bar; revisar si reemplaza o complementa `counter`.
- `inn-reception`: recepción de posada.
- `wood-stove`: cocina de leña.
- `fireplace`: chimenea interior.
- `equipment-pack`: morral de equipo.
- `spears`: lanzas.
- `swords`: espadas.
- `shelf-full`: módulo de una casilla de estante lleno para almacén.
- `shelf-empty`: módulo de una casilla de estante vacío para almacén.
- Herrería: horno, herramientas, armas, armaduras, piezas fundidas y estantería de pedidos.
- Templo: elementos arquitectónicos y rituales propios de los cinco estilos aprobados.
- Cuartel: cama de barraca; las armas sueltas reemplazan el armero en este escenario.

## Decisiones aprobadas y preparación

- Los assets existentes `barrels`, `counter`, `stairs`, `statue` y `bookshelf` se conservan; los nuevos serán variantes especializadas.
- Los assets grandes y variables, como corrales, mercados y estantes, se construirán con módulos combinables.
- Antes de dibujar cada asset se definirá su tamaño natural en casillas, categoría, capacidad de animación y altura para sombras.

## Integración

Actualizar `AssetId`, catálogo, scripts de assets, las tres carpetas temáticas, precarga, iluminación y documentación. Evaluar únicamente con `npm run build` y revisión visual manual.
