# Revisión estática: templo y conectividad

Revisión inicial sin modificaciones de código, tests ni ejecución de mapas. `legacy_documentation` excluido. Las correcciones posteriores se registran al final.

## Hallazgos

- **Media — `src/engine/scenarios/temple.ts:58–74`:** el sótano crea almacén y vestuario cuando caben, sin consultar `templeMainHallOnly`. En 40 × 30, con «Solo gran salón» y sótano, la planta baja respeta el control pero el sótano añade anexos. Corregir la condición o aclarar expresamente que el control solo afecta a la planta baja.
- **Media — `src/engine/scenarios/temple.ts:195,228–240,267`:** el minbar se omite silenciosamente en mezquita 12 × 10, sin secretos y con `templeMainHallOnly=true`. Por las fórmulas, el salón es `{x:1,y:2,w:10,h:5}` y reserva la fila 4; el minbar centrado en `(9.5,3.5)`, tamaño 2, ocupa filas 2–4. `furnishing` lo rechaza y el llamador ignora el retorno, aunque solicita un elemento no opcional. Ajustar su ubicación/tamaño o informar explícitamente si es requerido.

## Integración revisada

- `connectivity.ts:3–4`: `void` es no transitable y `getRegions` lo respeta.
- Templo no llama a `connectRegions`; caverna lo llama antes de generar simas. No encontré una desconexión demostrable de las galerías mediante lectura.
- **Precaución, no defecto activo — `connectivity.ts:43`:** `connectRegions` sobrescribe también `void`; no usarlo como reparación posterior del templo o de cavernas con separación permitida.
- Las capas del templo tienen terreno/objetos propios, elevación, descansillo y escaleras inversas alineadas. El vacío superior se abre después de las rutas. Los cinco estilos tienen trazados y assets diferenciados.

Estas conclusiones son estáticas; no equivalen a verificación funcional o visual.

## Estado REV-P2 — corregido en código

- **Sótano:** los tabiques de almacén y vestuario ahora exigen `!templeMainHallOnly`; «Solo gran salón» se respeta también bajo tierra.
- **Minbar:** se coloca antes del mobiliario decorativo, alineado a la cuadrícula. En 12 × 10 ocupa las columnas 8–9 y filas 2–3, dejando libre la fila transversal 4. Las salas compactas usan un púlpito de una casilla; el minbar ya no se omite por una condición de tamaño.
- **Rituales requeridos:** `requireRitual` comprueba el resultado de la colocación y lanza un error explícito si no cabe. Se aplica a los tres santuarios, mihrab/minbar, arca/bimá, fuente de ablución del patio y braseros/campanas cuando están activados. No sustituye assets ni ignora fallos de ocupación.
- **Prioridad de colocación:** en mandir, braseros y campana se colocan antes de las columnas decorativas para que estas no los excluyan silenciosamente. El mobiliario decorativo sigue pudiendo omitirse por densidad o falta de espacio.
- **Evaluación:** `npm run build` correcto. Sin tests ni ejecución de mapas; queda pendiente la comprobación visual manual integrada.
