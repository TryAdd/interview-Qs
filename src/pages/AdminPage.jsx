import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  clearAuditLog,
  clearEndedExamLinks,
  clearSubmissions,
  createAdmin,
  createExamLink,
  getAdmins,
  getAuditLog,
  getExamLinks,
  getSubmissions,
  loginAdmin,
  revokeExamLink,
  setAdminEnabled,
  updateAdmin,
} from '../utils/storage'
import QuestionsEditor from '../components/QuestionsEditor'

const SESSION = {
  admin: {
    auth: 'interview-qs-admin-auth',
    name: 'interview-qs-admin-name',
    pass: 'interview-qs-admin-pass',
    role: 'interview-qs-admin-role',
  },
  super: {
    auth: 'interview-qs-super-auth',
    name: 'interview-qs-super-name',
    pass: 'interview-qs-super-pass',
    role: 'interview-qs-super-role',
  },
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return 'unknown'
  const sec = Math.max(0, Math.round(ms / 1000))
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s}s`
}

function reasonLabel(reason) {
  if (reason === 'tab-hidden') return 'Switched tab / minimized'
  if (reason === 'window-blur') return 'Left window / lost focus'
  return reason || 'Left page'
}

function actionLabel(action) {
  const map = {
    login: 'Logged in',
    create_link: 'Created exam link',
    revoke_link: 'Revoked exam link',
    clear_ended_links: 'Cleared ended links',
    clear_submissions: 'Cleared submissions',
    create_admin: 'Created admin',
    edit_admin: 'Edited admin',
    update_questions: 'Updated questions',
    disable_admin: 'Disabled admin',
    enable_admin: 'Enabled admin',
  }
  return map[action] || action
}

function summarizeSubmission(sub) {
  const answers = sub.answers || []
  const reached = answers.filter((a) => !a.skipped)
  const answered = reached.filter((a) => {
    if (a.type === 'mcq') return a.selectedIndex != null || (a.answer && a.answer !== '')
    return Boolean(a.answer && String(a.answer).trim())
  })

  const mcq = answers.filter((a) => a.type === 'mcq' && !a.ungraded && !a.skipped)
  const mcqCorrect = mcq.filter((a) => a.isCorrect).length

  const code = answers.filter((a) => a.type === 'code' && !a.skipped)
  const codePassed = code.filter((a) => a.isCorrect).length

  const textReview = answers.filter(
    (a) => a.type === 'text' && !a.ungraded && !a.skipped,
  ).length

  const leaveCount = sub.focusLeaves?.count ?? 0
  const leaveEvents = sub.focusLeaves?.events ?? []
  const totalAwayMs = leaveEvents.reduce(
    (sum, ev) => sum + (typeof ev.durationMs === 'number' ? ev.durationMs : 0),
    0,
  )

  const gradedTotal = mcq.length + code.length
  const gradedCorrect = mcqCorrect + codePassed
  const scorePct =
    gradedTotal > 0 ? Math.round((gradedCorrect / gradedTotal) * 100) : null

  const storeAnswer = answers.find((a) => a.questionId === 'close2')
  const deployNote = storeAnswer?.answer || null

  const timedAnswers = answers.filter(
    (a) => typeof a.durationMs === 'number' && a.durationMs >= 0,
  )
  const totalExamMs = timedAnswers.reduce((sum, a) => sum + a.durationMs, 0)
  const avgMs =
    timedAnswers.length > 0
      ? Math.round(totalExamMs / timedAnswers.length)
      : null
  const slowest = timedAnswers.reduce(
    (best, a) => (!best || a.durationMs > best.durationMs ? a : best),
    null,
  )

  return {
    answers,
    answeredCount: answered.length,
    totalCount: answers.length,
    mcqCorrect,
    mcqTotal: mcq.length,
    codePassed,
    codeTotal: code.length,
    textReview,
    leaveCount,
    leaveEvents,
    totalAwayMs,
    scorePct,
    gradedCorrect,
    gradedTotal,
    deployNote,
    totalExamMs,
    avgMs,
    slowest,
  }
}

function SubmissionCard({ sub, isSuper }) {
  const stats = summarizeSubmission(sub)
  const deleted = Boolean(sub.deletedAt)

  return (
    <li className={`submission-card ${deleted ? 'is-deleted' : ''}`}>
      <details className="submission-details">
        <summary className="submission-summary">
          <div className="summary-top">
            <strong className="summary-name">{sub.name}</strong>
            {sub.email ? (
              <span className="summary-email">{sub.email}</span>
            ) : null}
            <span className="summary-time">{formatTime(sub.submittedAt)}</span>
            {isSuper && deleted ? (
              <span className="tag tag-miss">Deleted by {sub.deletedBy || 'admin'}</span>
            ) : null}
            <span className="summary-chevron" aria-hidden="true" />
          </div>

          <div className="summary-stats">
            <span className="summary-stat">
              <em>Answered</em>
              {stats.answeredCount}/{stats.totalCount}
            </span>
            <span className="summary-stat">
              <em>Score</em>
              {stats.scorePct == null
                ? '—'
                : `${stats.gradedCorrect}/${stats.gradedTotal} (${stats.scorePct}%)`}
            </span>
            <span className="summary-stat">
              <em>MCQ</em>
              {stats.mcqCorrect}/{stats.mcqTotal}
            </span>
            <span className="summary-stat">
              <em>Code</em>
              {stats.codePassed}/{stats.codeTotal}
            </span>
            <span
              className={`summary-stat ${stats.leaveCount > 0 ? 'is-alert' : 'is-ok'}`}
            >
              <em>Unfocus</em>
              {stats.leaveCount > 0
                ? `${stats.leaveCount}× · ${formatDuration(stats.totalAwayMs)}`
                : 'None'}
            </span>
            <span className="summary-stat">
              <em>Total time</em>
              {stats.totalExamMs > 0 ? formatDuration(stats.totalExamMs) : '—'}
            </span>
            <span className="summary-stat">
              <em>Avg / Q</em>
              {stats.avgMs != null ? formatDuration(stats.avgMs) : '—'}
            </span>
            <span className="summary-stat">
              <em>ObjectBox</em>
              {sub.skippedObjectBox
                ? 'Skipped'
                : sub.usedObjectBox === true
                  ? 'Yes'
                  : sub.usedObjectBox === false
                    ? 'No'
                    : '—'}
            </span>
            {sub.endedEarly ? (
              <span className="summary-stat is-alert">
                <em>Status</em>
                Ended early (Q{sub.skippedAtQuestion})
              </span>
            ) : (
              <span className="summary-stat is-ok">
                <em>Status</em>
                Completed
              </span>
            )}
            {stats.deployNote ? (
              <span className="summary-stat summary-stat-wide">
                <em>Stores</em>
                {stats.deployNote}
              </span>
            ) : null}
          </div>
        </summary>

        <div className="submission-body">
          {isSuper && deleted ? (
            <p className="review-note">
              Soft-deleted {formatTime(sub.deletedAt)}
              {sub.deletedBy ? ` by ${sub.deletedBy}` : ''}. Still visible to
              super admin only.
            </p>
          ) : null}

          {stats.leaveCount > 0 ? (
            <div className="focus-leave-details open-block">
              <p className="focus-leave-title">Focus / window leave log</p>
              <ul className="focus-leave-list">
                {stats.leaveEvents.map((ev, i) => (
                  <li key={`${ev.at}-${i}`}>
                    <span>{formatTime(ev.at)}</span>
                    <span>Q{ev.questionIndex}</span>
                    <span>{reasonLabel(ev.reason)}</span>
                    <span>away {formatDuration(ev.durationMs)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="focus-ok-note">No focus / window leaves during the exam.</p>
          )}

          {stats.textReview > 0 ? (
            <p className="review-note">
              {stats.textReview} open-text answer
              {stats.textReview === 1 ? '' : 's'} to review manually.
            </p>
          ) : null}

          <ol className="answer-list">
            {stats.answers.map((a, i) => (
              <li key={a.questionId}>
                <p className="answer-q">
                  {i + 1}. {a.prompt}
                  {a.difficulty ? (
                    <span
                      className={`difficulty-badge difficulty-${a.difficulty}`}
                    >
                      {a.difficulty}
                    </span>
                  ) : null}
                  {typeof a.durationMs === 'number' ? (
                    <span className="time-badge">
                      {formatDuration(a.durationMs)}
                    </span>
                  ) : null}
                </p>
                {a.type === 'code' && (a.starterCode || a.code) ? (
                  <pre className="code-block code-block-admin">
                    <code>{a.starterCode || a.code}</code>
                  </pre>
                ) : null}
                <p className="answer-a">{a.answer || '—'}</p>
                {a.type === 'code' && a.explanation ? (
                  <p className="answer-explanation">
                    <span className="answer-explanation-label">
                      Explanation:{' '}
                    </span>
                    {a.explanation}
                  </p>
                ) : null}
                {a.ungraded ? (
                  <span className="tag tag-review">
                    {a.skipped ? 'Not reached' : 'No right/wrong'}
                  </span>
                ) : a.type === 'mcq' ? (
                  <span
                    className={a.isCorrect ? 'tag tag-ok' : 'tag tag-miss'}
                  >
                    {a.skipped
                      ? 'Not reached'
                      : a.isCorrect
                        ? 'Correct'
                        : 'Incorrect'}
                  </span>
                ) : a.type === 'code' ? (
                  <span
                    className={
                      a.skipped
                        ? 'tag tag-miss'
                        : a.isCorrect
                          ? 'tag tag-ok'
                          : 'tag tag-review'
                    }
                  >
                    {a.skipped
                      ? 'Skipped / ended'
                      : a.isCorrect
                        ? 'Code passed'
                        : 'Code failed'}
                  </span>
                ) : (
                  <span className="tag tag-review">
                    {a.skipped ? 'Not reached' : 'Review manually'}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </details>
    </li>
  )
}

function examUrl(token) {
  return `${window.location.origin}/e/${token}`
}

function statusClass(status) {
  if (status === 'unused') return 'tag tag-ok'
  if (status === 'started') return 'tag tag-review'
  return 'tag tag-miss'
}

function clearSession(keys) {
  sessionStorage.removeItem(keys.auth)
  sessionStorage.removeItem(keys.name)
  sessionStorage.removeItem(keys.pass)
  sessionStorage.removeItem(keys.role)
}

function saveSession(keys, { name, password, role }) {
  sessionStorage.setItem(keys.auth, '1')
  sessionStorage.setItem(keys.name, name)
  sessionStorage.setItem(keys.pass, password)
  sessionStorage.setItem(keys.role, role)
}

function readSession(keys) {
  return {
    name: sessionStorage.getItem(keys.name) || '',
    password: sessionStorage.getItem(keys.pass) || '',
    role: sessionStorage.getItem(keys.role) || '',
  }
}

export default function AdminPage({ mode = 'admin' }) {
  const keys = SESSION[mode] || SESSION.admin
  const requiresSuper = mode === 'super'

  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(keys.auth) === '1',
  )
  const [loginName, setLoginName] = useState(
    () => (requiresSuper ? 'superadmin' : ''),
  )
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(() => sessionStorage.getItem(keys.role) || '')
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem(keys.name) || '',
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState([])
  const [links, setLinks] = useState([])
  const [linkLabel, setLinkLabel] = useState('')
  const [linkHours, setLinkHours] = useState('')
  const [copiedToken, setCopiedToken] = useState('')
  const [admins, setAdmins] = useState([])
  const [audit, setAudit] = useState([])
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [editingAdminId, setEditingAdminId] = useState('')
  const [editAdminName, setEditAdminName] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')
  const [activeTab, setActiveTab] = useState(() =>
    requiresSuper ? 'admins' : 'links',
  )
  const [linkFilter, setLinkFilter] = useState('active')
  const [subFilter, setSubFilter] = useState('active')

  const isSuper = requiresSuper && role === 'super'

  const sorted = useMemo(
    () =>
      [...submissions].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
      ),
    [submissions],
  )

  const activeLinks = useMemo(
    () => links.filter((l) => !l.cleared),
    [links],
  )
  const clearedLinks = useMemo(
    () => links.filter((l) => l.cleared),
    [links],
  )
  const visibleLinks = useMemo(() => {
    if (!isSuper) return links
    if (linkFilter === 'cleared') return clearedLinks
    if (linkFilter === 'all') return links
    return activeLinks
  }, [isSuper, linkFilter, links, activeLinks, clearedLinks])

  const activeSubs = useMemo(
    () => sorted.filter((s) => !s.deletedAt),
    [sorted],
  )
  const deletedSubs = useMemo(
    () => sorted.filter((s) => s.deletedAt),
    [sorted],
  )
  const visibleSubs = useMemo(() => {
    if (!isSuper) return sorted
    if (subFilter === 'deleted') return deletedSubs
    if (subFilter === 'all') return sorted
    return activeSubs
  }, [isSuper, subFilter, sorted, activeSubs, deletedSubs])

  const tabs = isSuper
    ? [
        { id: 'admins', label: 'Admins', count: admins.length },
        { id: 'questions', label: 'Questions', count: null },
        { id: 'activity', label: 'Activity', count: audit.length },
        { id: 'links', label: 'Exam links', count: links.length },
        { id: 'submissions', label: 'Submissions', count: submissions.length },
      ]
    : [
        { id: 'links', label: 'Exam links', count: links.length },
        {
          id: 'submissions',
          label: 'Submissions',
          count: submissions.length,
        },
      ]

  function handleAuthFailure(err) {
    if (err.status === 401 || err.code === 'disabled' || err.status === 403) {
      clearSession(keys)
      setAuthed(false)
      setRole('')
      setDisplayName('')
      if (err.code === 'disabled') {
        setError('This admin account has been disabled by the super admin.')
      } else if (err.status === 401) {
        setError('Incorrect name or password.')
      } else {
        setError(err.message || 'Access denied.')
      }
      return true
    }
    return false
  }

  function roleAllowed(nextRole) {
    if (requiresSuper) return nextRole === 'super'
    return nextRole === 'admin'
  }

  async function loadAll(name, pass) {
    setLoading(true)
    setError('')
    try {
      const [subsRes, linksRes] = await Promise.all([
        getSubmissions(name, pass),
        getExamLinks(name, pass),
      ])
      const nextRole = subsRes.role || linksRes.role || role
      const nextName = subsRes.name || linksRes.name || name

      if (!roleAllowed(nextRole)) {
        clearSession(keys)
        setAuthed(false)
        setRole('')
        setDisplayName('')
        setError(
          requiresSuper
            ? 'Super admin credentials required for this page.'
            : 'Use /superadmin for the super admin account.',
        )
        return false
      }

      setSubmissions(subsRes.submissions)
      setLinks(linksRes.links)
      setRole(nextRole)
      setDisplayName(nextName)
      sessionStorage.setItem(keys.role, nextRole)
      sessionStorage.setItem(keys.name, nextName)

      if (requiresSuper) {
        const [adminList, auditList] = await Promise.all([
          getAdmins(name, pass),
          getAuditLog(name, pass),
        ])
        setAdmins(adminList)
        setAudit(auditList)
      } else {
        setAdmins([])
        setAudit([])
      }
      return true
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to load admin data.')
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    const { name, password: pass } = readSession(keys)
    if (!name || !pass) {
      clearSession(keys)
      setAuthed(false)
      return
    }
    loadAll(name, pass)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, mode])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const name = requiresSuper
        ? 'superadmin'
        : loginName.trim()
      const result = await loginAdmin(name, password)
      if (!roleAllowed(result.role)) {
        setError(
          requiresSuper
            ? 'Super admin credentials required for this page.'
            : 'Use /superadmin for the super admin account.',
        )
        return
      }
      saveSession(keys, {
        name: result.name,
        password,
        role: result.role,
      })
      setRole(result.role)
      setDisplayName(result.name)
      setPassword('')
      if (!requiresSuper) setLoginName('')
      setAuthed(true)
    } catch (err) {
      if (err.code === 'disabled') {
        setError('This admin account has been disabled by the super admin.')
      } else if (err.status === 401) {
        setError('Incorrect name or password.')
      } else {
        setError(
          err.message || 'Could not reach the API. Deploy the worker first.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    if (
      !window.confirm(
        isSuper
          ? 'Soft-delete all submissions? Admins will no longer see them; you keep a copy.'
          : 'Clear all submissions from the admin view? (Super admin still keeps a copy.)',
      )
    ) {
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const result = await clearSubmissions(name, pass)
      setSubmissions(
        Array.isArray(result.submissions) ? result.submissions : [],
      )
      if (isSuper) {
        setAudit(await getAuditLog(name, pass))
      }
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to clear submissions.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleRefresh() {
    const { name, password: pass } = readSession(keys)
    if (name && pass) loadAll(name, pass)
  }

  async function handleCreateLink(e) {
    e.preventDefault()
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const hours = linkHours ? Number(linkHours) : null
      const result = await createExamLink(name, pass, {
        label: linkLabel.trim() || undefined,
        expiresInHours: Number.isFinite(hours) && hours > 0 ? hours : undefined,
      })
      setLinks((prev) => [result.link, ...prev])
      setLinkLabel('')
      setLinkHours('')
      const url = examUrl(result.link.token)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedToken(result.link.token)
      } catch {
        // ignore clipboard failures
      }
      if (isSuper) setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to create link.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyLink(token) {
    try {
      await navigator.clipboard.writeText(examUrl(token))
      setCopiedToken(token)
    } catch {
      setError('Could not copy link. Copy it manually from the list.')
    }
  }

  async function handleRevokeLink(token) {
    if (!window.confirm('Revoke this invite link? It will stop working immediately.')) {
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      await revokeExamLink(name, pass, token)
      setLinks((prev) =>
        prev.map((l) =>
          l.token === token
            ? { ...l, status: 'revoked', effectiveStatus: 'revoked' }
            : l,
        ),
      )
      if (isSuper) setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to revoke link.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleClearEndedLinks() {
    const endedCount = links.filter((l) => {
      if (l.cleared) return false
      const status = l.effectiveStatus || l.status
      return status === 'used' || status === 'revoked' || status === 'expired'
    }).length
    if (endedCount === 0) {
      setError('No revoked or ended links to clear.')
      return
    }
    if (
      !window.confirm(
        `Clear ${endedCount} revoked/used/expired link${endedCount === 1 ? '' : 's'} from admin view? Super admin keeps them.`,
      )
    ) {
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const result = await clearEndedExamLinks(name, pass)
      setLinks(Array.isArray(result.links) ? result.links : [])
      if (isSuper) setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to clear ended links.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault()
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const result = await createAdmin(name, pass, {
        adminName: newAdminName.trim(),
        adminPassword: newAdminPassword,
      })
      setAdmins((prev) => [result.admin, ...prev])
      setNewAdminName('')
      setNewAdminPassword('')
      setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to create admin.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAdmin(admin) {
    const enable = !admin.enabled
    const label = enable ? 'Enable' : 'Disable'
    if (
      !window.confirm(
        `${label} admin "${admin.name}"? ${
          enable
            ? 'They can use /admin again.'
            : 'They will be locked out of /admin.'
        }`,
      )
    ) {
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const result = await setAdminEnabled(name, pass, admin.id, enable)
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? result.admin : a)),
      )
      setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to update admin.')
      }
    } finally {
      setLoading(false)
    }
  }

  function startEditAdmin(admin) {
    setEditingAdminId(admin.id)
    setEditAdminName(admin.name)
    setEditAdminPassword('')
    setError('')
  }

  function cancelEditAdmin() {
    setEditingAdminId('')
    setEditAdminName('')
    setEditAdminPassword('')
  }

  async function handleEditAdmin(e) {
    e.preventDefault()
    if (!editingAdminId) return
    const nextName = editAdminName.trim()
    if (!nextName) {
      setError('Admin name is required.')
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const result = await updateAdmin(name, pass, editingAdminId, {
        adminName: nextName,
        adminPassword: editAdminPassword,
      })
      setAdmins((prev) =>
        prev.map((a) => (a.id === editingAdminId ? result.admin : a)),
      )
      cancelEditAdmin()
      setAudit(await getAuditLog(name, pass))
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to edit admin.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleClearAudit() {
    if (audit.length === 0) {
      setError('Activity log is already empty.')
      return
    }
    if (
      !window.confirm(
        `Clear all ${audit.length} activity log entr${audit.length === 1 ? 'y' : 'ies'}? This cannot be undone.`,
      )
    ) {
      return
    }
    const { name, password: pass } = readSession(keys)
    setLoading(true)
    setError('')
    try {
      const next = await clearAuditLog(name, pass)
      setAudit(next)
    } catch (err) {
      if (!handleAuthFailure(err)) {
        setError(err.message || 'Failed to clear activity log.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearSession(keys)
    setAuthed(false)
    setRole('')
    setDisplayName('')
    setSubmissions([])
    setLinks([])
    setAdmins([])
    setAudit([])
    if (requiresSuper) setLoginName('superadmin')
  }

  if (!authed) {
    return (
      <div className="page">
        <div className="panel admin-login">
          <p className="eyebrow">{requiresSuper ? 'Super admin' : 'Admin'}</p>
          <h1 className="brand">Interview Q&apos;s</h1>
          <p className="lead">
            {requiresSuper
              ? 'Enter the super admin password to manage admins and the full archive.'
              : 'Sign in with your admin name and password.'}
          </p>
          <form className="start-form" onSubmit={handleLogin}>
            {requiresSuper ? null : (
              <>
                <label htmlFor="admin-name">Name</label>
                <input
                  id="admin-name"
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoComplete="username"
                  required
                />
              </>
            )}
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
          </form>
          <Link to="/" className="text-link">
            Back to quiz
          </Link>
        </div>
      </div>
    )
  }

  function renderLinkList(list) {
    if (list.length === 0) {
      return <p className="empty-state">No links in this section.</p>
    }
    return (
      <ul className="link-list">
        {list.map((link) => {
          const status = link.effectiveStatus || link.status
          const url = examUrl(link.token)
          return (
            <li
              key={link.token}
              className={`link-card ${link.cleared ? 'is-deleted' : ''}`}
            >
              <div className="link-card-top">
                <strong>{link.label || 'Exam link'}</strong>
                <span className={statusClass(status)}>{status}</span>
                {isSuper && link.cleared ? (
                  <span className="tag tag-miss">cleared from admins</span>
                ) : null}
              </div>
              <code className="link-url">{url}</code>
              <div className="link-meta">
                <span>Created {formatTime(link.createdAt)}</span>
                {link.createdBy ? <span>by {link.createdBy}</span> : null}
                {link.expiresAt ? (
                  <span>Expires {formatTime(link.expiresAt)}</span>
                ) : (
                  <span>No time expiry</span>
                )}
                {link.usedAt ? <span>Used {formatTime(link.usedAt)}</span> : null}
                {isSuper && link.clearedAt ? (
                  <span>
                    Cleared {formatTime(link.clearedAt)}
                    {link.clearedBy ? ` by ${link.clearedBy}` : ''}
                  </span>
                ) : null}
              </div>
              <div className="link-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleCopyLink(link.token)}
                >
                  {copiedToken === link.token ? 'Copied' : 'Copy link'}
                </button>
                {status === 'unused' || status === 'started' ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleRevokeLink(link.token)}
                    disabled={loading}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  function renderSubmissions(list) {
    if (loading) return <p className="empty-state">Loading…</p>
    if (list.length === 0) {
      return <p className="empty-state">No submissions in this section.</p>
    }
    return (
      <ul className="submission-list">
        {list.map((sub) => (
          <SubmissionCard key={sub.id} sub={sub} isSuper={isSuper} />
        ))}
      </ul>
    )
  }

  return (
    <div className="page page-wide">
      <div className={`panel admin-panel ${isSuper ? 'admin-panel-super' : ''}`}>
        <header className="admin-header">
          <div>
            <p className="eyebrow">
              {isSuper ? 'Super admin' : 'Admin results'}
            </p>
            <h1 className="brand-sm">Interview Q&apos;s</h1>
            <p className="admin-user-line">
              Signed in as <strong>{displayName}</strong>
              {isSuper ? ' · full archive + audit access' : ''}
            </p>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="admin-tabs">
          <div className="admin-tablist" role="tablist" aria-label="Admin sections">
            {tabs.map((item) => {
              const selected = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${item.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`admin-tab ${selected ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                  {item.count != null ? (
                    <span className="admin-tab-count">{item.count}</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="admin-tabpanels">
            {isSuper && activeTab === 'admins' ? (
              <section
                className="admin-tabpanel"
                role="tabpanel"
                id="panel-admins"
                aria-labelledby="tab-admins"
              >
                <div className="admin-section-head">
                  <div>
                    <h2 className="section-title">Admins</h2>
                    <p className="lead section-lead">
                      Create accounts and disable access. They sign in at{' '}
                      <code>/admin</code>.
                    </p>
                  </div>
                </div>

                <div className="admin-subblocks">
                  <div className="admin-subblock">
                    <h3 className="subblock-title">Create admin</h3>
                    <form className="link-form" onSubmit={handleCreateAdmin}>
                      <label htmlFor="new-admin-name">Admin name</label>
                      <input
                        id="new-admin-name"
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="e.g. sara"
                        required
                      />
                      <label htmlFor="new-admin-password">Admin password</label>
                      <input
                        id="new-admin-password"
                        type="password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <div className="link-form-actions">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading}
                        >
                          Create admin
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="admin-subblock">
                    <h3 className="subblock-title">
                      Admin accounts ({admins.length})
                    </h3>
                    {admins.length === 0 ? (
                      <p className="empty-state">No admins created yet.</p>
                    ) : (
                      <ul className="admin-user-list">
                        {admins.map((admin) => (
                          <li key={admin.id} className="admin-user-card">
                            <div className="link-card-top">
                              <strong>{admin.name}</strong>
                              <span
                                className={
                                  admin.enabled ? 'tag tag-ok' : 'tag tag-miss'
                                }
                              >
                                {admin.enabled ? 'active' : 'disabled'}
                              </span>
                            </div>
                            <div className="link-meta">
                              <span>Created {formatTime(admin.createdAt)}</span>
                              {admin.createdBy ? (
                                <span>by {admin.createdBy}</span>
                              ) : null}
                              {admin.disabledAt ? (
                                <span>
                                  Disabled {formatTime(admin.disabledAt)}
                                </span>
                              ) : null}
                            </div>
                            <div className="link-actions">
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() =>
                                  editingAdminId === admin.id
                                    ? cancelEditAdmin()
                                    : startEditAdmin(admin)
                                }
                                disabled={loading}
                              >
                                {editingAdminId === admin.id
                                  ? 'Cancel edit'
                                  : 'Edit name / password'}
                              </button>
                              <button
                                type="button"
                                className={
                                  admin.enabled
                                    ? 'btn btn-danger'
                                    : 'btn btn-secondary'
                                }
                                onClick={() => handleToggleAdmin(admin)}
                                disabled={loading}
                              >
                                {admin.enabled
                                  ? 'Disable access'
                                  : 'Enable access'}
                              </button>
                            </div>

                            {editingAdminId === admin.id ? (
                              <form
                                className="link-form admin-edit-form"
                                onSubmit={handleEditAdmin}
                              >
                                <label htmlFor={`edit-admin-name-${admin.id}`}>
                                  Name
                                </label>
                                <input
                                  id={`edit-admin-name-${admin.id}`}
                                  type="text"
                                  value={editAdminName}
                                  onChange={(e) =>
                                    setEditAdminName(e.target.value)
                                  }
                                  required
                                />
                                <label
                                  htmlFor={`edit-admin-password-${admin.id}`}
                                >
                                  New password (leave blank to keep current)
                                </label>
                                <input
                                  id={`edit-admin-password-${admin.id}`}
                                  type="password"
                                  value={editAdminPassword}
                                  onChange={(e) =>
                                    setEditAdminPassword(e.target.value)
                                  }
                                  autoComplete="new-password"
                                  placeholder="Optional"
                                />
                                <div className="link-form-actions">
                                  <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                  >
                                    Save changes
                                  </button>
                                </div>
                              </form>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {isSuper && activeTab === 'questions' ? (
              <section
                className="admin-tabpanel"
                role="tabpanel"
                id="panel-questions"
                aria-labelledby="tab-questions"
              >
                <QuestionsEditor
                  sessionName={readSession(keys).name}
                  sessionPassword={readSession(keys).password}
                  onError={setError}
                  onAuthFailure={handleAuthFailure}
                  onSaved={async () => {
                    const { name, password: pass } = readSession(keys)
                    try {
                      setAudit(await getAuditLog(name, pass))
                    } catch {
                      // ignore audit refresh failures
                    }
                  }}
                />
              </section>
            ) : null}

            {isSuper && activeTab === 'activity' ? (
              <section
                className="admin-tabpanel"
                role="tabpanel"
                id="panel-activity"
                aria-labelledby="tab-activity"
              >
                <div className="admin-section-head">
                  <div>
                    <h2 className="section-title">Admin activity</h2>
                    <p className="lead section-lead">
                      Log of create, revoke, clear, login, and admin changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleClearAudit}
                    disabled={loading || audit.length === 0}
                  >
                    Clear log
                  </button>
                </div>
                {audit.length === 0 ? (
                  <p className="empty-state">No activity yet.</p>
                ) : (
                  <ul className="audit-list">
                    {audit.map((row) => (
                      <li key={row.id} className="audit-row">
                        <span className="audit-time">{formatTime(row.at)}</span>
                        <span className="audit-who">
                          {row.actorName}
                          <em>{row.actorRole}</em>
                        </span>
                        <span className="audit-action">
                          {actionLabel(row.action)}
                        </span>
                        <span className="audit-details">
                          {row.details
                            ? Object.entries(row.details)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')
                            : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {activeTab === 'links' ? (
              <section
                className="admin-tabpanel"
                role="tabpanel"
                id="panel-links"
                aria-labelledby="tab-links"
              >
                <div className="admin-section-head">
                  <div>
                    <h2 className="section-title">One-time exam links</h2>
                    <p className="lead section-lead">
                      Generate a private link for each candidate. After they
                      finish (or you revoke it), the link cannot open the exam
                      again.
                    </p>
                  </div>
                </div>

                {isSuper ? (
                  <div
                    className="inner-tablist"
                    role="tablist"
                    aria-label="Link filters"
                  >
                    {[
                      { id: 'active', label: 'Active', count: activeLinks.length },
                      {
                        id: 'cleared',
                        label: 'Cleared',
                        count: clearedLinks.length,
                      },
                      { id: 'all', label: 'All', count: links.length },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={linkFilter === item.id}
                        className={`inner-tab ${linkFilter === item.id ? 'is-active' : ''}`}
                        onClick={() => setLinkFilter(item.id)}
                      >
                        {item.label}
                        <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <form className="link-form" onSubmit={handleCreateLink}>
                  <label htmlFor="link-label">Label (optional)</label>
                  <input
                    id="link-label"
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="e.g. Ahmed — Flutter round"
                  />
                  <label htmlFor="link-hours">Expires in hours (optional)</label>
                  <input
                    id="link-hours"
                    type="text"
                    inputMode="numeric"
                    value={linkHours}
                    onChange={(e) => setLinkHours(e.target.value)}
                    placeholder="e.g. 48 (leave empty for no time expiry)"
                  />
                  <div className="link-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Generate link
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleClearEndedLinks}
                      disabled={loading}
                    >
                      Clear revoked / ended links
                    </button>
                  </div>
                </form>

                {renderLinkList(visibleLinks)}
              </section>
            ) : null}

            {activeTab === 'submissions' ? (
              <section
                className="admin-tabpanel"
                role="tabpanel"
                id="panel-submissions"
                aria-labelledby="tab-submissions"
              >
                <div className="admin-section-head">
                  <div>
                    <h2 className="section-title">Submissions</h2>
                    <p className="lead section-lead">
                      {isSuper
                        ? 'Active results and soft-deleted archive kept after admins clear data.'
                        : 'Candidate results from completed exams.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleClear}
                    disabled={loading}
                  >
                    Clear all
                  </button>
                </div>

                {isSuper ? (
                  <div
                    className="inner-tablist"
                    role="tablist"
                    aria-label="Submission filters"
                  >
                    {[
                      { id: 'active', label: 'Active', count: activeSubs.length },
                      {
                        id: 'deleted',
                        label: 'Deleted',
                        count: deletedSubs.length,
                      },
                      { id: 'all', label: 'All', count: sorted.length },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={subFilter === item.id}
                        className={`inner-tab ${subFilter === item.id ? 'is-active' : ''}`}
                        onClick={() => setSubFilter(item.id)}
                      >
                        {item.label}
                        <span>{item.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {renderSubmissions(visibleSubs)}
              </section>
            ) : null}
          </div>
        </div>

        <Link to="/" className="text-link">
          Back to quiz
        </Link>
      </div>
    </div>
  )
}
