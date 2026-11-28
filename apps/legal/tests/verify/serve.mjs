/**
 * Minimal static server for the built legal app.
 *
 * Mirrors the origin's routing behaviour:
 *  - a path without a trailing slash that has a directory index is 301'd
 *  - `/terms` redirects to `/terms/get-started/`
 *  - unknown paths serve dist/404.html with status 404
 *  - query strings are ignored for file lookup (`?dpl=` stays in the URL)
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist')
const port = Number(process.env.PORT || 4323)

// Exact-match 301 rules generated from the origin crawl (public/_redirects).
const redirects = new Map()
const redirectFile = join(dist, '_redirects')
if (existsSync(redirectFile)) {
  for (const line of readFileSync(redirectFile, 'utf8').split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 3 && parts[2] === '301') redirects.set(parts[0], parts[1])
  }
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
}

function resolve(urlPath) {
  const decoded = decodeURIComponent(urlPath)
  const safe = normalize(decoded).replace(/^([.]{2}[/\\])+/, '')
  const base = join(dist, safe.split('/').join(sep))
  if (!base.startsWith(dist)) return null
  if (existsSync(base) && statSync(base).isFile()) return base
  const index = join(base, 'index.html')
  if (existsSync(index)) return index
  return null
}

createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const rule = redirects.get(url.pathname) ?? redirects.get(decodeURIComponent(url.pathname))
  if (rule) {
    res.writeHead(301, { location: rule + url.search })
    res.end()
    return
  }
  const file = resolve(url.pathname)
  if (file) {
    res.writeHead(200, {
      'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
      'x-robots-tag': 'noindex, nofollow',
    })
    createReadStream(file).pipe(res)
    return
  }
  if (!url.pathname.endsWith('/')) {
    const withSlash = resolve(url.pathname + '/')
    if (withSlash) {
      res.writeHead(301, { location: url.pathname + '/' + url.search })
      res.end()
      return
    }
  }
  const notFound = join(dist, '404.html')
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  if (existsSync(notFound)) createReadStream(notFound).pipe(res)
  else res.end('Not found')
}).listen(port, '127.0.0.1', () => console.log(`legal clone on http://127.0.0.1:${port}`))
