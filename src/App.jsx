import { useRef, useState } from "react"
import CanvasBoard from "./components/CanvasBoard"
import Controls from "./components/Controls"
import StatusBadge from "./components/StatusBadge"
import { Analytics } from "@vercel/analytics/react"
import { useCanvasDrawing } from "./hooks/useCanvasDrawing"
import { useRateLimit } from "./hooks/useRateLimit"
import { usePrinterStatus } from "./hooks/usePrinterStatus"
import { sendPrint } from "./services/api"

function fmt(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`
}

export default function App() {
  const canvasRef = useRef(null)
  const [name, setName] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [nameErrorActive, setNameErrorActive] = useState(false)

  const drawing = useCanvasDrawing(canvasRef, { width: 250, height: 400 })
  const { remaining, limited, start } = useRateLimit({ key: "rateLimitUntil", seconds: 30 })
  const printerStatus = usePrinterStatus(0)

  const handleClear = () => drawing.clear()

  const sendAndPrint = async () => {
    if (!name) { setNameErrorActive(true); return }
    if (limited || isSending) return
    setIsSending(true)
    try {
      const blob = await drawing.toBlob()
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 15000)
      await sendPrint({ blob, name, signal: controller.signal })
      clearTimeout(t)
      start()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="grid place-items-center gap-4">
      <div className="mt-2 p-2">
        <StatusBadge status={printerStatus} />
      </div>

      <CanvasBoard canvasRef={canvasRef} handlers={drawing.handlers} width={250} height={400} />

      <Controls
        tool={drawing.tool}
        setTool={drawing.setTool}
        brushSize={drawing.brushSize}
        setBrushSize={drawing.setBrushSize}
        eraserSize={drawing.eraserSize}
        setEraserSize={drawing.setEraserSize}
        name={name}
        setName={v => { setName(v); if (v) setNameErrorActive(false) }}
        nameErrorActive={nameErrorActive}
        onSend={sendAndPrint}
        onClear={handleClear}
        isSending={isSending}
        limited={limited}
        remaining={remaining}
        fmt={fmt}
      />
      <Analytics mode="production" />
    </div>
  )
}