import type { VNode } from '@wabot-dev/framework/ui'
import { setThemeToken } from './documentEdits'
import type { IEditorStore } from './editorStore'
import { hexValueOf, looksLikeColor } from './themeValues'

function TokenRow({
  store,
  token,
  value,
}: {
  store: IEditorStore
  token: string
  value: string
}): VNode {
  const fieldId = `theme-${token}`
  const swatch = looksLikeColor(value) ? hexValueOf(value) : null

  function change(next: string): void {
    store.commit(setThemeToken(store.doc.value, token, next))
  }

  return (
    <div class="wb-theme-row">
      <label for={fieldId}>{token}</label>
      <div class="wb-theme-controls">
        {swatch ? (
          <input
            type="color"
            class="wb-theme-swatch"
            aria-label={`Color de ${token}`}
            data-theme-swatch={token}
            value={swatch}
            onInput={(event) => change((event.currentTarget as HTMLInputElement).value)}
          />
        ) : null}
        <input
          id={fieldId}
          type="text"
          data-theme-token={token}
          value={value}
          onInput={(event) => change((event.currentTarget as HTMLInputElement).value)}
        />
      </div>
    </div>
  )
}

export function ThemePanel({ store }: { store: IEditorStore }): VNode {
  const theme = store.doc.value.theme
  return (
    <fieldset class="stack-sm" data-theme-panel="true">
      <legend>Tema</legend>
      {Object.entries(theme).map(([token, value]) => (
        <TokenRow key={token} store={store} token={token} value={String(value)} />
      ))}
    </fieldset>
  )
}

export const THEME_PANEL_CSS = `
.wb-preset-picker {
  flex: none;
  width: auto;
}

.wb-theme-row {
  display: grid;
  gap: var(--sp-1);
}

.wb-theme-controls {
  display: flex;
  gap: var(--sp-1);
  align-items: center;
}

.wb-theme-controls input[type='text'] {
  flex: 1;
  min-width: 0;
}

.wb-theme-swatch {
  flex: none;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: var(--r-sm);
}
`
