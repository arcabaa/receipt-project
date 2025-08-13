import { useEffect, useState } from "react"

export function useRateLimit({ key = "rateLimitUntil", seconds = 30 } = {}) {
  const [remaining, setRemaining] = useState(0)
  const [limited, setLimited] = useState(false)

  const compute = () => Math.max(0, Math.ceil(((Number(localStorage.getItem(key) || 0)) - Date.now()) / 1000))

  useEffect(() => {
    const r0 = compute()
    setRemaining(r0)
    setLimited(r0 > 0)
    const id = setInterval(() => {
      const r = compute()
      setRemaining(r)
      setLimited(r > 0)
      if (r === 0) localStorage.removeItem(key)
    }, 1000)
    return () => clearInterval(id)
  }, [key])

  const start = () => {
    const until = Date.now() + seconds * 1000
    localStorage.setItem(key, String(until))
    setRemaining(seconds)
    setLimited(true)
  }

  return { remaining, limited, start }
}