// Pure helpers for TaskItem data. No React here, easy to unit-test.
 
const pad = (n) => String(n).padStart(2, '0')
 
// "Làm giao diện" -> "làm giao diện" (so it reads well after a name).
export function lowerFirst(text) {
  if (!text) return ''
  return text.charAt(0).toLowerCase() + text.slice(1)
}
 
/**
 * ISO string -> human Vietnamese text, in the user's local time.
 * "2026-11-20T17:00:00+07:00" -> "thứ Sáu, 20/11 lúc 17:00"
 * Midnight is treated as "date only": "thứ Tư, 25/11".
 * Returns null when there is no (valid) date.
 */
export function formatDueDate(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
 
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date)
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const text = time === '00:00' ? `${weekday}, ${day}` : `${weekday}, ${day} lúc ${time}`
  return lowerFirst(text)
}
 
// ISO string -> value for <input type="datetime-local">, e.g. "2026-11-20T17:00".
export function isoToInputValue(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
 
// <input type="datetime-local"> value -> ISO-8601 with the local UTC offset,
// e.g. "2026-11-20T17:00" -> "2026-11-20T17:00:00+07:00". Empty -> null.
export function inputValueToIso(value) {
  if (!value) return null
  const date = new Date(value) // parsed as local time
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  return `${value}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// Fields the user can edit (and the ones sent to /tasks/confirm).
const EDITABLE_FIELDS = ['task_description', 'assignee', 'due_date_iso', 'priority']
 
// true if the user changed anything compared with what the LLM proposed.
export function isEdited(task) {
  return EDITABLE_FIELDS.some((field) => task[field] !== task.original[field])
}

// Local task -> request body item for POST /tasks/confirm (contract §3.7).
export function toConfirmPayload(task) {
  return {
    id: task.id,
    task_description: task.task_description,
    assignee: task.assignee,
    due_date_iso: task.due_date_iso,
    priority: task.priority,
  }
}

export const DEADLINE_ERROR_MESSAGE = 'Hạn hoàn thành không được trước thời điểm bắt đầu cuộc họp.'

export function isDueDateBeforeMeeting(dueDateIso, meetingTimeIso) {
  if(!dueDateIso || !meetingTimeIso) return false
  const due = new Date(dueDateIso).getTime()
  const meeting = new Date(meetingTimeIso).getTime()
  return Number.isFinite(due) && Number.isFinite(meeting) && due < meeting
}

