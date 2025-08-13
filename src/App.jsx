import { useEffect, useRef, useState } from "react"

export default function App() {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPtRef = useRef({ x: 0, y: 0 })
  const [tool, setTool] = useState("pen")
  const [eraserSize, setEraserSize] = useState(12)
  const [brushSize, setBrushSize] = useState(4)
  const [isSending, setIsSending] = useState(false)
  const [name, setName] = useState("")
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [nameErrorActive, setNameErrorActive] = useState(false)

  function fmt(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`
  }

  function computeRemaining() {
    const until = Number(localStorage.getItem("rateLimitUntil") || 0)
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
  }

  useEffect(() => {
    const r0 = computeRemaining()
    setRateLimitSeconds(r0)
    setIsRateLimited(r0 > 0)

    const id = setInterval(() => {
      const r = computeRemaining()
      setRateLimitSeconds(r)
      setIsRateLimited(r > 0)
      if (r === 0) localStorage.removeItem("rateLimitUntil")
    }, 1000)

    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const printerWidthPx = 250
    const safeDrawWidth = 250
    const heightPx = 400

    canvas.width = printerWidthPx
    canvas.height = heightPx
    canvas.style.width = `${printerWidthPx}px`
    canvas.style.height = `${heightPx}px`

    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, printerWidthPx, heightPx)
    ctx.strokeStyle = "#cccccc"
    ctx.strokeRect(0, 0, safeDrawWidth, heightPx)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#111827"
    ctx.lineWidth = brushSize
  }, [])

  const getRelativePoint = e => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = e => {
    e.preventDefault()
    const canvas = canvasRef.current
    canvas?.setPointerCapture?.(e.pointerId)
    isDrawingRef.current = true
    lastPtRef.current = getRelativePoint(e)
  }

  const onPointerMove = e => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const isEraser = tool === "eraser"
    ctx.lineWidth = isEraser ? eraserSize : brushSize
    ctx.strokeStyle = isEraser ? "#ffffff" : "#111827"
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const { x, y } = getRelativePoint(e)
    const { x: lx, y: ly } = lastPtRef.current
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPtRef.current = { x, y }
  }

  const onPointerUpOrCancel = e => {
    e.preventDefault()
    isDrawingRef.current = false
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const cssWidth = 250
    const cssHeight = 400
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cssWidth, cssHeight)
  }

  async function sendAndPrint() {
    if (name === "") {
      setNameErrorActive(true)
      return
    }
    if (isRateLimited || isSending) return

    const canvas = canvasRef.current
    if (!(canvas instanceof HTMLCanvasElement)) return

    setIsSending(true)

    try {
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
      )

      const form = new FormData()
      form.append("image", blob, "drawing.png")
      form.append("name", name)

      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 15000)

      const resp = await fetch("/api/print", {
        method: "POST",
        body: form,
        signal: controller.signal
      })

      clearTimeout(t)

      if (!resp.ok) {
        const text = await resp.text().catch(() => "")
        throw new Error(`Print failed: ${resp.status} ${text}`)
      }

      const cooldownSec = 30
      localStorage.setItem("rateLimitUntil", String(Date.now() + cooldownSec * 1000))
      setRateLimitSeconds(cooldownSec)
      setIsRateLimited(true)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="grid place-items-center">
      <div className="flex flex-row items-center mt-4 mb-4">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => setTool(t => (t === "pen" ? "eraser" : "pen"))}
            className="px-3 py-1 mb-2 mt-10 border rounded"
            aria-pressed={tool === "eraser"}
          >
            {tool === "eraser" ? "Eraser" : "Pen"}
          </button>
          <label className="pr-3">Brush size: {brushSize}</label>
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
          />
          <div className="flex flex-col items-center">
            <label className="px-3">Eraser size: {eraserSize}</label>
            <input
              type="range"
              min={4}
              max={30}
              value={eraserSize}
              onChange={e => setEraserSize(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="shadow-lg border-radius-lg select-none touch-none"
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUpOrCancel}
        onPointerLeave={onPointerUpOrCancel}
        onPointerCancel={onPointerUpOrCancel}
      />
      <div>
        <p className="text-red-500 mt-4 text-center">{nameErrorActive && "* Name is required *"}</p>
        <input
          placeholder="Your name"
          value={name}
          onChange={e => {
            setName(e.target.value)
            setNameErrorActive(false)
          }}
          className="mt-4 p-2 border rounded"
        />
      </div>
      <div className="flex items-center mt-4">
        <button
          className="mr-6"
          onClick={sendAndPrint}
          disabled={isSending || isRateLimited}
          title={isRateLimited ? `Please wait ${fmt(rateLimitSeconds)}` : "Send to printer"}
        >
          {isSending ? "Sending..." : isRateLimited ? `Send (${fmt(rateLimitSeconds)})` : "Send"}
        </button>
        <button onClick={handleClear}>Clear</button>
      </div>
    </div>
  )
}