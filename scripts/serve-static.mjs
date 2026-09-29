// Minimal static server for checking the exported `out/` folder locally (clean URLs + 404.html).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "out");
const port = Number(process.env.PORT ?? 4173);
// Mirror a GitHub Pages project site: with BASE_PATH=/kelma, the site is served under /kelma/.
const basePath = process.env.BASE_PATH ?? "";
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".mp4": "video/mp4", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain",
};

async function tryFile(p) {
  try {
    const s = await stat(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  let url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (basePath) {
    if (url !== basePath && !url.startsWith(basePath + "/")) {
      res.writeHead(404);
      return res.end();
    }
    url = url.slice(basePath.length) || "/";
  }
  const base = normalize(join(root, url));
  if (!base.startsWith(root)) return res.writeHead(403).end();
  const file = (await tryFile(base)) ?? (await tryFile(base + ".html")) ?? (await tryFile(join(base, "index.html")));
  if (!file) {
    res.writeHead(404, { "content-type": types[".html"] });
    return res.end(await readFile(join(root, "404.html")));
  }
  const body = await readFile(file);
  const range = req.headers.range;
  if (range && extname(file) === ".mp4") {
    const [s, e] = range.replace("bytes=", "").split("-");
    const start = Number(s), end = e ? Number(e) : body.length - 1;
    res.writeHead(206, { "content-type": "video/mp4", "content-range": `bytes ${start}-${end}/${body.length}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
    return res.end(body.subarray(start, end + 1));
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "accept-ranges": "bytes" });
  res.end(body);
}).listen(port, () => console.log(`Serving out/ on http://localhost:${port}`));
