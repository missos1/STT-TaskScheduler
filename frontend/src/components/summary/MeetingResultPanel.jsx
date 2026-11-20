import { useState } from 'react'
import { useSummary } from '../../hooks/useSummary'
import TaskList from '../tasks/TaskList'
import SummaryPending from './SummaryPending'
import SummaryView from './SummaryView'
 
const TABS = [
  { id: 'summary', label: 'Tóm tắt' },
  { id: 'tasks', label: 'Việc' },
]
 
const pad = (n) => String(n).padStart(2, '0')
 
// "2026-11-19T09:00:00+07:00" -> "09:00, 19/11" (local time)
function formatMeetingTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}
 
/**
 * Side-panel screen after the room is closed: summary + task review.
 * Props: meetCode (Google Meet code, e.g. "abc-defg-hij")
 */
export default function MeetingResultPanel({ meetCode }) {
  const { data, error, retry } = useSummary(meetCode)
  const [tab, setTab] = useState('summary')
 
  const isReady = data?.status === 'ready' && !error
 
  return (
    <div className="flex h-full flex-col bg-paper font-sans text-ink">
      <header className="flex flex-col gap-1 px-5 pt-4">
        <h1 className="text-base font-semibold">Kết quả cuộc họp</h1>
        <p className="text-[13px] text-muted">
          {meetCode}
          {data?.meeting_time_iso && ` · họp lúc ${formatMeetingTime(data.meeting_time_iso)}`}
        </p>
 
        {isReady && (
          <nav aria-label="Các mục" className="mt-3 flex gap-5 border-b border-line">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px min-h-10 border-b-2 text-sm ${
                  tab === t.id ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>
 
      {!isReady ? (
        <SummaryPending status={data?.status} error={error} onRetry={retry} />
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto px-5">
          {/* Both tabs stay mounted (just hidden) so task edits survive tab switches. */}
          <div hidden={tab !== 'summary'}>
            <SummaryView
              summary={data.summary}
              decisions={data.decisions}
              taskCount={data.tasks.length}
              onOpenTasks={() => setTab('tasks')}
            />
          </div>
          <div hidden={tab !== 'tasks'}>
            <TaskList
              meetCode={meetCode}
              initialTasks={data.tasks}
              meetingTimeIso={data.meeting_time_iso}
            />
          </div>
        </main>
      )}
    </div>
  )
}
