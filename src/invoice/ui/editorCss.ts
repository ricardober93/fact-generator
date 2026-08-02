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
  justify-content: safe center;
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

.wb-zoom {
  flex: none;
}

.wb-selection,
.wb-marquee,
.wb-guide,
.wb-readout {
  position: absolute;
  pointer-events: none;
}

.wb-selection {
  outline: 1px solid rgb(var(--c-focus));
}

.wb-marquee {
  outline: 1px dashed rgb(var(--c-focus));
  background: rgb(var(--c-focus) / 0.08);
}

.wb-guide {
  background: rgb(var(--c-focus));
}

.wb-readout {
  top: -1.6rem;
  left: 0;
  padding: 0 var(--sp-1);
  border-radius: var(--r-sm);
  background: rgb(var(--c-focus));
  color: rgb(var(--c-bg));
  font-size: var(--fs-xs);
  white-space: nowrap;
}

.wb-handle {
  position: absolute;
  background: rgb(var(--c-focus));
  border-radius: var(--r-sm);
  pointer-events: auto;
  cursor: pointer;
}

.wb-ghost {
  position: fixed;
  z-index: 10;
  transform: translate(0.5rem, 0.5rem);
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-md);
  background: rgb(var(--c-fg));
  color: rgb(var(--c-bg));
  font-size: var(--fs-xs);
  pointer-events: none;
}

.wb-bands {
  display: grid;
  gap: var(--sp-1);
}

.wb-layers,
.wb-cells {
  display: grid;
  gap: var(--sp-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.wb-layer {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--sp-1);
  border-radius: var(--r-md);
}

.wb-layer[data-selected='true'] {
  background: rgb(var(--c-bg-contrast) / 0.55);
}

.wb-layer-name {
  display: grid;
  justify-items: start;
  min-width: 0;
  text-align: left;
}

.wb-layer-kind {
  font-weight: 600;
}

.wb-layer-name span {
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.wb-cell {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-1);
  align-items: center;
  padding: var(--sp-2);
  border-radius: var(--r-md);
  background: rgb(var(--c-bg-contrast) / 0.4);
}

.wb-cell > input,
.wb-cell > select {
  min-width: 0;
}

.wb-cell > [data-cell-label],
.wb-cell > [data-cell-path] {
  grid-column: 1 / -1;
}

.wb-cell-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-1);
}

.wb-align,
.wb-zoom-controls {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
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
