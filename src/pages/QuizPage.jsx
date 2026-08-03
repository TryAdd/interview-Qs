import { useEffect, useRef, useState } from 'react'
import {
  closingQuestions,
  isCodeCorrect,
  objectBoxQuestions,
  pickExamQuestions,
} from '../data/questions'
import { addSubmission } from '../utils/storage'

const CORE_EXAM_LENGTH = 10

function blockPaste(e) {
  e.preventDefault()
}

function blockPasteKeys(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
    e.preventDefault()
  }
}

function getCodeValue(answer, fallback) {
  if (answer && typeof answer === 'object' && typeof answer.code === 'string') {
    return answer.code
  }
  if (typeof answer === 'string') return answer
  return fallback
}

function getExplanation(answer) {
  if (answer && typeof answer === 'object' && typeof answer.explanation === 'string') {
    return answer.explanation
  }
  return ''
}

function buildGradedAnswers(examQuestions, answers, options = {}) {
  const { endedEarly = false, skippedAtQuestion = null } = options
  return examQuestions.map((q, i) => {
    const value = answers[q.id]
    const reached = !endedEarly || skippedAtQuestion == null || i + 1 <= skippedAtQuestion

    if (q.type === 'mcq') {
      if (!reached || value === undefined) {
        return {
          questionId: q.id,
          type: 'mcq',
          difficulty: q.difficulty,
          ungraded: Boolean(q.ungraded),
          prompt: q.prompt,
          answer: '',
          selectedIndex: null,
          correctIndex: q.correctIndex ?? null,
          isCorrect: null,
          skipped: !reached,
        }
      }
      const selectedIndex = value
      const selectedText =
        typeof selectedIndex === 'number' ? q.options[selectedIndex] : ''
      return {
        questionId: q.id,
        type: 'mcq',
        difficulty: q.difficulty,
        ungraded: Boolean(q.ungraded),
        prompt: q.prompt,
        answer: selectedText,
        selectedIndex,
        correctIndex: q.correctIndex ?? null,
        isCorrect: q.ungraded ? null : selectedIndex === q.correctIndex,
        skipped: false,
      }
    }

    if (q.type === 'code') {
      const code = getCodeValue(value, '')
      const explanation = getExplanation(value).trim()
      const passed = Boolean(value && typeof value === 'object' && value.passed)
      return {
        questionId: q.id,
        type: 'code',
        difficulty: q.difficulty,
        prompt: q.prompt,
        starterCode: q.code,
        answer: code,
        explanation,
        isCorrect: reached ? passed : null,
        skipped: !reached || (reached && !passed && endedEarly && i + 1 === skippedAtQuestion),
      }
    }

    if (!reached || value === undefined) {
      return {
        questionId: q.id,
        type: 'text',
        difficulty: q.difficulty,
        ungraded: Boolean(q.ungraded),
        prompt: q.prompt,
        answer: '',
        isCorrect: null,
        skipped: !reached,
      }
    }

    return {
      questionId: q.id,
      type: 'text',
      difficulty: q.difficulty,
      ungraded: Boolean(q.ungraded),
      prompt: q.prompt,
      answer: typeof value === 'string' ? value.trim() : '',
      isCorrect: null,
      skipped: false,
    }
  })
}

