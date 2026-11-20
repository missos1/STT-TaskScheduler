/**
 * Read-only summary: one paragraph + list of decisions.
 * Props: summary (string), decisions (string[]), taskCount, onOpenTasks()
 */
export default function SummaryView({ summary, decisions, taskCount, onOpenTasks }) {
  return (
    <div className="flex flex-col gap-5.5 py-4">
      <p className="text-[15px] leading-relaxed">{summary || 'Không có nội dung tóm tắt.'}</p>
 
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Đã chốt</h2>
        {decisions.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-4.5">
            {decisions.map((decision) => (
              <li key={decision} className="text-sm leading-normal">
                {decision}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Không có quyết định nào được ghi lại.</p>
        )}
      </section>
 
      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 className="text-sm font-semibold">Việc được giao</h2>
        <p className="text-sm leading-normal">
          AI nghe được {taskCount} việc. Xem lại và chọn việc nào gửi đi.
        </p>
        <button type="button" onClick={onOpenTasks} className="self-start text-sm text-accent underline underline-offset-3">
          Xem các việc
        </button>
      </section>
    </div>
  )
}
