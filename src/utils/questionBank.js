import {
  closingQuestions as defaultClosing,
  objectBoxQuestions as defaultObjectBox,
  questions as defaultCore,
} from '../data/questions'

function patternToString(p) {
  if (p instanceof RegExp) return p.source
  if (typeof p === 'string') return p
  if (p && typeof p.source === 'string') return p.source
  return ''
}

function stringToRegExp(p) {
  if (p instanceof RegExp) return p
  if (typeof p === 'string' && p.trim()) return new RegExp(p, 'i')
  if (p && typeof p.source === 'string') {
    return new RegExp(p.source, p.flags || 'i')
  }
  return null
}

export function serializeChecks(checks) {
  if (!checks || typeof checks !== 'object') return undefined
  return {
    allOf: (checks.allOf || []).map(patternToString).filter(Boolean),
    anyOf: (checks.anyOf || []).map(patternToString).filter(Boolean),
    noneOf: (checks.noneOf || []).map(patternToString).filter(Boolean),
  }
}

export function reviveChecks(checks) {
  if (!checks || typeof checks !== 'object') return undefined
  return {
    allOf: (checks.allOf || []).map(stringToRegExp).filter(Boolean),
    anyOf: (checks.anyOf || []).map(stringToRegExp).filter(Boolean),
    noneOf: (checks.noneOf || []).map(stringToRegExp).filter(Boolean),
  }
}

export function serializeQuestion(q) {
  if (!q || typeof q !== 'object') return null
  const out = {
    id: String(q.id || ''),
    type: q.type || 'text',
    difficulty: q.difficulty || 'medium',
    prompt: typeof q.prompt === 'string' ? q.prompt : '',
  }
  if (q.topic) out.topic = q.topic
  if (q.ungraded) out.ungraded = true
  if (Array.isArray(q.options)) out.options = q.options.map(String)
  if (typeof q.correctIndex === 'number') out.correctIndex = q.correctIndex
  if (typeof q.code === 'string') out.code = q.code
  const checks = serializeChecks(q.checks)
  if (checks) out.checks = checks
  return out
}

export function reviveQuestion(q) {
  if (!q || typeof q !== 'object') return null
  const out = { ...q }
  if (out.checks) out.checks = reviveChecks(out.checks)
  return out
}

export function serializeBank(bank) {
  return {
    questions: (bank.questions || []).map(serializeQuestion).filter(Boolean),
    objectBoxQuestions: (bank.objectBoxQuestions || [])
      .map(serializeQuestion)
      .filter(Boolean),
    closingQuestions: (bank.closingQuestions || [])
      .map(serializeQuestion)
      .filter(Boolean),
  }
}

export function reviveBank(bank) {
  return {
    questions: (bank?.questions || []).map(reviveQuestion).filter(Boolean),
    objectBoxQuestions: (bank?.objectBoxQuestions || [])
      .map(reviveQuestion)
      .filter(Boolean),
    closingQuestions: (bank?.closingQuestions || [])
      .map(reviveQuestion)
      .filter(Boolean),
  }
}

export function getDefaultQuestionBank() {
  return serializeBank({
    questions: defaultCore,
    objectBoxQuestions: defaultObjectBox,
    closingQuestions: defaultClosing,
  })
}

export function emptyQuestion(type = 'mcq', difficulty = 'easy') {
  const id = `q_${Date.now().toString(36)}`
  if (type === 'mcq') {
    return {
      id,
      type: 'mcq',
      difficulty,
      prompt: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
    }
  }
  if (type === 'code') {
    return {
      id,
      type: 'code',
      difficulty,
      prompt: '',
      code: '',
      checks: { anyOf: [], allOf: [], noneOf: [] },
    }
  }
  return {
    id,
    type: 'text',
    difficulty,
    prompt: '',
  }
}
