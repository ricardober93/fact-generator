import assert from 'node:assert/strict'
import test from 'node:test'
import { container, type IConstructor } from '@wabot-dev/framework'
import { UiControllerMetadataStore } from '@wabot-dev/framework/ui'
import { EmbedController } from './EmbedController'
import { InvoiceController } from './InvoiceController'
import { TemplateController } from './TemplateController'

const CONTROLLERS: IConstructor<unknown>[] = [
  InvoiceController,
  TemplateController,
  EmbedController,
]

interface IUnversionedView {
  controller: string
  path: string
}

function unversionedViews(): IUnversionedView[] {
  const store = container.resolve(UiControllerMetadataStore)
  const found: IUnversionedView[] = []
  for (const controller of CONTROLLERS) {
    for (const view of store.getControllerViewsInfo(controller)) {
      const path = view.config?.path ?? ''
      const parameterized = path.split('/').some((segment) => segment.startsWith(':'))
      if (!view.controller.app || !parameterized || view.config?.swr?.version) continue
      found.push({ controller: controller.name, path })
    }
  }
  return found
}

test('every parameterized view of a boosted controller declares its version key', () => {
  assert.deepEqual(unversionedViews(), [])
})

test('the guard actually looks at views, so an empty result means checked and not skipped', () => {
  const store = container.resolve(UiControllerMetadataStore)
  const views = CONTROLLERS.flatMap((controller) => store.getControllerViewsInfo(controller))
  const parameterized = views.filter((view) =>
    (view.config?.path ?? '').split('/').some((segment) => segment.startsWith(':')),
  )

  assert.ok(views.length > 0)
  assert.ok(parameterized.length > 0)
})
