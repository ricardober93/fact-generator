# @wabot-dev/template

An **empty** starter for building with the [`@wabot-dev/framework`](https://www.npmjs.com/package/@wabot-dev/framework).

It ships with just the runner — no mindsets, controllers, or channels — so there's nothing to
delete before you start. Add your own with the Wabot agent skills (`.claude` / `.codex` / `.agents`
`skills/`), or start from the full example instead (`npm create wabot@latest` → "Full example").

## Requirements

- Node.js **22** (see [.nvmrc](.nvmrc))
- A PostgreSQL database (optional — the framework also has an in-memory store for local development)
- Credentials for at least one AI provider (set in `.env`)

## Run

```bash
npm install
npm run dev
```

`src/_run_.ts` boots the framework with an empty config; it scans `src/` for your components. With
none yet, it starts idle — add a mindset + a chat or UI controller and they're picked up
automatically on the next run.

## Next steps

- Add a chat bot: see the `wabot-chat` and `wabot-mindset` skills.
- Add a web UI: see the `wabot-ui` and `wabot-design` skills.
- Talk to a `@cmd` chat controller from a second terminal (see the command-channel script in `package.json`).
