import type { IDocument } from '../render/document'
import { barsTemplate, BARS_NAVY_THEME } from './barsTemplate'
import { chevronTemplate, CHEVRON_AMBER_THEME, CHEVRON_SLATE_THEME } from './chevronTemplate'
import { mosaicTemplate, MOSAIC_GREEN_THEME, MOSAIC_RED_THEME } from './mosaicTemplate'

export const TEMPLATE_FAMILIES = ['chevron', 'mosaic', 'bars'] as const

export type ITemplateFamily = (typeof TEMPLATE_FAMILIES)[number]

export interface ITemplatePreset {
  id: string
  name: string
  description: string
  family: ITemplateFamily
  build: () => IDocument
}

export const TEMPLATE_PRESETS: ITemplatePreset[] = [
  {
    id: 'chevron-slate',
    name: 'Chevron pizarra',
    description: 'Rejilla con bordes, galones en dos esquinas y totales en cajas.',
    family: 'chevron',
    build: () => chevronTemplate(CHEVRON_SLATE_THEME),
  },
  {
    id: 'chevron-amber',
    name: 'Chevron ámbar',
    description: 'El mismo chevron en ámbar, para marcas de color cálido.',
    family: 'chevron',
    build: () => chevronTemplate(CHEVRON_AMBER_THEME),
  },
  {
    id: 'mosaic-red',
    name: 'Mosaico rojo',
    description: 'Cabecera de cuadros girados, tabla con reglas por fila y firma manuscrita.',
    family: 'mosaic',
    build: () => mosaicTemplate(MOSAIC_RED_THEME),
  },
  {
    id: 'mosaic-green',
    name: 'Mosaico verde',
    description: 'El mismo mosaico en verde, más sobrio para servicios.',
    family: 'mosaic',
    build: () => mosaicTemplate(MOSAIC_GREEN_THEME),
  },
  {
    id: 'bars-navy',
    name: 'Bandas naranja',
    description: 'Banda azul a sangre, filas alternas y barra de total al ancho de la página.',
    family: 'bars',
    build: () => barsTemplate(BARS_NAVY_THEME),
  },
]

export const TEMPLATE_PRESET_IDS: string[] = TEMPLATE_PRESETS.map((preset) => preset.id)

export function findTemplatePreset(id: string): ITemplatePreset | null {
  if (typeof id !== 'string' || id.length === 0) return null
  return TEMPLATE_PRESETS.find((preset) => preset.id === id) ?? null
}
