# Revisión estática: Pueblo y Ciudad

Alcance: `src/engine/scenarios/village.ts`, `village/`, `city.ts` y `city/`; contratos de configuración y planes correspondientes. Sin editar código, ejecutar mapas ni crear/ejecutar tests. `legacy_documentation` excluida. Las referencias corresponden al código leído durante esta revisión.

## Hallazgos

### P2 — Aumentar densidad puede reducir la cantidad de edificios — corregido

**Referencias:** `src/engine/scenarios/village.ts:41`, `:76–91`.

Los edificios singulares automáticos se eligen antes de calcular la capacidad residencial. Un singular puede reemplazar una cuadra de cuatro parcelas por una única unidad, cambiando el denominador de ocupación.

Ejemplo derivado estáticamente, no ejecutado: mapa 41 × 41, cuadras `large`, trazado `square`, agua desactivada y ningún obligatorio. Hay cuatro cuadras de 19 × 19; una se reserva como plaza. Con densidad 24, el presupuesto automático es cero: doce parcelas residenciales producen tres casas. Con densidad 25, el presupuesto pasa a uno; si sale taberna, templo o rancho fuera de la plaza, quedan ocho parcelas más un singular y el objetivo baja a dos edificios.

**Recomendación:** definir una capacidad estable y contabilizar los lotes consumidos por cada singular, o declarar explícitamente que la densidad usa un denominador variable y no garantiza ocupación creciente.

### P2 condicionado — La plaza puede impedir un edificio obligatorio viable — corregido

**Referencias:** `src/engine/scenarios/village.ts:15–16`, `:72–77`.

La plaza se fija antes de asignar obligatorios. Esa cuadra queda prohibida para cualquier obligatorio salvo mercado, sin intentar ubicar la plaza en otra cuadra.

Ejemplo geométrico derivado, no ejecutado: con `mixed`, un mapa 20 × 20 puede dividir ambos ejes en tramos de 8 y 11. Sus cuadras son 7 × 7, 7 × 10, 10 × 7 y 10 × 10. La última es la más central y la única apta para templo; reservarla como plaza hace fallar el templo obligatorio, aunque cabrían templo y plaza si se intercambiaran las reservas.

**Recomendación:** si los obligatorios tienen prioridad, seleccionar una plaza compatible con ellos. Si la posición central es inamovible, documentar esa restricción; en tal caso este punto es una decisión de diseño, no un incumplimiento confirmado.

## Sin otros defectos concretos identificados

- `village.ts:57–65`: estatus por mayores restos; la cantidad resultante coincide con las casas generadas. La validación central cubre porcentajes y selección de obligatorios sin duplicados.
- `village.ts:14–35`: búsqueda de asignación de obligatorios; coloca todos o produce error explícito. Comparte comprobación de tamaño con la colocación.
- `city.ts:42–55`: cuotas de ocupación y comercio calculadas sobre parcelas/edificios, redondeadas a enteros; las casas usan `houseStatus`.
- `city/layout.ts:32–47`: callejones reservados antes de generar parcelas; `none` no introduce cortes, `few` aplica un corte probabilístico y `many` permite una cruz cuando cabe.
- `city/layout.ts:62–89`: las parcelas de las fachadas se particionan sin solapamientos según la lectura del algoritmo.

Estas conclusiones son estáticas; no equivalen a verificación funcional ni visual.

## Corrección REV-P2 — Pueblo

Implementada únicamente en `src/engine/scenarios/village.ts`; las referencias de línea de los hallazgos describen la versión anterior.

### Capacidad estable y ocupación monótona

- La planificación automática de singulares ya no recibe `density`. Reserva una mezcla fija de parcelas singulares antes de subdividir las restantes para viviendas; las reservas de plaza y estanque tampoco dependen de densidad.
- Cada parcela planificada representa una unidad de ocupación: casa, mercado, taberna, templo o conjunto rancho/corral. Una parcela singular puede ocupar una cuadra completa; no se considera una unidad por módulo SVG ni un porcentaje de superficie.
- La capacidad `C` es la suma fija de parcelas residenciales y singulares. Un único orden barajado por semilla permite activar un prefijo de `round(C × density / 100)` unidades. Los singulares automáticos entran en ese mismo orden, no sustituyen casas al cruzar umbrales de densidad.
- Con `R` obligatorios, estos permanecen activos incluso con densidad cero. El total es `max(R, round(C × density / 100))`; el resto se completa con viviendas. Densidad 100 ocupa todas las parcelas planificadas.
- Supuesto de monotonía: misma semilla y demás configuración, variando solamente densidad. El número de unidades ocupadas no disminuye y las parcelas activas forman conjuntos anidados. No se garantiza conservar el estatus particular de cada casa al cambiar su cantidad, pues las cuotas porcentuales se recalculan, ni la misma decoración vegetal.
- Las parcelas singulares reservadas pero no activadas permanecen vacías; no se subdividen temporalmente en viviendas. Esto mantiene fijo el denominador.

### Plaza compatible con obligatorios

- En trazado de plaza se prueban las cuadras por cercanía al centro, usando el matching de capacidad ya existente para todos los obligatorios.
- Se elige la primera plaza compatible; mercado y plaza siguen pudiendo compartir parcela.
- La plaza puede desplazarse, pero no omitirse cuando el trazado `square` la prevé (más de una cuadra). Si ninguna ubicación permite conservar plaza y obligatorios, se emite un error explícito que menciona ambas necesidades; no se degrada el trazado seleccionado.
- Solo se evalúa una asignación sin plaza en trazados que no la prevén, incluido el caso compacto de una única cuadra. El estanque sigue planificándose después, sin desplazar obligatorios.

### Evaluación

`npm run build` completado correctamente tras la corrección. Sin crear ni ejecutar tests, mapas de prueba o validación visual. Los argumentos de monotonía y prioridad anteriores son de revisión estática; `legacy_documentation` continúa fuera de alcance.
