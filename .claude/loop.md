# .claude/loop.md — default prompt for a bare `/loop` in this repo.
#
# Claude Code's `/loop` bundled skill re-runs this file's instructions on a
# schedule for as long as the session stays open (see
# https://code.claude.com/docs/en/scheduled-tasks). This is the "looping/
# scheduling/pulling work" surface for claude-orchestrator when you're
# running interactively — poll.sh is the equivalent for unattended/no-open-
# session use (cron/launchd); see README.md "Two ways to run the loop."
#
# Each iteration's job is ONLY to notice and dispatch ready tickets, never to
# implement one yourself here — implementation, gating, and PR-opening are
# /work-ticket's job, run in a forked background subagent so this top-level
# loop stays fast and can pick up the next ticket without waiting on the
# previous one to finish.

Work the ticket queue:

1. Run `bd ready --json` from the repo root.
2. If it returns no tickets, reply "queue empty, nothing to dispatch — next
   check in ~<interval>" and end this iteration — do not invent work. **Ask
   for a short next-check delay when the queue is empty** (roughly
   30s–1min), not a longer one: self-paced `/loop` normally backs off when
   nothing's pending, but a human may be watching this session live and
   adding tickets as you go, so an empty queue here means "check back soon,"
   not "check back later." Only widen the delay once several consecutive
   iterations in a row have found nothing to dispatch or resume.
3. For each returned ticket, check `bd show <id> --field status`. Skip any
   whose status isn't `ready` (already claimed by a prior iteration or fork).
4. For each still-`ready` ticket, in order:
   a. Claim it: `bd update <id> --status in-progress`. (If this repo's
      `.claude/settings.json` has the optional hooks from
      `optional/hooks/settings.json` installed, this is what fires the
      "picked up" Slack notification — see `optional/README.md`. Without
      those hooks installed, this step is just the claim itself, no
      notification fires, and that's fine.)
   b. Ensure its worktree exists: if `../wt-<id>` isn't already a worktree
      (check `git worktree list`), run
      `git worktree add ../wt-<id> -b feature/<id>-<slug-of-title>`.
   c. Use `/fork` to spawn a background subagent with this exact directive:
      "cd into `../wt-<id>`, then run `/work-ticket <id>`. Do not do
      anything else — that command owns the full implement → gate → PR
      flow for this ticket." `/fork` returns immediately and the forked
      subagent's result comes back into this conversation whenever it
      finishes — don't wait on it before continuing to the next ticket.
5. Resume tickets awaiting a human reply: check every ticket with status
   `in-progress` that has a `[claude-orchestrator:question]`-prefixed
   comment (see `.claude/skills/ticket-comms/SKILL.md`) and no worktree
   currently being worked (no live fork for it per `/tasks`). If its ticket
   comments include a reply newer than the question, `/fork` a subagent with
   the directive: "cd into `../wt-<id>`, then resume `/work-ticket <id>`
   using this reply as the answer to the pending question: `<reply text>`."
   This is what makes `ticket-liaison`'s non-blocking check-back (mechanism
   2 in the `ticket-comms` skill) actually get picked back up — without this
   step, a ticket that asked a question would wait forever.
6. After dispatching every ready ticket found in step 1 and resuming every
   answered question found in step 5, end this iteration. Do not poll again
   within the same iteration — `/loop`'s own scheduler (self-paced by
   default) decides when the next iteration runs.

If you're unsure whether a ticket was already dispatched by an earlier
iteration (e.g. after a `/compact`), trust `bd`'s status field, not your own
memory of the conversation — `bd show <id> --field status` is the single
source of truth for "has this been claimed."
