const API_ORIGIN = 'https://api.get-energy-performance-data.communities.gov.uk'

function getBearerToken() {
  return (
    process.env.EPC_BEARER_TOKEN?.trim() ||
    process.env.VITE_EPC_BEARER_TOKEN?.trim() ||
    null
  )
}

export default async function handler(req, res) {
  const bearerToken = getBearerToken()

  if (!bearerToken) {
    return res.status(500).json({
      error: 'Missing bearer token. Set EPC_BEARER_TOKEN in Vercel project settings.',
    })
  }

  const postcode = Array.isArray(req.query.postcode)
    ? req.query.postcode[0]
    : req.query.postcode

  if (!postcode) {
    return res.status(400).json({ error: 'Missing postcode query parameter.' })
  }

  const targetUrl = `${API_ORIGIN}/api/domestic/search?postcode=${encodeURIComponent(postcode)}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(body)
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach the EPC API.',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
