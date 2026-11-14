# Detection rules

The detector starts at 100 and subtracts each triggered rule's impact, clamping the total between 0 and 100. Higher scores indicate fewer signals. Rule outputs appear in the GitHub Check and, when enabled, the PR comment. The rules are deterministic heuristics; no rule proves AI usage, low intent, or misconduct.

| Signal                 | Impact | Trigger                                                                                                      |
| ---------------------- | -----: | ------------------------------------------------------------------------------------------------------------ |
| Generic title          |     20 | Common generic titles such as `Update`, `Fix`, or `Changes`.                                                 |
| Very short title       |      8 | Title shorter than 10 characters, unless already classified generic.                                         |
| Weak description       |     12 | Fewer than 20 meaningful characters after stripping HTML comments.                                           |
| Short description      |      6 | 20–59 meaningful characters.                                                                                 |
| No issue reference     |      4 | No linked issue event or issue reference in the description. Unknown linked-issue API data is not penalized. |
| Generic commits        |     12 | At least half the commit subjects are generic (only evaluated when commits exist).                           |
| Suspicious diff size   |     12 | At most one changed line or more than 5,000 changed lines.                                                   |
| Many changed files     |      8 | More than 50 files.                                                                                          |
| No tests changed       |      8 | A recognized production-code file changed without a recognized test file.                                    |
| New account            |     10 | GitHub account is less than 30 days old.                                                                     |
| Low sampled merge rate |      8 | At least three earlier PRs among the latest 100 in this repository and fewer than 20% were merged.           |
| AI-style boilerplate   |      8 | One or more common stock phrases in the description or added code comments.                                  |
| Generic branch         |      6 | Branch name starts with a generic pattern such as `update`, `fix`, or `wip`.                                 |
| No docs changed        |      5 | Recognized code changed without a documentation file; many code changes do not need docs.                    |

Unavailable optional author or issue data is logged and skipped where possible. API failures for required PR metadata, checks, labels, or comments fail the Action. You can tune risk thresholds and actions; rule weights are intentionally stable in the initial release.
