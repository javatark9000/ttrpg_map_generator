# Estado de ejecución coordinada

## Implementación integrada

- **General:** temática individual para objetos manuales, escala 25–400 %, render/animación/exportación coherentes y validación del JSON.
- **Modelo:** 15 escenarios directos; migración de `building`/`buildingType` sin regenerar geometría. Plantas adicionales dentro del proyecto, selección y edición de la planta activa.
- **Bosque:** orientación del río y opción sin río/caminos.
- **Mazmorra:** cantidades por lado corto 4–8 / 9–12 / 13+, capacidad exacta en el worker; formulario con cotas rápidas, sin búsqueda combinatoria en cada pulsación.
- **Caverna:** vacío/simas, modos seguros o divisores y puentes naturales.
- **Ruinas:** trazados, plazas, elementos monumentales, agua variable y secretos decorativos.
- **Pueblo:** cuadras variables, cuotas de estatus, edificios singulares y corrales.
- **Montaña:** trazados opcionales, agua variable y cantidad de entradas de cueva.
- **Ciudad:** densidad, distribución comercial/residencial, callejones, accesos de alcantarilla y murallas opcionales.
- **Casa, Taberna, Posada, Herrería, Templo, Almacén y Cuartel:** generadores y opciones propios; Taberna/Posada con planta superior opcional, Templo con galería o sótano.
- **Biblioteca:** independiente, sin rediseño, conforme al aplazamiento aprobado.
- **Assets:** 48 objetos nuevos en Vanilla/Dark/Anime; total de 95 objetos y 4 texturas por temática. Catálogo en `src/engine/new-assets.ts` y fuentes reproducibles en `scripts/`.

## Responsabilidades

Cada experto es propietario de su generador; `modelador@maps` de los nuevos Vanilla y metadatos, `maquillador@maps` de variantes, `UI@maps` de interfaz. `boss@maps` integra modelo, validación, migración, render, capas y registro. La separación evita cambios simultáneos sobre los archivos centrales.

## Evaluación y límites

- Compilación final integrada `npm run build`: **correcta**, TypeScript y Vite (159 módulos).
- `git diff --check`: sin errores; solo avisos de conversión LF/CRLF de Windows.
- No se han creado ni ejecutado suites unitarias, E2E o pruebas genéricas.
- Revisión estática cruzada completada; sus hallazgos conocidos y correcciones están registrados en `revisiones/`. La compilación **no acredita** la calidad visual ni todos los comportamientos en navegador.
- Los objetos siguen siendo ilustraciones; sus reservas de colocación no convierten el editor en un simulador de colisiones.
- Se exporta la planta activa; el JSON conserva todas las plantas.
- En Ruinas, los niveles y secretos siguen siendo decorativos. Las alcantarillas y entradas de cueva no generan otro escenario enlazado.
- La documentación heredada bajo `legacy_documentation` queda excluida del alcance.

## Cierre

Implementación aprobada integrada, documentación actualizada y compilación final completada. No quedan abiertos los hallazgos identificados en la revisión cruzada; no se afirma una verificación funcional exhaustiva.

Correcciones de cierre:

- Rotación coherente de edificios anchos y todas sus plantas, conservando orientación de SVG y metadatos de habitaciones.
- Modo manual antiguo de mazmorra visible y conservado hasta un cambio explícito; validación de importación separada de factibilidad de generación.
- Exportación desde un snapshot estable de la planta previsualizada; historial, guardado y JSON conservan el proyecto completo.
- Cantidades numéricas vacías inválidas, límites de objetos conjuntos y JSON guardable dentro del tamaño admitido por importación.
- Circulación de casas compactas, conjuntos mesa/asiento de taberna y elementos rituales/anexos del templo sin omisiones silenciosas.
- Ocupación monótona del pueblo con densidad creciente y plaza compatible con edificios obligatorios, sin eliminar la plaza para forzarlos.

Se mantiene aplazado únicamente el rediseño de Biblioteca según lo aprobado. No se han añadido dependencias ni realizado commits globales.
