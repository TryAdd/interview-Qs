import { useState } from 'react'
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
      const graded = buildGradedAnswers(answers)
      addSubmission({
        id: crypto.randomUUID(),
        name: name.trim() || 'Anonymous',
        submittedAt: new Date().toISOString(),
        answers: graded,
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
