## Why

La arquitectura de este proyecto está escrita **dos veces**: en `ARCHITECTURE.md` y en el bloque
`context:` de `openspec/config.yaml`, que son el mismo texto a dos longitudes. Ya han divergido, y la
copia que se quedó atrás es justo la peor.

`config.yaml` es lo que se inyecta como `<project_context>` en las instrucciones de **cada artefacto
que se escribe**. Hoy afirma, como decisión cerrada:

- «Documento **PRESENTACIONAL**, no fiscal. Sin XML, firma digital, QR/CUFE ni catálogos SRI/DIAN/CFDI.
  **Nada de dominio tributario entra en las specs**» — mientras `openspec/specs/invoice-issuance/`,
  `invoice-numbering/` y `credit-notes/` existen y describen consecutivos con vigencia, congelación y
  notas de crédito.
- «Sin multi-tenant, sin API keys» — que `company-scoping` invierte.
- «No se construye: carpeta `shared/`…» — que `modular-apps` invierte.
- «Una feature nueva es una carpeta hermana de `invoice/`» — cierto sobre el papel y nunca practicado:
  150 de 170 archivos están dentro de `invoice/`.

Eso no es un documento desactualizado: es un **briefing equivocado** entregado a quien escriba el
siguiente cambio. Lo escribí yo: la tarea 9.3 de `invoice-issuance` decía «actualizar ARCHITECTURE.md»
y eso hice, dejando la otra copia atrás sin darme cuenta de que existía.

Y hay un segundo problema, de forma y no de contenido. Tres cambios en cola llevan cada uno su tarea
de tocar `ARCHITECTURE.md`. Cuando aterricen, el documento será un remiendo de cuatro manos con una
**estructura que ya no describe el sistema**: §3 dice que el registro de bloques es _el_ eje de
crecimiento cuando ahora hay dos, §2 presenta `invoice/` como la carpeta de features cuando pasan a ser
módulos, y §5 prohíbe cosas que dejan de estar prohibidas.

## What Changes

- **`ARCHITECTURE.md` se reestructura, no se parchea.** Lo que se ha vuelto grande deja de ser una
  viñeta dentro de «Decisiones cerradas» y pasa a ser sección propia: el módulo como aplicación, el
  kernel y su puerta, la frontera con otras apps, y dónde está la línea entre lo fiscal y lo
  presentacional.
- **Los dos documentos dejan de decir lo mismo**, que es la causa de que diverjan. `config.yaml` se
  queda con **lo que no se puede volver a discutir** —decisiones cerradas y restricciones verificadas
  del framework— y `ARCHITECTURE.md` con **el porqué y la forma**. Solapamiento casi nulo, así que casi
  no hay nada que sincronizar.
- **Se anota que son dos archivos.** El fallo de esta sesión no fue de disciplina, fue de
  desconocimiento: la tarea decía «ARCHITECTURE.md» y nadie sabía que había una segunda copia. Queda
  escrito en los dos.
- **Se poda lo que ya no es verdad** y se marca lo que sigue siéndolo, con la misma redacción de
  siempre: qué se decidió y **por qué**, para que no se reabra por costumbre.

## Capabilities

Ninguna. Este cambio no toca comportamiento, ni rutas, ni datos, ni ninguna capacidad: solo los dos
documentos que describen el sistema. Es un cambio **sin deltas**, de los que `openspec archive`
contempla con `--skip-specs`.

## Impact

**Va el último**, después de `modular-apps`, `company-scoping` y `catalog-source`. Antes describiría
una arquitectura que todavía no existe, y en medio obligaría a reescribir lo mismo dos veces. Las
tareas de documentación de esos tres cambios se quedan como están —cada uno anota su decisión al
aterrizar—; lo que hace este es reconciliar el resultado y darle forma.

**`openspec validate` avisará de que no hay deltas.** Es correcto: no los hay. Se archiva con
`--skip-specs`, que existe exactamente para cambios de documentación y herramientas.

**Sin código, sin dependencias, sin migración.**

## Fuera de alcance

- **No se replantea nada que no haya cambiado.** La frontera isomorfa, el registro de bloques, el
  modelo del documento por bandas, los milímetros, las referencias a token, los logos en base64 y el
  PDF solo por impresión del navegador se quedan **con la misma redacción**. Reescribir lo que sigue
  siendo verdad es la forma más fácil de perder por el camino la razón por la que se decidió.
- **Sin decisiones nuevas.** Este cambio no decide: recoge lo decidido en `invoice-issuance`,
  `credit-note-ui`, `modular-apps`, `company-scoping` y `catalog-source`. Si al escribirlo aparece una
  decisión que nadie tomó, se para y se propone aparte.
- **Sin generar un documento desde el otro.** Un paso de build para 148 líneas es más máquina que
  problema; la respuesta es que dejen de solaparse, no automatizar la copia.
- **Sin tocar los specs.** `openspec/specs/` ya describe el comportamiento y es la fuente de verdad de
  lo que el sistema hace; ARCHITECTURE describe cómo está construido.
