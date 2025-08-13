const ENDPOINT = '/api/print'

export async function sendPrint({ blob, name, signal }) {
  const form = new FormData()
  form.append("image", blob, "drawing.png")
  form.append("name", name)
  const r = await fetch(ENDPOINT, { method: "POST", body: form, signal })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`Print failed: ${r.status} ${t}`)
  }
}