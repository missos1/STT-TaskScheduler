import { useEffect, useState } from 'react'
import { POLL_INTERVAL_MS } from '../constants/api'
import { getSummary } from '../services/summaryApi'
 
/**
 * Polls GET /summary until status === "ready".
 * Returns { data, error, retry }:
 *   data  - last response from the server (null before the first answer)
 *   error - error message string, or null
 *   retry - call to start polling again after an error
 */
export function useSummary(meetCode) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0) // bump to restart the effect
 
  useEffect(() => {
    if (!meetCode) return undefined
 
    let cancelled = false // set when the component unmounts
    let timerId = null
 
    async function poll() {
      try {
        const result = await getSummary(meetCode)
        if (cancelled) return
        setData(result)
        setError(null)
        // Keep asking until the LLM pipeline is done.
        if (result.status !== 'ready') {
          timerId = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
 
    poll()
 
    // Cleanup: stop polling when meetCode changes or the panel closes.
    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [meetCode, attempt])
 
  const retry = () => {
    setError(null)
    setAttempt((n) => n + 1)
  }
 
  return { data, error, retry }
}
