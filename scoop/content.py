"""Load the site's Markdown files into an in-memory index.

Posts live at archives/YYYY/MM/DD/slug/index.md and pages at <folder>/index.md
(plus thefix/<essay>/index.md and the root index.md). A file's URL always comes
from its folder path, never from its front-matter date.
"""
import datetime
import html
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import frontmatter
import markdown
from django.conf import settings

MARKDOWN_EXTENSIONS = ["fenced_code", "tables", "codehilite", "toc", "smarty", "sane_lists"]
MARKDOWN_CONFIG = {
    "codehilite": {"guess_lang": False, "css_class": "highlight"},
    "toc": {"toc_depth": "2-4"},
}

FIRST_PARAGRAPH = re.compile(r"<p>(.*?)</p>", re.S)
TAGS = re.compile(r"<[^>]+>")


@dataclass
class Entry:
    key: str
    url: str
    source: Path
    title: str
    author: str
    date: datetime.date | None
    description: str
    tags: list = field(default_factory=list)
    categories: list = field(default_factory=list)
    tumblr_url: str = ""
    toc: bool = False
    toc_html: str = ""
    html: str = ""
    excerpt: str = ""

    @property
    def folder(self) -> Path:
        return self.source.parent


def parse_date(value):
    """Return a plain date. Timestamps keep the calendar date as written, so no time-zone shift."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    return datetime.date.fromisoformat(str(value).strip()[:10])


def make_excerpt(description, body_html):
    if description:
        return description
    match = FIRST_PARAGRAPH.search(body_html)
    if not match:
        return ""
    return html.unescape(TAGS.sub("", match.group(1))).strip()


def load(path: Path, key: str, url: str) -> Entry:
    post = frontmatter.load(path)
    meta = post.metadata
    md = markdown.Markdown(extensions=MARKDOWN_EXTENSIONS, extension_configs=MARKDOWN_CONFIG)
    body = md.convert(post.content)
    description = str(meta.get("description") or "")
    return Entry(
        key=key,
        url=url,
        source=path,
        title=str(meta.get("title") or ""),
        author=str(meta.get("author") or ""),
        date=parse_date(meta.get("date")),
        description=description,
        tags=list(meta.get("tags") or []),
        categories=list(meta.get("categories") or []),
        tumblr_url=str(meta.get("tumblr_url") or ""),
        toc=bool(meta.get("toc")),
        toc_html=md.toc if "<li>" in md.toc else "",
        html=body,
        excerpt=make_excerpt(description, body),
    )


@lru_cache(maxsize=1)
def index():
    root = Path(settings.CONTENT_DIR)
    posts = {}
    for path in sorted(root.glob("archives/*/*/*/*/index.md")):
        key = path.parent.relative_to(root / "archives").as_posix()
        posts[key] = load(path, key, f"/archives/{key}/")

    pages = {}
    root_index = root / "index.md"
    if root_index.exists():
        pages[""] = load(root_index, "", "/")
    top_level = [d for d in root.iterdir()
                 if d.is_dir() and d.name not in settings.CONTENT_EXCLUDE and not d.name.startswith((".", "_"))]
    for folder in sorted(top_level):
        for path in sorted(folder.rglob("index.md")):
            key = path.parent.relative_to(root).as_posix()
            pages[key] = load(path, key, f"/{key}/")

    ordered = sorted(posts.values(), key=lambda p: (p.date or datetime.date.min, p.key), reverse=True)
    return {"posts": posts, "pages": pages, "ordered": ordered}


def posts():
    """All posts, newest first."""
    return index()["ordered"]


def pages():
    return list(index()["pages"].values())


def get_post(key):
    return index()["posts"].get(key)


def get_page(key):
    return index()["pages"].get(key)


def content_folders():
    """Folders whose non-Markdown files are published alongside the HTML."""
    root = Path(settings.CONTENT_DIR)
    folders = {root / "archives"}
    for entry in pages():
        if entry.key:
            folders.add(root / entry.key.split("/")[0])
    return sorted(folders)
