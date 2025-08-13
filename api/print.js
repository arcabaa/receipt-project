export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const NGROK_URL = process.env.NGROK_URL;
  const API_KEY   = process.env.API_KEY;
  if (!NGROK_URL) return res.status(500).send("Server misconfig: NGROK_URL not set");
  if (!API_KEY)   return res.status(500).send("Server misconfig: API_KEY not set");

  const contentType = req.headers["content-type"];
  if (!contentType) return res.status(400).send("Missing Content-Type");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
    });

    clearTimeout(timeout);
    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      res.status(504).send("Upstream timeout: printer tunnel not responding");
    } else {
      console.error("Error proxying to printer:", err);
      res.status(502).send("Bad gateway: failed to reach printer service");
    }
  }
}