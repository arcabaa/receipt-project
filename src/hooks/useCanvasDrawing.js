import { useEffect, useRef, useState } from "react"

export function useCanvasDrawing(ref, { width = 250, height = 400, stroke = "#111827", bg = "#ffffff" } = {}) {
  const [tool, setTool] = useState("pen")
  const [brushSize, setBrushSize] = useState(4)
  const [eraserSize, setEraserSize] = useState(12)
  const isDrawingRef = useRef(false)
  const lastPtRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = "#cccccc"
    ctx.strokeRect(0, 0, width, height)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = stroke
    ctx.lineWidth = brushSize
    drawTornEdge(ctx, "bottom", 250, 400, { amp: 6, tooth: 10 })
    drawTornEdge(ctx, "top", 250, 400, { amp: 6, tooth: 10 })
  }, [ref, width, height, stroke, bg])

  function drawTornEdge(ctx, edge, width, height, { amp = 6, tooth = 12, inset = 0, shade = true } = {}) {
    const y = edge === "bottom" ? height - inset : inset
    const invert = edge === "top" ? -1 : 1

    // cut a jagged shape outside the receipt
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    ctx.beginPath()
    ctx.moveTo(0, y)

    let up = true
    for (let x = 0; x <= width; x += tooth) {
      const mid = Math.min(x + tooth / 2, width)
      ctx.lineTo(mid, y + invert * (up ? amp : -amp))
      const next = Math.min(x + tooth, width)
      ctx.lineTo(next, y)
      up = !up
    }

    if (edge === "bottom") {
      ctx.lineTo(width, height + 60)
      ctx.lineTo(0, height + 60)
    } else {
      ctx.lineTo(width, -60)
      ctx.lineTo(0, -60)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    if (!shade) return

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, y)
    up = true
    for (let x = 0; x <= width; x += tooth) {
      const mid = Math.min(x + tooth / 2, width)
      ctx.lineTo(mid, y + invert * (up ? amp : -amp))
      const next = Math.min(x + tooth, width)
      ctx.lineTo(next, y)
      up = !up
    }
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  const getRelativePoint = e => {
    const rect = ref.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = e => {
    e.preventDefault()
    const canvas = ref.current
    if (canvas && typeof canvas.setPointerCapture === "function") {
      try { canvas.setPointerCapture(e.pointerId) } catch {}
    }
    isDrawingRef.current = true
    lastPtRef.current = getRelativePoint(e)
  }

  const onPointerMove = e => {
    if (!isDrawingRef.current) return
    e.preventDefault()
    const canvas = ref.current
    const ctx = canvas.getContext("2d")
    const isEraser = tool === "eraser"
    ctx.lineWidth = isEraser ? eraserSize : brushSize
    ctx.strokeStyle = isEraser ? bg : stroke
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

  const clear = () => {
    const canvas = ref.current
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)
    drawTornEdge(ctx, "bottom", 250, 400, { amp: 6, tooth: 10 })
    drawTornEdge(ctx, "top", 250, 400, { amp: 6, tooth: 10 })
  }

  const toBlob = () => new Promise((resolve, reject) =>
    ref.current.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
  )

  return {
    tool, setTool,
    brushSize, setBrushSize,
    eraserSize, setEraserSize,
    handlers: { onPointerDown, onPointerMove, onPointerUpOrCancel },
    clear,
    toBlob
  }
}