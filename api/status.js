/* eslint-env node */
/* global process */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).send("Method Not Allowed")

  const NGROK_URL = process.env.NGROK_URL
  const API_KEY = process.env.API_KEY
  if (!NGROK_URL) return res.status(500).send("Server misconfig: NGROK_URL not set")
  if (!API_KEY)   return res.status(500).send("Server misconfig: API_KEY not set")

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5000)

  try {
    const up = await fetch(`${NGROK_URL}/status`, {
      headers: { "x-api-key": API_KEY },
      signal: controller.signal
    })
    clearTimeout(t)
    const text = await up.text()
    res.status(up.status).send(text)
  } catch (err) {
    clearTimeout(t)
    if (err.name === "AbortError") return res.status(504).send("Upstream timeout")
    res.status(502).send("Bad gateway")
  }
}
