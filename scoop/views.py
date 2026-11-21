from pathlib import Path

from django.conf import settings
from django.http import Http404
from django.shortcuts import render
from django.views.static import serve

from . import content

NAV = [
    ("About", "/about/"),
    ("Now", "/now/"),
    ("Then", "/then/"),
    ("Ways I Can Help", "/help/"),
    ("The Fix", "/thefix/"),
    ("Blog", "/blog.html"),
    ("Teaching", "/teaching/"),
    ("Datasets", "/datasets/"),
]

SOCIAL = [
    ("bluesky", "Bluesky", "https://bsky.app/profile/dwillis.bsky.social"),
    ("github", "GitHub", "https://github.com/dwillis"),
]


def site_context(request):
    path = request.path
    nav = [{"text": text, "href": href,
            "active": path.startswith(href) or (href == "/blog.html" and path.startswith("/archives/"))}
           for text, href in NAV]
    return {"site": settings.SITE, "nav": nav, "social": SOCIAL, "year": 2026}


def home(request):
    page = content.get_page("")
    return render(request, "home.html", {"page": page, "posts": content.posts()[:3]})


def blog(request):
    return render(request, "blog.html", {"posts": content.posts()})


def post(request, key):
    entry = content.get_post(key)
    if entry is None:
        raise Http404(key)
    return render(request, "post.html", {"page": entry})


def page(request, key):
    entry = content.get_page(key)
    if entry is None or key == "":
        raise Http404(key)
    return render(request, "page.html", {"page": entry})


def sitemap(request):
    entries = [{"url": "/", "date": None}, {"url": "/blog.html", "date": None}]
    entries += [{"url": e.url, "date": e.date} for e in content.pages() if e.key]
    entries += [{"url": e.url, "date": e.date} for e in content.posts()]
    return render(request, "sitemap.xml", {"entries": entries}, content_type="application/xml")


def dev_asset(request, path):
    """Development only (runserver): serve images and files the build would copy into _site/."""
    root = Path(settings.BASE_DIR)
    for base in (root / "static", root):
        if (base / path).is_file():
            top = Path(path).parts[0]
            if base == root and top in {"scoop", "docs", "_site", ".venv", ".git"}:
                break
            return serve(request, path, document_root=base)
    raise Http404(path)
