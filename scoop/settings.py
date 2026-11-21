from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Nothing runs in production: the site is rendered to static files.
SECRET_KEY = "thescoop-static-build"
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

INSTALLED_APPS = [
    "django_medusa",
    "scoop",
]

MIDDLEWARE = []
ROOT_URLCONF = "scoop.urls"
DATABASES = {}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["scoop.views.site_context"]},
    }
]

USE_TZ = False
TIME_ZONE = "America/New_York"

SITE = {
    "title": "Derek Willis",
    "description": "Academic and journalist",
    "url": "https://www.thescoop.org",
    "author": "Derek Willis",
}

# Folders holding Markdown pages and post assets; everything else at the root is ignored.
CONTENT_DIR = BASE_DIR
CONTENT_EXCLUDE = {"archives", "scoop", "static", "images", "node_modules", "docs", "_site",
                   "_freeze", "scripts", ".venv", ".github", ".quarto"}

MEDUSA_RENDERER_CLASS = "django_medusa.renderers.DiskStaticSiteRenderer"
MEDUSA_DEPLOY_DIR = BASE_DIR / "_site"
MEDUSA_MULTITHREAD = True  # forks on Linux/macOS; renderers.py loads the index before forking

# `runserver` also serves images and post assets; the static build copies them instead (copyassets).
import sys  # noqa: E402

SERVE_ASSETS = len(sys.argv) > 1 and sys.argv[1] == "runserver"
