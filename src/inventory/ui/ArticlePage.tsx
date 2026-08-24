import type { VNode } from '@wabot-dev/framework/ui'
import { SignOutButton } from '../../auth/ui/SignOutButton'
import type { Article } from '../models/Article'

function money(value: number): string {
  return value.toFixed(2)
}

function ArticleRow({ article, canWrite }: { article: Article; canWrite: boolean }): VNode {
  return (
    <tr data-article={article.id} data-stock={String(article.stock)}>
      <td class="mono">{article.code}</td>
      <td>{article.name}</td>
      <td class="mono">{money(article.unitPrice)}</td>
      <td class="mono">{article.taxRate}%</td>
      <td class="mono">{article.stock}</td>
      <td>
        {canWrite ? (
          <form class="row" method="post" action="/articles/_action/adjust">
            <input type="hidden" name="id" value={article.id} />
            <input
              name="delta"
              type="number"
              step="1"
              required
              aria-label={`Ajuste de ${article.name}`}
            />
            <input
              name="reason"
              type="text"
              required
              placeholder="Motivo"
              aria-label={`Motivo del ajuste de ${article.name}`}
            />
            <button type="submit" class="btn btn-sm">
              Ajustar
            </button>
          </form>
        ) : (
          <span class="muted">—</span>
        )}
      </td>
    </tr>
  )
}

export function ArticlePage({
  articles,
  canWrite,
}: {
  articles: Article[]
  canWrite: boolean
}): VNode {
  return (
    <main class="container stack-lg">
      <div class="row">
        <h1>Catálogo</h1>
        <span class="wb-toolbar-gap" />
        <a class="btn btn-ghost btn-sm" href="/invoices">
          Facturas
        </a>
        <SignOutButton />
      </div>

      {articles.length === 0 ? (
        <p class="muted">
          Todavía no hay artículos. Sin ellos, las líneas de una factura se escriben a mano.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Impuesto</th>
              <th>Existencias</th>
              <th>Ajustar</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <ArticleRow key={article.id} article={article} canWrite={canWrite} />
            ))}
          </tbody>
        </table>
      )}

      {canWrite ? (
        <form class="card stack" method="post" action="/articles/_action/create">
          <h2>Nuevo artículo</h2>
          <div class="stack-sm">
            <label for="article-code">Código</label>
            <input id="article-code" name="code" type="text" autocomplete="off" required />
          </div>
          <div class="stack-sm">
            <label for="article-name">Nombre</label>
            <input id="article-name" name="name" type="text" autocomplete="off" required />
          </div>
          <div class="stack-sm">
            <label for="article-unitPrice">Precio unitario</label>
            <input
              id="article-unitPrice"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div class="stack-sm">
            <label for="article-taxRate">Impuesto (%)</label>
            <input id="article-taxRate" name="taxRate" type="number" min="0" step="0.01" required />
          </div>
          <button type="submit" class="btn">
            Crear artículo
          </button>
        </form>
      ) : null}
    </main>
  )
}
