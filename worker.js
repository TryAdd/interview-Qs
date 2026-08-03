const LIST_KEY = 'submissions'

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return json({ ok: true })
    }

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

        const submissions = await readSubmissions(env)
        const next = [body, ...submissions.filter((s) => s.id !== body.id)]
        await writeSubmissions(env, next)
        return json({ ok: true, submission: body }, 201)
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

    // Static assets / SPA fallback
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return json({ error: 'Not found' }, 404)
  },
}
