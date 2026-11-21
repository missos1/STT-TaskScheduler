import { useEffect, useRef, useState } from 'react'

const MOCK_LINES = [
  { id: 1, speaker: 'An', text: 'Tuần này Hoàng làm giao diện đăng nhập nhé, thứ Sáu demo cho cả nhóm.', time: '02:15' },
  { id: 2, speaker: 'An', text: 'Còn backend đăng nhập thì để Đức lo.', time: '02:31' },
  { id: 3, speaker: 'Đức', text: 'Em sẽ dùng FastAPI với JWT.', time: '03:02' },
  { id: 4, speaker: 'Hoàng', text: 'Để em làm luôn phần báo lỗi cho form đăng nhập.', time: '03:40' },
  { id: 5, speaker: 'Trung', text: 'Em đề xuất chia bản tóm tắt làm ba phần.', time: '04:40' },
]

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function RecordingScreen({
  title = 'Họp đồ án – Sprint 2',
  isHost = false,
  onStop,
  onLeave,
}) {
  const [seconds, setSeconds] = useState(0)
  const [lines, setLines] = useState([])
  const [micOn, setMicOn] = useState(true)
  const endRef = useRef(null)

  // Đồng hồ
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Lời thoại giả hiện dần mỗi 3 giây
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i >= MOCK_LINES.length) return clearInterval(t)
      setLines((prev) => [...prev, MOCK_LINES[i]])
      i += 1
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Tự cuộn xuống dòng mới nhất
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="flex h-screen flex-col bg-stone-50 text-stone-900">
      <header className="flex items-start justify-between border-b border-stone-200 p-4">
        <div>
          <h1 className="font-bold">{title}</h1>
          <p className="flex items-center gap-2 text-sm text-stone-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Đang ghi {fmt(seconds)}
          </p>
        </div>
        {isHost ? (
          <button onClick={onStop} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm">
            Dừng ghi
          </button>
        ) : (
          <button onClick={onLeave} className="text-sm text-red-700">
            Rời cuộc họp
          </button>
        )}
      </header>

      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${micOn ? 'bg-emerald-700' : 'bg-stone-400'}`} />
          {micOn ? 'Mic đang bật' : 'Mic đang tắt'}
        </span>
        <button onClick={() => setMicOn(!micOn)} className="text-blue-900 underline">
          {micOn ? 'Tắt mic' : 'Bật mic'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {lines.length === 0 && <p className="mt-6 text-stone-500">Đang nghe… lời thoại sẽ hiện ở đây.</p>}
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.id}>
              <p className="text-xs text-stone-500">
                <span className="font-semibold text-stone-700">{l.speaker}</span> · {l.time}
              </p>
              <p>{l.text}</p>
            </li>
          ))}
        </ul>
        <div ref={endRef} />
      </div>
    </div>
  )
}