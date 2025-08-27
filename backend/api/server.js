// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Allow frontend to connect (for local dev, use *; for production, restrict domains)
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" })); // allow base64 images

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-1.5-flash";

// ✅ Root route (fix for "Cannot GET /")
app.get("/", (_req, res) => {
  res.send("✅ AI Chat Assistant Backend is running");
});

// Health check
app.get("/api", (_req, res) => res.send("✅ Gemini backend running"));

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, image } = req.body; // image?: { data, mimeType, name }
    if (!message && !image) {
      return res.status(400).json({ reply: "Please send a message or image." });
    }

    const parts = [];
    if (message) parts.push({ text: message });
    if (image?.data && image?.mimeType) {
      parts.push({
        inline_data: { mime_type: image.mimeType, data: image.data },
      });
    }

    const body = { contents: [{ role: "user", parts }] };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await resp.json();

    let reply = "⚠️ No response from Gemini API";
    if (data?.candidates?.[0]?.content?.parts?.length) {
      reply =
        data.candidates[0].content.parts
          .map((p) => p.text || "")
          .join("")
          .trim() || reply;
    }
    if (data?.promptFeedback?.blockReason) {
      reply = `⚠️ Blocked by safety: ${data.promptFeedback.blockReason}`;
    }

    res.json({ reply });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ reply: "⚠️ Server error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

