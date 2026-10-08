"""Rebuild the executed code chunks of two posts as static fenced code + captured output,
using the Quarto-rendered HTML in docs/ as the source of truth (MIGRATION.md, Step 4)."""
import re, sys
from bs4 import BeautifulSoup

POSTS = ["archives/2023/10/17/third-and-six", "archives/2023/11/13/wv-football-blowouts"]

def fence(lang, text):
    text = text.strip("\n")
    return f"```{lang}\n{text}\n```"

for post in POSTS:
    soup = BeautifulSoup(open(f"docs/{post}/index.html", encoding="utf8").read(), "html.parser")
    cells = soup.select("div.cell")
    rendered = []
    for cell in cells:
        parts = []
        lang = "python" if "python" in str(cell.select_one("pre.sourceCode")["class"]) else "r"
        for child in cell.find_all(["div"], recursive=True):
            cls = child.get("class") or []
            if "sourceCode" in cls and "cell-code" in cls:
                parts.append(fence(lang, child.get_text()))
            elif "cell-output" in cls:
                if "cell-output-stdout" in cls or "cell-output-stderr" in cls:
                    parts.append(fence("text", child.get_text()))
                else:
                    sys.exit(f"unhandled output type {cls} in {post}")
        rendered.append("\n\n".join(parts))
    path = f"{post}/index.md"
    lines = open(path, encoding="utf8").read().split("\n")
    out, i, n = [], 0, 0
    while i < len(lines):
        if re.match(r"^```\w*\s*$", lines[i]) and lines[i].strip() != "```":
            j = i + 1
            while lines[j].strip() != "```":
                j += 1
            out.append(rendered[n]); n += 1
            i = j + 1
        else:
            out.append(lines[i]); i += 1
    assert n == len(cells), (post, n, len(cells))
    open(path, "w", encoding="utf8").write("\n".join(out))
    print(post, "chunks:", n)
