import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureRoot = fileURLToPath(new URL("./", import.meta.url));

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const filename = pathname === "/" ? "login.html" : pathname.slice(1);
  if (!/^[a-z0-9.-]+$/i.test(filename) || extname(filename) !== ".html") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  createReadStream(join(fixtureRoot, filename)).pipe(response);
}).listen(4317, "127.0.0.1");
