import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://design.wabot.dev/assets/colors_and_type.css'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const designDir = join(root, 'src', 'design')
const systemPath = join(designDir, 'wabot-design.css')
const overridesPath = join(designDir, 'wabot-design.overrides.css')
const modulePath = join(designDir, 'wabotDesignCss.ts')

function readOrEmpty(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function assertNoExternalUrls(css, label) {
  const external = css.match(/url\(\s*['"]?https?:/gi)
  if (external) throw new Error(`${label} references an external url: ${external.join(', ')}`)
  const imports = css.match(/@import\s+(url\()?\s*['"]https?:/gi)
  if (imports) throw new Error(`${label} has an external @import`)
}

function dropWebFontFaces(css) {
  return css.replace(/@font-face\s*\{[^}]*\}\s*/g, '')
}

async function main() {
  mkdirSync(designDir, { recursive: true })

  const response = await fetch(SOURCE)
  if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`)
  const downloaded = dropWebFontFaces(await response.text())
  writeFileSync(systemPath, downloaded)

  const overrides = readOrEmpty(overridesPath)
  assertNoExternalUrls(downloaded, 'wabot-design.css')
  assertNoExternalUrls(overrides, 'wabot-design.overrides.css')

  const css = `@layer wabot-design {\n${downloaded}\n}\n${overrides}`
  writeFileSync(modulePath, `export const WABOT_DESIGN_CSS = ${JSON.stringify(css)}\n`)

  console.log(
    `design synced: ${downloaded.length} B system + ${overrides.length} B overrides -> ${modulePath}`,
  )
}

await main()
