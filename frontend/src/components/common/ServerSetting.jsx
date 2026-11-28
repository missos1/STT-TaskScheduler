import { useEffect, useState } from 'react'
import { getServerAddress, setServerAddress } from '../../services/settings'

export default function ServerSetting() {
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getServerAddress().then(setValue)
  }, [])

  const save = async () => {
    setValue(await setServerAddress(value))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <details className="mt-6 text-sm">
      <summary className="cursor-pointer text-stone-500">Cài đặt máy chủ</summary>
      <label className="mt-2 block text-stone-500">Địa chỉ server (ví dụ 100.64.0.5:8000)</label>
      <div className="mt-1 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2"
        />
        <button onClick={save} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
          {saved ? 'Đã lưu' : 'Lưu'}
        </button>
      </div>
    </details>
  )
}