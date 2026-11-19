import { useState } from 'react'

const PEOPLE = [
  { name: 'An', note: 'chủ trì', here: true },
  { name: 'Đức', note: '', here: true },
  { name: 'Hoàng', note: 'bạn', here: true },
  { name: 'Trung', note: 'chưa vào', here: false },
]

export default function WaitingRoom({
  meetingTitle = 'Họp đồ án – Sprint 2',
  hostName = 'An',
  people = PEOPLE,
  onLeave,
  onDemoStart,
}) {
  const [micOn, setMicOn] = useState(true)

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 p-6 text-stone-900">
      <h1 className="text-2xl font-bold">Bạn đã vào</h1>
      <p className="text-stone-500">
        {meetingTitle}. Đang chờ {hostName} bắt đầu ghi.
      </p>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${micOn ? 'bg-emerald-700' : 'bg-stone-400'}`} />
          <span>{micOn ? 'Mic của bạn đang bật, nghe rõ' : 'Mic của bạn đang tắt'}</span>
        </div>
        <button onClick={() => setMicOn(!micOn)} className="text-sm text-blue-900 underline">
          {micOn ? 'Tắt mic' : 'Bật mic'}
        </button>
      </div>

      <h2 className="mt-6 font-semibold">Đang ở đây</h2>
      <ul className="mt-2 divide-y divide-stone-200 border-y border-stone-200">
        {people.map((p) => (
          <li key={p.name} className={`flex justify-between py-3 ${p.here ? '' : 'text-stone-400'}`}>
            <span>{p.name}</span>
            <span className="text-stone-500">{p.note}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-stone-700">
        Khi {hostName} bắt đầu, lời thoại và các việc được giao sẽ hiện dần ở đây. Bạn có thể đóng side panel,
        việc ghi vẫn tiếp tục cho tới khi bạn tắt mic hoặc rời đi.
      </p>

      <div className="mt-auto flex items-center justify-between pt-6">
        <button onClick={onLeave} className="text-red-700">
          Rời cuộc họp
        </button>
        <button onClick={onDemoStart} className="text-sm text-stone-500 underline">
          Demo: khi {hostName} bấm bắt đầu →
        </button>
      </div>
    </div>
  )
}