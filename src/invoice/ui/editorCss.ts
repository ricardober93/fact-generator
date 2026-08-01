export const EDITOR_CSS = `.wb-shell {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  background: rgb(var(--c-bg));
}

.wb-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgb(var(--c-bg-raised));
}

.wb-toolbar-gap {
  flex: 1;
}

.wb-body {
  display: grid;
  grid-template-columns: 13rem 1fr 17rem;
  gap: var(--sp-4);
  padding: var(--sp-4);
  overflow: hidden;
  background: rgb(var(--c-bg-sunken));
}

.wb-panel {
  min-width: 0;
  overflow-y: auto;
}

.wb-stage {
  min-width: 0;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.wb-paper {
  position: relative;
  background: #ffffff;
  flex: none;
  touch-action: none;
  user-select: none;
}

.wb-geometry {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-2);
}

.wb-palette {
  display: grid;
  gap: var(--sp-1);
}

.wb-fragment {
  display: flex;
  gap: var(--sp-1);
  align-items: center;
}

.wb-fragment-field {
  flex: 1;
  min-width: 0;
}

.wb-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-1);
  border-radius: var(--r-md);
  color: rgb(var(--c-fg-muted));
  background: rgb(var(--c-bg-contrast) / 0.55);
}

.wb-icon-button svg {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 60rem) {
  .wb-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    overflow-y: auto;
  }

  .wb-shell {
    height: auto;
    min-height: 100vh;
  }

  .wb-panel {
    overflow-y: visible;
  }
}
`
