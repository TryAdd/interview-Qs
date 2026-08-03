const API_BASE = ''

function adminHeaders(password) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Password': password || '',
  }
}

async function apiGetSubmissions(password) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    headers: adminHeaders(password),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    throw new Error(`Failed to load submissions (${res.status})`)
  }
  const data = await res.json()
  return Array.isArray(data.submissions) ? data.submissions : []
}

async function apiAddSubmission(submission) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  })
  if (!res.ok) {
    throw new Error(`Failed to save submission (${res.status})`)
  }
  return res.json()
}

async function apiClearSubmissions(password) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'DELETE',
    headers: adminHeaders(password),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) {
    throw new Error(`Failed to clear submissions (${res.status})`)
  }
}

export async function getSubmissions(password) {
  return apiGetSubmissions(password)
}

export async function addSubmission(submission) {
  await apiAddSubmission(submission)
  return submission
}

export async function clearSubmissions(password) {
  await apiClearSubmissions(password)
}
