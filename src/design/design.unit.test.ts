import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { WABOT_DESIGN_CSS } from './wabotDesignCss'

const overrides = readFileSync(new URL('./wabot-design.overrides.css', import.meta.url), 'utf8')

test('the generated module carries the design system', () => {
  assert.equal(typeof WABOT_DESIGN_CSS, 'string')
  assert.ok(WABOT_DESIGN_CSS.length > 1000)
})

test('the semantic tokens the editor builds on are present', () => {
  for (const token of ['--c-bg', '--c-fg', '--c-action', '--c-bg-sunken', '--c-focus']) {
    assert.ok(WABOT_DESIGN_CSS.includes(token), `${token} is missing`)
  }
})

test('the overrides are appended after the system so an upgrade cannot clobber them', () => {
  assert.ok(overrides.length > 0)
  const firstOverrideRule = overrides.match(/--font-sans/)
  assert.ok(firstOverrideRule)
  assert.ok(WABOT_DESIGN_CSS.endsWith(overrides))
})

test('nothing is fetched from outside the project at runtime', () => {
  assert.doesNotMatch(WABOT_DESIGN_CSS, /url\(\s*['"]?https?:/i)
  assert.doesNotMatch(WABOT_DESIGN_CSS, /@import/i)
  assert.doesNotMatch(WABOT_DESIGN_CSS, /@font-face/i)
})

test('the font stack falls back to the system, since Geist is not served', () => {
  const declarations = [...WABOT_DESIGN_CSS.matchAll(/--font-sans:([^;]*);/g)].map((m) => m[1])
  assert.ok(declarations.length > 0)
  assert.match(declarations[declarations.length - 1], /-apple-system|system-ui/)
})
