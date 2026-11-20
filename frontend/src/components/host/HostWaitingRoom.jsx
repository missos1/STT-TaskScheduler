const MEMBERS = [
  { name: 'An', you: true, state: 'ok', note: 'Đã vào, mic nghe rõ' },
  { name: 'Hoàng', state: 'ok', note: 'Đã vào, mic nghe rõ' },
  { name: 'Đức', state: 'warn', note: 'Đã vào, nhưng mic đang thu cả tiếng người khác. Có lẽ đang bật loa ngoài.' },
  { name: 'Trung', state: 'absent', note: 'Chưa vào' },
]

const DOT = { ok: 'bg-emerald-700', warn: 'bg-amber-600', absent: 'border border-stone-400 bg-transparent' }
const TEXT = { ok: 'text-stone-500', warn: 'text-amber-700', absent: 'text-stone-500' }

export default function HostWaitingRoom({ code = 'K7Q-24M', members = MEMBERS, onStart, onWait }) {
  const hasAbsent = members.some((m) => m.state === 'absent')

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 p-6 text-stone-900">
      <h1 className="text-2xl font-bold">Đợi mọi người vào</h1>
      <p className="text-stone-500">Mã {code}</p>

      <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
        {members.map((m) => (
          <li key={m.name} className="flex gap-3 py-3">
            <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[m.state]}`} />
            <div className="flex-1">
              <p className={m.state === 'absent' ? 'font-semibold text-stone-500' : 'font-semibold'}>
                {m.name} {m.you && <span className="font-normal text-stone-500">(bạn)</span>}
              </p>
              <p className={`text-sm ${TEXT[m.state]}`}>{m.note}</p>
            </div>
            {m.state === 'absent' && (
              <button className="self-start text-sm text-blue-900 underline">Nhắc</button>
            )}
          </li>
        ))}
      </ul>

      {hasAbsent && (
        <p className="mt-5 text-stone-700">
          Nếu bắt đầu khi có người chưa vào, giọng họ chỉ lọt qua mic người khác. Trong lời thoại nó sẽ hiện là
          “Người nói 4”, bạn gán tên sau là được.
        </p>
      )}

      <p className="mt-4 text-sm text-stone-500">
        Mỗi máy gửi âm thanh từ mic của chính người đó, kèm tên và thời điểm nói. Máy chủ xếp lại theo thời
        gian thành một lời thoại chung, nên biết chắc câu nào là của ai.
      </p>

      <div className="mt-auto flex items-center gap-4 pt-6">
        <button onClick={onStart} className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white">
          Bắt đầu ghi
        </button>
        <button onClick={onWait} className="text-stone-700">
          Đợi thêm
        </button>
      </div>
    </div>
  )
}