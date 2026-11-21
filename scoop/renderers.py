from django_medusa.renderers import StaticSiteRenderer

from . import content


class SiteRenderer(StaticSiteRenderer):
    def get_paths(self):
        # Build the content index here, in the parent process, so forked workers inherit it.
        paths = {"/", "/blog.html", "/blog.xml", "/sitemap.xml"}
        paths |= {p.url for p in content.posts()}
        paths |= {p.url for p in content.pages() if p.key != ""}
        return sorted(paths)


renderers = [SiteRenderer]
