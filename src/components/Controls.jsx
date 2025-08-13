export default function Controls({
  tool, setTool,
  brushSize, setBrushSize,
  eraserSize, setEraserSize,
  name, setName, nameErrorActive,
  onSend, onClear,
  isSending, limited, remaining, fmt
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 mt-4">
        <div className="flex flex-col items-center">
            <p className="mb-2">Current Tool</p>
            <button
                type="button"
                onClick={() => setTool(t => (t === "pen" ? "eraser" : "pen"))}
                className="px-3 py-1 border rounded"
                aria-pressed={tool === "eraser"}
            >
                    {tool === "eraser" ? "Eraser" : "Pen"}
            </button>
        </div>

        <div className="flex flex-col items-center">
            <div className="flex flex-col items-center">
                <label>Brush: {brushSize}px</label>
                <input type="range" min={1} max={20} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
            </div>
            <div className="flex flex-col items-center">
                <label>Eraser: {eraserSize}px</label>
                <input type="range" min={4} max={30} value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} />
            </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <p className="text-red-500 h-5 mb-2">{nameErrorActive && "* Name is required *"}</p>
        <input
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="p-2 border rounded"
        />
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onSend}
          disabled={isSending || limited}
          title={limited ? `Please wait ${fmt(remaining)}` : "Send to printer"}
          className="px-4 py-2 border rounded"
        >
          {isSending ? "Sending..." : limited ? `Send (${fmt(remaining)})` : "Send"}
        </button>
        <button onClick={onClear} className="px-4 py-2 border rounded">Clear</button>
      </div>
    </div>
  )
}