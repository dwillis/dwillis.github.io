# Migrating thescoop.org from Quarto to Django + django-medusa

Same goal as `MIGRATION.md`: rebuild the site, deploy it to GitHub Pages with GitHub Actions, and keep every existing URL working exactly as it does now. Pages CMS stays the planned editing interface.

The difference is the build. A small Django project reads the Markdown files and serves them through views and templates. Then [django-medusa](https://github.com/dwillis/django-medusa) (v0.4.0, Python 3.12+, Django 6.1) requests every URL with Django's test client and writes the HTML to `_site/`.

The inventory and audit are the same as in `MIGRATION.md`: 107 posts, 19 pages, `images/`, and the folders that exist only in `docs/`.

## Design decisions

- **Content stays as Markdown files at the repo root** (`archives/`, `about/`, `thefix/` and so on). There's no database and no Django admin. Pages CMS edits the files, and Django only reads them at build time. A database would mean editing in a locally running admin and committing a SQLite file.
- **Django lives in `scoop/`** next to the content, with `manage.py` at the repo root.
- **URLs come from folder paths**, never from front-matter dates. This is the same rule as the Eleventy plan.
- **Medusa renders the pages; a separate command copies the files.** Medusa only saves responses from Django views. Post images, site images and the rescued static folders are copied into `_site/` by a custom `copyassets` management command.

Repo layout after the move:

```
manage.py
requirements.txt          # django>=6.1,<6.2, django-medusa @ git tag, python-frontmatter, markdown, pygments
scoop/
  settings.py
  urls.py
  content.py              # loads and indexes the Markdown
  views.py
  feeds.py
  renderers.py            # medusa get_paths()
  management/commands/copyassets.py
  templates/
    base.html  post.html  page.html  blog.html  home.html
archives/YYYY/MM/DD/slug/index.md   # plus images alongside
about/index.md  now/index.md  ...  thefix/<essay>/index.md
images/
static/                   # rescued docs/-only content, copied as-is
.github/workflows/deploy.yml
.pages.yml                # step 9
```

## Step 1: Rescue the content that lives only in `docs/`

This is unchanged from `MIGRATION.md`, and it's still the first step. Move these folders to `static/` at the repo root:

| Folder | Files |
|---|---|
| `docs/sports/` | 370 |
| `docs/sports-data-files/` | 187 |
| `docs/religion/` | 139 |
| `docs/data_journalism_book/` | 107 |
| `docs/files/` | 49 |

Also move `docs/CNAME` and `docs/robots.txt` into `static/`. `copyassets` (step 6) copies `static/` into the root of `_site/` unchanged.

Medusa's disk renderer never deletes anything in the output folder. The build should still start from an empty `_site/` (step 8) so that deleted posts don't stay published. As a result, everything that has to be published must come from `static/`, never from leftover files in the output.

## Step 2: Convert `.qmd` to `.md`

Unchanged from `MIGRATION.md` step 3:

- strip `format`, `engine`, `execute` and `jupyter`
- turn the 8 `knitr::include_graphics` posts into `<img>` tags
- turn non-executing chunks into plain fenced code
- turn the 2 posts with `{width=...}` attributes into `<img>` tags
- unwrap the `{=html}` block in `datasets/index.qmd`
- rename to `index.md`

Python-Markdown passes raw HTML through, so the `<img>` tags and the Buttondown form render as written.

## Step 3: Freeze the two posts that execute code

Unchanged from `MIGRATION.md` step 4. Paste the rendered output from `docs/` into `archives/2023/10/17/third-and-six/` and `archives/2023/11/13/wv-football-blowouts/` as static code output and HTML tables.

## Step 4: Content loader and URLs

`scoop/content.py` builds an in-memory index once per process:

- **Posts:** every `archives/*/*/*/*/index.md`. The key is the folder path (`2025/06/09/how-openelections-uses-llms`).
- **Pages:** `index.md` at the root, plus every other `*/index.md` and `thefix/*/index.md` outside `archives/`, `scoop/`, `static/`, `images/` and `node_modules/`. The key is again the folder path (`about`, `thefix/better-tools`).

For each file, the loader reads the front matter with `python-frontmatter` and renders the body with `markdown` using the `fenced_code`, `tables`, `codehilite` and `toc` extensions. It stores `title`, `author`, `date`, `description`, `tags`, `tumblr_url`, `html`, `excerpt` (the description, or else the first paragraph) and `url`.

**Dates:** YAML reads `2018-04-04` as a `datetime.date`, which has no time zone, so displayed dates can't shift by a day. If any front matter has a full timestamp, cut it to `.date()` when loading.

**Slugs and dates are separate:** `the-best-training` keeps its 2018-04-04 date for display and sorting, but its URL comes from `archives/2018/04/05/`. The same applies to `in-defense-of-building-tools`.

`scoop/urls.py`:

```python
from django.urls import path, re_path
from . import views, feeds

urlpatterns = [
    path("", views.home),
    path("blog.html", views.blog),
    path("blog.xml", feeds.PostsFeed()),
    re_path(r"^archives/(?P<key>\d{4}/\d{2}/\d{2}/[^/]+)/$", views.post),
    re_path(r"^(?P<key>[a-z0-9_\-/]+)/$", views.page),
]
```

Both detail views return 404 for unknown keys, and medusa stops the build on any status other than 200 (step 8).

## Step 5: Templates

The look is the same as in `MIGRATION.md` step 5: Bootstrap 5 with Bootswatch Flatly from a CDN, written as Django templates.

- `base.html`: a dark navbar with `images/dwillis.png`, the site title, an RSS link to `/blog.xml` and the Pagefind search box. A left sidebar with Bluesky and GitHub icons and the links About, Now, Then, Ways I Can Help, The Fix, Blog, Teaching, Datasets. The footer reads "© Copyright 2026 Derek Willis."
- `post.html`: title, author, date and content. Show the TOC when the front matter has `toc: true`.
- `blog.html`: all posts sorted by date, newest first, each with title, excerpt, date and author.
- `home.html`: the existing intro and image from `index.md`, plus the 3 latest posts.
- Code highlighting: generate the CSS once with `pygmentize -S default -f html > static/css/code.css`, or load highlight.js from a CDN instead of using `codehilite`.

Because every asset is either copied as-is or loaded from a CDN, the site doesn't need `collectstatic`. Use root-relative URLs everywhere (`/images/dwillis.png`).

## Step 6: Feed, static files and search

**Feed:** `scoop/feeds.py` subclasses `django.contrib.syndication.views.Feed`:

- `title`: the current channel title, exactly
- `link`: `/blog.html`
- `items()`: the 20 most recent posts
- `item_description()`: the post's full rendered HTML
- `item_link()`: the post URL
- `item_pubdate()`: the date

Medusa saves `/blog.xml` under exactly that name because the path doesn't end in a slash. Pages serves it as XML based on the `.xml` extension.

**Static files:** the `copyassets` command copies:

1. `static/` → `_site/` (the root, unchanged)
2. `images/` → `_site/images/`
3. every non-`.md` file under `archives/` and the page folders → the same path under `_site/` (post images, `scores.csv` and so on)

**Search:** run `npx pagefind --site _site` after the build, the same as in the Eleventy plan.

## Step 7: Renderer and settings

`scoop/renderers.py`:

```python
from django_medusa.renderers import StaticSiteRenderer
from . import content

class SiteRenderer(StaticSiteRenderer):
    def get_paths(self):
        paths = {"/", "/blog.html", "/blog.xml"}
        paths |= {p.url for p in content.posts()}
        paths |= {p.url for p in content.pages() if p.key != ""}
        return sorted(paths)

renderers = [SiteRenderer]
```

Settings to add:

```python
INSTALLED_APPS = ["django_medusa", "scoop"]
DATABASES = {}
MEDUSA_RENDERER_CLASS = "django_medusa.renderers.DiskStaticSiteRenderer"
MEDUSA_DEPLOY_DIR = BASE_DIR / "_site"
MEDUSA_MULTITHREAD = True   # forks on Linux; load the content index before rendering
```

`scoop` needs no models. The settings also need a `SECRET_KEY` (any value works, since nothing runs in production) and `TEMPLATES` with `APP_DIRS: True`.

Local preview has two options:

- `python manage.py runserver` for editing templates. For this to show images, add a development-only view that serves files from the content folders.
- A full build (step 8), then `python -m http.server --directory _site`.

## Step 8: Build and deploy

The build command, run locally and in CI:

```
rm -rf _site
python manage.py staticsitegen
python manage.py copyassets
npx pagefind --site _site
```

`.github/workflows/deploy.yml`:

1. checkout
2. `actions/setup-python` (3.12)
3. `pip install -r requirements.txt`
4. `actions/setup-node` (for Pagefind)
5. run the build command above
6. `actions/upload-pages-artifact` with path `_site`
7. `actions/deploy-pages`

Pin medusa in `requirements.txt` as `django-medusa @ git+https://github.com/dwillis/django-medusa.git@v0.4.0`.

The cutover is the same as before. Switch Pages → Source to "GitHub Actions" only at cutover. After that, delete `docs/`, `_freeze/`, `_quarto.yml`, `.RData`, `.Rhistory` and `thescoop.Rproj`, and add `_site/`, `node_modules/` and `__pycache__/` to `.gitignore`.

## Step 9: Verify before cutover

Unchanged from `MIGRATION.md` step 8: diff every `.html` path and every non-HTML file in `docs/` (plus the sitemap's `<loc>` entries) against `_site/`. Every old path must exist in the new output.

Two checks are specific to medusa:

- A build that finishes means every listed path returned 200. A path missing from `get_paths()` is silently absent, so the URL diff is what catches it.
- Compare the file count in `_site/` after `copyassets` with the `docs/` file counts for the 5 rescued folders.

Spot-check the same pages as in the Eleventy plan: the two frozen code posts, one `include_graphics` post, the two posts with width attributes, the Datasets signup form, The Fix index and one essay, `blog.html`, `blog.xml`, and search.

## Step 10 (after cutover): Pages CMS

Unchanged from `MIGRATION.md` step 9, because the content is still Markdown files in the same folders. New posts saved to `archives/{year}/{month}/{day}/{primary}/index.md` are picked up by the loader and by `get_paths()` on the next Action run, with no code change.

## Fixes in django-medusa itself

- `docs/TUTORIAL-01.markdown` installs from the `mtigas/django-medusa` tarball. Point it at `git+https://github.com/dwillis/django-medusa.git@v0.4.0`.
- `setup.py` still lists `url` as `mtigas/django-medusa`.

## Compared with the Eleventy plan

| | Eleventy | Django + medusa |
|---|---|---|
| Content format | Markdown at repo root | Same |
| Steps 1–3 (rescue, convert, freeze) | Same | Same |
| URL rules | Eleventy's default folder permalinks | Regex URL patterns plus a content index |
| Code to write | Config, templates | Loader, views, URLs, feed, renderer, `copyassets`, templates |
| Copying images alongside posts | `addPassthroughCopy` | Custom command |
| Feed | `eleventy-plugin-rss` | `django.contrib.syndication` |
| Search | Pagefind | Pagefind |
| Toolchain | Node | Python + Node (Pagefind) |
| Pages built from data (CSVs, databases) | Possible with global data files | Native: query in a view, add the paths to `get_paths()` |
| Pages CMS | Works | Works |
