const LIST_KEY = 'submissions'
const LINKS_KEY = 'exam-links'
const ADMINS_KEY = 'admins'
const AUDIT_KEY = 'admin-audit'
const QUESTIONS_KEY = 'question-bank'
const SUPER_NAME = 'superadmin'

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, X-Admin-Name, X-Admin-Password, X-Exam-Token',
      ...extraHeaders,
    },
  })
}

function randomToken(bytes = 18) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getSuperPassword(env) {
  return env.SUPER_ADMIN_PASSWORD || env.ADMIN_PASSWORD || ''
}

async function readJsonList(env, key) {
  const raw = await env.SUBMISSIONS.get(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeJsonList(env, key, list) {
  await env.SUBMISSIONS.put(key, JSON.stringify(list))
}

async function readQuestionBank(env) {
  const raw = await env.SUBMISSIONS.get(QUESTIONS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      objectBoxQuestions: Array.isArray(parsed.objectBoxQuestions)
        ? parsed.objectBoxQuestions
        : [],
      closingQuestions: Array.isArray(parsed.closingQuestions)
        ? parsed.closingQuestions
        : [],
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || null,
    }
  } catch {
    return null
  }
}

function normalizeQuestion(q) {
  if (!q || typeof q !== 'object') return null
  const id = typeof q.id === 'string' ? q.id.trim() : ''
  const type = q.type === 'mcq' || q.type === 'code' || q.type === 'text' ? q.type : ''
  const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : ''
  if (!id || !type || !prompt) return null

  const out = {
    id: id.slice(0, 40),
    type,
    difficulty:
      typeof q.difficulty === 'string' ? q.difficulty.slice(0, 40) : 'medium',
    prompt: prompt.slice(0, 2000),
  }
  if (typeof q.topic === 'string' && q.topic) out.topic = q.topic.slice(0, 40)
  if (q.ungraded) out.ungraded = true

  if (type === 'mcq') {
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o).slice(0, 300)).filter(Boolean)
      : []
    if (options.length < 2) return null
    out.options = options
    const idx =
      typeof q.correctIndex === 'number' && !q.ungraded ? q.correctIndex : null
    if (idx != null) {
      if (idx < 0 || idx >= options.length) return null
      out.correctIndex = idx
    }
  }

  if (type === 'code') {
    out.code = typeof q.code === 'string' ? q.code.slice(0, 8000) : ''
    if (q.checks && typeof q.checks === 'object') {
      const clean = (arr) =>
        Array.isArray(arr)
          ? arr
              .map((p) => String(p).slice(0, 300))
              .map((p) => p.trim())
              .filter(Boolean)
              .slice(0, 20)
          : []
      out.checks = {
        allOf: clean(q.checks.allOf),
        anyOf: clean(q.checks.anyOf),
        noneOf: clean(q.checks.noneOf),
      }
    }
  }

  return out
}

function normalizeBank(body) {
  const questions = Array.isArray(body?.questions)
    ? body.questions.map(normalizeQuestion).filter(Boolean)
    : []
  const objectBoxQuestions = Array.isArray(body?.objectBoxQuestions)
    ? body.objectBoxQuestions.map(normalizeQuestion).filter(Boolean)
    : []
  const closingQuestions = Array.isArray(body?.closingQuestions)
    ? body.closingQuestions.map(normalizeQuestion).filter(Boolean)
    : []
  return { questions, objectBoxQuestions, closingQuestions }
}

async function readSubmissions(env) {
  return readJsonList(env, LIST_KEY)
}

async function writeSubmissions(env, list) {
  await writeJsonList(env, LIST_KEY, list)
}

async function readLinks(env) {
  return readJsonList(env, LINKS_KEY)
}

async function writeLinks(env, list) {
  await writeJsonList(env, LINKS_KEY, list)
}

async function readAdmins(env) {
  return readJsonList(env, ADMINS_KEY)
}

