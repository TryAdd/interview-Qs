import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_PASSWORD } from '../data/questions'
import { clearSubmissions, getSubmissions } from '../utils/storage'

const AUTH_KEY = 'interview-qs-admin-auth'

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
  const [submissions, setSubmissions] = useState(() => getSubmissions())

  const sorted = useMemo(
    () =>
      [...submissions].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
      ),
    [submissions],
  )

  function handleLogin(e) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1')
      setAuthed(true)
      setError('')
      setPassword('')
      setSubmissions(getSubmissions())
    } else {
      setError('Incorrect password.')
    }
  }

  function handleClear() {
    if (!window.confirm('Clear all submissions? This cannot be undone.')) return
    clearSubmissions()
    setSubmissions([])
  }

  function handleRefresh() {
    setSubmissions(getSubmissions())
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY)
    setAuthed(false)
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
            <button type="submit" className="btn btn-primary">
              Unlock
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
            <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
              Refresh
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClear}>
              Clear all
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        {sorted.length === 0 ? (
          <p className="empty-state">No submissions yet.</p>
        ) : (
          <ul className="submission-list">
            {sorted.map((sub) => {
              const mcqAnswers = sub.answers.filter((a) => a.type === 'mcq')
              const correctCount = mcqAnswers.filter((a) => a.isCorrect).length
              const leaveCount = sub.focusLeaves?.count ?? 0
              const leaveEvents = sub.focusLeaves?.events ?? []
              return (
                <li key={sub.id} className="submission-card">
                  <div className="submission-meta">
                    <strong>{sub.name}</strong>
                    <span>{formatTime(sub.submittedAt)}</span>
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
                      MCQ: {correctCount}/{mcqAnswers.length} correct
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
                    {sub.answers.map((a, i) => (
                      <li key={a.questionId}>
                        <p className="answer-q">
                          {i + 1}. {a.prompt}
                        </p>
                        {a.type === 'code' && a.code ? (
                          <pre className="code-block code-block-admin">
                            <code>{a.code}</code>
                          </pre>
                        ) : null}
                        <p className="answer-a">{a.answer || '—'}</p>
                        {a.type === 'mcq' ? (
                          <span
                            className={
                              a.isCorrect ? 'tag tag-ok' : 'tag tag-miss'
                            }
                          >
                            {a.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        ) : a.type === 'code' ? (
                          <span className="tag tag-review">Code review</span>
                        ) : (
                          <span className="tag tag-review">Review manually</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              )
            })}
          </ul>
        )}

        <Link to="/" className="text-link">
          Back to quiz
        </Link>
      </div>
    </div>
  )
}
