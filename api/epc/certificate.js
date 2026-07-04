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

  const certificateNumber = Array.isArray(req.query.certificate_number)
    ? req.query.certificate_number[0]
    : req.query.certificate_number

  if (!certificateNumber) {
    return res.status(400).json({ error: 'Missing certificate_number query parameter.' })
  }

  const targetUrl = `${API_ORIGIN}/api/certificate?certificate_number=${encodeURIComponent(certificateNumber)}`

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
