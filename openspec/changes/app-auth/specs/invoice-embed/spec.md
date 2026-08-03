## ADDED Requirements

### Requirement: Acuñar un handoff exige sesión

La acción que prepara un handoff DEBE (MUST) exigir una sesión válida. Sin ella NO DEBE (MUST NOT)
crearse ningún handoff ni devolverse ningún token.

Hasta ahora la acción era anónima: cualquiera que conociera la ruta podía acuñar tokens sin
límite y llenar la base de datos con documentos ajenos.

Renderizar un handoff ya acuñado (`GET /embed/:token`) sigue **sin** exigir sesión: el token es
inadivinable y caduca, y esa vista está pensada para pintarse dentro del iframe de otro producto,
donde nuestra cookie puede no existir. La separación deja la creación en manos del producto
autenticado y la lectura en manos de quien tenga el token.

#### Scenario: Sin sesión no se acuña

- **WHEN** se envía la acción de preparar un handoff sin cookie de sesión
- **THEN** no se devuelve token y no queda ningún handoff nuevo guardado

#### Scenario: Con sesión se acuña igual que antes

- **WHEN** se envía la acción de preparar un handoff con una cookie de sesión válida
- **THEN** se devuelve el token y el handoff queda guardado

#### Scenario: Renderizar por token sigue siendo público

- **WHEN** se pide `GET /embed/:token` con un token vigente y sin cookie de sesión
- **THEN** responde 200 con la factura pintada
