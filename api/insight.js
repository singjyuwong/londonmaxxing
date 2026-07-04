const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-sonnet-5'

const SYSTEM_PROMPT =
  'You are an energy efficiency advisor. Summarize the government EPC data and compare it ' +
  'with the personalized bill estimate, then give 3-5 concrete, prioritized insights or ' +
  'recommendations for the household. Be concise and specific with numbers where possible.'

function getApiKey() {
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.VITE_OPENROUTER_API_KEY?.trim() ||
    null
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing OpenRouter API key. Set OPENROUTER_API_KEY in Vercel project settings.',
    })
  }

  const { prompt } = req.body || {}
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt.' })
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
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(body)
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach OpenRouter.',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
