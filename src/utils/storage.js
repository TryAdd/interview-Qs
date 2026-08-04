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

async function apiAddSubmission(submission, examToken) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Exam-Token': examToken || '',
    },
    body: JSON.stringify({ ...submission, examToken }),
  })
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || 'Exam link is no longer valid')
    err.status = 403
    err.linkStatus = data.status
    throw err
  }
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

export async function addSubmission(submission, examToken) {
  await apiAddSubmission(submission, examToken)
  return submission
}

export async function clearSubmissions(password) {
  await apiClearSubmissions(password)
}

export async function getExamLinks(password) {
  const res = await fetch(`${API_BASE}/api/links`, {
    headers: adminHeaders(password),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) throw new Error(`Failed to load links (${res.status})`)
  const data = await res.json()
  return Array.isArray(data.links) ? data.links : []
}

export async function createExamLink(password, { label, expiresInHours } = {}) {
  const res = await fetch(`${API_BASE}/api/links`, {
    method: 'POST',
    headers: adminHeaders(password),
    body: JSON.stringify({ label, expiresInHours }),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) throw new Error(`Failed to create link (${res.status})`)
  return res.json()
}

export async function revokeExamLink(password, token) {
  const res = await fetch(
    `${API_BASE}/api/links/${encodeURIComponent(token)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(password),
    },
  )
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) throw new Error(`Failed to revoke link (${res.status})`)
  return res.json()
}

export async function validateExamToken(token) {
  const res = await fetch(
    `${API_BASE}/api/exam/${encodeURIComponent(token)}`,
  )
  const data = await res.json().catch(() => ({}))
  return {
    ok: Boolean(data.ok),
    status: data.status || (res.ok ? 'unused' : 'invalid'),
    label: data.label || '',
  }
}

export async function startExamToken(token) {
  const res = await fetch(
    `${API_BASE}/api/exam/${encodeURIComponent(token)}/start`,
    { method: 'POST' },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Could not start exam')
    err.status = res.status
    err.linkStatus = data.status
    throw err
  }
  return data
}
