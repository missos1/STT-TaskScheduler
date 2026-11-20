import { useState } from 'react'
import { PRIORITY_LABELS } from '../../constants/tasks'
import { inputValueToIso, isoToInputValue, DEADLINE_ERROR_MESSAGE, isDueDateBeforeMeeting } from './taskFormat'

// Shared look for every input in this form.
const fieldClass =
  'min-h-10 rounded-md border border-field bg-white px-2.5 text-[15px] text-ink'

/**
 * Inline editor for one task. Keeps its own draft state; nothing is
 * written back until the user presses "Lưu".
 * Props: task, onSave(fields), onCancel()
 */
export default function TaskEditForm({ task, onSave, onCancel, meetingTimeIso }) {
  const initialDueInput = isoToInputValue(task.due_date_iso)

  const [description, setDescription] = useState(task.task_description)
  const [assignee, setAssignee] = useState(task.assignee ?? '')
  const [dueInput, setDueInput] = useState(initialDueInput)
  const [priority, setPriority] = useState(task.priority)

  const chosenDueIso = dueInput === initialDueInput
    ? task.due_date_iso
    : inputValueToIso(dueInput)

  const invalidDue = isDueDateBeforeMeeting(chosenDueIso, meetingTimeIso)
  const canSave = description.trim() !== '' && !invalidDue

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSave) return
    onSave({
      task_description: description.trim(),
      assignee: assignee.trim() || null, // empty -> "unknown" like the API
      // Untouched date -> keep the server's exact ISO string (and its offset).
      due_date_iso: chosenDueIso,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-2.5">
      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Làm gì
        <input
          className={fieldClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Ai làm
        <input
          className={fieldClass}
          value={assignee}
          placeholder="Để trống nếu chưa rõ"
          onChange={(e) => setAssignee(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Hạn
        <input
          type="datetime-local"
          className={fieldClass}
          value={dueInput}
          onChange={(e) => setDueInput(e.target.value)}
          aria-invalid={invalidDue}
        />
        {invalidDue && (
          <span role="alert" className="text-xs text-danger">
            {DEADLINE_ERROR_MESSAGE}
          </span>
        )}
        <span className="text-xs">Để trống nếu cuộc họp không nói hạn.</span> 
      </label>

      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Mức ưu tiên
        <select className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-4.5">
        <button
          type="submit"
          disabled={!canSave}
          className="min-h-9 rounded-md bg-accent px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Lưu
        </button>
        <button type="button" onClick={onCancel} className="min-h-9 text-sm text-muted">
          Huỷ
        </button>
      </div>
    </form>
  )
}
