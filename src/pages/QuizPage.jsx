import { useEffect, useRef, useState } from 'react'
import { questions } from '../data/questions'
import { addSubmission } from '../utils/storage'

function blockPaste(e) {
  e.preventDefault()
}

function blockPasteKeys(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault()
  }
}

function buildGradedAnswers(answers) {
  return questions.map((q) => {
    const value = answers[q.id]
    if (q.type === 'mcq') {
      const selectedIndex = value
      const selectedText =
        typeof selectedIndex === 'number' ? q.options[selectedIndex] : ''
      return {
        questionId: q.id,
        type: 'mcq',
        prompt: q.prompt,
        answer: selectedText,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect: selectedIndex === q.correctIndex,
      }
    }
    if (q.type === 'code') {
      return {
        questionId: q.id,
        type: 'code',
        prompt: q.prompt,
        code: q.code,
        answer: typeof value === 'string' ? value.trim() : '',
        isCorrect: null,
      }
    }
    return {
      questionId: q.id,
      type: 'text',
      prompt: q.prompt,
      answer: typeof value === 'string' ? value.trim() : '',
      isCorrect: null,
    }
  })
}

export default function QuizPage() {
  const [phase, setPhase] = useState('start')
  const [name, setName] = useState('')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})

  const indexRef = useRef(0)
  const focusLeavesRef = useRef([])
  const awaySinceRef = useRef(null)
  const lastLeaveAtRef = useRef(0)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    if (phase !== 'quiz') return

    function recordLeave(reason) {
      const now = Date.now()
      // visibilitychange + blur often fire together — count as one leave
      if (now - lastLeaveAtRef.current < 400) return
      if (awaySinceRef.current != null) return

      lastLeaveAtRef.current = now
      awaySinceRef.current = now
      const qIndex = indexRef.current
      const q = questions[qIndex]
      focusLeavesRef.current.push({
        at: new Date(now).toISOString(),
        questionIndex: qIndex + 1,
        questionId: q?.id ?? null,
        reason,
      })
    }

    function recordReturn() {
      if (awaySinceRef.current == null) return
      const leftAt = awaySinceRef.current
      awaySinceRef.current = null
      const events = focusLeavesRef.current
      const last = events[events.length - 1]
      if (last && last.durationMs == null) {
        last.durationMs = Date.now() - leftAt
        last.returnedAt = new Date().toISOString()
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        recordLeave('tab-hidden')
      } else {
        recordReturn()
      }
    }

    function onWindowBlur() {
      if (document.hidden) return
      recordLeave('window-blur')
    }

    function onWindowFocus() {
      if (!document.hidden) recordReturn()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
    }
  }, [phase])

  const current = questions[index]
  const total = questions.length
  const isLast = index === total - 1

  const currentAnswer = answers[current?.id]
  const canProceed =
    current?.type === 'mcq'
      ? typeof currentAnswer === 'number'
      : typeof currentAnswer === 'string' && currentAnswer.trim().length > 0

  function handleStart(e) {
    e.preventDefault()
    focusLeavesRef.current = []
    awaySinceRef.current = null
    lastLeaveAtRef.current = 0
    setPhase('quiz')
    setIndex(0)
    setAnswers({})
  }

  function setAnswer(value) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  function handleNext() {
    if (!canProceed) return
    if (isLast) {
      if (awaySinceRef.current != null) {
        const leftAt = awaySinceRef.current
        awaySinceRef.current = null
        const events = focusLeavesRef.current
        const last = events[events.length - 1]
        if (last && last.durationMs == null) {
          last.durationMs = Date.now() - leftAt
          last.returnedAt = new Date().toISOString()
        }
      }

      const graded = buildGradedAnswers(answers)
      const leaves = focusLeavesRef.current
      addSubmission({
        id: crypto.randomUUID(),
        name: name.trim() || 'Anonymous',
        submittedAt: new Date().toISOString(),
        answers: graded,
        focusLeaves: {
          count: leaves.length,
          events: leaves,
        },
      })
      setPhase('done')
      return
    }
    setIndex((i) => i + 1)
  }

  function handleBack() {
    if (index > 0) setIndex((i) => i - 1)
  }

  if (phase === 'start') {
    return (
      <div className="page">
        <div className="panel start-panel">
          <p className="eyebrow">Candidate assessment</p>
          <h1 className="brand">Interview Q&apos;s</h1>
          <p className="lead">
            Answer each question in order. You will not see whether answers are
            correct — just do your best.
          </p>
          <form className="start-form" onSubmit={handleStart}>
            <label htmlFor="candidate-name">Your name (optional)</label>
            <input
              id="candidate-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={blockPasteKeys}
              placeholder="Enter your name"
              autoComplete="name"
            />
            <button type="submit" className="btn btn-primary">
              Start
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="page">
        <div className="panel done-panel">
          <h1 className="brand">Interview Q&apos;s</h1>
          <h2 className="done-title">Thank you</h2>
          <p className="lead">
            Your responses have been submitted. You may close this page.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPhase('start')
              setName('')
              setIndex(0)
              setAnswers({})
              focusLeavesRef.current = []
              awaySinceRef.current = null
              lastLeaveAtRef.current = 0
            }}
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="panel quiz-panel">
        <header className="quiz-header">
          <span className="brand-sm">Interview Q&apos;s</span>
          <span className="progress">
            Question {index + 1} of {total}
          </span>
        </header>

        <div className="progress-bar" aria-hidden="true">
          <div
            className="progress-fill"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <h2 className="question-prompt">{current.prompt}</h2>

        {current.type === 'mcq' ? (
          <fieldset className="options">
            <legend className="sr-only">Choose one answer</legend>
            {current.options.map((option, i) => (
              <label key={option} className="option">
                <input
                  type="radio"
                  name={current.id}
                  checked={currentAnswer === i}
                  onChange={() => setAnswer(i)}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        ) : current.type === 'code' ? (
          <div className="code-answer">
            <p className="code-label">Buggy / starter code</p>
            <pre className="code-block">
              <code>{current.code}</code>
            </pre>
            <label htmlFor="code-answer" className="code-answer-label">
              Your fixed code / explanation
            </label>
            <textarea
              id="code-answer"
              className="code-textarea"
              rows={10}
              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={blockPasteKeys}
              placeholder="Write the corrected code and a short explanation…"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="text-answer">
            <label htmlFor="text-answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="text-answer"
              rows={5}
              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={blockPasteKeys}
              placeholder="Type your answer here…"
            />
          </div>
        )}

        <div className="nav-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={index === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canProceed}
          >
            {isLast ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
