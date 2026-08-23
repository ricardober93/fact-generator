Dos entregas. Los grupos 1 a 4 son la primera y valen solos: empresa, rango con dueño y emisor
congelado, sin tocar la identidad. Los grupos 5 a 8 son la segunda.

## 1. La empresa

- [ ] 1.1 `models/company/Company.ts`: entidad con `nit`, `name`, `address`, `taxRegime` y `logoId`
      opcional. Getters, sin lógica de emisión
- [ ] 1.2 `models/company/CompanyRepository.ts`: `createCompany` que exige NIT y razón social;
      `current()` que devuelve la única empresa o `null`
- [ ] 1.3 Crear una empresa añade esa empresa a quien la crea y la deja como su empresa activa, para
      que nadie pueda crear una empresa en la que después no puede entrar
- [ ] 1.4 Tests: se crea con sus datos; sin NIT o sin razón social no se crea; crearla deja al
      creador dentro y operando en ella

## 2. El rango tiene dueño

- [ ] 2.1 `NumberRange` gana `companyId`, y `createRange` lo exige
- [ ] 2.2 La regla de no solapamiento pasa a ser por empresa + tipo + prefijo
- [ ] 2.3 `findUsable` y `findCovering` filtran por empresa
- [ ] 2.4 Tests: sin empresa no se crea; el mismo tramo con el mismo prefijo en otra empresa sí vale;
      emitir no ve los rangos de otra empresa
- [ ] 2.5 Los rangos existentes no tienen empresa: se adoptan a la única que haya la primera vez que
      se leen, sin migración y sin paso manual. Caso a probar explícitamente

## 3. El emisor en el documento

- [ ] 3.1 `InvoiceRepository.checked`: escribir los caminos de emisor que declara la plantilla con los
      datos de la empresa, con el mismo `withPath` que usa el número
- [ ] 3.2 `Invoice` gana `companyId` e `issuer` congelado; `applyIssue` lo estampa junto al número
- [ ] 3.3 Emitir sin empresa se rechaza con su propio motivo tipado, como el rango ausente
- [ ] 3.4 `invoiceForm.ts`: excluir los caminos de emisor de los campos editables, como el número
- [ ] 3.5 Tests: el borrador adopta el emisor de la empresa al guardarse; cambiar la razón social
      alcanza a los borradores y **no** a los emitidos; el formulario no ofrece casilla de emisor

## 4. La empresa en la interfaz

- [ ] 4.1 Pantalla de empresa —ver y editar—, con la misma forma que la de rangos: formulario normal,
      sin island
- [ ] 4.2 Emitir sin empresa lo dice con el texto de `issueOutcome`, junto al de rango ausente
- [ ] 4.3 Tests de UI: sin empresa la pantalla lo dice y ofrece crearla; guardarla cambia lo que
      pintan los borradores

## 5. Los usuarios y la empresa activa

- [ ] 5.1 `models/user/User.ts` y su repositorio: correo único, hash con `Password`, rol y empresa
- [ ] 5.2 Semilla del primer administrador desde `AUTH_EMAIL`/`AUTH_PASSWORD` cuando no hay ningún
      usuario; con usuarios, ignorarlas. Sin `JWT_SECRET` la aplicación sigue sin arrancar
- [ ] 5.3 `AuthCredentials` comprueba contra el repositorio en vez de contra el entorno, conservando
      intacto el mensaje que no dice qué parte falló y el límite de intentos por origen
- [ ] 5.4 La sesión lleva identificador, rol y **empresa activa**; un usuario dado de baja deja de
      entrar
- [ ] 5.5 Acción de cambiar de empresa: comprueba la pertenencia y **vuelve a firmar la cookie**. La
      empresa activa viaja dentro del token, nunca en una cookie aparte ni en el cliente
- [ ] 5.6 Selector de empresa en la cabecera, visible solo si el usuario pertenece a más de una, y
      con aviso antes de cambiar si hay un borrador sin guardar
- [ ] 5.7 Tests: entra con lo suyo; correo repetido no se crea; la contraseña no se guarda en claro;
      el primer arranque siembra y el segundo no toca nada; el usuario de baja no entra; cambiar de
      empresa cambia lo que devuelve el listado; cambiar a una empresa ajena se rechaza y no toca la
      activa; con una sola empresa no aparece el selector

## 6. Los roles

- [ ] 6.1 Middleware `RequireRole`, del mismo estilo que `RequireSession`, aplicado por ruta
- [ ] 6.2 Repartir los tres roles según la tabla de la decisión 7: documentos para cajero,
      numeración, plantillas, assets, usuarios y empresa solo para administrador
- [ ] 6.3 Quitarse el último rol de administrador —o darse de baja siendo el último— se rechaza
- [ ] 6.4 Tests: el cajero emite y no crea rangos; lectura ve e imprime y no escribe; una acción
      reservada se rechaza **antes** de tocar el dominio; sin sesión responde como cualquier ruta
      protegida, sin revelar si el rol habría bastado

## 7. El alcance de la empresa

- [ ] 7.1 Filtrar por **la empresa activa de la sesión** en el repositorio —facturas, plantillas,
      assets y rangos—, no en los controladores. Se escribe así desde el grupo 2, no al final: es el
      mismo coste y evita repasar cada consulta cuando aparezca la segunda empresa
- [ ] 7.2 Pedir por identificador un documento de otra empresa responde como si no existiera
- [ ] 7.3 Tests que **siembran dos empresas** aunque la aplicación solo permita crear una, para que el
      filtro tenga algo que filtrar

## 8. El autor y el cierre

- [ ] 8.1 `applyIssue` estampa quién emite, con su nombre, y el documento lo muestra
- [ ] 8.2 `versionOfInvoice`: añadir empresa y emisor congelado a lo que se hashea, para que cambiar
      la empresa no sirva una página vieja de un borrador
- [ ] 8.3 Actualizar ARCHITECTURE.md: la identidad deja de venir del entorno y el emisor deja de ser
      texto libre
- [ ] 8.4 Recorrido a mano: crear empresa, crear usuarios de los tres roles, comprobar con cada uno
      qué puede y qué no, emitir con el cajero y ver su nombre en el documento, crear una segunda
      empresa y comprobar que al cambiar a ella no se ve ni un documento de la primera
- [ ] 8.5 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
