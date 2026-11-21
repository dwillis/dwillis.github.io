from django.conf import settings
from django.urls import path, re_path

from . import feeds, views

urlpatterns = [
    path("", views.home),
    path("blog.html", views.blog),
    path("blog.xml", feeds.PostsFeed()),
    path("sitemap.xml", views.sitemap),
    re_path(r"^archives/(?P<key>\d{4}/\d{2}/\d{2}/[^/]+)/$", views.post),
    re_path(r"^(?P<key>[a-z0-9_\-/]+)/$", views.page),
]

if settings.SERVE_ASSETS:
    urlpatterns.append(re_path(r"^(?P<path>.+\.[A-Za-z0-9]+)$", views.dev_asset))
