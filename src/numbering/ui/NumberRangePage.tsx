import type { VNode } from '@wabot-dev/framework/ui'
import { SignOutButton } from '../../auth/ui/SignOutButton'
import type { NumberRange } from '../models/NumberRange'

const SERIES_LABELS: Record<string, string> = {
  factura: 'Factura',
  notaCredito: 'Nota de crédito',
}

function day(at: number): string {
  return new Date(at).toISOString().slice(0, 10)
}

function RangeRow({ range }: { range: NumberRange }): VNode {
  return (
    <tr data-range={range.id} data-exhausted={range.exhausted ? 'true' : 'false'}>
      <td>{SERIES_LABELS[range.series] ?? range.series}</td>
      <td class="mono">{range.prefix || '—'}</td>
      <td class="mono">
        {range.from} – {range.to}
      </td>
      <td class="mono">{range.exhausted ? 'agotado' : range.next}</td>
      <td>
        {day(range.validFrom)} – {day(range.validTo)}
      </td>
    </tr>
  )
}

export function NumberRangePage({ ranges }: { ranges: NumberRange[] }): VNode {
  return (
    <main class="container stack-lg">
      <div class="row">
        <h1>Numeración</h1>
        <span class="wb-toolbar-gap" />
        <a class="btn btn-ghost btn-sm" href="/invoices">
          Facturas
        </a>
        <SignOutButton />
      </div>

      {ranges.length === 0 ? (
        <p class="muted">Todavía no hay rangos. Sin uno no se puede emitir ningún documento.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Prefijo</th>
              <th>Tramo</th>
              <th>Siguiente</th>
              <th>Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((range) => (
              <RangeRow key={range.id} range={range} />
            ))}
          </tbody>
        </table>
      )}

      <form class="card stack" method="post" action="/ranges/_action/create">
        <h2>Nuevo rango</h2>
        <div class="stack-sm">
          <label for="range-series">Serie</label>
          <select id="range-series" name="series" required>
            <option value="factura">Factura</option>
            <option value="notaCredito">Nota de crédito</option>
          </select>
        </div>
        <div class="stack-sm">
          <label for="range-prefix">Prefijo</label>
          <input id="range-prefix" name="prefix" type="text" autocomplete="off" />
        </div>
        <div class="stack-sm">
          <label for="range-from">Desde</label>
          <input id="range-from" name="from" type="number" min="1" step="1" required />
        </div>
        <div class="stack-sm">
          <label for="range-to">Hasta</label>
          <input id="range-to" name="to" type="number" min="1" step="1" required />
        </div>
        <div class="stack-sm">
          <label for="range-validFrom">Vigente desde</label>
          <input id="range-validFrom" name="validFrom" type="date" required />
        </div>
        <div class="stack-sm">
          <label for="range-validTo">Vigente hasta</label>
          <input id="range-validTo" name="validTo" type="date" required />
        </div>
        <button type="submit" class="btn">
          Crear rango
        </button>
      </form>
    </main>
  )
}
