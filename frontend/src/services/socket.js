import { getServerAddress } from './settings'

let ws = null

// Frame = 8 byte float64 (little-endian, mili giây) + dữ liệu Int16 PCM
export function buildFrame(pcmBuffer, timestampMs) {
  const out = new ArrayBuffer(8 + pcmBuffer.byteLength)
  new DataView(out).setFloat64(0, timestampMs, true)
  new Uint8Array(out, 8).set(new Uint8Array(pcmBuffer))
  return out
}

export async function connect({ code, userId, userName, onOpen, onClose, onError, onMessage }) {
  disconnect()
  const addr = await getServerAddress()
  // IP hoặc localhost -> ws://, tên miền (vd .ts.net) -> wss://
  const secure = !/^(localhost|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(addr)
  const proto = secure ? 'wss' : 'ws'
  const url =
    `${proto}://${addr}/ws/meet/${encodeURIComponent(code)}` +
    `?user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}`
  console.log('[WS] connecting to', url)

  ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  ws.onopen = () => {
    console.log('[WS] open')
    onOpen?.()
  }
  ws.onclose = (e) => {
    console.log('[WS] closed', e.code, e.reason)
    onClose?.(e)
  }
  ws.onerror = () => {
    console.log('[WS] error')
    onError?.('Không kết nối được server')
  }
  ws.onmessage = (e) => onMessage?.(e.data)
}

export function sendAudio(pcmBuffer) {
  if (ws?.readyState !== WebSocket.OPEN) return false
  ws.send(buildFrame(pcmBuffer, Date.now()))
  return true
}

export function isConnected() {
  return ws?.readyState === WebSocket.OPEN
}

export function disconnect() {
  ws?.close()
  ws = null
}