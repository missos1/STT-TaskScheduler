import { useCallback, useRef, useState } from 'react'

export default function useRecorder({ deviceId, onChunk }) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef({})

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      const ctx = new AudioContext()
      await ctx.audioWorklet.addModule(chrome.runtime.getURL('pcm-worklet.js'))
      const src = ctx.createMediaStreamSource(stream)
      const node = new AudioWorkletNode(ctx, 'pcm-processor')
      node.port.onmessage = (e) => onChunk?.(e.data)
      src.connect(node)
      ref.current = { stream, ctx, node, src }
      setRecording(true)
      setError('')
    } catch (e) {
      setError(e.message || 'Không bật được mic')
    }
  }, [deviceId, onChunk])

  const stop = useCallback(() => {
    const { stream, ctx, node, src } = ref.current
    src?.disconnect()
    node?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    ctx?.close()
    ref.current = {}
    setRecording(false)
  }, [])

  return { recording, error, start, stop }
}