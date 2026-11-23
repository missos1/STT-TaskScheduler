import { useCallback, useEffect, useRef, useState } from 'react'

export default function useMic() {
  const [status, setStatus] = useState('idle') // idle | granted | denied
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [level, setLevel] = useState(0)
  const cleanupRef = useRef(null)

  const loadDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    const mics = all.filter((d) => d.kind === 'audioinput')
    setDevices(mics)
    if (mics[0]) setDeviceId((cur) => cur || mics[0].deviceId)
  }, [])

  const openPermissionTab = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission.html') })
  }

  // Kiểm tra quyền hiện tại
  useEffect(() => {
    navigator.permissions
      .query({ name: 'microphone' })
      .then((p) => {
        const apply = () => {
          setStatus(p.state === 'granted' ? 'granted' : p.state === 'denied' ? 'denied' : 'idle')
          if (p.state === 'granted') loadDevices()
        }
        apply()
        p.onchange = apply
      })
      .catch(() => {})
  }, [loadDevices])

  // Đo mức âm khi đã có quyền
  useEffect(() => {
    if (status !== 'granted' || !deviceId) return
    let stopped = false
    let raf, ctx, stream

    navigator.mediaDevices
      .getUserMedia({ audio: { deviceId: { exact: deviceId } } })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        ctx = new AudioContext()
        const src = ctx.createMediaStreamSource(s)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        src.connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        const tick = () => {
          analyser.getByteTimeDomainData(data)
          let peak = 0
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
          setLevel(Math.min(1, peak / 64))
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => setStatus('denied'))

    cleanupRef.current = () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
    }
    return () => cleanupRef.current?.()
  }, [status, deviceId])

  return { status, devices, deviceId, setDeviceId, level, openPermissionTab }
}