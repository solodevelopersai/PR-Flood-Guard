# Architecture

```text
GitHub pull_request[_target] event
       |
       v
Action (GitHub API only; no checkout of PR content)
  |- fetch PR metadata, commits, files, account and repo history
  |- load + validate repository YAML config (Zod)
  |- scorePullRequest(context, config)
  |- create neutral GitHub Check
  |- apply configured label/comment/draft conversion
       |
       v
Pure TypeScript core: typed context -> deterministic rules -> score/risk/action
```

`src/core` has no GitHub runtime dependency except the boundaries in `src/github`. Detection rules are independent functions; the scorer combines them and applies thresholds. `src/config` parses YAML and validates the complete normalized config. `action/src/main.ts` is the integration layer. `npm run build:action` bundles it and all runtime dependencies into `action/dist/index.js`, which is checked into source so GitHub Actions can execute it directly.

Contributor-controlled title, body, branch, and diff text are treated as data only. The workflow does not check out or execute PR code. Actions stay human-in-the-loop: a check is neutral, PRs are never auto-closed, and draft conversion is opt-in.
