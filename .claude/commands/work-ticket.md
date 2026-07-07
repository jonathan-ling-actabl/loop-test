---
description: Run the full ticket-to-PR loop for one beads ticket, headlessly.
argument-hint: <TICKET-ID>
---

# /work-ticket

You are running **fully autonomously** in a dedicated git worktree, invoked
headlessly by `poll.sh` (or by a `/loop`-dispatched fork) with no human
available to respond synchronously. You already have full permission to
read, write, and execute anything in this repository — proceed directly. The
one exception is a genuine requirements ambiguity, which goes through
`ticket-liaison` (see step 2's `ticket-planner`, and the "Budget exhausted"
case in step 4), not a guess.

Ticket key: `$1` (a beads ticket ID, e.g. `TST-0001`).

## Steps

1. **Load the ticket.** Run `bd show $1` to get the title, description, and
   acceptance criteria. If `bd show $1` fails or the ticket isn't found,
   stop and report the error — do not guess at requirements.

2. **Plan it, if not already planned.** Check whether
   `docs/specs/*$1*` and `docs/plans/*$1*` already exist (e.g. a prior
   attempt on this ticket already ran this step). If not, Task →
   `ticket-planner`, giving it the ticket key. It runs `/to-spec` then
   `/to-plan`, asking any necessary clarifying questions via
   `ticket-liaison` instead of blocking on live input, and returns the spec
   path and plan path. Then Task → `gate-runner`, asking it to evaluate
   `gates.yaml`'s `planning` stage `post` checks (`plan-lint`) to confirm
   both files actually exist and are non-trivial.
   - **PASS** → continue to step 3, carrying the spec/plan paths forward.
   - **FAIL** → retry `ticket-planner` once more (transient issue, e.g. it
     forgot to commit); if it fails a second time, delegate to
     `ticket-liaison` to report the planning failure to a human and stop —
     do not proceed to implementation without a spec/plan on file.

3. **Read the dev-stage budget.** Read `gates.yaml`'s `stages.dev.budget`
   (`max_attempts`, `max_minutes`). If absent, default to `max_attempts: 5`,
   `max_minutes: 20`. Record your start time now — you'll compare against it
   each round.

4. **Dev-stage ping-pong** (bounded by the budget from step 3):

   ```
   attempt = 1
   loop:
     if attempt == 1:
       Task → ticket-implementer, given the ticket's title/description/
         acceptance criteria PLUS the spec path and plan path from step 2 —
         ticket-implementer treats the plan as its primary implementation
         guide, not just the raw ticket text (first-attempt inputs)
     else:
       Task → ticket-implementer, given the same spec/plan paths PLUS
         gate-runner's exact failure output from the previous round PLUS
         "attempt <attempt> of <max_attempts>" (fix-up inputs)

     Task → gate-runner, asking it to evaluate gates.yaml's `dev` stage
       `post` checks against the commit ticket-implementer just made

     if gate-runner reports PASS:
       break out of the loop — proceed to step 5
     if gate-runner reports FAIL:
       elapsed = now - start_time (from step 3)
       if attempt >= max_attempts OR elapsed >= max_minutes:
         go to "Budget exhausted" below — do not loop again
       attempt += 1
       continue loop
   ```

   Every round is a fresh `Task` call to each subagent — they're stateless
   between invocations (see their own files), so you're the one carrying
   the attempt count, failure history, and spec/plan paths forward in the
   prompts you give them.

   **Budget exhausted:** delegate to `ticket-liaison` (via `Task`) to ask a
   human: report that `<max_attempts>` attempts (or `<max_minutes>` minutes)
   were spent, quote the last FAIL's reasons, and ask whether to keep
   retrying, change approach, or drop the ticket. Then:
   - If `ticket-liaison` returns a human reply: act on it (e.g. resume the
     ping-pong with new guidance, using the reply as extra context for the
     next `ticket-implementer` round — this **does** get a fresh budget, since
     the human explicitly asked you to keep going).
   - If `ticket-liaison` reports a timeout-with-assumption: follow that
     assumption once (usually "give up and leave it blocked" is the safe
     default), then run `bd update $1 --status blocked` and
     `bd comment $1 "Automated run blocked after <n> attempts over <m>
     minutes: <last FAIL reasons>. Awaiting human input."` and stop — do not
     push or open a PR.

5. **Push and open a PR** (only reachable via a gate-runner PASS in step 4).
   ```
   git push -u origin <the feature branch you're on>
   gh pr create --title "[$1] <ticket title>" --body "<see template below>"
   ```
   PR body template:
   ```
   Automated PR for **$1**: <ticket title>

   <ticket description>

   ---
   Spec: <spec path from step 2>
   Plan: <plan path from step 2>
   Quality gates run: dev stage of gates.yaml (all passed via the gate-runner subagent, attempt <n>/<max_attempts>).
   Full agent audit log: audit/$1/<run-id>.log (see poll.sh)

   _Opened by claude-orchestrator — human review and approval required before merge._
   ```

6. **Update the ticket.** Run `bd update $1 --status in-review` and
   `bd comment $1 "PR opened: <PR URL>"`.

## Notes

- Notifications (ticket picked up / gate failure / PR opened) are **not**
  your responsibility. If this repo has the optional hooks installed (see
  `optional/README.md`), they fire automatically off the commands you run
  above — do not `curl` the Slack webhook yourself either way.
- Routine progress comments (`bd comment` calls in steps 2/4/6) are yours to
  make directly. Only route through `ticket-liaison` when you genuinely need
  a human's *answer* to something, per its own file's criteria.
- If you were dispatched by `.claude/loop.md` (a forked subagent, not a bare
  `poll.sh` headless run) and end up waiting on `ticket-liaison` for a
  reply, follow its non-blocking check-back mechanism, not a blocking sleep
  — see `.claude/skills/ticket-comms/SKILL.md`.
