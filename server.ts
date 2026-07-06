import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { startBot } from "./bot/index";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini API client to prevent crashing if the key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// AI Chat Sandbox endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, systemInstruction, enableSearch } = req.body;

    if (!message) {
       res.status(400).json({ error: "Message is required" });
       return;
    }

    const client = getAiClient();
    
    // Map history to Google GenAI structure
    // history expected: Array of { role: 'user' | 'model', content: string }
    const formattedContents = (history || []).map((h: any) => ({
      role: h.role,
      parts: [{ text: h.content }]
    }));

    // Append current message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config,
    });

    const responseText = response.text || "No response generated.";
    
    // Extract grounding search query info if available
    const searchGroundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({
      text: responseText,
      grounding: searchGroundingMetadata || null
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "An error occurred during AI generation." });
  }
});

// AI Auto-Mod Simulator endpoint
app.post("/api/automod", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
       res.status(400).json({ error: "Text is required" });
       return;
    }

    const client = getAiClient();
    
    const prompt = `Analyze the following message sent by a Discord user. Classify it for moderation.
Check if it contains:
1. SPAM / SCAM / PHISHING (e.g., suspicious links, "click here to win", free discord nitro scams)
2. TOXICITY / HARASSMENT / EXTREME INSULTS
3. EXPLICIT CONTENT / NSFW
4. NORMAL (Safe to post)

Respond with a JSON block. Use the exact keys:
"isFlagged": boolean,
"reason": string (if flagged, describe why in 1 sentence. If not flagged, write ""),
"category": string ("SPAM_SCAM", "TOXICITY", "NSFW", or "NORMAL"),
"confidence": number (between 0.0 and 1.0)

Message to analyze: "${text.replace(/"/g, '\\"')}"`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Error in /api/automod:", error);
    res.status(500).json({ error: error.message || "An error occurred during Auto-Mod." });
  }
});

// AI Welcome Generator endpoint
app.post("/api/welcome", async (req, res) => {
  try {
    const { username, bio, personaType } = req.body;
    if (!username) {
       res.status(400).json({ error: "Username is required" });
       return;
    }

    const client = getAiClient();

    let personaPrompt = "Friendly, welcoming, high-energy gaming bot";
    if (personaType === "chaotic") {
      personaPrompt = "Sarcastic, chaotic gamer, full of playful banter and gaming references";
    } else if (personaType === "tech") {
      personaPrompt = "Highly technical, sleek, professional sci-fi utility AI";
    } else if (personaType === "chill") {
      personaPrompt = "Chill, laid-back lo-fi barista vibe";
    }

    const prompt = `Write a short, highly engaging 2-sentence welcome message for a Discord server's general chat.
The bot welcoming the user has this persona: "${personaPrompt}".
The new member's username is "${username}".
Their custom bio or interests are: "${bio || "No bio provided"}".
Keep it friendly, highly personalized to their bio if they have one, use Discord markdown formatting (like **bold**, *italics*, or \`code\`), and make it sound natural and human, not boilerplate. Do not include the bot's name, just write the welcome message itself.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ message: response.text || "Welcome!" });
  } catch (error: any) {
    console.error("Error in /api/welcome:", error);
    res.status(500).json({ error: error.message || "An error occurred during welcome message generation." });
  }
});

// Vite middleware integration or production static serving
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });

  // Start the Discord bot
  startBot().catch((err) => {
    console.error("Failed to start Discord bot:", err);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start server:", err);
});
