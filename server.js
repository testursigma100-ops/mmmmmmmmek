import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [] } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum diatur di Railway."
      });
    }

    if (!messages.length) {
      return res.status(400).json({
        error: "Pesan kosong."
      });
    }

    const conversation = messages
      .map((m) => {
        const role = m.role === "assistant" ? "AI" : "User";
        return `${role}: ${String(m.content)}`;
      })
      .join("\n\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          input: conversation
        })
      }
    );

    const data = await response.json();

    console.log("Gemini status:", response.status);

    if (!response.ok) {
      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.message ||
          "Gemini API error."
      });
    }

    // ==============================
    // AMBIL TEXT DARI INTERACTIONS API
    // ==============================

    let text = "";

    // Kalau tersedia langsung
    if (typeof data.output_text === "string") {
      text = data.output_text;
    }

    // Format REST Interactions API
    if (!text && Array.isArray(data.steps)) {
      for (const step of data.steps) {
        if (!Array.isArray(step.content)) continue;

        for (const content of step.content) {
          if (
            content.type === "text" &&
            typeof content.text === "string"
          ) {
            text += content.text;
          }
        }
      }
    }

    // Fallback kalau struktur response berbeda
    if (
      !text &&
      Array.isArray(data.output)
    ) {
      for (const item of data.output) {
        if (typeof item.text === "string") {
          text += item.text;
        }

        if (
          Array.isArray(item.content)
        ) {
          for (const content of item.content) {
            if (typeof content.text === "string") {
              text += content.text;
            }
          }
        }
      }
    }

    text = text.trim();

    if (!text) {
      console.error(
        "Gemini response tidak punya text:",
        JSON.stringify(data, null, 2)
      );

      return res.status(500).json({
        error:
          "Gemini mengirim response, tapi teks jawabannya tidak ditemukan."
      });
    }

    res.json({
      text
    });

  } catch (err) {
    console.error("Server Error:", err);

    res.status(500).json({
      error: err.message || "Server error."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MY AI berjalan di port ${PORT}`);
});
