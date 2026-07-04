import { loadEnv } from 'vite'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-5'

const SYSTEM_PROMPT =
  'You are an energy efficiency advisor. Summarize the government EPC data and compare it ' +
  'with the personalized bill estimate, then give 3-5 concrete, prioritized insights or ' +
  'recommendations for the household. Be concise and specific with numbers where possible.'

export function getOpenRouterApiKey(mode = 'development') {
  const env = loadEnv(mode, process.cwd(), '')
  return env.OPENROUTER_API_KEY?.trim() || env.VITE_OPENROUTER_API_KEY?.trim() || null
}

export function insightApiProxyPlugin(mode = 'development') {
  return {
    name: 'insight-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/insight', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        const apiKey = getOpenRouterApiKey(mode)
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                'Missing OpenRouter API key. Set OPENROUTER_API_KEY in .env.',
            }),
          )
          return
        }

        let rawBody = ''
        for await (const chunk of req) rawBody += chunk

        let prompt
        try {
          prompt = JSON.parse(rawBody || '{}').prompt
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid JSON body.' }))
          return
        }

        if (!prompt) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing prompt.' }))
          return
        }

        try {
          const upstream = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: MODEL,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
              ],
            }),
          })

          const body = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', 'application/json')
          res.end(body)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Failed to reach OpenRouter.',
              details: error instanceof Error ? error.message : String(error),
            }),
          )
        }
      })
    },
  }
}
