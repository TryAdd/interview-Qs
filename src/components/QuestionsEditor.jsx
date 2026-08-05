import { useEffect, useState } from 'react'
import {
  emptyQuestion,
  getDefaultQuestionBank,
  serializeBank,
} from '../utils/questionBank'
import { getQuestionBank, saveQuestionBank } from '../utils/storage'

function patternsToText(arr) {
  return Array.isArray(arr) ? arr.join('\n') : ''
}

function textToPatterns(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const TYPE_OPTIONS = [
  { id: 'mcq', label: 'MCQ' },
  { id: 'text', label: 'Text' },
  { id: 'code', label: 'Code' },
]

function SegmentedControl({ label, value, options, onChange, ariaLabel }) {
  return (
    <div className="q-field">
      {label ? <span className="q-field-label">{label}</span> : null}
      <div className="inner-tablist q-segmented" role="radiogroup" aria-label={ariaLabel || label}>
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={value === item.id}
            className={`inner-tab ${value === item.id ? 'is-active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function applyTypeChange(q, type) {
  if (type === 'mcq') {
    return {
      ...q,
      type,
      options: q.options?.length
        ? q.options
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: q.correctIndex ?? 0,
      code: undefined,
      checks: undefined,
    }
  }
  if (type === 'code') {
    return {
      ...q,
      type,
      code: q.code || '',
      checks: q.checks || { anyOf: [], allOf: [], noneOf: [] },
      options: undefined,
      correctIndex: undefined,
    }
  }
  return {
    ...q,
    type: 'text',
    options: undefined,
    correctIndex: undefined,
    code: undefined,
    checks: undefined,
  }
}

function QuestionEditorCard({
  question,
  index,
  onChange,
  onRemove,
  difficultyOptions,
}) {
  const q = question

  function patch(partial) {
    onChange({ ...q, ...partial })
  }

  function patchOption(i, value) {
    const options = [...(q.options || [])]
    options[i] = value
    patch({ options })
  }

  const typeLabel =
    TYPE_OPTIONS.find((t) => t.id === q.type)?.label || q.type || 'Text'

  return (
    <li className="q-editor-card">
      <div className="q-editor-card-top">
        <div className="q-editor-card-title">
          <strong>
            #{index + 1}
            <span className="q-editor-id">{q.id || 'no-id'}</span>
          </strong>
          <span className={`tag tag-type tag-type-${q.type || 'text'}`}>
            {typeLabel}
          </span>
          {q.difficulty ? (
            <span className={`difficulty-badge difficulty-${q.difficulty}`}>
              {q.difficulty}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onRemove}
        >
          Delete
        </button>
      </div>

      <div className="q-editor-grid">
        <label className="q-field">
          <span className="q-field-label">ID</span>
          <input
            type="text"
            value={q.id || ''}
            onChange={(e) => patch({ id: e.target.value })}
          />
        </label>
        {difficultyOptions?.length ? (
          <SegmentedControl
            label="Difficulty"
            ariaLabel="Difficulty"
            value={q.difficulty || difficultyOptions[0].id}
            options={difficultyOptions}
            onChange={(difficulty) => patch({ difficulty })}
          />
        ) : null}
      </div>

      <SegmentedControl
        label="Type"
        ariaLabel="Question type"
        value={q.type || 'text'}
        options={TYPE_OPTIONS}
        onChange={(type) => onChange(applyTypeChange(q, type))}
      />

      <label className="q-editor-full">
        Prompt
        <textarea
          rows={3}
          value={q.prompt || ''}
          onChange={(e) => patch({ prompt: e.target.value })}
        />
      </label>

      {q.type === 'mcq' ? (
        <div className="q-editor-mcq">
          <p className="subblock-title">Options</p>
          {(q.options || []).map((opt, i) => (
            <label key={i} className="q-editor-option">
              <input
                type="radio"
                name={`correct-${q.id}-${index}`}
                checked={q.correctIndex === i}
                onChange={() => patch({ correctIndex: i })}
                disabled={q.ungraded}
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => patchOption(i, e.target.value)}
              />
            </label>
          ))}
          <label className="q-editor-check">
            <input
              type="checkbox"
              checked={Boolean(q.ungraded)}
              onChange={(e) =>
                patch({
                  ungraded: e.target.checked,
                  correctIndex: e.target.checked
                    ? undefined
                    : q.correctIndex ?? 0,
                })
              }
            />
            Ungraded (no correct answer)
          </label>
        </div>
      ) : null}

      {q.type === 'code' ? (
        <div className="q-editor-code">
          <label className="q-editor-full">
            Starter code
            <textarea
              rows={6}
              className="code-like"
              value={q.code || ''}
              onChange={(e) => patch({ code: e.target.value })}
            />
          </label>
          <div className="q-editor-grid">
            <label className="q-editor-full">
              anyOf patterns (one regex per line)
              <textarea
                rows={3}
                className="code-like"
                value={patternsToText(q.checks?.anyOf)}
                onChange={(e) =>
                  patch({
                    checks: {
                      ...(q.checks || {}),
                      anyOf: textToPatterns(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="q-editor-full">
              allOf patterns (one regex per line)
              <textarea
                rows={2}
                className="code-like"
                value={patternsToText(q.checks?.allOf)}
                onChange={(e) =>
                  patch({
                    checks: {
                      ...(q.checks || {}),
                      allOf: textToPatterns(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="q-editor-full">
              noneOf patterns (one regex per line)
              <textarea
                rows={2}
                className="code-like"
                value={patternsToText(q.checks?.noneOf)}
                onChange={(e) =>
                  patch({
                    checks: {
                      ...(q.checks || {}),
                      noneOf: textToPatterns(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {q.type === 'text' ? (
        <label className="q-editor-check">
          <input
            type="checkbox"
            checked={Boolean(q.ungraded)}
            onChange={(e) => patch({ ungraded: e.target.checked })}
          />
          Ungraded
        </label>
      ) : null}
    </li>
  )
}

export default function QuestionsEditor({
  sessionName,
  sessionPassword,
  onError,
  onAuthFailure,
  onSaved,
}) {
  const [bank, setBank] = useState(() => getDefaultQuestionBank())
  const [source, setSource] = useState('default')
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: null })
  const [group, setGroup] = useState('questions')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addType, setAddType] = useState('mcq')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getQuestionBank()
        if (cancelled) return
        if (data.bank) {
          setBank(serializeBank(data.bank))
          setSource(data.source || 'kv')
          setMeta({
            updatedAt: data.updatedAt || null,
            updatedBy: data.updatedBy || null,
          })
        } else {
          setBank(getDefaultQuestionBank())
          setSource('default')
          setMeta({ updatedAt: null, updatedBy: null })
        }
      } catch (err) {
        if (!cancelled) {
          setBank(getDefaultQuestionBank())
          setSource('default')
          onError?.(err.message || 'Could not load question bank.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // intentionally load once when editor mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = bank[group] || []
  const difficultyOptions =
    group === 'objectBoxQuestions'
      ? [{ id: 'objectbox', label: 'ObjectBox' }]
      : group === 'closingQuestions'
        ? [{ id: 'closing', label: 'Closing' }]
        : [
            { id: 'easy', label: 'Easy' },
            { id: 'medium', label: 'Medium' },
            { id: 'hard', label: 'Hard' },
          ]

  function setList(nextList) {
    setBank((prev) => ({ ...prev, [group]: nextList }))
  }

  function updateAt(index, nextQ) {
    setList(list.map((q, i) => (i === index ? nextQ : q)))
  }

  function removeAt(index) {
    if (!window.confirm('Delete this question?')) return
    setList(list.filter((_, i) => i !== index))
  }

  function handleAdd() {
    const difficulty =
      group === 'objectBoxQuestions'
        ? 'objectbox'
        : group === 'closingQuestions'
          ? 'closing'
          : 'easy'
    const q = emptyQuestion(addType, difficulty)
    if (group === 'objectBoxQuestions') q.topic = 'objectbox'
    if (group === 'closingQuestions') {
      q.topic = 'closing'
      q.ungraded = true
    }
    setList([...list, q])
  }

  async function handleSave() {
    setSaving(true)
    onError?.('')
    try {
      const payload = serializeBank(bank)
      const result = await saveQuestionBank(
        sessionName,
        sessionPassword,
        payload,
      )
      setBank(serializeBank(result.bank || payload))
      setSource('kv')
      setMeta({
        updatedAt: result.updatedAt || null,
        updatedBy: result.updatedBy || null,
      })
      onSaved?.()
    } catch (err) {
      if (onAuthFailure?.(err)) return
      onError?.(err.message || 'Failed to save questions.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetDefaults() {
    if (
      !window.confirm(
        'Replace the editor with the built-in default questions? Save afterward to publish.',
      )
    ) {
      return
    }
    setBank(getDefaultQuestionBank())
    setSource('default')
  }

  if (loading) {
    return <p className="empty-state">Loading questions…</p>
  }

  return (
    <div className="questions-editor">
      <div className="admin-section-head">
        <div>
          <h2 className="section-title">Questions</h2>
          <p className="lead section-lead">
            View and edit the exam question bank. Only super admin can change
            this. Source:{' '}
            <strong>{source === 'kv' ? 'saved bank' : 'built-in defaults'}</strong>
            {meta.updatedAt
              ? ` · last saved ${new Date(meta.updatedAt).toLocaleString()}${
                  meta.updatedBy ? ` by ${meta.updatedBy}` : ''
                }`
              : ''}
          </p>
        </div>
        <div className="link-form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDefaults}
            disabled={saving}
          >
            Load defaults
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save questions'}
          </button>
        </div>
      </div>

      <div className="inner-tablist" role="tablist" aria-label="Question groups">
        {[
          {
            id: 'questions',
            label: 'Core',
            count: bank.questions?.length || 0,
          },
          {
            id: 'objectBoxQuestions',
            label: 'ObjectBox',
            count: bank.objectBoxQuestions?.length || 0,
          },
          {
            id: 'closingQuestions',
            label: 'Closing',
            count: bank.closingQuestions?.length || 0,
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={group === item.id}
            className={`inner-tab ${group === item.id ? 'is-active' : ''}`}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="q-editor-toolbar">
        <SegmentedControl
          label="Add type"
          ariaLabel="Add question type"
          value={addType}
          options={TYPE_OPTIONS}
          onChange={setAddType}
        />
        <button type="button" className="btn btn-secondary" onClick={handleAdd}>
          Add question
        </button>
      </div>

      {list.length === 0 ? (
        <p className="empty-state">No questions in this group.</p>
      ) : (
        <ul className="q-editor-list">
          {list.map((q, index) => (
            <QuestionEditorCard
              key={`${group}-${q.id}-${index}`}
              question={q}
              index={index}
              difficultyOptions={difficultyOptions}
              onChange={(next) => updateAt(index, next)}
              onRemove={() => removeAt(index)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
