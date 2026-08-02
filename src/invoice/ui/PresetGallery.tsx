import type { VNode } from '@wabot-dev/framework/ui'
import { usableWidthMm, type IDocument } from '../render/document'
import { render } from '../render/render'
import { sampleDataFor } from '../render/sampleData'
import { TEMPLATE_PRESETS, type ITemplatePreset } from '../templates/presets'

const CARD_WIDTH_PX = 208
const CARD_HEIGHT_PX = 268
const PX_PER_MM = 96 / 25.4
const PREVIEW_ROWS = 4

function previewScale(doc: IDocument): number {
  const widthPx = usableWidthMm(doc.page) * PX_PER_MM
  return widthPx > 0 ? CARD_WIDTH_PX / widthPx : 1
}

function PresetPreview({ doc }: { doc: IDocument }): VNode {
  const sample = sampleDataFor(doc)
  const items = Array.from({ length: PREVIEW_ROWS }, () => sample.item)
  return (
    <div class="wb-preset-preview" aria-hidden="true">
      <div
        class="wb-preset-paper"
        style={{
          width: `${usableWidthMm(doc.page)}mm`,
          transform: `scale(${previewScale(doc)})`,
        }}
      >
        {render({ doc, data: sample.data, items, pageRules: false })}
      </div>
    </div>
  )
}

function PresetCard({ preset }: { preset: ITemplatePreset }): VNode {
  const inputId = `preset-${preset.id}`
  return (
    <label class="wb-preset-card" for={inputId}>
      <input id={inputId} type="radio" name="preset" value={preset.id} />
      <PresetPreview doc={preset.build()} />
      <span class="wb-preset-name">{preset.name}</span>
      <span class="wb-preset-description faint">{preset.description}</span>
    </label>
  )
}

function BlankCard(): VNode {
  return (
    <label class="wb-preset-card" for="preset-blank">
      <input id="preset-blank" type="radio" name="preset" value="" checked />
      <span class="wb-preset-preview wb-preset-blank" aria-hidden="true" />
      <span class="wb-preset-name">En blanco</span>
      <span class="wb-preset-description faint">Una página vacía para empezar de cero.</span>
    </label>
  )
}

export function PresetGallery(): VNode {
  return (
    <fieldset class="stack-sm">
      <legend>Diseño de partida</legend>
      <div class="wb-preset-gallery">
        <BlankCard />
        {TEMPLATE_PRESETS.map((preset) => (
          <PresetCard key={preset.id} preset={preset} />
        ))}
      </div>
    </fieldset>
  )
}

export const PRESET_GALLERY_CSS = `
.wb-preset-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${CARD_WIDTH_PX}px, 1fr));
  gap: var(--sp-3);
}

.wb-preset-card {
  display: grid;
  gap: var(--sp-1);
  justify-items: start;
  align-content: start;
  padding: var(--sp-2);
  border-radius: var(--r-md);
  background: rgb(var(--c-bg-sunken));
  cursor: pointer;
}

.wb-preset-card:focus-within {
  outline: 2px solid rgb(var(--c-focus));
  outline-offset: 2px;
}

.wb-preset-card:has(input:checked) {
  background: rgb(var(--c-bg-contrast) / 0.55);
  outline: 2px solid rgb(var(--c-action));
}

.wb-preset-preview {
  width: ${CARD_WIDTH_PX}px;
  height: ${CARD_HEIGHT_PX}px;
  overflow: hidden;
  background: #ffffff;
  border-radius: var(--r-sm);
}

.wb-preset-blank {
  display: block;
}

.wb-preset-paper {
  transform-origin: top left;
}

.wb-preset-name {
  font-weight: 600;
}

.wb-preset-description {
  font-size: var(--fs-xs);
  color: rgb(var(--c-fg-muted));
}
`
