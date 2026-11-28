// Minimal static file server for the built `dist/` output.
// Used for previewing/verifying the exact production build from the cloud VM.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import zlib from 'node:zlib'

const root = path.resolve('dist')
const port = Number(process.env.PORT ?? 3000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(url.parse(req.url).pathname)
    let file = path.join(root, pathname)
    if (pathname.endsWith('/')) file = path.join(file, 'index.html')
    if (!file.startsWith(root)) {
      res.writeHead(403).end('forbidden')
      return
    }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        const notFound = path.join(root, '404.html')
        if (fs.existsSync(notFound)) {
          res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
          fs.createReadStream(notFound).pipe(res)
        } else {
          res.writeHead(404).end('not found')
        }
        return
      }
      const type = MIME[path.extname(file)] ?? 'application/octet-stream'
      // Text assets are compressed like the origin's CDN so transfer sizes are comparable.
      const compressible = /text|javascript|json|svg|xml/.test(type)
      const accept = String(req.headers['accept-encoding'] ?? '')
      if (compressible && /gzip/.test(accept)) {
        res.writeHead(200, {
          'content-type': type,
          'content-encoding': 'gzip',
          'cache-control': 'no-cache',
        })
        fs.createReadStream(file).pipe(zlib.createGzip({ level: 9 })).pipe(res)
        return
      }
      res.writeHead(200, { 'content-type': type, 'content-length': stat.size, 'cache-control': 'no-cache' })
      fs.createReadStream(file).pipe(res)
    })
  })
  .listen(port, '0.0.0.0', () => console.log(`static server on http://0.0.0.0:${port}`))
