import { findTemplatePreset } from '../templates/presets'
import type { IEditorStore } from './editorStore'

export function applyPresetToStore(
  store: IEditorStore,
  presetId: string,
  confirmReplace: (name: string) => boolean,
): boolean {
  if (!store) throw new Error('applyPresetToStore requires a store')
  if (typeof confirmReplace !== 'function') {
    throw new Error('applyPresetToStore requires a confirmation callback')
  }
  const preset = findTemplatePreset(presetId)
  if (!preset) return false
  if (!confirmReplace(preset.name)) return false
  store.commit(preset.build())
  store.clearSelection()
  return true
}
