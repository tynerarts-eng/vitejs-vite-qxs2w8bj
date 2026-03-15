export async function fetchContent(admin = false) {
  const response = await fetch(admin ? '/api/admin/content' : '/api/public/content')
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }
  return response.json()
}

export async function sendJson(url, method, payload) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`)
  }

  return data
}
