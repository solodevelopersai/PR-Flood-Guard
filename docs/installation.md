# Installation

## GitHub Action

Add a workflow such as `.github/workflows/prfloodguard.yml`:

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

The Action reads PR metadata from GitHub APIs and never checks out or executes contributor code. `pull_request_target` is used so fork PRs can receive configured feedback; do not add untrusted code checkout or execution to this workflow. Grant only the permissions you use. `quarantine` requires `pull-requests: write`.

The action always creates a neutral GitHub Check, which requires `checks: write`. PRFloodGuard also reconciles its own risk labels and report comment on each run, so `issues: write` is required even if the current score needs no PR-facing action. Draft conversion additionally requires `pull-requests: write`. For team allowlists, the token must have organization read access (`read:org`). If organization policy does not permit that, use user allowlists instead.

## Config file

Create `.github/prfloodguard.yml` in the base branch. The Action uses built-in defaults if the file is absent. Invalid YAML or configuration stops the Action with a clear error; other API permission or network errors are also reported rather than silently ignored.

## Pinning

For production, pin the Action to a full commit SHA and update that SHA deliberately. The `@v1` example is convenient but floats to compatible releases.
