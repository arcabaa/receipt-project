export default function CanvasBoard({ canvasRef, handlers, width = 250, height = 400 }) {
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="shadow-lg border-radius-lg select-none touch-none"
      style={{ width, height, touchAction: "none", userSelect: "none" }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUpOrCancel}
      onPointerLeave={handlers.onPointerUpOrCancel}
      onPointerCancel={handlers.onPointerUpOrCancel}
    />
  )
}