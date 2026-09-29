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
        error: "GEMINI_API_KEY belum diatur."
      });
    }

    // Gabungkan chat menjadi satu input
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
          model: "gemini-3.8-flash",
          input: conversation
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API error"
      });
    }

    const text =
      data?.output_text ||
      "Gemini tidak mengembalikan jawaban.";

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
