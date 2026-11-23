import { useState } from 'react'
import useMic from '../../hooks/useMic'

export default function PreJoinScreen({
  meeting = { title: 'Họp đồ án – Sprint 2', host: 'An', joined: ['Đức'], waiting: ['Hoàng', 'Trung'] },
  defaultName = 'Hoàng',
  onBack,
  onEnter,
}) {
  const [name, setName] = useState(defaultName)
  const [agree, setAgree] = useState(false)
  const { status, devices, deviceId, setDeviceId, level, openPermissionTab } = useMic()

  const canEnter = name.trim() && agree && status === 'granted'

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 p-6 text-stone-900">
      <button onClick={onBack} className="self-start text-sm text-blue-900 underline">
        ← Nhập mã khác
      </button>

      <p className="mt-4 text-sm text-stone-500">Bước 2/2 · Trước khi vào</p>
      <h1 className="text-2xl font-bold">{meeting.title}</h1>
      <p className="text-stone-500">
        {meeting.host} chủ trì. {meeting.joined.join(', ')} đã vào, còn {meeting.waiting.join(' và ')}.
      </p>

      <label className="mt-6 text-sm text-stone-500">Tên hiện trong lời thoại</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 rounded-lg border border-stone-300 bg-white px-4 py-3"
      />

      <label className="mt-4 text-sm text-stone-500">Micro</label>
      {status === 'granted' ? (
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="mt-1 rounded-lg border border-stone-300 bg-white px-4 py-3"
        >
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || 'Micro'}
            </option>
          ))}
        </select>
      ) : (
        <button
          onClick={openPermissionTab}
          className="mt-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-left text-blue-900 underline"
        >
          {status === 'denied' ? 'Micro bị chặn. Bấm để thử cấp lại' : 'Bấm để cấp quyền micro'}
        </button>
      )}

      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="text-stone-500">Thử nói một câu</span>
        <div className="h-2 flex-1 rounded bg-stone-200">
          <div className="h-2 rounded bg-emerald-700 transition-all" style={{ width: `${level * 100}%` }} />
        </div>
        <span className="font-medium text-emerald-700">{level > 0.15 ? 'Nghe rõ' : 'Chưa nghe thấy'}</span>
      </div>
      <p className="mt-2 text-sm text-stone-500">
        Nên đeo tai nghe. Nếu bật loa ngoài, mic của bạn sẽ thu luôn giọng người khác.
      </p>

      <hr className="my-5 border-stone-200" />

      <label className="flex gap-3">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5" />
        <span>
          Tôi đồng ý cho ghi giọng nói của mình trong cuộc họp này. Tôi có thể tắt mic hoặc rời đi bất cứ lúc nào.
        </span>
      </label>

      <button
        onClick={() => onEnter?.({ name, deviceId })}
        disabled={!canEnter}
        className="mt-auto rounded-lg bg-blue-900 py-3 font-semibold text-white disabled:opacity-40"
      >
        Vào và bật mic
      </button>
    </div>
  )
}