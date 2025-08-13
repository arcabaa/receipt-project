import React, { useEffect, useRef, useState } from "react"

export default function App() {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPtRef = useRef({ x: 0, y: 0 })
  const [brushSize, setBrushSize] = useState(4)
  const [isSending, setIsSending] = useState(false)
  const [name, setName] = useState("")
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [nameErrorActive, setNameErrorActive] = useState(false)

  useEffect(() => {
    let rateLimit = localStorage.getItem("rateLimit")
    if (Number(rateLimit) > 0) {
      setIsRateLimited(true)

      setTimeout(() => {
        setIsRateLimited(false)
        localStorage.removeItem("rateLimit")
      }, Number(rateLimit) * 1000)

      setTimeout(() => {
        setRateLimitSeconds((prev) => prev - 1)
      }, 1000)
    }

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


  const getRelativePoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = event.touches?.length ? event.touches[0].clientX : event.clientX
    const clientY = event.touches?.length ? event.touches[0].clientY : event.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    isDrawingRef.current = true
    lastPtRef.current = getRelativePoint(e)
  }

  const draw = (e) => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext("2d")
    ctx.lineWidth = brushSize
    const { x, y } = getRelativePoint(e)
    const { x: lx, y: ly } = lastPtRef.current
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPtRef.current = { x, y }
  }

  const endDrawing = (e) => {
    if (!isDrawingRef.current) return
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
    if (name == "") {
      setNameErrorActive(true)
      return
    }

    const canvas = canvasRef.current
    
    if (!(canvas instanceof HTMLCanvasElement)) {
      console.error("Canvas not found or ref not attached")
      return
    }

    setIsSending(true)

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    )

    const form = new FormData()
    form.append("image", blob, "drawing.png")
    form.append("name", name)

    const response = await fetch("/api/print", {
      method: "POST",
      body: form,
    })

    if (!response.ok) {
      console.error(await response.text())
      setIsSending(false)
    }
    localStorage.setItem("rateLimit", 30)
    setIsSending(false)
  }

  return (
    <div className="grid place-items-center">
      <div className="flex flex-row items-center mt-4 mb-4">
        <p className="pr-6">Brush size: {brushSize}</p>
        <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>
      <canvas
        ref={canvasRef}
        className="shadow-lg border-radius-lg"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      <div>
        <p className="text-red-500 mt-4 text-center">{nameErrorActive && "* Name is required *"}</p>
        <input placeholder="Your name" value={name} onChange={(e) => { setName(e.target.value); setNameErrorActive(false) }} className="mt-4 p-2 border rounded" />
      </div>
      <div className="flex items-center mt-4">
        {isRateLimited && <p className="text-red-500 mr-4">Try again in {rateLimitSeconds} seconds.</p>}
        <button className="mr-6" onClick={sendAndPrint} disabled={isSending || isRateLimited}>{isSending ? "Sending" : "Send"}</button>
        <button onClick={handleClear}>Clear</button>
      </div>
    </div>
  )
}
