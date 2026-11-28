const KEY = 'serverAddress'
const DEFAULT = 'localhost:8000'

const hasChrome = typeof chrome !== 'undefined' && chrome.storage?.local

export async function getServerAddress() {
  try {
    if (hasChrome) {
      const r = await chrome.storage.local.get(KEY)
      return r[KEY] || DEFAULT
    }
    return localStorage.getItem(KEY) || DEFAULT
  } catch {
    return DEFAULT
  }
}

export async function setServerAddress(value) {
  const v = value.trim().replace(/^(https?|wss?):\/\//, '').replace(/\/+$/, '')
  if (hasChrome) await chrome.storage.local.set({ [KEY]: v })
  else localStorage.setItem(KEY, v)
  return v
}