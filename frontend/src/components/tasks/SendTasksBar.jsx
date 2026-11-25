import { useState } from 'react'
import { SYNC_TARGETS } from '../../constants/tasks'
import { confirmTasks } from '../../services/summaryApi'
import { toConfirmPayload } from './taskFormat'
 
/**
 * Sticky footer: pick targets, then send every approved task in ONE call
 * to POST /tasks/confirm.
 * Props: sessionId, tasks (approved, not yet synced), pendingCount, onSent(results)
 */
export default function SendTasksBar({ sessionId, tasks, pendingCount, onSent }) {
  const [targets, setTargets] = useState(['google_calendar'])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null) // { kind: "ok" | "error", text }
 
  const canSend = tasks.length > 0 && targets.length > 0 && !sending
 
  // Add or remove one target id from the selected list.
  function toggleTarget(id) {
    setTargets((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    )
  }
 
  async function handleSend() {
    setSending(true)
    setMessage(null)
    try {
      const response = await confirmTasks(sessionId, tasks.map(toConfirmPayload), targets)
      onSent(response.results)
      setMessage({ kind: 'ok', text: `Đã gửi ${response.synced_count} việc.` })
    } catch {
      setMessage({ kind: 'error', text: 'Gửi chưa được. Kiểm tra kết nối rồi thử lại.' })
    } finally {
      setSending(false)
    }
  }
 
  return (
    <div className="sticky bottom-0 flex flex-col gap-2.5 border-t border-line bg-paper py-3.5">
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
        <legend className="mb-1 text-[13px] text-muted">Gửi tới</legend>
        {SYNC_TARGETS.map((target) => (
          <label key={target.id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={targets.includes(target.id)}
              onChange={() => toggleTarget(target.id)}
            />
            {target.label}
          </label>
        ))}
      </fieldset>
 
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="min-h-11 rounded-md bg-accent text-[15px] font-medium text-white disabled:opacity-50"
      >
        {sending
          ? 'Đang gửi…'
          : tasks.length > 0
            ? `Gửi ${tasks.length} việc đã lưu`
            : 'Lưu ít nhất một việc để gửi'}
      </button>
 
      {pendingCount > 0 && (
        <p className="text-[13px] text-muted">{pendingCount} việc chưa xem sẽ không được gửi.</p>
      )}
      {message && (
        <p role="status" className={`text-[13px] ${message.kind === 'ok' ? 'text-ok' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
