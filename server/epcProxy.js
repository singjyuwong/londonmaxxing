import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'

const PLACEHOLDER_TOKENS = new Set([
  'your-bearer-token-here',
  'your-bearer-token',
])

export function getBearerToken(mode = 'development') {
  const env = loadEnv(mode, process.cwd(), '')
  const envToken =
    env.EPC_BEARER_TOKEN?.trim() || env.VITE_EPC_BEARER_TOKEN?.trim()

  if (envToken && !PLACEHOLDER_TOKENS.has(envToken)) {
    return envToken
  }

  const tokenPath = path.resolve(process.cwd(), '.bearer-token')
  if (!fs.existsSync(tokenPath)) {
    return null
  }

  const fileToken = fs.readFileSync(tokenPath, 'utf8').trim()
  if (!fileToken || PLACEHOLDER_TOKENS.has(fileToken)) {
    return null
  }

  return fileToken
}

export function epcApiProxyPlugin(mode = 'development') {
  const apiOrigin = 'https://api.get-energy-performance-data.communities.gov.uk'

  return {
    name: 'epc-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/epc', async (req, res) => {
        const bearerToken = getBearerToken(mode)

        if (!bearerToken) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                'Missing bearer token. Add your token to .bearer-token or set EPC_BEARER_TOKEN in .env.',
            }),
          )
          return
        }

        const apiPath = req.url.startsWith('/api/')
          ? req.url
          : `/api${req.url}`
        const targetUrl = `${apiOrigin}${apiPath}`

        try {
          const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${bearerToken}`,
            },
          })

          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')

          const body = await upstream.text()
          res.end(body)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Failed to reach the EPC API.',
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      })
    },
  }
}
