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
      error:
        'Missing bearer token. Set EPC_BEARER_TOKEN in Vercel environment variables.',
    })
  }

  const pathParam = req.query.path
  const pathSegments = Array.isArray(pathParam)
    ? pathParam
    : pathParam
      ? [pathParam]
      : []

  const { path: _path, ...query } = req.query
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry))
    } else if (value != null) {
      searchParams.append(key, value)
    }
  }

  const queryString = searchParams.toString()
  const targetUrl = `${API_ORIGIN}/api/${pathSegments.join('/')}${queryString ? `?${queryString}` : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const body = await upstream.text()
    res
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
      .send(body)
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach the EPC API.',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
