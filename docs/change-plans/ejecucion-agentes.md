# Contrato de ejecución coordinada

Propietario de modelo común, validación, migración, render, capas y registro: boss@maps. UI@maps es propietario de main.ts y CSS. Cada experto posee solo su generador/helpers. Modelador posee nuevos Vanilla; maquillador nuevas variantes. No editar archivos de otros ni hacer commits globales. Solo evaluación de compilación; sin suites de tests.

## Criterio obligatorio de implementación

- Preferir código simple, eficiente, legible e idiomático; menos líneas no justifican menor claridad.
- Mantener cada cambio enfocado. No crear motores genéricos ni capas especulativas.
- Cada abstracción, dependencia, comprobación o fallback debe responder a una necesidad o riesgo concreto de esta tarea.
- La validación de tipos y rangos vive en las fronteras centrales. El generador comprueba solo factibilidad geométrica y condiciones que dependen de su algoritmo; no duplicar contratos ya garantizados.
- Los errores deben ser explícitos: no reducir cantidades, eliminar requisitos obligatorios ni sustituir silenciosamente assets faltantes.
- Declarar supuestos ambiguos en lugar de implementar todas las interpretaciones.
- La complejidad no justificada es un defecto. En el callback, justificar cualquier nueva utilidad, dependencia o restricción.
- No crear ni ejecutar pruebas genéricas, unitarias ni E2E. Únicamente evaluación de compilación; no confundir compilación correcta con verificación funcional.

## Configuración común (la implementa boss)

- forestRiverDirection: none | random | north-south | east-west | diagonal-nw-se | diagonal-ne-sw.
- dungeonRooms: { small:number; medium:number; large:number } | null (null=automático). roomCount legado se migra.
- caveChasms: none | safe | dividing; caveNaturalBridges:boolean.
- ruinLayout: grid | courtyard | scattered | random; ruinFeatures: simple | standard | monumental; ruinSecretPassages:boolean.
- villageBlockSize: small | mixed | large; villageWealth: { poor:number; common:number; wealthy:number } porcentajes suma 100; villageRequiredBuildings: ('market'|'tavern'|'temple'|'ranch')[]. Vacío=auto según capacidad.
- mountainPaths:boolean; mountainPathLayout: pass | switchback | ridge | fork | random; mountainCaveEntrances:number.
- cityDensity:number 0–100; cityDistrictBalance:number 0–100 porcentaje comercial; cityAlleys: none | few | many; citySewers:boolean; cityWalls:boolean; cityStreetWidth:narrow | standard | wide.
- houseLayout: compact | corridor | courtyard | random; houseBedrooms:number (0=auto).
- tavernCondition: ordered | messy; tavernUpperStairs:boolean.
- innRoomCount:number; innUpperStairs:boolean.
- smithyForgeLayout: wall | central; smithyExtraRoomCount:number.
- templeStyle: roman | mosque | synagogue | mandir | pagoda; templeMainHallOnly:boolean; templeSecretRooms:boolean; templeTransition: none | upper | basement.
- warehouseFill:number 0–100; warehouseShelfLayout: parallel | perimeter | mixed | random.
- barracksBedLayout: walls | perpendicular | rows | random; barracksContents:number 0–100.
- houseStatus: poor | common | wealthy (selección general assets casas; pueblo usa porcentajes propios).

Los generadores exportan generateX(map:BattleMap,rng:Random,place:PlaceObject):void. Biomas nuevos directos, sin buildingType nuevo. PlaceObject de scenario-painter.ts. La central completa valores ausentes para proyectos anteriores. No usar casts locales ad hoc si aún faltan tipos; se implementan en paralelo.

## Capas

BattleMap conserva terreno/objetos/spawn de planta baja. `layers?: MapLayer[]` contiene solamente plantas adicionales, con id/name/elevation/terrain/objects/spawn/rooms opcional. `activeLayer?: number` vale 0 para planta baja, 1..N para layers[index-1]. `activeLayerData(map)` retorna la planta editable, `mapForActiveLayer(map)` retorna una vista BattleMap para render/exportación. Boss crea src/engine/map-layers.ts. UI usa estos helpers al pintar/borrar/colocar y el selector de plantas; guardado e historial conservan todo el proyecto. Exporta la planta activa e informa esto.

Cada experto con varias plantas puede generar layers usando su API local y reportarla. No repetir una planta completa para simular una superior. Templo debe tener vacío central en piso superior; taberna y posada una distribución superior funcional. MapLayer no tiene config propia: mismas dimensiones/tema de proyecto.

## Assets coordinados

IDs iniciales: stairs-up, stairs-down, cave-entrance, sewer-entrance, statue-complete, statue-broken, market-structure, roof-tavern, roof-temple, roof-ranch, corral, window, drinks, bar-counter, inn-reception, wood-stove, fireplace, equipment-pack, spears, swords, shelf-full, shelf-empty, barracks-bed. Assets de herrería: forge-furnace, smith-tools, armor, cast-metal, order-shelf. Casas: roof-house-poor, roof-house-common, roof-house-wealthy (tamaños mediante escala proporcional o variantes acordadas con modelador). Muralla: city-wall. Secretos: secret-entrance. Templo: acordar con modelador los específicos. Cada experto debe comunicar IDs adicionales al modelador y boss antes de depender de ellos.

`void` será terreno no transitable (boss integra renderer/palette/storage/connectivity). Ventanas estrictamente decorativas. Objetos manuales tienen theme opcional; generados lo omiten. Escala manual 25–400 %, validación no trunca.
