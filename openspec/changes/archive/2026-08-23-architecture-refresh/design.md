## Context

Dos archivos describen la arquitectura y son el mismo texto a dos longitudes: `ARCHITECTURE.md` y el
bloque `context:` de `openspec/config.yaml`. El segundo se inyecta en las instrucciones de cada
artefacto, así que cuando se queda atrás no envejece un documento: se entrega un briefing equivocado.

Ya pasó. `invoice-issuance` movió la línea de «presentacional» a «registro fiscal» en
`ARCHITECTURE.md` y `config.yaml` sigue diciendo que nada de dominio tributario entra en las specs,
con tres specs tributarias promovidas al lado.

## Goals / Non-Goals

**Goals:**

- Que el briefing que reciben los cambios futuros describa el sistema que existe.
- Que la duplicación entre los dos archivos baje a algo que se pueda mantener a mano.
- Que la estructura del documento vuelva a corresponderse con la forma del sistema.

**Non-Goals:**

- Tomar decisiones nuevas. Este cambio recoge, no decide.
- Reescribir lo que sigue siendo verdad.
- Generar un archivo desde el otro.

## Decisions

### 1. Los dos archivos dejan de decir lo mismo, y la duplicación que queda es de una línea

- **`ARCHITECTURE.md`** — la forma y el **porqué**. Fronteras, ejes de crecimiento, el módulo como
  aplicación, el modelo del documento, y cada decisión cerrada con el argumento que la sostiene.
- **`config.yaml`** — el **briefing operativo**: qué es el producto en tres líneas, el stack, las
  restricciones verificadas del framework, las reglas de seguridad, y las decisiones cerradas como
  **una línea cada una, sin argumento**, seguidas de «el porqué está en ARCHITECTURE.md».

No desaparece toda la duplicación y no conviene fingir que sí: las decisiones cerradas siguen
apareciendo en los dos sitios. Lo que cambia es la granularidad. Hoy se duplican **párrafos con
razonamiento**, que es lo que hace caro actualizarlos y por eso se dejan a medias; con una línea por
decisión, actualizar es cambiar una línea en cada archivo.

_Alternativa descartada_: generar el `context:` desde `ARCHITECTURE.md`. Un paso de build para 148
líneas es más máquina que problema, y el resultado sería un briefing escrito para otro lector.

_Alternativa descartada_: dejar `config.yaml` como un puntero a `ARCHITECTURE.md`. El bloque se inyecta
tal cual en instrucciones que se leen sin abrir el repositorio: tiene que sostenerse solo.

### 2. Cada archivo dice que el otro existe

Encima de las decisiones cerradas, en los dos: «esta lista está también en el otro archivo; si cambias
una, cambia las dos».

El fallo de esta sesión no fue de disciplina, fue de desconocimiento: la tarea decía «actualizar
ARCHITECTURE.md», eso se hizo, y nadie sabía que había una segunda copia. Un aviso en el sitio donde se
edita cuesta dos líneas y ataca la causa real.

### 3. «Decisiones cerradas» tenía el mismo problema que iba a tener `shared/`

Es una lista que crece sin criterio de entrada, y por eso mezcla decisiones de producto —el documento
es fiscal—, técnicas —bloqueo optimista por `rev`— y de integración —referencias opacas—, con tamaños
que van de una línea a un párrafo.

Misma solución que el kernel: una puerta. **Una decisión cerrada que necesita más de tres líneas para
explicarse deja de ser una viñeta y se convierte en sección.** La lista se queda con lo que de verdad
cabe en una línea.

### 4. La estructura resultante

```
  1. La única frontera                 sin tocar
  2. Los dos ejes de crecimiento       bloques (documento) + módulos (sistema)   ← §3 decía "uno"
  3. El módulo como aplicación         app.ts, interior privado, el kernel       ← nuevo
  4. El modelo del documento           sin tocar
  5. La frontera con otras apps        las cuatro reglas                         ← nuevo
  6. Fiscal y presentación             dónde está la línea y qué queda fuera     ← nuevo
  7. Lo que NO se construye            podado
  8. Restricciones del framework       sin tocar
  9. Decisiones cerradas               podado según la puerta de la decisión 3
```

Las secciones 2, 3, 5 y 6 no son contenido nuevo: son viñetas de §7 que se ganaron el sitio. El §3
actual —«el eje de crecimiento: el registro de bloques»— pasa a ser la mitad del nuevo §2, porque
seguía siendo verdad para el documento y dejó de serlo para el sistema.

### 5. Lo que sigue siendo verdad se copia con su redacción original

La frontera isomorfa, las bandas, los milímetros, las referencias a token, los logos en base64, el PDF
solo por impresión y las restricciones verificadas del framework se mueven **sin reescribirse**.

Reescribir lo que no ha cambiado es la forma más fácil de perder el motivo por el que se decidió, y
esos motivos —«esbuild mete express en el bundle y el build falla solo», «el JSONB se reescribe entero,
así que sin `rev` la última escritura gana en silencio»— son la parte cara del documento.

## Risks / Trade-offs

- **Volverán a divergir** → Probablemente alguna vez, pero de una línea y no de un párrafo, y con un
  aviso en el sitio donde se edita. No se promete resolverlo del todo sin generación, y la generación
  ya se descartó.
- **Reestructurar pierde historia de `git blame`** → Se hace en un commit propio, sin mezclar contenido
  nuevo, para que el movimiento se lea como movimiento.
- **Aparece una decisión que nadie tomó** al intentar redactar una sección → Se para y se propone
  aparte. Un documento de arquitectura no es sitio para decidir por omisión.
- **El briefing engorda** al añadir tres secciones → Al contrario: la parte que se inyecta es
  `config.yaml`, que **adelgaza** al quedarse con una línea por decisión. El que crece es el documento
  largo, que se lee cuando hace falta.

## Migration Plan

Va el último, después de `modular-apps`, `company-scoping` y `catalog-source`. Sin código y sin datos:
un commit para mover y otro para podar.

Se archiva con `openspec archive architecture-refresh --skip-specs --yes`, porque no tiene deltas.

## Open Questions

Ninguna.
