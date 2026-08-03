const STORAGE_KEY = 'interview-qs-submissions'

export function getSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addSubmission(submission) {
  const existing = getSubmissions()
  const next = [submission, ...existing]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearSubmissions() {
  localStorage.removeItem(STORAGE_KEY)
}
