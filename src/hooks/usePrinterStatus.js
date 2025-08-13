import { useEffect, useState } from "react"

export function usePrinterStatus(refreshMs = 0) {
  const [status, setStatus] = useState("unknown")
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const r = await fetch("/api/status")
        const j = await r.json()
        if (!cancelled) setStatus(j.status || "unknown")
      } catch {
        if (!cancelled) setStatus("unreachable")
      }
    }
    run()
    let id
    if (refreshMs > 0) id = setInterval(run, refreshMs)
    return () => { cancelled = true; if (id) clearInterval(id) }
  }, [refreshMs])
  return status
}