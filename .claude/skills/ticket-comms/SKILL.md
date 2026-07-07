---
name: ticket-comms
description: How to comment on a ticket and, optionally, wait for a human reply — backend-agnostic (beads or JIRA), config-driven from gates.yaml's ticket_comms block. Shared logic used by the ticket-liaison subagent.
---

# ticket-comms skill

This skill is the one place that knows how to (a) post a comment on a ticket
and (b) wait for a human reply to it, regardless of whether the backend is
`bd` (beads) or JIRA. `ticket-liaison` (the subagent) is the caller in this
MVP; keeping the backend-specific commands here means adding JIRA support
later is a change in this one file, not in every subagent that wants to talk
to a ticket.

Config comes from `gates.yaml`'s `ticket_comms` block:

```yaml
ticket_comms:
  backend: beads          # beads | jira
  max_wait_minutes: 240   # give up waiting after this long
  poll_interval_minutes: 10
```

## Posting a comment

| Backend | Command |
|---|---|
| `beads` | `bd comment <id> "<text>"` |
| `jira` | `jira issue comment add <id> "<text>"` (requires the `jira` CLI configured with credentials — not implemented in the MVP, see `PLAN_ITERATION_ONE.md`'s JIRA integration note) |

Always prefix a question comment with a marker so a later poll can tell it
apart from other automated comments:

```
[claude-orchestrator:question] <your actual question text>
```

## Waiting for a reply — two mechanisms

**Which one to use depends on how you were invoked**, not on preference:

### 1. Bounded blocking poll (headless / `-p` runs, e.g. via `poll.sh`)

Use this when you're running inside a single headless `claude -p` invocation
(no `/loop` wrapping you) — there's no other mechanism that will wake you
back up, so you must poll yourself, bounded by `ticket_comms.max_wait_minutes`
and `ticket_comms.poll_interval_minutes`:

```bash
deadline=$(( $(date +%s) + max_wait_minutes*60 ))
question_posted_at=$(date -u +%FT%TZ)
while [ "$(date +%s)" -lt "$deadline" ]; do
  sleep "$(( poll_interval_minutes*60 ))"
  # beads:
  reply=$(bd show <id> --comments-since "$question_posted_at" --json | jq -r '.[] | select(.author != "claude-orchestrator")')
  if [ -n "$reply" ]; then
    echo "$reply"   # hand this back to the caller and stop polling
    exit 0
  fi
done
echo "TIMED OUT waiting for a reply after ${max_wait_minutes}m"
exit 1
```

(Adjust the `bd show` flags to your installed `bd` version's actual
comment-listing/filtering options — the important contract is "only count
comments authored by a human, posted after the question, newer wins.")

This blocks the whole headless run for up to `max_wait_minutes` — acceptable
for `poll.sh`-driven runs (each ticket already runs as its own backgrounded
process, so one ticket waiting doesn't block others), but wasteful of a
turn/session budget in an interactive context. That's why mechanism 2 exists.

### 2. Non-blocking check-back (interactive session dispatched via `/loop` + `/fork`)

If you were dispatched by `.claude/loop.md` (i.e. you're a forked subagent
inside an interactive session), **do not sleep-poll**. Instead:

1. Post the question comment (as above).
2. Report back to your caller: `"waiting on a human reply to <id> — do not
   mark this ticket blocked, just leave it; a future /loop iteration will
   pick it back up."`
3. End your turn. `.claude/loop.md`'s next iteration already re-checks every
   in-progress ticket's comments (see loop.md's "resume awaiting-reply
   tickets" step) and will `/fork` you again — or resume the same
   conversation — once a new human comment appears. This is exactly the
   dynamic-`/loop` "check whether CI passed and address review comments"
   pattern, applied to ticket comments instead of PR comments.

Either mechanism gives up after `ticket_comms.max_wait_minutes` total license
to wait — if that elapses with no reply, comment `"[claude-orchestrator]
timed out waiting for a reply after <n>m — proceeding with the most
reasonable assumption"` on the ticket, make the assumption, note it in the
next commit message, and continue rather than waiting forever.
