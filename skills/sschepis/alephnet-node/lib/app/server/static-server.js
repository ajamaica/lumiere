/**
 * Static File Server
 *
 * Handles serving static files from the public directory.
 */

const fs = require('fs')
const path = require('path')

/**
 * MIME types for common file extensions
 */
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
}

/**
 * Creates static file server handlers
 * @param {Object} server - SentientServer instance
 * @returns {Object} Static server methods
 */
function createStaticServer(server) {
  /**
   * Serve static files
   */
  async function serveStatic(req, res, pathname) {
    const staticPath = path.resolve(server.options.staticPath)
    let filePath = path.join(staticPath, pathname === '/' ? 'index.html' : pathname)

    // Security: prevent directory traversal
    if (!filePath.startsWith(staticPath)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    try {
      const stat = await fs.promises.stat(filePath)

      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html')
      }

      const ext = path.extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      const content = await fs.promises.readFile(filePath)
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } catch (error) {
      // SPA fallback
      if (error.code === 'ENOENT') {
        try {
          const indexPath = path.join(staticPath, 'index.html')
          const content = await fs.promises.readFile(indexPath)
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(content)
        } catch (e) {
          res.writeHead(404)
          res.end('Not Found')
        }
      } else {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    }
  }

  /**
   * Check if a pathname is a static file request
   */
  function isStaticRequest(pathname) {
    // Check if the pathname has a file extension
    const ext = path.extname(pathname).toLowerCase()
    return ext !== '' && MIME_TYPES[ext]
  }

  return {
    serveStatic,
    isStaticRequest,
    MIME_TYPES,
  }
}

module.exports = { createStaticServer, MIME_TYPES }
