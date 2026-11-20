import { PRIORITY_LABELS } from '../../constants/tasks'
import TaskEditForm from './TaskEditForm'
import { formatDueDate, isEdited, lowerFirst } from './taskFormat'
 
// Small status dot on the left of each row (mockup: no cards, just a dot).
const DOT_COLOR = {
  pending: 'bg-accent',
  approved: 'bg-ok',
  synced: 'bg-ok',
  skipped: 'bg-[#cfcac0]',
}
 
// Text-style button used for secondary actions.
const linkButton = 'min-h-8 text-sm'
 
/**
 * One task row.
 * task.review: "pending" | "approved" | "skipped"  (local, see TaskList)
 * task.status: "draft" | "confirmed" | "synced"    (from the API)
 */
export default function TaskItem({ task, isEditing, onApprove, onSkip, onUndo, onEdit, onSave, onCancel, meetingTimeIso, validationError }) {
  const isSynced = task.status === 'synced'
  const isSkipped = task.review === 'skipped'
  const dueText = formatDueDate(task.due_date_iso)
  const dotKey = isSynced ? 'synced' : task.review
 
  return (
    <li className="grid grid-cols-[10px_minmax(0,1fr)] gap-2.5 border-b border-line py-4">
      <span aria-hidden="true" className={`mt-2.5 size-[7px] rounded-full ${DOT_COLOR[dotKey]}`} />
 
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* Sentence: "<Assignee> <task>" — same wording style as the mockup */}
        <p className={`text-[15px] leading-normal ${isSkipped ? 'text-faint line-through' : ''}`}>
          {task.assignee ? (
            <strong className="font-semibold">{task.assignee}</strong>
          ) : (
            <span className={`font-semibold ${isSkipped ? '' : 'text-warn'}`}>Chưa rõ ai làm:</span>
          )}{' '}
          {lowerFirst(task.task_description)}
        </p>
 
        {isSkipped && (
          <div className="flex items-center gap-3 text-[13px] text-faint">
            <span>Đã bỏ qua</span>
            <button type="button" onClick={onUndo} className="text-accent underline underline-offset-3">
              Hoàn tác
            </button>
          </div>
        )}
 
        {!isSkipped && isEditing && (<TaskEditForm task={task} onSave={onSave} onCancel={onCancel} meetingTimeIso={meetingTimeIso} /> )}
 
        {!isSkipped && !isEditing && (
          <>
            {/* Deadline + priority on one muted line */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
              {dueText ? (
                <span className="text-muted">Hạn: {dueText}</span>
              ) : (
                <>
                  <span className="text-warn">Chưa nói khi nào xong</span>
                  {!isSynced && (
                    <button type="button" onClick={onEdit} className="text-accent underline underline-offset-3">
                      Thêm hạn
                    </button>
                  )}
                </>
              )}
              <span className="text-muted">· {PRIORITY_LABELS[task.priority] ?? task.priority}</span>
            </div>
 
            {isEdited(task) && <span className="text-[13px] text-muted">Bạn đã sửa việc này.</span>}
 
            {/* Actions depend on where the task is in the review flow */}
            {isSynced && <span className="text-sm text-ok">Đã gửi đi</span>}
 
            {!isSynced && task.review === 'pending' && (
              <div className="mt-1 flex items-center gap-4.5">
                <button type="button" onClick={onApprove} className="min-h-9 rounded-md bg-accent px-4 text-sm font-medium text-white">
                  Lưu
                </button>
                <button type="button" onClick={onEdit} className={linkButton}>
                  Sửa
                </button>
                <button type="button" onClick={onSkip} className={`${linkButton} text-muted`}>
                  Bỏ qua
                </button>
              </div>
            )}

            {validationError && !isEditing && (
              <p role="alert" className="text-[13px] text-danger">
                {validationError}
              </p>
            )}
 
            {!isSynced && task.review === 'approved' && (
              <div className="flex items-center gap-4.5 text-sm">
                <span className="text-ok">Đã lưu, chờ gửi</span>
                <button type="button" onClick={onEdit} className={linkButton}>
                  Sửa
                </button>
                <button type="button" onClick={onUndo} className={`${linkButton} text-muted`}>
                  Hoàn tác
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  )
}
