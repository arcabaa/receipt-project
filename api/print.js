/* eslint-env node */
/* global process */
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed")
    return
  }

  const NGROK_URL = process.env.NGROK_URL
  const API_KEY   = process.env.API_KEY
  const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET
  if (!NGROK_URL) return res.status(500).send("Server misconfig: NGROK_URL not set")
  if (!API_KEY)   return res.status(500).send("Server misconfig: API_KEY not set")
  if (!TURNSTILE_SECRET) return res.status(500).send("Server misconfig: TURNSTILE_SECRET not set")

  const contentType = req.headers["content-type"]
  if (!contentType) return res.status(400).send("Missing Content-Type")

  const token = req.headers["cf-turnstile-response"]
  if (!token) return res.status(400).send("Missing Turnstile token")

  const ip = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress

  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      remoteip: ip,
    }),
  })
  const outcome = await verify.json()
  if (!outcome.success) return res.status(403).send("Turnstile verification failed")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const upstream = await fetch(`${NGROK_URL}/print`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "content-type": contentType,
        ...(req.headers["content-length"]
          ? { "content-length": req.headers["content-length"] }
          : {}),
      },
      body: req,
      duplex: "half",
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const text = await upstream.text()
    res.status(upstream.status).send(text)
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === "AbortError") {
      res.status(504).send("Upstream timeout: printer tunnel not responding")
    } else {
      console.error("Error proxying to printer:", err)
      res.status(502).send("Bad gateway: failed to reach printer service")
    }
  }
}