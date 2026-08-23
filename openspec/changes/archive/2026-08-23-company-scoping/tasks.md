Dos entregas. Los grupos 1 a 4 son la primera y valen solos: empresa, rango con dueño y emisor
congelado, sin tocar la identidad. Los grupos 5 a 8 son la segunda.

## 1. La empresa

- [x] 1.1 `models/company/Company.ts`: entidad con `nit`, `name`, `address`, `taxRegime` y `logoId`
      opcional. Getters, sin lógica de emisión
- [x] 1.2 `models/company/CompanyRepository.ts`: `createCompany` que exige NIT y razón social;
      `current()` que devuelve la única empresa o `null`
- [x] 1.3 **Espera a la segunda entrega**: pertenencia y empresa activa necesitan que exista `User`,
      así que la comprobación se hace en el grupo 5 junto con la sesión
- [x] 1.4 Tests: se crea con sus datos; sin NIT o sin razón social no se crea; crearla deja al
      creador dentro y operando en ella

## 2. El rango tiene dueño

- [x] 2.1 `NumberRange` gana `owner` —opaco para la numeración—, y `createRange` lo exige
- [x] 2.2 La regla de no solapamiento pasa a ser por dueño + serie + prefijo
- [x] 2.3 `findUsable` y `findCovering` filtran por dueño
- [x] 2.4 Tests de aislamiento por dueño, uno por cada escenario nuevo del spec: un rango sin dueño no
      se crea; el mismo tramo con la misma serie y el mismo prefijo con otro dueño sí se crea; emitir
      para un dueño sin rangos se rechaza como si no hubiera ninguno y no mueve el puntero del rango
      ajeno; y un número dado que sólo cae en el rango de otro dueño se rechaza igual que un número
      fuera de todo rango. Los cuatro se comprobaron a la inversa: quitando el filtro por dueño de
      `findBySeries` caen los tres últimos, y quitando el guard de `assertInput` cae el primero
- [x] 2.5 **Descartado con motivo.** Un rango sin dueño simplemente deja de encontrarse. Adoptarlo
      automáticamente exigía o que la numeración supiera qué es una empresa —rompiendo la opacidad que
      acaba de costar un refactor— o una regla permisiva que con dos empresas filtraría consecutivos
      de una a otra, que en un registro fiscal es el peor fallo posible. La aplicación no se ha
      desplegado nunca: los únicos rangos sin dueño están en bases de desarrollo

## 3. El emisor en el documento

- [x] 3.1 `InvoiceRepository.checked`: escribir los caminos de emisor que declara la plantilla con los
      datos de la empresa, con el mismo `withPath` que usa el número
- [x] 3.2 `Invoice` gana `companyId` e `issuer` congelado; `applyIssue` lo estampa junto al número
- [x] 3.3 Emitir sin empresa se rechaza con su propio motivo tipado, como el rango ausente
- [x] 3.4 `invoiceForm.ts`: excluir los caminos de emisor de los campos editables, como el número
- [x] 3.5 Tests: el borrador adopta el emisor de la empresa al guardarse; cambiar la razón social
      alcanza a los borradores y **no** a los emitidos; el formulario no ofrece casilla de emisor

## 4. La empresa en la interfaz

- [x] 4.1 Pantalla de empresa —ver y editar—, con la misma forma que la de rangos: formulario normal,
      sin island
- [x] 4.2 Emitir sin empresa lo dice con el texto de `issueOutcome`, junto al de rango ausente
- [x] 4.3 Tests de UI: sin empresa la pantalla lo dice y ofrece crearla; guardarla cambia lo que
      pintan los borradores

## 5. Los usuarios y la empresa activa

- [x] 5.1 `models/user/User.ts` y su repositorio: correo único, hash con `Password`, rol y empresa
- [x] 5.2 Semilla del primer administrador desde `AUTH_EMAIL`/`AUTH_PASSWORD` cuando no hay ningún
      usuario; con usuarios, ignorarlas. Sin `JWT_SECRET` la aplicación sigue sin arrancar
- [x] 5.3 `AuthCredentials` comprueba contra el repositorio en vez de contra el entorno, conservando
      intacto el mensaje que no dice qué parte falló y el límite de intentos por origen
- [x] 5.4 La sesión lleva identificador, rol y **empresa activa**; un usuario dado de baja deja de
      entrar
- [x] 5.5 Acción de cambiar de empresa: comprueba la pertenencia y **vuelve a firmar la cookie**. La
      empresa activa viaja dentro del token, nunca en una cookie aparte ni en el cliente
- [x] 5.6 Selector de empresa en la cabecera, visible solo si el usuario pertenece a más de una, y
      con aviso antes de cambiar si hay un borrador sin guardar
- [x] 5.7 Tests: entra con lo suyo; correo repetido no se crea; la contraseña no se guarda en claro;
      el primer arranque siembra y el segundo no toca nada; el usuario de baja no entra; cambiar de
      empresa cambia lo que devuelve el listado; cambiar a una empresa ajena se rechaza y no toca la
      activa; con una sola empresa no aparece el selector

## 6. Los roles

- [x] 6.1 Middleware `RequireRole`, del mismo estilo que `RequireSession`, aplicado por ruta
- [x] 6.2 Repartir los tres roles según la tabla de la decisión 7: documentos para cajero,
      numeración, plantillas, assets, usuarios y empresa solo para administrador
- [x] 6.3 Quitarse el último rol de administrador —o darse de baja siendo el último— se rechaza
- [x] 6.4 Tests: el cajero emite y no crea rangos; lectura ve e imprime y no escribe; una acción
      reservada se rechaza **antes** de tocar el dominio; sin sesión responde como cualquier ruta
      protegida, sin revelar si el rol habría bastado

## 7. El alcance de la empresa

- [x] 7.1 Filtrar por **la empresa activa de la sesión** en el repositorio —facturas, plantillas,
      assets y rangos—, no en los controladores. Se escribe así desde el grupo 2, no al final: es el
      mismo coste y evita repasar cada consulta cuando aparezca la segunda empresa
- [x] 7.2 Pedir por identificador un documento de otra empresa responde como si no existiera
- [x] 7.3 Tests que **siembran dos empresas** aunque la aplicación solo permita crear una, para que el
      filtro tenga algo que filtrar

## 8. El autor y el cierre

- [x] 8.1 `applyIssue` estampa quién emite, con su nombre, y el documento lo muestra
- [x] 8.2 `versionOfInvoice`: añadir empresa y emisor congelado a lo que se hashea, para que cambiar
      la empresa no sirva una página vieja de un borrador
- [x] 8.3 Actualizar ARCHITECTURE.md: la identidad deja de venir del entorno y el emisor deja de ser
      texto libre
- [ ] 8.4 **Pendiente de manos humanas.** Recorrido a mano: crear empresa, crear usuarios de los tres roles, comprobar con cada uno
      qué puede y qué no, emitir con el cajero y ver su nombre en el documento, crear una segunda
      empresa y comprobar que al cambiar a ella no se ve ni un documento de la primera
- [x] 8.5 Puerta de calidad completa: `npm run tsc`, `npm run test:unit` y `npm run fmt:check`
