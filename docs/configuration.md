# Configuration

PRFloodGuard reads YAML from `.github/prfloodguard.yml`. The file is optional; the defaults below are applied when it is absent or when optional keys are omitted.

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
labels:
  critical: "prflood:critical"
  high: "prflood:high-risk"
  medium: "prflood:medium-risk"
  low: "prflood:low-risk"
comment:
  enabled: true
  style: professional
whitelist:
  users: []
  teams: []
features:
  reputation: false
  llm_analysis: false
```

## Thresholds

Scores range from 0 (most risk signals) to 100 (fewest). The matching risk is the first threshold that contains the score: `score <= critical` is critical, else `score <= high` is high, else `score <= medium` is medium, otherwise low. Thresholds must be integers from 0 to 100 and strictly increase.

## Actions

Each risk accepts `none`, `label`, `comment`, `label+comment`, or `quarantine`. Quarantine adds the risk label and comment and uses GitHub's `convertPullRequestToDraft` mutation. It does not close, merge, or otherwise discard the PR. It requires `pull-requests: write` and should only be enabled intentionally. The built-in critical action is label plus comment, not quarantine.

`comment.enabled: false` suppresses comments even if an action requests them. For clarity, the reported suggested action also reflects this by reducing `comment` to `none` or `label+comment` to `label`; `quarantine` remains quarantine.

## Labels and comments

Risk labels are created if needed and synchronized so only the current PRFloodGuard risk label remains. Label creation requires `issues: write`. Comment creation or update requires `issues: write`. Comments are updated on subsequent runs rather than duplicated.

Style choices: `professional` (default), `friendly`, and `minimal`.

## Allowlist

`whitelist.users` is case-insensitive. `whitelist.teams` accepts `organization/team-slug`; the Action checks membership through the GitHub API. For a whitelisted author, it creates a neutral check and skips PR labels, comments, and quarantine. If team membership cannot be checked due to API permissions, the Action logs a warning and continues normal analysis.

## Reserved features

`features.reputation` and `features.llm_analysis` are reserved for future integrations and default to `false`. Setting either to `true` logs a warning; it does not enable additional Pro behavior. Free account-age and repository-history signals are still part of the current scorer. The current release does not call external LLM APIs or enable any paid features.
