import { Outlet, type VNode } from '@wabot-dev/framework/ui'
import { WABOT_DESIGN_CSS } from '../../design/wabotDesignCss'
import { EDITOR_CSS } from './editorCss'

export function AppLayout(): VNode {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `${WABOT_DESIGN_CSS}\n${EDITOR_CSS}` }} />
      <Outlet />
    </>
  )
}
