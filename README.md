# Loop Test

A static site of small HTML/CSS/JS apps, built iteratively from spec files in
[florinpop17/app-ideas](https://github.com/florinpop17/app-ideas).

`index.html` is the landing page — a list of links, one per app. Each app lives in
its own folder under `apps/` and is fully self-contained (plain HTML, CSS, and
vanilla JS, no build step).

## Run

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```

then visit http://localhost:8000.

## Adding apps

See [CLAUDE.md](CLAUDE.md) for the conventions used when building each app.
