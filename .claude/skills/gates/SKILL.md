---
name: gates
description: How to read and execute a repo's gates.yaml — shared logic used by the gate-runner subagent so the same skill works across the MVP and any future stage/repo, matching iteration one's dotagents-style shared-skill philosophy.
---

# gates skill

This skill is the one place that knows how to turn a `gates.yaml` entry into
an actual executed check. `gate-runner` (the subagent) is the only caller in
this MVP, but the skill itself doesn't know or care who's asking — that's
what makes it reusable for a future CODE_REVIEW/QA stage's subagent without
any changes here.

## `gates.yaml` shape

```yaml
stages:
  <stage-name>:
    pre:  [<check-name>, ...]
    post: [<check-name>, ...]
```

See `../../../gates.yaml` in this folder for the MVP's actual `dev` /
`code_review` config, and `PLAN_ITERATION_ONE.md` §6 for the full target
shape (more stages, more checks) this is a trimmed subset of.

## Resolving a check name

Given a `<check-name>`, resolve it in this order:

1. **mise task.** If `mise tasks ls` (or simply checking `mise.toml` for a
   `[tasks.<check-name>]` table) shows a task with this exact name, the
   check is `mise run <check-name>` in the repo root. Exit 0 = pass. This
   covers `lint`, `test`, `build`, and any project-specific task a team adds
   — **adding a new mise task and referencing it in `gates.yaml` is enough
   to add a new deterministic gate; nothing here needs to change.**

2. **Native check.** If the name isn't a mise task, it must be one of the
   checks this skill implements directly:

   | Check name | How to evaluate |
   |---|---|
   | `worktree-provisioned` | Pass if the current working directory is inside a `git worktree list` entry (i.e. not the bare/reference `REPO_ROOT` clone itself). Fail with reason `"not running inside a provisioned worktree"` otherwise. |
   | `gates-passed` | Pass if the current commit's message or a local marker file (`.gates-passed-<commit-sha>`) shows the `dev` stage's `post` checks already passed for this exact commit. In the MVP, `gate-runner` writes this marker itself right after a `dev.post` PASS, so `code_review.pre`'s `gates-passed` check just looks for that file — this is intentionally simple; a real implementation might check CI status instead. |
   | `plan-lint` | Pass if a spec file matching `docs/specs/*<TICKET-ID>*` **and** a plan file matching `docs/plans/*<TICKET-ID>*` both exist and are non-empty (a few hundred bytes at least — a placeholder/empty file doesn't count). Fail with reason `"no spec/plan file found for <TICKET-ID> — did ticket-planner run?"` if either is missing. This is what `planning.post` checks — see `ticket-planner.md`, which is what's supposed to have created these files. |

3. **Unknown check.** If a name matches neither a mise task nor a known
   native check, that's a FAIL for that check with reason `"unknown check
   '<name>' — not a mise task and not implemented in the gates skill"`.
   Never silently skip an unresolvable check.

## Stage `budget` (bounding the dev-stage ping-pong)

A stage may declare a `budget` block (see `dev` in `gates.yaml`):

```yaml
budget:
  max_attempts: 5
  max_minutes: 20
  max_check_seconds: 300
```

This isn't a check — it's read by `/work-ticket` (not `gate-runner` itself)
to decide when to stop retrying the implementer↔gate-runner loop and escalate
instead. `max_check_seconds` **is** used by you (the `gates` skill / whoever
executes a check): wrap every check's command in a timeout of that many
seconds (e.g. `timeout 300 mise run test`), and treat a timeout as a FAIL
with reason `"check exceeded max_check_seconds (<n>s) — likely hung"`. A
stage with no `budget` block has no timeout wrapping and no retry cap —
don't invent one.

## Adding a new gate (for future stages)

1. Add the check name under the right stage's `pre`/`post` list in
   `gates.yaml`.
2. If it's a repo-level deterministic task (lint/test/coverage/secret-scan/
   etc.), add a matching `[tasks.<name>]` entry to `mise.toml` — done, no
   skill changes needed.
3. If it's something that isn't naturally a shell command (e.g. "has a
   human approved this PR"), add a row to the native-check table above and
   describe how to evaluate it. Keep the description precise enough that
   any subagent reading this file can implement the check consistently
   without further clarification.
