/**
 * Shown while GET /summary is not "ready" yet, or when it failed.
 * Props: status ("active" | "processing" | ...), error (string|null), onRetry()
 */
export default function SummaryPending({ status, error, onRetry }) {
  if (error) {
    return (
      <div className="flex flex-col gap-2 px-5 py-6">
        <p className="text-[15px]">Chưa lấy được tóm tắt.</p>
        <p className="text-[13px] text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="self-start text-sm text-accent underline underline-offset-3">
          Thử lại
        </button>
      </div>
    )
  }
 
  // Room still open: the summary only exists after the host closes it.
  if (status === 'active') {
    return (
      <p className="px-5 py-6 text-[15px] leading-relaxed">
        Cuộc họp chưa kết thúc. Tóm tắt sẽ có khi chủ trì bấm kết thúc.
      </p>
    )
  }
 
  return (
    <div className="flex flex-col gap-1.5 px-5 py-6">
      <p className="text-[15px]">Cuộc họp đã kết thúc. Đang viết tóm tắt…</p>
      <p className="text-[13px] leading-normal text-muted">
        Thường mất chưa tới một phút. Bạn có thể đóng side panel rồi quay lại sau.
      </p>
    </div>
  )
}
