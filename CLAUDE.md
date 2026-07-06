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
