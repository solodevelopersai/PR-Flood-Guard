# Contributing

Thanks for helping improve PRFloodGuard. Issues and pull requests are welcome.

## Development setup

- Node.js 20+
- npm

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run build:action
```

## Pull requests

- Keep changes focused and explain user-visible behavior.
- Add or update tests, especially for scoring, thresholds, configuration, and edge cases.
- Keep heuristics transparent and avoid treating AI-style patterns as proof of authorship.
- Do not add automatic close/merge behavior or execute pull request code.
- If Action source or shared core changes, regenerate and include `action/dist/index.js`.
- Update relevant docs when config or Action behavior changes.

## Reporting issues

Include a minimal reproduction, expected behavior, actual behavior, and relevant logs with secrets removed. Please do not include private contributor data.
