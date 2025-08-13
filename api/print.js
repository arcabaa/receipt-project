// api/print.js
export const config = {
  api: {
    bodyParser: false,      // don't consume the multipart body
    externalResolver: true, // we fully handle the response
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const NGROK_URL = process.env.NGROK_URL;
  const API_KEY   = process.env.API_KEY;

  // Quick sanity checks so you don't get a mysterious 500
  if (!NGROK_URL) {
    res.status(500).send("Server misconfig: NGROK_URL is not set on Vercel");
    return;
  }
  if (!API_KEY) {
    res.status(500).send("Server misconfig: API_KEY is not set on Vercel");
    return;
  }

  const contentType = req.headers["content-type"];
  if (!contentType) {
    res.status(400).send("Missing Content-Type header");
    return;
  }

  // Abort if upstream is slow / tunnel is down
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s

  try {
    const upstream = await fetch(`${NGROK_URL}/print`, {
      method: "POST",
      // Only forward what's strictly needed for FormData streaming.
      headers: {
        "x-api-key": API_KEY,
        "content-type": contentType,                 // keep boundary
        // If present, forward content-length to avoid chunked quirks.
        ...(req.headers["content-length"]
          ? { "content-length": req.headers["content-length"] }
          : {}),
      },
      body: req, // stream the raw multipart body
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Read upstream body (text is fine; your backend sends text)
    const text = await upstream.text();

    // Pass through status + text so you see real errors in the browser/Logs
    res.status(upstream.status).send(text);
  } catch (err) {
    clearTimeout(timeout);
    // Distinguish timeout vs other issues
    if (err.name === "AbortError") {
      res.status(504).send("Upstream timeout: printer tunnel not responding");
    } else {
      console.error("Proxy error to printer:", err);
      res.status(502).send("Bad gateway: failed to reach printer service");
    }
  }
}