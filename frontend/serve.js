import { join, normalize } from "node:path";

const root = normalize(join(import.meta.dir, "dist"));
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const path = normalize(join(root, requested));
    const file = path.startsWith(root) ? Bun.file(path) : null;
    if (file && await file.exists()) return new Response(file);
    return new Response(Bun.file(join(root, "index.html")));
  },
});
