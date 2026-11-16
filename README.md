# PRFloodGuard

**Guard your repository from the PR flood.**

[![CI](https://github.com/solodevelopersai/pr-flood-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/solodevelopersai/pr-flood-guard/actions/workflows/ci.yml)
[![License: PolyForm Shield](https://img.shields.io/badge/License-PolyForm%20Shield-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-339933.svg)](https://nodejs.org/)

PRFloodGuard is a source-available GitHub Action that transparently scores pull requests using fast, configurable heuristics. It can add a risk label, leave a constructive explanation, create a GitHub Check, and—only when you opt in—convert a high-risk PR to a draft. It never closes PRs.

> **Important:** Scores are signals for maintainers, not proof of AI authorship or contributor intent. Review the reasons and make the final decision.

## Features

- No model, API key, or external service required.
- Quality score from 0 to 100, risk levels from low to critical, and rule-by-rule explanations.
- Checks title, description, linked issues, commits, change size, tests, author age and public PR history, AI-style wording, branch names, and documentation updates.
- Optional labels, professional comments, GitHub Checks, and draft conversion for explicitly configured quarantine.
- YAML configuration with Zod validation, user/team allowlists, and actionable error messages.
- TypeScript core is reusable independently of GitHub Actions.

## Quick start

Add `.github/workflows/prfloodguard.yml`:

```yaml
name: PRFloodGuard
on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: write
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: solodevelopersai/pr-flood-guard/action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

`pull_request_target` lets the Action read and write PR metadata without checking out or executing contributor code. PRFloodGuard never checks out PR code. Keep the token permissions limited to those shown above. If you prefer `pull_request`, note that write permissions are restricted for fork PRs.

Add `.github/prfloodguard.yml` to customize behavior (optional; sensible defaults are built in):

```yaml
version: 1
thresholds:
  critical: 25
  high: 40
  medium: 65
actions:
  critical: "label+comment"
  high: "label+comment"
  medium: "label"
  low: "none"
```

The Action creates a GitHub Check for every analyzed PR. Risk actions are configured separately: `none`, `label`, `comment`, `label+comment`, or `quarantine`. Quarantine adds the critical label/comment and converts the PR to draft; it does not close or merge it. Draft conversion requires the `pull-requests: write` permission and is off unless configured.

## Test your setup

Open a test PR titled `Update` with an empty description. Expect a `prflood:` risk label and a comment explaining the score. Close the test PR afterwards without merging.

## Example result

```text
PRFloodGuard: High risk · Score 40/100

Signals:
- generic-title (-20)
- weak-description (-12)
- no-linked-issue (-4)
- weak-commit-messages (-12)
- suspicious-diff-size (-12)
```

Scores are heuristic signals, and no PR is closed automatically.

## Configuration

See [Configuration](docs/configuration.md) for all settings, defaults, threshold semantics, and team allowlist permissions. Ready-to-copy examples are in [examples/basic.yml](examples/basic.yml) and [examples/advanced.yml](examples/advanced.yml). The checked-in default is [config/default.yml](config/default.yml).

| Setting           | Purpose                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `thresholds`      | Inclusive score ceilings for critical, high, and medium risk; higher scores are low risk.         |
| `actions`         | Per-risk behavior: `none`, `label`, `comment`, `label+comment`, or `quarantine`.                  |
| `labels`          | Label names per risk. Labels are created if missing; stale PRFloodGuard risk labels are removed.  |
| `comment`         | Enable a transparent comment and choose `professional`, `friendly`, or `minimal` style.           |
| `whitelist.users` | GitHub login names that bypass scoring actions (a neutral check is still recorded).               |
| `whitelist.teams` | Experimental: `org/team-slug` entries; may require extra token permissions.                       |
| `features`        | Reserved opt-in flags for future Pro features; no paid or LLM feature is enabled by this release. |

## If a PR is labeled wrongly

Add trusted contributors to `whitelist.users` or adjust the risk thresholds in your configuration. Scores are signals only; review the rule explanations before deciding.

If labels, comments, or draft conversion are enabled, grant the corresponding permissions in the workflow. Experimental team membership checks may require `read:org`; if the token cannot check a configured team, the Action logs a warning and continues with analysis.

## Scoring and safety

The score starts at 100. Triggered rules subtract their documented impact, and the final value is clamped to 0–100. A higher score means fewer risk signals. A missing optional GitHub signal is not treated as suspicious. See [Rules](docs/rules.md) for each heuristic and its limitations.

Default actions are non-destructive: critical/high risk is labeled and commented, medium risk is labeled, and low risk has no PR side effect. A GitHub Check is always created. Set `actions.critical: quarantine` only if you explicitly want critical PRs converted to draft.

## Development

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run build:action
```

The Action uses the committed, bundled `action/dist/index.js`, so users do not need a separate build step. After changing Action or core source, run `npm run build:action` and commit the regenerated bundle.

## Roadmap

The core in this repository is source-available and free to use. LLM analysis, richer contributor reputation, hosted analytics, organization policies, and notifications are possible future integrations; they are not required or silently enabled by the MVP.

## Contributing

Bug reports and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md). Please include tests for changes to scoring or configuration.

## License

Licensed under the PolyForm Shield License 1.0.0. See [LICENSE](LICENSE). You may use PRFloodGuard freely in your own repositories, but you may not use it to provide a competing product or service.
