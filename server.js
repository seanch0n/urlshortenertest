// Minimal URL shortener: node server.js, then open http://localhost:3000
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "links.json");

let links = {};
try {
  links = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  links = {};
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(links, null, 2));
}

function newCode() {
  let code;
  do {
    code = crypto.randomBytes(6).toString("base64url").slice(0, 6);
  } while (links[code]);
  return code;
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>URL Shortener</title>
<style>body{font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem}
input{width:100%;padding:.5rem;box-sizing:border-box}button{margin-top:.5rem;padding:.5rem 1rem}</style>
</head><body>
<h1>URL Shortener</h1>
<form id="f"><input id="url" type="url" placeholder="https://example.com" required>
<button>Shorten</button></form>
<p id="out"></p>
<script>
document.getElementById("f").onsubmit = async (e) => {
  e.preventDefault();
  const r = await fetch("/api/shorten", {method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({url: document.getElementById("url").value})});
  const d = await r.json();
  const out = document.getElementById("out");
  out.textContent = "";
  if (!r.ok) { out.textContent = d.error; return; }
  const a = document.createElement("a");
  a.href = a.textContent = d.shortUrl;
  out.appendChild(a);
};
</script></body></html>`;

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(PAGE);
  }

  if (req.method === "POST" && pathname === "/api/shorten") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy();
    });
    req.on("end", () => {
      let url;
      try {
        url = JSON.parse(body).url;
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      if (!isValidUrl(url)) {
        return sendJson(res, 400, { error: "Provide a valid http(s) URL" });
      }
      const code = newCode();
      links[code] = url;
      save();
      sendJson(res, 201, { code, shortUrl: `http://${req.headers.host}/${code}` });
    });
    return;
  }

  if (req.method === "GET") {
    const target = links[pathname.slice(1)];
    if (target) {
      res.writeHead(302, { Location: target });
      return res.end();
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
