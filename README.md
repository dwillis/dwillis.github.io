# thescoop.org

Derek Willis's site. A small Django project (`scoop/`) reads the Markdown files at the repo root, and [django-medusa](https://github.com/dwillis/django-medusa) renders every URL to static HTML in `_site/`. GitHub Actions builds and deploys it to GitHub Pages on every push to `main`.

## Requirements

- Python 3.12
- Node (for the Pagefind search index)
- [uv](https://docs.astral.sh/uv/) (optional, but the commands below use it)

## Setup (one time)

```bash
uv venv -p 3.12 .venv
uv pip install -p .venv -r requirements.txt
```

## Build the site

```bash
PYTHON=.venv/bin/python ./build.sh
```

This empties `_site/`, renders every page with `manage.py staticsitegen`, copies images and other files with `manage.py copyassets`, and builds the search index with Pagefind. It takes a few seconds.

To look at the result:

```bash
python3 -m http.server 8099 -d _site
```

Then open http://localhost:8099. Search only works on the built site.

## Edit with live reload

While editing templates or content, skip the build and use Django's dev server:

```bash
.venv/bin/python manage.py runserver
```

Then open http://localhost:8000. Pages, images and the files in `static/` all load, and changes show up when you save. Search doesn't work here, because the index is only made by the build.

## Adding content

- **Post:** create `archives/YYYY/MM/DD/your-slug/index.md` with `title`, `author` and `date` front matter. Put its images in the same folder and reference them by file name. The URL comes from the folder path, not the `date` field.
- **Page:** create `<folder>/index.md` at the repo root (for example `about/index.md`); it's served at `/<folder>/`.
- Add `toc: true` to the front matter to show a table of contents.

New files are picked up on the next build, or right away under `runserver`, with no code changes.

## Layout

| Path | What it is |
|---|---|
| `scoop/` | Django project: content loader, views, feed, templates, medusa renderer, `copyassets` command |
| `archives/`, `about/`, `thefix/`, … | Markdown content, plus images alongside |
| `images/` | Site-wide images |
| `static/` | Files copied as-is to the site root (rescued folders, `CNAME`, `robots.txt`, CSS) |
| `build.sh` | The build, run locally and in CI |
| `.github/workflows/deploy.yml` | GitHub Pages deploy |
