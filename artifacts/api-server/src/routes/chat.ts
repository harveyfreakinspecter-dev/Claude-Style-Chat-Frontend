import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CHATBOT_API_URL =
  process.env.CHATBOT_API_URL ?? "https://chatbot.discoveryez-test.online";
const CHATBOT_API_KEY = process.env.CHATBOT_API_KEY ?? "";

function chatbotHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-Key": CHATBOT_API_KEY,
  };
}

router.post("/chat/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const { message, thinking_mode } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const upstream = await fetch(
      `${CHATBOT_API_URL}/chat/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: chatbotHeaders(),
        body: JSON.stringify({ message, thinking_mode: thinking_mode ?? false }),
      },
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log?.error({ err }, "chatbot upstream request failed");
    res.status(502).json({ error: "Chatbot service unavailable" });
  }
});

router.get("/chat/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const upstream = await fetch(
      `${CHATBOT_API_URL}/chat/${encodeURIComponent(sessionId)}`,
      { headers: chatbotHeaders() },
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log?.error({ err }, "chatbot upstream request failed");
    res.status(502).json({ error: "Chatbot service unavailable" });
  }
});

router.delete("/chat/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const upstream = await fetch(
      `${CHATBOT_API_URL}/chat/${encodeURIComponent(sessionId)}`,
      { method: "DELETE", headers: chatbotHeaders() },
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log?.error({ err }, "chatbot upstream request failed");
    res.status(502).json({ error: "Chatbot service unavailable" });
  }
});

export default router;
