import datetime
import re
from urllib.parse import urljoin

from django.conf import settings
from django.contrib.syndication.views import Feed

from . import content

RELATIVE_ATTR = re.compile(r'(\s(?:src|href)=")(?![a-z][a-z0-9+.-]*:|/|#)([^"]*)"', re.I)


def absolutize(html, base):
    """Make relative src/href values absolute so images resolve in feed readers."""
    return RELATIVE_ATTR.sub(lambda m: f'{m.group(1)}{urljoin(base, m.group(2))}"', html)


class PostsFeed(Feed):
    title = settings.SITE["title"]
    # Absolute URLs: otherwise Django prefixes the test client's host ("testserver").
    link = settings.SITE["url"] + "/blog.html"
    description = settings.SITE["description"]
    feed_url = settings.SITE["url"] + "/blog.xml"

    def items(self):
        return content.posts()[:20]

    def item_title(self, item):
        return item.title

    def item_description(self, item):
        return absolutize(item.html, settings.SITE["url"] + item.url)

    def item_link(self, item):
        return settings.SITE["url"] + item.url

    def item_pubdate(self, item):
        if item.date:
            return datetime.datetime.combine(item.date, datetime.time())

    def item_author_name(self, item):
        return item.author or None

    def item_categories(self, item):
        return item.categories or item.tags
