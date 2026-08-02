import { Outlet, type VNode } from '@wabot-dev/framework/ui'
import { WABOT_DESIGN_CSS } from '../../design/wabotDesignCss'
import { EDITOR_CSS } from './editorCss'
import { INVOICE_CSS } from './invoiceCss'
import { PRESET_GALLERY_CSS } from './PresetGallery'
import { THEME_PANEL_CSS } from './ThemePanel'

export function AppLayout(): VNode {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: [
            WABOT_DESIGN_CSS,
            EDITOR_CSS,
            PRESET_GALLERY_CSS,
            THEME_PANEL_CSS,
            INVOICE_CSS,
          ].join('\n'),
        }}
      />
      <Outlet />
    </>
  )
}
