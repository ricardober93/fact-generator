Va el último: después de `modular-apps`, `company-scoping` y `catalog-source`. Un commit para mover y
otro para podar, sin mezclarlos, para que el movimiento se lea como movimiento.

## 1. Reconciliar lo que ya no es verdad

- [ ] 1.1 Recorrer `openspec/specs/` entero y anotar cada afirmación de `ARCHITECTURE.md` y de
      `config.yaml` que lo contradiga. Empezar por las cuatro conocidas: documento presentacional, sin
      multi-tenant, sin `shared/`, y «una feature nueva es una carpeta hermana» —cierto sobre el papel
      y nunca practicado—
- [ ] 1.2 Si alguna contradicción no corresponde a ninguna decisión tomada en un cambio archivado,
      **parar y proponerla aparte**. Un documento de arquitectura no decide por omisión

## 2. Reestructurar ARCHITECTURE.md

- [ ] 2.1 Mover, sin reescribir una palabra, lo que sigue siendo verdad: la frontera isomorfa, el
      modelo del documento, las restricciones verificadas del framework y las reglas de seguridad
- [ ] 2.2 §2 «Los dos ejes de crecimiento»: el registro de bloques crece el documento y los módulos
      crecen el sistema. El §3 actual es la primera mitad
- [ ] 2.3 §3 «El módulo como aplicación»: `app.ts` como superficie, el interior privado, el kernel y su
      puerta. Sale de `modular-apps`
- [ ] 2.4 §5 «La frontera con otras apps»: las cuatro reglas, y que rigen dentro y fuera del proceso.
      Sale de `catalog-source` y `modular-apps`
- [ ] 2.5 §6 «Fiscal y presentación»: dónde está la línea, qué entró y qué sigue fuera. Sale de
      `invoice-issuance`, y ya está escrito ahí: se traslada
- [ ] 2.6 Podar «Lo que NO se construye» y «Decisiones cerradas» aplicando la puerta: lo que necesita
      más de tres líneas es sección, no viñeta

## 3. Adelgazar el briefing

- [ ] 3.1 `config.yaml`: dejar producto en tres líneas, stack, restricciones verificadas del framework,
      reglas de seguridad y las decisiones cerradas **a una línea cada una, sin argumento**
- [ ] 3.2 Cerrar el bloque con «el porqué de cada decisión está en ARCHITECTURE.md»
- [ ] 3.3 Comprobar que el briefing se sostiene solo: leerlo como si no se tuviera el repositorio
      delante y ver si alcanza para escribir una propuesta sin decir una falsedad

## 4. Que no vuelva a pasar

- [ ] 4.1 Aviso encima de la lista de decisiones cerradas, **en los dos archivos**: la lista está
      duplicada, si cambias una cambia las dos
- [ ] 4.2 `ARCHITECTURE.md`, arriba del todo: existen dos archivos y para qué sirve cada uno
- [ ] 4.3 Revisar que las plantillas de tarea de cambios futuros digan «actualizar ARCHITECTURE.md **y
      config.yaml**», que es la redacción que faltó en la tarea 9.3 de `invoice-issuance`

## 5. Cierre

- [ ] 5.1 Releer `openspec instructions proposal --change <cualquiera>` y comprobar que el
      `<project_context>` inyectado ya no afirma nada falso. Es la única comprobación que importa:
      es lo que va a leer el siguiente cambio
- [ ] 5.2 `npm run fmt:check` en verde —los dos archivos pasan por prettier—
- [ ] 5.3 Archivar con `openspec archive architecture-refresh --skip-specs --yes`, porque el cambio no
      tiene deltas
