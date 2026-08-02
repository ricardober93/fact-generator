import { Outlet, type VNode } from '@wabot-dev/framework/ui'
import { WABOT_DESIGN_CSS } from '../../design/wabotDesignCss'
import { EDITOR_CSS } from './editorCss'
import { PRESET_GALLERY_CSS } from './PresetGallery'
import { THEME_PANEL_CSS } from './ThemePanel'

export function AppLayout(): VNode {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `${WABOT_DESIGN_CSS}\n${EDITOR_CSS}\n${PRESET_GALLERY_CSS}\n${THEME_PANEL_CSS}`,
        }}
      />
      <Outlet />
    </>
  )
}
