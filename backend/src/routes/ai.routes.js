import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Converts plain-text paragraphs (separated by blank lines) into simple
// HTML paragraphs, so the result drops straight into the Quill editor
// looking correctly formatted.
function paragraphsToHtml(text) {
  return text
    .split(/\n\s*\n/)
    .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// POST /api/generate-email — takes a short prompt, returns a draft subject + body.
router.post("/generate-email", requireAuth, async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "prompt is required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ error: "AI generation is not configured on the server" });
  }

  console.log(
    "Using API key:",
    process.env.GEMINI_API_KEY.substring(0, 10) + "...",
  );

  const instruction = `You are writing a marketing/outreach email. Based on this request: "${prompt}"

Write a subject line and email body. The email should naturally include the placeholders {name} where a greeting would normally use the recipient's name, so it can be personalized per-recipient later.

Respond in EXACTLY this format, nothing else, no markdown, no extra commentary:
SUBJECT: <the subject line>
BODY:
<the email body, written as plain paragraphs separated by blank lines>`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruction }] }],
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      console.error("Response status:", response.status);
      return res
        .status(502)
        .json({ error: "AI generation failed. Try again." });
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));

    let rawText = "";
    try {
      rawText = data.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error("Error parsing response:", e.message);
      console.error("Response data:", data);
      rawText = "";
    }

    if (!rawText) {
      return res.status(502).json({ error: "No text generated. Try again." });
    }

    const subjectMatch = rawText.match(/SUBJECT:\s*(.+)/);
    const bodyMatch = rawText.match(/BODY:\s*([\s\S]*)/);

    const subject = subjectMatch
      ? subjectMatch[1].trim()
      : "Subject unavailable — please write your own";
    const bodyText = bodyMatch ? bodyMatch[1].trim() : rawText.trim();

    res.json({
      subject,
      bodyHtml: paragraphsToHtml(bodyText),
    });
  } catch (err) {
    console.error("AI generation error:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: "AI generation failed. Try again." });
  }
});

export default router;
