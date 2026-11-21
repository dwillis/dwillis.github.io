"""Copy everything medusa doesn't render into the build folder.

1. static/  -> _site/        (rescued docs/-only folders, CNAME, robots.txt, css)
2. images/  -> _site/images/
3. every non-.md file under archives/ and the page folders -> same path in _site/
"""
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from scoop import content

SKIP_NAMES = {".DS_Store"}
SKIP_SUFFIXES = {".md", ".qmd"}


class Command(BaseCommand):
    help = "Copy static/, images/ and post/page assets into MEDUSA_DEPLOY_DIR."

    def handle(self, *args, **options):
        root = Path(settings.BASE_DIR)
        out = Path(settings.MEDUSA_DEPLOY_DIR)
        out.mkdir(parents=True, exist_ok=True)
        counts = {}

        counts["static/"] = self.copy_tree(root / "static", out, skip_suffixes=set())
        counts["images/"] = self.copy_tree(root / "images", out / "images", skip_suffixes=set())
        assets = 0
        for folder in content.content_folders():
            assets += self.copy_tree(folder, out / folder.relative_to(root), skip_suffixes=SKIP_SUFFIXES)
        counts["content assets"] = assets

        for label, n in counts.items():
            self.stdout.write(f"{label}: {n} files")

    def copy_tree(self, src, dest, skip_suffixes):
        n = 0
        if not src.is_dir():
            return n
        for path in src.rglob("*"):
            if not path.is_file() or path.name in SKIP_NAMES or path.suffix in skip_suffixes:
                continue
            target = dest / path.relative_to(src)
            if target.exists() and path.suffix == ".html":
                # Never overwrite a page medusa rendered.
                raise SystemExit(f"copyassets: {target} already exists (rendered by Django)")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            n += 1
        return n
