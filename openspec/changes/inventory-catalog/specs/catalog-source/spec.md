## MODIFIED Requirements

### Requirement: Un origen puede venir de fuera o de dentro, y sin ninguno la aplicación está entera

Un origen DEBE (MUST) ser uno de dos: uno externo, declarado con una variable de entorno que contenga
su URL base, o uno local servido por este mismo proceso. Con la variable puesta manda el externo; sin
ella, el local, si existe. NO DEBE (MUST NOT) haber dos orígenes a la vez, ni mezclarse sus
resultados.

Que no haya dos no es una simplificación: dos orígenes pueden devolver la misma `ref` para cosas
distintas, y como la referencia es opaca nadie puede desambiguarlas sin partirla, que es justo lo que
la opacidad prohíbe. Una configuración explícita gana a un origen implícito, de modo que quien pone
la variable obtiene lo que pidió.

Sin ninguno de los dos NO DEBE (MUST NOT) haber selector, ni llamadas, ni avisos de error: escribir
las líneas a mano es el camino normal, no un modo degradado.

Es lo que hace verdad que cada app pueda vivir sola: la aplicación arranca y funciona entera con
todas las demás ausentes.

#### Scenario: Sin origen configurado no cambia nada

- **WHEN** no hay variable de origen ni catálogo local, y se abre el formulario de una factura
- **THEN** las líneas se escriben a mano igual que antes y no se ofrece ningún selector

#### Scenario: Con origen configurado aparece el selector

- **WHEN** hay una variable de origen y se abre el formulario
- **THEN** las líneas ofrecen elegir del catálogo

#### Scenario: Sin variable, el catálogo local sirve el selector

- **WHEN** no hay variable de origen pero sí hay catálogo local, y se abre el formulario
- **THEN** las líneas ofrecen elegir del catálogo, y lo que se ofrece sale del catálogo local

#### Scenario: La variable gana al catálogo local

- **WHEN** hay variable de origen y además hay catálogo local
- **THEN** se consulta sólo el externo, y ningún resultado sale del local

## RENAMED Requirements

- FROM: `### Requirement: El origen es configuración, y sin él la aplicación está entera`
- TO: `### Requirement: Un origen puede venir de fuera o de dentro, y sin ninguno la aplicación está entera`
