import { useState } from 'react'
import ServerSetting from '../common/ServerSetting'

const RECENT = [
  { id: 1, title: 'Họp đồ án – Sprint 1', date: '07/11', note: '2 việc của bạn' },
  { id: 2, title: 'Chốt đề tài', date: '31/10', note: '' },
]

export default function HomeScreen({ userName = 'Hoàng', onJoin, onCreate }) {
  const [code, setCode] = useState('')

  return (
    <div className="min-h-screen bg-stone-50 p-6 text-stone-900">
      <h1 className="text-2xl font-bold">Ghi chú cuộc họp</h1>
      <p className="text-stone-500">Xin chào {userName}</p>

      <section className="mt-6">
        <h2 className="font-semibold">Vào một cuộc họp</h2>
        <label className="mt-2 block text-sm text-stone-500">Mã cuộc họp</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="K7Q-24M"
          className="mt-1 w-full rounded-lg border border-emerald-700 bg-white px-4 py-3 text-2xl font-bold tracking-widest"
        />
        <button
          onClick={() => onJoin?.(code)}
          disabled={!code.trim()}
          className="mt-3 rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          Vào cuộc họp này
        </button>
      </section>

      <hr className="my-6 border-stone-200" />

      <section>
        <h2 className="font-semibold">Bạn chủ trì?</h2>
        <p className="mt-1 text-stone-600">
          Mở một cuộc họp mới, bạn sẽ có mã và link để gửi cho mọi người.
        </p>
        <button
          onClick={() => onCreate?.()}
          className="mt-3 rounded-lg border border-stone-300 bg-white px-5 py-3"
        >
          Tạo cuộc họp mới
        </button>
      </section>

      <hr className="my-6 border-stone-200" />

      <section>
        <h2 className="font-semibold">Gần đây</h2>
        <ul className="mt-2 divide-y divide-stone-200">
          {RECENT.map((m) => (
            <li key={m.id} className="flex justify-between py-3">
              <span>{m.title}</span>
              <span className="text-stone-500">
                {m.date}{m.note && ` · ${m.note}`}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <ServerSetting />
    </div>
  )
}