async function writeAdmins(env, list) {
  await writeJsonList(env, ADMINS_KEY, list)
}

async function readAudit(env) {
  return readJsonList(env, AUDIT_KEY)
}

async function appendAudit(env, entry) {
  const list = await readAudit(env)
  const row = {
    id: randomToken(8),
    at: new Date().toISOString(),
    ...entry,
  }
  await writeJsonList(env, AUDIT_KEY, [row, ...list].slice(0, 500))
  return row
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

function publicAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    enabled: admin.enabled !== false,
    createdAt: admin.createdAt,
    disabledAt: admin.disabledAt || null,
    createdBy: admin.createdBy || null,
  }
}

async function resolveAuth(request, env) {
  const name = (request.headers.get('X-Admin-Name') || '').trim()
  const password = request.headers.get('X-Admin-Password') || ''
  if (!name || !password) return null

  const superPass = getSuperPassword(env)
  if (
    name.toLowerCase() === SUPER_NAME &&
    superPass &&
    password === superPass
  ) {
    return { role: 'super', name: SUPER_NAME, id: 'superadmin' }
  }

  const admins = await readAdmins(env)
  const admin = admins.find(
    (a) => a.name.toLowerCase() === name.toLowerCase(),
  )
  if (!admin) return null
  if (admin.enabled === false) {
    return { role: 'disabled', name: admin.name, id: admin.id }
  }

  const hash = await hashPassword(password, admin.salt)
  if (hash !== admin.passwordHash) return null
  return { role: 'admin', name: admin.name, id: admin.id }
}

async function requireAuth(request, env, { superOnly = false } = {}) {
  const auth = await resolveAuth(request, env)
  if (!auth) return { error: json({ error: 'Unauthorized' }, 401) }
  if (auth.role === 'disabled') {
    return {
      error: json(
        { error: 'Account disabled', code: 'disabled' },
        403,
      ),
    }
  }
  if (superOnly && auth.role !== 'super') {
    return { error: json({ error: 'Super admin only' }, 403) }
  }
  return { auth }
}

