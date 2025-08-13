export const config = {
  api: {
    bodyParser: false, // don't parse the body, we want to stream FormData
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const NGROK_URL = process.env.NGROK_URL;
  const API_KEY = process.env.API_KEY;

  try {
    const upstreamRes = await fetch(`${NGROK_URL}/print`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "content-type": req.headers["content-type"] || "",
      },
      body: req,
    });

    res.status(upstreamRes.status);
    upstreamRes.body.pipe(res);
  } catch (err) {
    console.error("Error proxying to printer:", err);
    res.status(500).send("Failed to reach printer service");
  }
}