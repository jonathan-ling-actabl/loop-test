# CLAUDE.md

Guidance for Claude Code when building apps in this repo.

## What this repo is

A static site. The landing page (`index.html`) links to small self-contained apps,
each living in its own folder under `apps/`. Apps are built iteratively from spec
files in the [app-ideas](https://github.com/florinpop17/app-ideas) repository
(`Projects/1-Beginner`, `Projects/2-Intermediate`, `Projects/3-Advanced`).

## Stack

Plain HTML, CSS, and vanilla JavaScript only. No build step, no frameworks, no
package manager, no external dependencies. Everything runs by opening a file in
the browser.

## Layout

```
index.html          landing page — list of links to each app
styles.css          landing page styles
apps/
  <app-name>/
    index.html       the app
    style.css        the app's styles
    script.js        the app's logic
```

## Conventions for each new app

- Create a new folder `apps/<kebab-case-name>/` with `index.html`, `style.css`, `script.js`.
- Each app is fully self-contained — it must not import files from other app folders.
- Every app's `index.html` includes a `← Back` link to `../../index.html`.
- Link to `style.css` and `script.js` with relative paths; keep JS in `script.js`, not inline.
- Add a link to the new app in the `#app-list` in the root `index.html`, using the
  app's display name from the spec.
- Implement the spec's core **User Stories** first. Bonus features are optional.
- Keep it accessible: semantic HTML, labelled form controls, keyboard-usable.

## Testing a change

Open `index.html` (or the app's `index.html`) directly in a browser, or serve the
folder with `python3 -m http.server` and load `http://localhost:8000`.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
