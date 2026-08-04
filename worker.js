const LIST_KEY = 'submissions'
const LINKS_KEY = 'exam-links'

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Admin-Password, X-Exam-Token',
      ...extraHeaders,
    },
  })
}

function getAdminPassword(request) {
  return request.headers.get('X-Admin-Password') || ''
}

function isAuthorized(request, env) {
  const expected = env.ADMIN_PASSWORD || ''
  if (!expected) return false
  return getAdminPassword(request) === expected
}

function randomToken() {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function readSubmissions(env) {
  const raw = await env.SUBMISSIONS.get(LIST_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeSubmissions(env, list) {
  await env.SUBMISSIONS.put(LIST_KEY, JSON.stringify(list))
}

async function readLinks(env) {
  const raw = await env.SUBMISSIONS.get(LINKS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeLinks(env, list) {
  await env.SUBMISSIONS.put(LINKS_KEY, JSON.stringify(list))
}

function findLink(links, token) {
  return links.find((l) => l.token === token) || null
}

function linkIsExpired(link) {
  if (!link?.expiresAt) return false
  return Date.now() > new Date(link.expiresAt).getTime()
}

function publicLinkStatus(link) {
  if (!link) return 'invalid'
  if (link.status === 'revoked') return 'revoked'
  if (link.status === 'used') return 'used'
  if (linkIsExpired(link)) return 'expired'
  if (link.status === 'started') return 'started'
  return 'unused'
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return json({ ok: true })
    }

    // ── Exam links (admin) ──────────────────────────────
    if (url.pathname === '/api/links') {
      if (!isAuthorized(request, env)) {
        return json({ error: 'Unauthorized' }, 401)
      }

      if (request.method === 'GET') {
        const links = await readLinks(env)
        const sorted = [...links].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )
        return json({
          links: sorted.map((l) => ({
            ...l,
            effectiveStatus: publicLinkStatus(l),
          })),
        })
      }

      if (request.method === 'POST') {
        let body = {}
        try {
          body = await request.json()
        } catch {
          body = {}
        }

        const label =
          typeof body.label === 'string' ? body.label.trim().slice(0, 80) : ''
        const hours =
          typeof body.expiresInHours === 'number' && body.expiresInHours > 0
            ? body.expiresInHours
            : null

        const token = randomToken()
        const createdAt = new Date().toISOString()
        const link = {
          token,
          label: label || 'Exam link',
          status: 'unused',
          createdAt,
          startedAt: null,
          usedAt: null,
          expiresAt: hours
            ? new Date(Date.now() + hours * 3600 * 1000).toISOString()
            : null,
          submissionId: null,
        }

        const links = await readLinks(env)
        await writeLinks(env, [link, ...links])
        return json(
          {
            ok: true,
            link: { ...link, effectiveStatus: 'unused' },
            path: `/e/${token}`,
          },
          201,
        )
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    // DELETE /api/links/:token
    const linkDeleteMatch = url.pathname.match(/^\/api\/links\/([^/]+)$/)
    if (linkDeleteMatch) {
      if (!isAuthorized(request, env)) {
        return json({ error: 'Unauthorized' }, 401)
      }
      if (request.method !== 'DELETE') {
        return json({ error: 'Method not allowed' }, 405)
      }
      const token = decodeURIComponent(linkDeleteMatch[1])
      const links = await readLinks(env)
      const link = findLink(links, token)
      if (!link) return json({ error: 'Not found' }, 404)
      link.status = 'revoked'
      link.revokedAt = new Date().toISOString()
      await writeLinks(env, links)
      return json({ ok: true, link })
    }

    // GET /api/exam/:token — validate invite
    const examMatch = url.pathname.match(/^\/api\/exam\/([^/]+)$/)
    if (examMatch && request.method === 'GET') {
      const token = decodeURIComponent(examMatch[1])
      const links = await readLinks(env)
      const link = findLink(links, token)
      const status = publicLinkStatus(link)
      if (status === 'invalid') {
        return json({ ok: false, status: 'invalid' }, 404)
      }
      if (status === 'used' || status === 'revoked' || status === 'expired') {
        return json({ ok: false, status }, 403)
      }
      return json({
        ok: true,
        status,
        label: link.label,
      })
    }

    // POST /api/exam/:token/start — mark started
    const examStartMatch = url.pathname.match(/^\/api\/exam\/([^/]+)\/start$/)
    if (examStartMatch && request.method === 'POST') {
      const token = decodeURIComponent(examStartMatch[1])
      const links = await readLinks(env)
      const link = findLink(links, token)
      const status = publicLinkStatus(link)
      if (status === 'invalid') {
        return json({ ok: false, status: 'invalid' }, 404)
      }
      if (status === 'used' || status === 'revoked' || status === 'expired') {
        return json({ ok: false, status }, 403)
      }
      if (link.status === 'unused') {
        link.status = 'started'
        link.startedAt = new Date().toISOString()
        await writeLinks(env, links)
      }
      return json({ ok: true, status: link.status })
    }

    // ── Submissions ─────────────────────────────────────
    if (url.pathname === '/api/submissions') {
      if (request.method === 'GET') {
        if (!isAuthorized(request, env)) {
          return json({ error: 'Unauthorized' }, 401)
        }
        const submissions = await readSubmissions(env)
        return json({ submissions })
      }

      if (request.method === 'POST') {
        let body
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON' }, 400)
        }

        if (!body || typeof body !== 'object' || !body.id) {
          return json({ error: 'Invalid submission' }, 400)
        }

        const examToken =
          body.examToken || request.headers.get('X-Exam-Token') || ''
        if (!examToken) {
          return json({ error: 'Exam token required' }, 403)
        }

        const links = await readLinks(env)
        const link = findLink(links, examToken)
        const status = publicLinkStatus(link)
        if (
          status === 'invalid' ||
          status === 'used' ||
          status === 'revoked' ||
          status === 'expired'
        ) {
          return json({ error: 'Exam link is not valid', status }, 403)
        }

        const stored = {
          ...body,
          examLabel: link.label || null,
          examToken: `${examToken.slice(0, 8)}…`,
        }

        const submissions = await readSubmissions(env)
        const next = [stored, ...submissions.filter((s) => s.id !== stored.id)]
        await writeSubmissions(env, next)

        link.status = 'used'
        link.usedAt = new Date().toISOString()
        link.submissionId = stored.id
        await writeLinks(env, links)

        return json({ ok: true, submission: stored }, 201)
      }

      if (request.method === 'DELETE') {
        if (!isAuthorized(request, env)) {
          return json({ error: 'Unauthorized' }, 401)
        }
        await writeSubmissions(env, [])
        return json({ ok: true })
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true })
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return json({ error: 'Not found' }, 404)
  },
}
