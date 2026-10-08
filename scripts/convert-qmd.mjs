// One-shot converter: Quarto .qmd -> Eleventy-ready index.md (see MIGRATION.md, Step 3).
// Usage: node scripts/convert-qmd.mjs <file.qmd> [...]
import fs from "node:fs";
import path from "node:path";

const DROP_KEYS = new Set(["format", "engine", "execute", "jupyter", "layout"]);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function widthStyle(w, align) {
  let style = "";
  if (w) {
    const v = /^\d+$/.test(w) ? `${w}px` : w;
    style = v.endsWith("%") ? `max-width:${v};width:${v}` : `max-width:${v};width:100%`;
  }
  if (align === "center") style += `${style ? ";" : ""}display:block;margin-left:auto;margin-right:auto`;
  return style;
}

function img(src, alt, style) {
  return `<img src="${src}" alt="${esc(alt)}"${style ? ` style="${style}"` : ""}>`;
}

function convertFrontMatter(fm) {
  const out = [];
  let skipping = false;
  let toc = false;
  for (const line of fm) {
    const m = line.match(/^([A-Za-z_][\w-]*):/);
    if (m) {
      skipping = DROP_KEYS.has(m[1]);
      if (skipping) continue;
      out.push(line);
    } else if (skipping) {
      if (/^\s*toc:\s*true/.test(line)) toc = true;
    } else {
      out.push(line);
    }
  }
  // toc: true lives inside format.html in the source; keep it as a flag.
  if (toc) out.push("toc: true");
  return out;
}

function convert(text) {
  const lines = text.split("\n");
  let i = 0;
  let fm = [];
  if (lines[0].trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") fm.push(lines[i++]);
    i++;
  }
  const body = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    const open = line.match(/^```\{([^}]*)\}\s*$/);
    if (open) {
      const chunk = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) chunk.push(lines[i++]);
      const header = open[1].trim();
      const src = chunk.join("\n");
      if (header === "=html") {
        body.push(src);
        continue;
      }
      const gi = src.match(/knitr::include_graphics\(\s*["']([^"']+)["']\s*\)/);
      if (gi) {
        const w = header.match(/out\.width\s*=\s*"([^"]+)"/);
        body.push(img(gi[1], "", widthStyle(w && w[1])));
        continue;
      }
      const lang = header.split(",")[0].trim();
      const code = chunk.filter((l) => !/^#\|/.test(l));
      body.push("```" + lang, ...code, "```");
      continue;
    }
    body.push(
      line.replace(/!\[([^\]]*)\]\(([^)\s]+)\)\{([^}]*)\}/g, (_, alt, src, attrs) => {
        const w = attrs.match(/width\s*=\s*"?(\d+%?)"?/);
        const a = attrs.match(/fig-align\s*=\s*"?(\w+)"?/);
        return img(src, alt.replace(/\*/g, ""), widthStyle(w && w[1], a && a[1]));
      })
    );
  }
  return ["---", ...convertFrontMatter(fm), "---", ...body].join("\n");
}

for (const file of process.argv.slice(2)) {
  const out = path.join(path.dirname(file), path.basename(file, ".qmd") + ".md");
  fs.writeFileSync(out, convert(fs.readFileSync(file, "utf8")));
  fs.unlinkSync(file);
  console.log(`${file} -> ${out}`);
}
