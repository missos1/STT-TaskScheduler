import { useState } from 'react'

const GROUPS = ['Đồ án HCI · 4 người', 'Nhóm khác']

export default function CreateMeeting({
  hostName = 'An',
  code = 'K7Q-24M',
  onBack,
  onOpenRoom,
}) {
  const [title, setTitle] = useState('Họp đồ án – Sprint 2')
  const [group, setGroup] = useState(GROUPS[0])
  const [needApproval, setNeedApproval] = useState(true)
  const [copied, setCopied] = useState('')

  const link = `https://hop.example.com/j/${code}`

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setCopied('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 p-6 text-stone-900">
      <button onClick={onBack} className="self-start text-sm text-blue-900 underline">
        ← Quay lại
      </button>

      <h1 className="mt-4 text-2xl font-bold">Bắt đầu ghi cuộc họp</h1>
      <p className="text-stone-500">Bạn là {hostName}, trưởng nhóm</p>

      <label className="mt-5 text-sm text-stone-500">Tên cuộc họp</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 rounded-lg border border-stone-300 bg-white px-4 py-3"
      />

      <label className="mt-4 text-sm text-stone-500">Nhóm</label>
      <select
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="mt-1 rounded-lg border border-stone-300 bg-white px-4 py-3"
      >
        {GROUPS.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>

      <label className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={needApproval}
          onChange={(e) => setNeedApproval(e.target.checked)}
          className="h-5 w-5"
        />
        <span>Thành viên muốn xoá việc đã lưu thì phải xin tôi</span>
      </label>

      <hr className="my-5 border-stone-200" />

      <h2 className="font-semibold">Mời mọi người</h2>
      <p className="mt-1 text-stone-600">
        Ai trong nhóm đang mở trang họp này sẽ tự thấy lời mời. Người khác thì gửi mã này:
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-3xl font-bold tracking-widest">{code}</span>
        <button onClick={() => copy(code, 'code')} className="text-sm text-blue-900 underline">
          {copied === 'code' ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
      <div className="mt-2 text-stone-600">
        hoặc gửi link{' '}
        <button onClick={() => copy(link, 'link')} className="text-blue-900 underline">
          {copied === 'link' ? 'Đã chép' : 'Sao chép link'}
        </button>
      </div>

      <p className="mt-6 text-sm text-stone-500">
        Mỗi người tự bật mic của mình và phải đồng ý trước khi được ghi. Âm thanh được gửi lên máy chủ của nhóm
        và dịch vụ chuyển giọng nói thành chữ.
      </p>

      <button
        onClick={() => onOpenRoom?.({ title, group, needApproval, code })}
        disabled={!title.trim()}
        className="mt-auto rounded-lg bg-blue-900 py-3 font-semibold text-white disabled:opacity-40"
      >
        Mở phòng chờ
      </button>
    </div>
  )
}