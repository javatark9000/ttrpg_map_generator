# Cambios generales

## Objetos con temática independiente

**Necesidad:** colocar en un mismo mapa objetos Vanilla, Dark y Anime.

### Solución propuesta

- Añadir `theme?: Theme` a `MapObject`.
- Los objetos manuales guardan la temática seleccionada en el momento de colocarlos.
- **Decisión aprobada:** los objetos procedurales omiten el campo y heredan `map.config.theme`; solo los objetos manuales mezclan temas.
- Render, previsualización, animación, iluminación y exportación resuelven `object.theme ?? map.config.theme`.
- Añadir un selector de temática en la biblioteca de objetos, separado del tema global.
- Los proyectos existentes siguen heredando el tema del mapa; no requieren regeneración.

**Riesgo concreto:** los sprites animados y la caché actual se agrupan por tema del mapa; deberán indexarse también por la temática del objeto.

## Escala manual de objetos

El rango actual de la interfaz es 50–180 %, mientras el JSON admite escalas absolutas de hasta 20.

### Rango aprobado

El selector manual usará **25–400 %**, con 100 % como tamaño natural. La validación del proyecto debe admitir todo este rango sin recortar valores silenciosamente.

### Archivos previstos

- `src/engine/types.ts`
- `src/engine/render.ts`
- `src/engine/animation.ts`
- `src/engine/animated-objects.ts`
- `src/engine/storage.ts`
- `src/viewport.ts`
- `src/main.ts`

## Evaluación

- Ejecutar únicamente `npm run build`.
- Verificación manual: mezclar tres versiones de un objeto, guardar JSON, abrirlo y exportarlo.
