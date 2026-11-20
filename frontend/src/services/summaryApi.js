import { API_BASE_URL, USE_MOCK } from '../constants/api'
import { MOCK_SUMMARY, MOCK_SUMMARY_PROCESSING } from '../mocks/summaryMock'

// Small fetch wrapper: JSON in, JSON out, throw on non-2xx.
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} on ${path}`)
  }
  return response.json()
}

// Fake network latency for mock mode.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mock mode answers "processing" for the first calls, then "ready",
// so the polling + loading screen can be seen without a backend.
let mockSummaryCalls = 0

/**
 * GET /api/rooms/{meet_code}/summary  (contract §3.6)
 * Returns { meet_code, status, meeting_time_iso?, summary, decisions[], tasks[] }
 */
export async function getSummary(meetCode) {
  if (USE_MOCK) {
    await wait(400)
    mockSummaryCalls += 1
    return mockSummaryCalls < 3 ? MOCK_SUMMARY_PROCESSING : MOCK_SUMMARY
  }
  return request(`/api/rooms/${encodeURIComponent(meetCode)}/summary`)
}

/**
 * POST /api/rooms/{meet_code}/tasks/confirm  (contract §3.7)
 * tasks:   [{ id, task_description, assignee, due_date_iso, priority }]
 * targets: ["google_calendar", "notion", ...]
 * Returns { meet_code, synced_count, results: [{ task_id, target, status }] }
 */
export async function confirmTasks(meetCode, tasks, targets) {
  if (USE_MOCK) {
    await wait(600)
    const results = tasks.flatMap((task) =>
      targets.map((target) => ({ task_id: task.id, target, status: 'synced' })),
    )
    return { meet_code: meetCode, synced_count: tasks.length, results }
  }
  return request(`/api/rooms/${encodeURIComponent(meetCode)}/tasks/confirm`, {
    method: 'POST',
    body: JSON.stringify({ targets, tasks }),
  })
}
