const EPC_API_BASE = '/api/epc'

async function epcFetch(path, params = {}) {
  const searchParams = new URLSearchParams(params)
  const query = searchParams.toString()
  const url = `${EPC_API_BASE}/${path}${query ? `?${query}` : ''}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text || `Request failed (${response.status})`

    try {
      const body = JSON.parse(text)
      const raw = body.error ?? body.message ?? message
      message =
        typeof raw === 'string'
          ? raw
          : (raw?.message ?? JSON.stringify(raw))
    } catch {
      // keep text response
    }

    throw new Error(message)
  }

  return response.json()
}

export async function searchByPostcode(postcode) {
  const result = await epcFetch('domestic/search', { postcode: postcode.trim() })
  return result.data ?? []
}

export async function fetchCertificate(certificateNumber) {
  const result = await epcFetch('certificate', {
    certificate_number: certificateNumber,
  })
  return result.data ?? null
}

export function formatAddress(property) {
  return [
    property.addressLine1,
    property.addressLine2,
    property.addressLine3,
    property.addressLine4,
    property.postTown,
    property.postcode,
  ]
    .filter(Boolean)
    .join(', ')
}

export function formatCertificateAddress(certificate) {
  return [
    certificate.address_line_1,
    certificate.address_line_2,
    certificate.address_line_3,
    certificate.address_line_4,
    certificate.post_town,
    certificate.postcode,
  ]
    .filter(Boolean)
    .join(', ')
}

export function formatCurrency(value) {
  if (!value?.value && value?.value !== 0) return '—'
  return `£${value.value.toLocaleString('en-GB')}`
}
