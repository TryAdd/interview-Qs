import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSubmissions, getSubmissions } from '../utils/storage'

const AUTH_KEY = 'interview-qs-admin-auth'
const PASS_KEY = 'interview-qs-admin-pass'

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

export default function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === '1',
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState([])

  const sorted = useMemo(
    () =>
      [...submissions].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
      ),
    [submissions],
  )

  async function loadSubmissions(adminPassword) {
    setLoading(true)
    setError('')
    try {
      const list = await getSubmissions(adminPassword)
      setSubmissions(list)
      return true
    } catch (err) {
      if (err.status === 401) {
        sessionStorage.removeItem(AUTH_KEY)
        sessionStorage.removeItem(PASS_KEY)
        setAuthed(false)
        setError('Incorrect password.')
      } else {
        setError(err.message || 'Failed to load submissions.')
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authed) return
    const saved = sessionStorage.getItem(PASS_KEY)
    if (!saved) {
      setAuthed(false)
      return
    }
    loadSubmissions(saved)
  }, [authed])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const list = await getSubmissions(password)
      sessionStorage.setItem(AUTH_KEY, '1')
      sessionStorage.setItem(PASS_KEY, password)
      setAuthed(true)
      setSubmissions(list)
      setPassword('')
    } catch (err) {
      if (err.status === 401) {
        setError('Incorrect password.')
      } else {
        setError(err.message || 'Could not reach the API. Deploy the worker first.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    if (!window.confirm('Clear all submissions? This cannot be undone.')) return
    const saved = sessionStorage.getItem(PASS_KEY)
    setLoading(true)
    setError('')
    try {
      await clearSubmissions(saved)
      setSubmissions([])
    } catch (err) {
      setError(err.message || 'Failed to clear submissions.')
    } finally {
      setLoading(false)
    }
  }

  function handleRefresh() {
    const saved = sessionStorage.getItem(PASS_KEY)
    if (saved) loadSubmissions(saved)
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(PASS_KEY)
    setAuthed(false)
    setSubmissions([])
  }

  if (!authed) {
    return (
      <div className="page">
        <div className="panel admin-login">
          <p className="eyebrow">Admin</p>
          <h1 className="brand">Interview Q&apos;s</h1>
          <p className="lead">Enter the admin password to view submissions.</p>
          <form className="start-form" onSubmit={handleLogin}>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

  return (
    <div className="page page-wide">
      <div className="panel admin-panel">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Admin results</p>
            <h1 className="brand-sm">Interview Q&apos;s</h1>
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
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleClear}
              disabled={loading}
            >
              Clear all
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        {error ? <p className="form-error">{error}</p> : null}
        {loading ? <p className="empty-state">Loading submissions…</p> : null}

        {!loading && sorted.length === 0 ? (
          <p className="empty-state">No submissions yet.</p>
        ) : null}

        {!loading && sorted.length > 0 ? (
          <ul className="submission-list">
            {sorted.map((sub) => {
              const mcqAnswers = (sub.answers || []).filter(
                (a) => a.type === 'mcq' && !a.ungraded,
              )
              const correctCount = mcqAnswers.filter((a) => a.isCorrect).length
              const leaveCount = sub.focusLeaves?.count ?? 0
              const leaveEvents = sub.focusLeaves?.events ?? []
              const codeAnswers = (sub.answers || []).filter((a) => a.type === 'code')
              const codePassed = codeAnswers.filter((a) => a.isCorrect).length
              return (
                <li key={sub.id} className="submission-card">
                  <div className="submission-meta">
                    <strong>{sub.name}</strong>
                    <span>{formatTime(sub.submittedAt)}</span>
                    {sub.endedEarly ? (
                      <span className="tag tag-miss">
                        Ended early (skipped Q{sub.skippedAtQuestion})
                      </span>
                    ) : null}
                    {sub.usedObjectBox === true ? (
                      <span className="tag tag-ok">ObjectBox: Yes</span>
                    ) : sub.usedObjectBox === false ? (
                      <span className="tag tag-review">ObjectBox: No</span>
                    ) : null}
                    <span
                      className={
                        leaveCount > 0
                          ? 'tag tag-miss focus-leave-badge'
                          : 'tag tag-ok focus-leave-badge'
                      }
                    >
                      {leaveCount > 0
                        ? `Left exam ${leaveCount}×`
                        : 'Stayed focused'}
                    </span>
                    <span className="score-badge">
                      MCQ: {correctCount}/{mcqAnswers.length}
                      {codeAnswers.length > 0
                        ? ` · Code: ${codePassed}/${codeAnswers.length}`
                        : ''}
                    </span>
                  </div>

                  {leaveCount > 0 ? (
                    <details className="focus-leave-details">
                      <summary>Focus / window leave log</summary>
                      <ul className="focus-leave-list">
                        {leaveEvents.map((ev, i) => (
                          <li key={`${ev.at}-${i}`}>
                            <span>{formatTime(ev.at)}</span>
                            <span>Q{ev.questionIndex}</span>
                            <span>{reasonLabel(ev.reason)}</span>
                            <span>away {formatDuration(ev.durationMs)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  <ol className="answer-list">
                    {(sub.answers || []).map((a, i) => (
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
                            className={
                              a.isCorrect ? 'tag tag-ok' : 'tag tag-miss'
                            }
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
                </li>
              )
            })}
          </ul>
        ) : null}

        <Link to="/" className="text-link">
          Back to quiz
        </Link>
      </div>
    </div>
  )
}
