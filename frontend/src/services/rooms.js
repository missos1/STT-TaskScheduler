import { getServerAddress } from './settings'

async function base() {
  const addr = await getServerAddress()
  const secure = !/^(localhost|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(addr)
  return `${secure ? 'https' : 'http'}://${addr}`
}

async function request(method, path, body) {
  const res = await fetch(`${await base()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* không phải JSON */ }
  console.log('[API]', method, path, res.status, data)
  if (!res.ok) throw new Error(data?.detail ? JSON.stringify(data.detail) : `Lỗi ${res.status}`)
  return data
}

export const createRoom = ({ hostName }) =>
  request('POST', '/api/rooms/create', { host_name: hostName })

export const checkRoom = (sessionId) =>
  request('GET', `/api/rooms/${encodeURIComponent(sessionId)}`)

export const joinRoom = (sessionId, { userName, userId }) =>
  request('POST', `/api/rooms/${encodeURIComponent(sessionId)}/join`, {
    user_name: userName,
    ...(userId ? { user_id: userId } : {}),
  })

export const closeRoom = (sessionId, hostToken) =>
  request('POST', `/api/rooms/${encodeURIComponent(sessionId)}/close`, { host_token: hostToken })