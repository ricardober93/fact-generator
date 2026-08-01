import { island, useEffect } from '@wabot-dev/framework/ui'

export const EMBED_HEIGHT_MESSAGE = 'wabot:embed:height'

function EmbedFrame(): null {
  useEffect(() => {
    if (window.parent === window) return
    const content = document.body
    const publishHeight = (): void => {
      window.parent.postMessage(
        { type: EMBED_HEIGHT_MESSAGE, height: content.scrollHeight },
        window.location.origin,
      )
    }
    const observer = new ResizeObserver(publishHeight)
    observer.observe(content)
    publishHeight()
    return () => observer.disconnect()
  }, [])
  return null
}

export default island(EmbedFrame)