function actorMeta(auth) {
  return {
    actorId: auth.id,
    actorName: auth.name,
    actorRole: auth.role,
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return json({ ok: true })
    }

    // ── Auth check / login ──────────────────────────────
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      let body = {}
      try {
        body = await request.json()
      } catch {
        body = {}
      }
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      if (!name || !password) {
        return json({ error: 'Name and password required' }, 400)
      }

      // Reuse header-based resolver via a synthetic request
      const probe = new Request(request.url, {
        headers: {
          'X-Admin-Name': name,
          'X-Admin-Password': password,
        },
      })
      const auth = await resolveAuth(probe, env)
      if (!auth || auth.role === 'disabled') {
        if (auth?.role === 'disabled') {
          return json({ error: 'Account disabled', code: 'disabled' }, 403)
        }
        return json({ error: 'Unauthorized' }, 401)
      }

      await appendAudit(env, {
        ...actorMeta(auth),
        action: 'login',
        details: { role: auth.role },
      })

      return json({
        ok: true,
        role: auth.role,
        name: auth.name,
      })
    }

    // ── Admins (super only) ─────────────────────────────
    if (url.pathname === '/api/admins') {
      const gate = await requireAuth(request, env, { superOnly: true })
      if (gate.error) return gate.error
      const { auth } = gate

      if (request.method === 'GET') {
        const admins = await readAdmins(env)
        return json({ admins: admins.map(publicAdmin) })
      }

      if (request.method === 'POST') {
        let body = {}
        try {
          body = await request.json()
        } catch {
          body = {}
        }
        const name =
          typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
        const password =
          typeof body.password === 'string' ? body.password : ''
        if (!name || name.length < 2) {
          return json({ error: 'Name must be at least 2 characters' }, 400)
        }
        if (name.toLowerCase() === SUPER_NAME) {
          return json({ error: 'That name is reserved' }, 400)
        }
        if (!password || password.length < 4) {
          return json({ error: 'Password must be at least 4 characters' }, 400)
        }

        const admins = await readAdmins(env)
        if (admins.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
          return json({ error: 'Admin name already exists' }, 409)
        }

        const salt = randomToken(8)
        const passwordHash = await hashPassword(password, salt)
        const admin = {
          id: randomToken(8),
          name,
          salt,
          passwordHash,
          enabled: true,
          createdAt: new Date().toISOString(),
          createdBy: auth.name,
          disabledAt: null,
        }
        await writeAdmins(env, [admin, ...admins])
        await appendAudit(env, {
          ...actorMeta(auth),
          action: 'create_admin',
          details: { adminName: name, adminId: admin.id },
        })
        return json({ ok: true, admin: publicAdmin(admin) }, 201)
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    const adminPatchMatch = url.pathname.match(/^\/api\/admins\/([^/]+)$/)
    if (adminPatchMatch && request.method === 'PATCH') {
      const gate = await requireAuth(request, env, { superOnly: true })
      if (gate.error) return gate.error
      const { auth } = gate

      let body = {}
      try {
        body = await request.json()
      } catch {
        body = {}
      }

      const id = decodeURIComponent(adminPatchMatch[1])
      const admins = await readAdmins(env)
      const admin = admins.find((a) => a.id === id)
      if (!admin) return json({ error: 'Not found' }, 404)

      const changes = []
      const previousName = admin.name

      if (typeof body.name === 'string') {
        const nextName = body.name.trim().slice(0, 40)
        if (!nextName || nextName.length < 2) {
          return json({ error: 'Name must be at least 2 characters' }, 400)
        }
        if (nextName.toLowerCase() === SUPER_NAME) {
          return json({ error: 'That name is reserved' }, 400)
        }
        if (
          admins.some(
            (a) =>
              a.id !== admin.id &&
              a.name.toLowerCase() === nextName.toLowerCase(),
          )
        ) {
          return json({ error: 'Admin name already exists' }, 409)
        }
        if (nextName !== admin.name) {
          admin.name = nextName
          changes.push('name')
        }
      }

      if (typeof body.password === 'string' && body.password.length > 0) {
        if (body.password.length < 4) {
          return json({ error: 'Password must be at least 4 characters' }, 400)
        }
        const salt = randomToken(8)
        admin.salt = salt
        admin.passwordHash = await hashPassword(body.password, salt)
        changes.push('password')
      }

      if (typeof body.enabled === 'boolean') {
        admin.enabled = body.enabled
        admin.disabledAt = body.enabled ? null : new Date().toISOString()
        changes.push(body.enabled ? 'enable' : 'disable')
      }

      if (changes.length === 0) {
        return json({ error: 'No changes provided' }, 400)
      }

      admin.updatedAt = new Date().toISOString()
      await writeAdmins(env, admins)

      if (changes.includes('name') || changes.includes('password')) {
        await appendAudit(env, {
          ...actorMeta(auth),
          action: 'edit_admin',
          details: {
            adminId: admin.id,
            adminName: admin.name,
            previousName:
              previousName !== admin.name ? previousName : undefined,
            fields: changes.filter((c) => c === 'name' || c === 'password'),
          },
        })
      }
      if (changes.includes('enable') || changes.includes('disable')) {
        await appendAudit(env, {
          ...actorMeta(auth),
          action: changes.includes('enable') ? 'enable_admin' : 'disable_admin',
          details: { adminName: admin.name, adminId: admin.id },
        })
      }

      return json({ ok: true, admin: publicAdmin(admin) })
    }

    // ── Audit log (super only) ──────────────────────────
    if (url.pathname === '/api/audit') {
      const gate = await requireAuth(request, env, { superOnly: true })
      if (gate.error) return gate.error

      if (request.method === 'GET') {
        const audit = await readAudit(env)
        return json({ audit })
      }

      if (request.method === 'DELETE') {
        await writeJsonList(env, AUDIT_KEY, [])
        return json({ ok: true, audit: [] })
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    // ── Exam links (admin + super) ──────────────────────
    if (url.pathname === '/api/links') {
      const gate = await requireAuth(request, env)
      if (gate.error) return gate.error
      const { auth } = gate

      if (request.method === 'GET') {
        const links = await readLinks(env)
        const visible =
          auth.role === 'super'
            ? links
            : links.filter((l) => !l.clearedAt)
        const sorted = [...visible].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        )
        return json({
          role: auth.role,
          name: auth.name,
          links: sorted.map((l) => ({
            ...l,
            effectiveStatus: publicLinkStatus(l),
            cleared: Boolean(l.clearedAt),
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
          createdBy: auth.name,
          createdByRole: auth.role,
          clearedAt: null,
        }

        const links = await readLinks(env)
        await writeLinks(env, [link, ...links])
        await appendAudit(env, {
          ...actorMeta(auth),
          action: 'create_link',
          details: { label: link.label, token: `${token.slice(0, 8)}…` },
        })
        return json(
          {
            ok: true,
            link: { ...link, effectiveStatus: 'unused', cleared: false },
            path: `/e/${token}`,
          },
          201,
        )
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    // Soft-clear ended links (kept for super admin)
    if (url.pathname === '/api/links/cleanup' && request.method === 'DELETE') {
      const gate = await requireAuth(request, env)
      if (gate.error) return gate.error
      const { auth } = gate

      const links = await readLinks(env)
      const now = new Date().toISOString()
      let removed = 0
      for (const l of links) {
        const status = publicLinkStatus(l)
        const ended =
          status === 'used' || status === 'revoked' || status === 'expired'
        if (ended && !l.clearedAt) {
          l.clearedAt = now
          l.clearedBy = auth.name
          removed += 1
        }
      }
      await writeLinks(env, links)
      await appendAudit(env, {
        ...actorMeta(auth),
        action: 'clear_ended_links',
        details: { removed },
      })

      const visible =
        auth.role === 'super'
          ? links
          : links.filter((l) => !l.clearedAt)

      return json({
        ok: true,
        removed,
        links: visible
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((l) => ({
            ...l,
            effectiveStatus: publicLinkStatus(l),
            cleared: Boolean(l.clearedAt),
          })),
      })
    }

    const linkDeleteMatch = url.pathname.match(/^\/api\/links\/([^/]+)$/)
    if (linkDeleteMatch) {
      const gate = await requireAuth(request, env)
      if (gate.error) return gate.error
      const { auth } = gate

      if (request.method !== 'DELETE') {
        return json({ error: 'Method not allowed' }, 405)
      }
      const token = decodeURIComponent(linkDeleteMatch[1])
      const links = await readLinks(env)
      const link = findLink(links, token)
      if (!link) return json({ error: 'Not found' }, 404)
      link.status = 'revoked'
      link.revokedAt = new Date().toISOString()
      link.revokedBy = auth.name
      await writeLinks(env, links)
      await appendAudit(env, {
        ...actorMeta(auth),
        action: 'revoke_link',
        details: {
          label: link.label,
          token: `${token.slice(0, 8)}…`,
        },
      })
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
        expiresAt: link.expiresAt || null,
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
      return json({
        ok: true,
        status: link.status,
        expiresAt: link.expiresAt || null,
      })
    }

    // ── Submissions ─────────────────────────────────────
    if (url.pathname === '/api/submissions') {
      if (request.method === 'GET') {
        const gate = await requireAuth(request, env)
        if (gate.error) return gate.error
        const { auth } = gate
        const submissions = await readSubmissions(env)
        const visible =
          auth.role === 'super'
            ? submissions
            : submissions.filter((s) => !s.deletedAt)
        return json({
          role: auth.role,
          name: auth.name,
          submissions: visible,
        })
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
        if (!link) {
          return json({ error: 'Exam link is not valid', status: 'invalid' }, 403)
        }
        if (link.status === 'used') {
          return json({ error: 'Exam link is not valid', status: 'used' }, 403)
        }
        if (link.status === 'revoked') {
          return json(
            { error: 'Exam link is not valid', status: 'revoked' },
            403,
          )
        }
        // Allow submit after expiry if the exam was already started,
        // so partial progress can still be saved.
        if (link.status === 'unused' && linkIsExpired(link)) {
          return json(
            { error: 'Exam link is not valid', status: 'expired' },
            403,
          )
        }
        if (link.status !== 'started' && link.status !== 'unused') {
          return json(
            { error: 'Exam link is not valid', status: 'invalid' },
            403,
          )
        }

        const stored = {
          ...body,
          examLabel: link.label || null,
          examToken: `${examToken.slice(0, 8)}…`,
          deletedAt: null,
          deletedBy: null,
          submittedAfterExpiry: Boolean(
            body.endedReason === 'link-expired' || linkIsExpired(link),
          ),
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
        const gate = await requireAuth(request, env)
        if (gate.error) return gate.error
        const { auth } = gate

        const submissions = await readSubmissions(env)
        const now = new Date().toISOString()
        let removed = 0
        const next = submissions.map((s) => {
          if (s.deletedAt) return s
          removed += 1
          return {
            ...s,
            deletedAt: now,
            deletedBy: auth.name,
          }
        })
        await writeSubmissions(env, next)
        await appendAudit(env, {
          ...actorMeta(auth),
          action: 'clear_submissions',
          details: { removed },
        })

        const visible =
          auth.role === 'super'
            ? next
            : next.filter((s) => !s.deletedAt)

        return json({ ok: true, removed, submissions: visible })
      }

      return json({ error: 'Method not allowed' }, 405)
    }

    // ── Question bank ───────────────────────────────────
    if (url.pathname === '/api/questions') {
      if (request.method === 'GET') {
        const bank = await readQuestionBank(env)
        if (!bank) {
          return json({ ok: true, source: 'default', bank: null })
        }
        return json({
          ok: true,
          source: 'kv',
          bank: {
            questions: bank.questions,
            objectBoxQuestions: bank.objectBoxQuestions,
            closingQuestions: bank.closingQuestions,
          },
          updatedAt: bank.updatedAt,
          updatedBy: bank.updatedBy,
        })
      }

      if (request.method === 'PUT') {
        const gate = await requireAuth(request, env, { superOnly: true })
        if (gate.error) return gate.error
        const { auth } = gate

        let body = {}
        try {
          body = await request.json()
        } catch {
          return json({ error: 'Invalid JSON' }, 400)
        }

        const normalized = normalizeBank(body)
        if (normalized.questions.length < 10) {
          return json(
            { error: 'Core bank needs at least 10 questions' },
            400,
          )
        }

        const easy = normalized.questions.filter((q) => q.difficulty === 'easy')
        const medium = normalized.questions.filter(
          (q) => q.difficulty === 'medium',
        )
        const hard = normalized.questions.filter((q) => q.difficulty === 'hard')
        if (easy.length < 4 || medium.length < 3 || hard.length < 3) {
          return json(
            {
              error:
                'Need at least 4 easy, 3 medium, and 3 hard core questions',
            },
            400,
          )
        }

        const stored = {
          ...normalized,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.name,
        }
        await env.SUBMISSIONS.put(QUESTIONS_KEY, JSON.stringify(stored))
        await appendAudit(env, {
          ...actorMeta(auth),
          action: 'update_questions',
          details: {
            core: normalized.questions.length,
            objectBox: normalized.objectBoxQuestions.length,
            closing: normalized.closingQuestions.length,
          },
        })
        return json({
          ok: true,
          source: 'kv',
          bank: normalized,
          updatedAt: stored.updatedAt,
          updatedBy: stored.updatedBy,
        })
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
