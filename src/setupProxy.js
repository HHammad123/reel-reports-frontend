const http = require('http')
const https = require('https')

const collectRequestBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', chunk => {
    body += chunk
    if (body.length > 5 * 1024 * 1024) {
      reject(new Error('Request body too large'))
      req.destroy()
    }
  })
  req.on('end', () => resolve(body))
  req.on('error', reject)
})

const fetchRemoteAsDataUrl = (targetUrl) => new Promise((resolve, reject) => {
  const parsed = new URL(targetUrl)
  const client = parsed.protocol === 'https:' ? https : http

  const options = {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: `${parsed.pathname}${parsed.search}`,
    method: 'GET',
    headers: {
      'User-Agent': 'reelreports-image-proxy',
      'Accept': '*/*',
      'Accept-Encoding': 'identity'
    }
  }

  const request = client.request(options, (response) => {
    if (!response.statusCode || response.statusCode >= 400) {
      reject(new Error(`Upstream responded with status ${response.statusCode}`))
      response.resume()
      return
    }

    const chunks = []
    response.on('data', chunk => chunks.push(chunk))
    response.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks)
        const contentType = response.headers['content-type'] || 'application/octet-stream'
        const base64 = buffer.toString('base64')
        resolve(`data:${contentType};base64,${base64}`)
      } catch (error) {
        reject(error)
      }
    })
  })

  request.on('error', reject)
  request.end()
})

module.exports = function setupProxy(app) {
  app.post('/image-proxy', async (req, res) => {
    try {
      const rawBody = await collectRequestBody(req)
      let parsedBody = {}
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody)
        } catch {
          throw new Error('Invalid JSON payload')
        }
      }
      const targetUrl = typeof parsedBody.url === 'string' ? parsedBody.url.trim() : ''
      if (!targetUrl) {
        res.status(400).json({ error: 'Missing url field' })
        return
      }
      const dataUrl = await fetchRemoteAsDataUrl(targetUrl)
      res.json({ dataUrl })
    } catch (error) {
      console.error('[image-proxy] Failed to process request:', error)
      const status = error.message && error.message.includes('Upstream responded with status')
        ? 502
        : error.message === 'Request body too large'
          ? 413
          : 500
      res.status(status).json({ error: error.message || 'Unknown error' })
    }
  })
}
