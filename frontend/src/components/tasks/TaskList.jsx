import { useState } from 'react'
import SendTasksBar from './SendTasksBar'
import TaskItem from './TaskItem'
import { DEADLINE_ERROR_MESSAGE, isDueDateBeforeMeeting } from './taskFormat'
 
// API task -> local task. "review" lives only in the browser:
//   pending  = AI draft, user has not decided yet
//   approved = user pressed "Lưu" (will be sent)
//   skipped  = user pressed "Bỏ qua" (never sent)
// "original" keeps the LLM version so we can tell if the user edited it.
function toLocalTask(task) {
  return {
    ...task,
    review: task.status === 'draft' ? 'pending' : 'approved',
    original: task,
  }
}
 
/**
 * Review list for the draft tasks returned by GET /summary.
 * Props: sessionId, initialTasks (TaskItem[] from the API)
 */
export default function TaskList({ sessionId, initialTasks, meetingTimeIso }) {
  const [tasks, setTasks] = useState(() => initialTasks.map(toLocalTask))
  const [editingId, setEditingId] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
 
  // Merge `changes` into the task with this id.
  function updateTask(id, changes) {
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, ...changes } : t)))
  }
 
  function validateDeadline(id, dueDateIso) {
  if (isDueDateBeforeMeeting(dueDateIso, meetingTimeIso)) {
    setValidationErrors((current) => ({
      ...current,
      [id]: DEADLINE_ERROR_MESSAGE,
    }))
    return false
  }
  setValidationErrors((current) => ({ ...current, [id]: null }))
  return true
}

function handleApprove(id) {
  const task = tasks.find((item) => item.id === id)
  if (!task || !validateDeadline(id, task.due_date_iso)) return
  updateTask(id, { review: 'approved' })
}

function handleSave(id, fields) {
  if (!validateDeadline(id, fields.due_date_iso)) return
  updateTask(id, { ...fields, review: 'approved' })
  setEditingId(null)
}
 
  // Mark tasks as synced using the per-target results from the server.
  function handleSent(results) {
    const syncedIds = new Set(results.filter((r) => r.status === 'synced').map((r) => r.task_id))
    setTasks((current) =>
      current.map((t) => (syncedIds.has(t.id) ? { ...t, status: 'synced' } : t)),
    )
  }
 
  const pendingCount = tasks.filter((t) => t.review === 'pending').length
  const readyToSend = tasks.filter((t) => t.review === 'approved' && t.status !== 'synced')
 
  if (tasks.length === 0) {
    return <p className="py-6 text-sm text-muted">Cuộc họp này không có việc nào được giao.</p>
  }
 
  return (
    <div className="flex flex-col pt-3.5">
      <p className="mb-1 text-[13px] leading-normal text-muted">
        {pendingCount > 0
          ? `Có ${pendingCount} việc AI nghe được đang chờ bạn xem. Chỉ việc bạn bấm Lưu mới được gửi đi.`
          : 'Bạn đã xem hết các việc.'}
      </p>
 
      <ul className="border-t border-line">
        {tasks.map((task) => (
          <TaskItem
            meetingTimeIso={meetingTimeIso}
            validationError={validationErrors[task.id]}
            key={task.id}
            task={task}
            isEditing={editingId === task.id}
            onApprove={() => handleApprove(task.id)}
            onSkip={() => {
              setValidationErrors((current) => ({ ...current, [task.id]: null }))
              updateTask(task.id, { review: 'skipped' })
            }}
            onUndo={() => updateTask(task.id, { review: 'pending' })}
            onEdit={() => setEditingId(task.id)}
            onSave={(fields) => handleSave(task.id, fields)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </ul>
      
      <SendTasksBar
        sessionId={sessionId}
        tasks={readyToSend}
        pendingCount={pendingCount}
        onSent={handleSent}
      />
    </div>
  )
}