export default function QuizPage() {
  const [phase, setPhase] = useState('start')
  const [name, setName] = useState('')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [examQuestions, setExamQuestions] = useState([])
  const [objectBoxChoice, setObjectBoxChoice] = useState(null) // null | true | false

  const indexRef = useRef(0)
  const examQuestionsRef = useRef([])
  const objectBoxChoiceRef = useRef(null)
  const focusLeavesRef = useRef([])
  const awaySinceRef = useRef(null)
  const lastLeaveAtRef = useRef(0)

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    examQuestionsRef.current = examQuestions
  }, [examQuestions])

  useEffect(() => {
    objectBoxChoiceRef.current = objectBoxChoice
  }, [objectBoxChoice])

  useEffect(() => {
    if (phase !== 'quiz') return

    function recordLeave(reason) {
      const now = Date.now()
      if (now - lastLeaveAtRef.current < 400) return
      if (awaySinceRef.current != null) return

      lastLeaveAtRef.current = now
      awaySinceRef.current = now
      const qIndex = indexRef.current
      const q = examQuestionsRef.current[qIndex]
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

  const current = examQuestions[index]
  const total = examQuestions.length
  const isLast = total > 0 && index === total - 1
  const atEndOfCore =
    objectBoxChoice == null && index === CORE_EXAM_LENGTH - 1
  const nextLabel = isLast && !atEndOfCore ? 'Submit' : 'Next'
  const isCode = current?.type === 'code'

  const currentAnswer = answers[current?.id]
  const codeValue = isCode
    ? getCodeValue(currentAnswer, current.code)
    : ''
  const codeExplanation = isCode ? getExplanation(currentAnswer) : ''
  const codeEdited =
    isCode && codeValue.trim() !== (current?.code ?? '').trim()

  const canProceed = isCode
    ? codeEdited
    : current?.type === 'mcq'
      ? typeof currentAnswer === 'number'
      : typeof currentAnswer === 'string' && currentAnswer.trim().length > 0

  function finalizeAwayTime() {
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
  }

  async function submitExam({
    endedEarly = false,
    skippedAtQuestion = null,
    answersOverride = null,
  } = {}) {
    finalizeAwayTime()
    const leaves = focusLeavesRef.current
    const finalAnswers = answersOverride ?? answers
    try {
      await addSubmission({
        id: crypto.randomUUID(),
        name: name.trim() || 'Anonymous',
        submittedAt: new Date().toISOString(),
        endedEarly,
        skippedAtQuestion,
        examMix: { easy: 4, medium: 3, hard: 3 },
        usedObjectBox: objectBoxChoiceRef.current,
        answers: buildGradedAnswers(examQuestionsRef.current, finalAnswers, {
          endedEarly,
          skippedAtQuestion,
        }),
        focusLeaves: {
          count: leaves.length,
          events: leaves,
        },
      })
    } catch (err) {
      window.alert(
        err?.message ||
          'Could not save your answers to the server. Check your connection and try again.',
      )
      return
    }
    setPhase('done')
  }

  /** After core 10 questions: ask ObjectBox gate (unless already decided). */
  async function finishCoreOrSubmit(answersOverride = null) {
    if (objectBoxChoice == null) {
      if (answersOverride) setAnswers(answersOverride)
      setPhase('objectbox-gate')
      return
    }
    await submitExam({
      endedEarly: false,
      answersOverride: answersOverride ?? undefined,
    })
  }

  function handleStart(e) {
    e.preventDefault()
    focusLeavesRef.current = []
    awaySinceRef.current = null
    lastLeaveAtRef.current = 0
    const picked = pickExamQuestions()
    examQuestionsRef.current = picked
    setExamQuestions(picked)
    setObjectBoxChoice(null)
    objectBoxChoiceRef.current = null
    setPhase('quiz')
    setIndex(0)
    setAnswers({})
  }

  function handleObjectBoxYes() {
    const next = [
      ...examQuestionsRef.current,
      ...objectBoxQuestions,
      ...closingQuestions,
    ]
    examQuestionsRef.current = next
    setExamQuestions(next)
    setObjectBoxChoice(true)
    objectBoxChoiceRef.current = true
    setIndex(CORE_EXAM_LENGTH)
    setPhase('quiz')
  }

  function handleObjectBoxNo() {
    const next = [...examQuestionsRef.current, ...closingQuestions]
    examQuestionsRef.current = next
    setExamQuestions(next)
    setObjectBoxChoice(false)
    objectBoxChoiceRef.current = false
    setIndex(CORE_EXAM_LENGTH)
    setPhase('quiz')
  }

  function setAnswer(value) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  function handleCodeChange(value) {
    setAnswers((prev) => {
      const prevAnswer = prev[current.id]
      return {
        ...prev,
        [current.id]: {
          code: value,
          explanation: getExplanation(prevAnswer),
          passed: isCodeCorrect(current, value),
        },
      }
    })
  }

  function handleExplanationChange(value) {
    setAnswers((prev) => {
      const prevAnswer = prev[current.id]
      const code = getCodeValue(prevAnswer, current.code)
      return {
        ...prev,
        [current.id]: {
          code,
          explanation: value,
          passed: isCodeCorrect(current, code),
        },
      }
    })
  }

  async function advanceFromCode() {
    if (!isCode || !codeEdited) return
    const ok = isCodeCorrect(current, codeValue)
    const nextAnswers = {
      ...answers,
      [current.id]: {
        code: codeValue,
        explanation: codeExplanation,
        passed: ok,
      },
    }
    setAnswers(nextAnswers)
    if (isLast) {
      await finishCoreOrSubmit(nextAnswers)
      return
    }
    setIndex((i) => i + 1)
  }

  async function handleNext() {
    if (isCode) {
      await advanceFromCode()
      return
    }
    if (!canProceed) return
    if (isLast) {
      await finishCoreOrSubmit()
      return
    }
    setIndex((i) => i + 1)
  }

  async function handleSkip() {
    if (!isCode || codeEdited) return
    if (
      !window.confirm(
        'Skip ends the exam now and submits what you have finished. Continue?',
      )
    ) {
      return
    }
    await submitExam({ endedEarly: true, skippedAtQuestion: index + 1 })
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
            You will get 10 questions: 4 easy, 3 medium, and 3 hard. After that
            we may ask about ObjectBox. On code questions, edit then continue —
            Skip (unchanged) ends the exam.
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
              setExamQuestions([])
              examQuestionsRef.current = []
              setObjectBoxChoice(null)
              objectBoxChoiceRef.current = null
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

  if (phase === 'objectbox-gate') {
    return (
      <div className="page">
        <div className="panel start-panel">
          <p className="eyebrow">Almost done</p>
          <h1 className="brand">ObjectBox</h1>
          <p className="lead">
            Have you worked with ObjectBox in Flutter?
          </p>
          <div className="code-actions gate-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleObjectBoxYes}
            >
              Yes — continue
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleObjectBoxNo}
            >
              No — finish exam
            </button>
          </div>
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

        {current?.difficulty ? (
          <p className={`difficulty-badge difficulty-${current.difficulty}`}>
            {current.difficulty}
          </p>
        ) : null}
        <h2 className="question-prompt">{current?.prompt}</h2>

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
            <label htmlFor="code-editor" className="code-label">
              Edit the code (type your fix)
            </label>
            <textarea
              id="code-editor"
              className="code-textarea code-editor"
              rows={14}
              value={codeValue}
              onChange={(e) => handleCodeChange(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={blockPasteKeys}
              spellCheck={false}
            />
            <label htmlFor="code-explanation" className="code-label">
              Why did you change it? <span className="optional-label">(optional)</span>
            </label>
            <textarea
              id="code-explanation"
              className="code-explanation"
              rows={3}
              value={codeExplanation}
              onChange={(e) => handleExplanationChange(e.target.value)}
              onPaste={blockPaste}
              onDrop={blockPaste}
              onKeyDown={blockPasteKeys}
              placeholder="Briefly explain your fix (optional)…"
            />
            <div className="code-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={advanceFromCode}
                disabled={!codeEdited}
              >
                {nextLabel}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSkip}
                disabled={codeEdited}
                title={
                  codeEdited
                    ? 'Clear your edits to skip, or press Next to continue'
                    : 'End the exam without answering'
                }
              >
                Skip (end exam)
              </button>
            </div>
            <p className="code-hint">
              {codeEdited
                ? 'Continue when ready — admin will see if the fix looks correct.'
                : 'Edit the code to continue, or Skip to end the exam.'}
            </p>
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
          {isCode ? (
            <span className="nav-hint">Use Next or Skip above</span>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={!canProceed}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
