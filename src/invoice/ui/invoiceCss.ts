export const INVOICE_CSS = `
.wb-invoice-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.wb-invoice-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: rgb(var(--c-bg-raised));
}

.wb-invoice-toolbar select {
  flex: none;
  width: auto;
}

.wb-invoice-body {
  display: grid;
  grid-template-columns: 24rem 1fr;
  gap: var(--sp-4);
  padding: var(--sp-4);
  overflow: hidden;
  flex: 1;
  background: rgb(var(--c-bg-sunken));
}

.wb-invoice-form {
  min-width: 0;
  overflow-y: auto;
}

.wb-invoice-field label,
.wb-invoice-lines th {
  margin-bottom: var(--sp-1);
  font-size: var(--fs-xs);
  color: rgb(var(--c-fg-muted));
}

.wb-invoice-form input,
.wb-invoice-lines input {
  background: rgb(var(--c-bg-contrast) / 0.55);
  padding: var(--sp-1) var(--sp-2);
  font-size: var(--fs-sm);
}

.wb-required {
  color: rgb(var(--c-danger-fg));
}

.wb-invoice-stage {
  min-width: 0;
  overflow: auto;
  display: flex;
  justify-content: safe center;
  align-items: flex-start;
}

.wb-invoice-paper {
  flex: none;
  background: #ffffff;
}

.wb-invoice-missing {
  padding: var(--sp-4);
}

.wb-invoice-lines {
  width: 100%;
}

.wb-invoice-lines input {
  width: 100%;
  min-width: 4rem;
}

.wb-line-actions {
  display: flex;
  gap: var(--sp-1);
}

.wb-invoice-mismatch {
  font-size: var(--fs-xs);
}

.wb-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.wb-toolbar-form {
  display: contents;
}

.wb-correction-note {
  margin: 0;
  padding: var(--sp-2) var(--sp-4);
  background: rgb(var(--c-bg-raised));
}

.wb-invoice-fieldset {
  display: contents;
  border: 0;
  padding: 0;
  margin: 0;
}

.wb-print-blocked {
  margin: var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--radius-md);
  background: rgb(var(--c-bg-raised));
  border: 1px solid rgb(var(--c-warning, var(--c-border)));
}

.wb-print-blocked ul {
  margin: var(--sp-2) 0 0;
  padding-left: var(--sp-4);
}

@media print {
  .wb-invoice-toolbar,
  .wb-correction-note,
  .wb-invoice-form {
    display: none !important;
  }

  .wb-invoice-shell,
  .wb-invoice-body {
    display: block;
    height: auto;
    padding: 0;
    overflow: visible;
    background: #ffffff;
  }

  .wb-invoice-stage {
    display: block;
    overflow: visible;
  }

  .wb-invoice-paper {
    transform: none !important;
    zoom: 1 !important;
  }

  .wb-invoice-shell[data-print-blocked='true'] .wb-invoice-stage {
    display: none !important;
  }
}
`
