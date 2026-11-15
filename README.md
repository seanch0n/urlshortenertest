# urlshortenertest

A tiny URL shortener with no dependencies.

    npm start        # http://localhost:3000

- `POST /api/shorten` with `{"url": "https://..."}` returns `{code, shortUrl}`
- `GET /<code>` redirects (302) to the original URL
- Links are stored in `links.json`
