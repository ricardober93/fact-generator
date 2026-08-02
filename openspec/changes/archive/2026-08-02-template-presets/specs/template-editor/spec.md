## ADDED Requirements

### Requirement: El tema del documento se edita en un panel propio

El editor DEBE (MUST) ofrecer un panel que liste todos los tokens declarados en el tema del
documento y permita cambiar su valor, sin necesidad de seleccionar antes un bloque que los
referencie. Un token de color DEBE editarse con un selector de color; los demás, con campo de
texto.

Cambiar un token DEBE repintar el lienzo sin tocar ningún bloque, y DEBE entrar en el historial
como una edición más.

El panel edita valores, no la lista de tokens: NO DEBE (MUST NOT) añadir ni borrar tokens. El
conjunto de tokens de un documento lo fija el diseño del que nace, y borrar uno referenciado
dejaría el documento sin validar.

#### Scenario: El panel lista el tema entero

- **WHEN** se abre el editor de una plantilla creada desde `bars-navy`
- **THEN** el panel de tema muestra un control por cada token del tema, con su valor actual

#### Scenario: Cambiar un color repinta el documento

- **WHEN** se cambia el valor del token `accent` en el panel
- **THEN** el lienzo repinta con el color nuevo y ningún bloque cambia

#### Scenario: El cambio de tema se deshace

- **WHEN** se cambia un token y se deshace
- **THEN** el token vuelve a su valor anterior

#### Scenario: El panel no altera la lista de tokens

- **WHEN** se usa el panel de tema
- **THEN** no ofrece añadir ni borrar tokens, y el documento conserva exactamente los que tenía

### Requirement: El alto de cada banda se edita desde el editor

El editor DEBE (MUST) ofrecer un control para cambiar el alto en milímetros de la banda
seleccionada. El alto DEBE ser un número positivo; un valor no positivo o no numérico se rechaza
sin modificar el documento.

Al reducir el alto de una banda, los bloques que quedarían fuera DEBEN reencuadrarse dentro de
ella, con el mismo criterio que ya se aplica al mover un bloque.

#### Scenario: Cambiar el alto de una banda

- **WHEN** se fija en 90 el alto de la banda `header`
- **THEN** la banda mide 90 mm en el lienzo y el documento lo refleja

#### Scenario: Reducir el alto reencuadra lo que sobresale

- **WHEN** se reduce el alto de una banda por debajo del borde inferior de uno de sus bloques
- **THEN** ese bloque queda dentro de la banda

#### Scenario: Alto inválido

- **WHEN** se intenta fijar un alto de 0 o un valor no numérico
- **THEN** el documento no cambia

### Requirement: Los bloques decorativos no estorban a la edición

Un bloque PUEDE marcarse como decorativo. Un bloque decorativo DEBE (MUST) pintarse exactamente
igual que cualquier otro —en el lienzo, en el embed y al imprimir—, pero NO DEBE (MUST NOT)
seleccionarse al hacer clic sobre él en el lienzo, y la lista de capas DEBE agruparlos en una
única entrada plegable por banda en vez de una fila por bloque.

Desplegando esa entrada, o mediante la selección por área, un bloque decorativo DEBE poder
seleccionarse y editarse como cualquier otro. La marca es una ayuda de edición, no un bloqueo.

Un documento sin ninguna marca de decoración DEBE comportarse exactamente como hasta ahora.

#### Scenario: La decoración se agrupa en la lista de capas

- **WHEN** se selecciona la cabecera de una plantilla creada desde `mosaic-red`, con 66 cajas
  decorativas
- **THEN** la lista de capas muestra una sola entrada plegable para la decoración, y una fila por
  cada bloque no decorativo

#### Scenario: Un clic en el lienzo no selecciona decoración

- **WHEN** se hace clic sobre un bloque decorativo en el lienzo
- **THEN** la selección no cambia a ese bloque

#### Scenario: La decoración se puede editar cuando se busca

- **WHEN** se despliega la entrada de decoración y se elige uno de sus bloques
- **THEN** ese bloque queda seleccionado y su inspector permite editarlo

#### Scenario: La decoración se pinta igual

- **WHEN** se renderiza un documento con bloques decorativos
- **THEN** el marcado resultante es el mismo que si no estuvieran marcados

### Requirement: El editor aplica un diseño del catálogo al documento abierto

El editor DEBE (MUST) ofrecer aplicar un diseño del catálogo a la plantilla abierta, pidiendo
confirmación porque sustituye el documento entero, y registrando la sustitución en el historial
para que se pueda deshacer.

Tras aplicar un diseño, el documento resultante DEBE ser válido: es el que construye el diseño, sin
mezcla con el anterior.

#### Scenario: Aplicar un diseño desde el editor

- **WHEN** se elige un diseño del catálogo en el editor y se confirma
- **THEN** el documento del editor pasa a ser el de ese diseño y la validación lo acepta

#### Scenario: La sustitución es una edición más

- **WHEN** se aplica un diseño y se pulsa deshacer
- **THEN** vuelve el documento anterior completo
