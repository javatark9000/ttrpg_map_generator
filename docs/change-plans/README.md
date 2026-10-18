# Planes de ampliación del generador

Estos documentos conservan la planificación y las [decisiones aprobadas](decisiones-aprobadas.md). La implementación coordinada se registra en [estado de ejecución](estado-ejecucion.md), con el [contrato entre agentes](ejecucion-agentes.md) y las revisiones estáticas en `revisiones/`. Los apartados de solución propuesta describen el diseño de partida; el código actual y el estado de ejecución indican lo integrado.

## Orden sugerido

1. [General](general.md), [assets](assets-nuevos.md) y soporte de capas aprobado para edificios.
2. Separación de edificios descrita en [edificios](edificios-general.md).
3. Escenarios existentes: [bosque](bosque.md), [mazmorra](mazmorra.md), [caverna](caverna.md), [ruinas](ruinas.md), [pueblo](pueblo.md) y [montaña](montana.md).
4. Escenario nuevo: [ciudad](ciudad.md).
5. Edificios: [casa](casa.md), [taberna](taberna.md), [posada](posada.md), [herrería](herreria.md), [templo](templo.md), [almacén](almacen.md), [biblioteca](biblioteca.md) y [cuartel](cuartel.md).

## Criterios comunes

- Implementar la solución directa más pequeña que cubra el requisito confirmado.
- No añadir dependencias ni abstracciones sin una necesidad concreta.
- Mantener cada generador en su propio módulo.
- No ocultar configuraciones inválidas ni reducir cantidades silenciosamente.
- Cuando una decisión esté abierta, confirmarla antes de programar.
- Evaluación permitida: `npm run build`. No se crearán pruebas genéricas automáticas.
