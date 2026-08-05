const API_BASE = ''

function adminHeaders(name, password) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Name': name || '',
    'X-Admin-Password': password || '',
  }
}

function authError(res, data = {}) {
  const err = new Error(
    data.error ||
      (res.status === 403 ? 'Forbidden' : 'Unauthorized'),
  )
  err.status = res.status
  err.code = data.code || null
  return err
}

async function parseJson(res) {
  return res.json().catch(() => ({}))
}

export async function loginAdmin(name, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function getSubmissions(name, password) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return {
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    role: data.role,
    name: data.name,
  }
}

export async function addSubmission(submission, examToken) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Exam-Token': examToken || '',
    },
    body: JSON.stringify({ ...submission, examToken }),
  })
  const data = await parseJson(res)
  if (res.status === 403) {
    const err = new Error(data.error || 'Exam link is no longer valid')
    err.status = 403
    err.linkStatus = data.status
    throw err
  }
  if (!res.ok) {
    throw new Error(`Failed to save submission (${res.status})`)
  }
  return data
}

export async function clearSubmissions(name, password) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: 'DELETE',
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function getExamLinks(name, password) {
  const res = await fetch(`${API_BASE}/api/links`, {
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return {
    links: Array.isArray(data.links) ? data.links : [],
    role: data.role,
    name: data.name,
  }
}

export async function createExamLink(name, password, { label, expiresInHours } = {}) {
  const res = await fetch(`${API_BASE}/api/links`, {
    method: 'POST',
    headers: adminHeaders(name, password),
    body: JSON.stringify({ label, expiresInHours }),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function revokeExamLink(name, password, token) {
  const res = await fetch(
    `${API_BASE}/api/links/${encodeURIComponent(token)}`,
    {
      method: 'DELETE',
      headers: adminHeaders(name, password),
    },
  )
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function clearEndedExamLinks(name, password) {
  const res = await fetch(`${API_BASE}/api/links/cleanup`, {
    method: 'DELETE',
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function getAdmins(name, password) {
  const res = await fetch(`${API_BASE}/api/admins`, {
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return Array.isArray(data.admins) ? data.admins : []
}

export async function createAdmin(name, password, { adminName, adminPassword }) {
  const res = await fetch(`${API_BASE}/api/admins`, {
    method: 'POST',
    headers: adminHeaders(name, password),
    body: JSON.stringify({ name: adminName, password: adminPassword }),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function setAdminEnabled(name, password, adminId, enabled) {
  const res = await fetch(
    `${API_BASE}/api/admins/${encodeURIComponent(adminId)}`,
    {
      method: 'PATCH',
      headers: adminHeaders(name, password),
      body: JSON.stringify({ enabled }),
    },
  )
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function updateAdmin(
  name,
  password,
  adminId,
  { adminName, adminPassword } = {},
) {
  const body = {}
  if (typeof adminName === 'string') body.name = adminName
  if (typeof adminPassword === 'string' && adminPassword.length > 0) {
    body.password = adminPassword
  }
  const res = await fetch(
    `${API_BASE}/api/admins/${encodeURIComponent(adminId)}`,
    {
      method: 'PATCH',
      headers: adminHeaders(name, password),
      body: JSON.stringify(body),
    },
  )
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
}

export async function getAuditLog(name, password) {
  const res = await fetch(`${API_BASE}/api/audit`, {
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return Array.isArray(data.audit) ? data.audit : []
}

export async function clearAuditLog(name, password) {
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: 'DELETE',
    headers: adminHeaders(name, password),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return Array.isArray(data.audit) ? data.audit : []
}

export async function getQuestionBank() {
  const res = await fetch(`${API_BASE}/api/questions`)
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data.error || 'Failed to load questions')
  return data
}

export async function saveQuestionBank(name, password, bank) {
  const res = await fetch(`${API_BASE}/api/questions`, {
    method: 'PUT',
    headers: adminHeaders(name, password),
    body: JSON.stringify(bank),
  })
  const data = await parseJson(res)
  if (!res.ok) throw authError(res, data)
  return data
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
