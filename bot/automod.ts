import { GoogleGenAI } from "@google/genai";
import { Message } from "discord.js";

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function checkAutoMod(message: Message): Promise<boolean> {
  const client = getAiClient();
  if (!client) return false; // AI disabled, do nothing

  const text = message.content;
  if (!text) return false;

  // PRE-FILTER: Jangan panggil AI jika pesannya tidak mengandung link atau kata mencurigakan
  // Ini sangat penting untuk MENCEGAH limit 429 API Google!
  const hasLink = /https?:\/\//i.test(text);
  const hasSuspiciousWords = /(free|nitro|scam|click|win|gift|password|token|fuck|shit|bitch|cunt|stupid|idiot)/i.test(text);
  
  if (!hasLink && !hasSuspiciousWords) {
    return false; // Pesan biasa, hemat kuota AI
  }

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

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.isFlagged && result.confidence > 0.7) {
      console.log(`AutoMod Flagged Message: [${result.category}] ${result.reason}`);
      await message.delete();
      if ('send' in message.channel) {
        await message.channel.send(`⚠️ <@${message.author.id}>, your message was removed. Reason: ${result.reason}`);
      }
      return true; // was handled by automod
    }
  } catch (error) {
    console.error("AutoMod Error:", error);
  }

  return false; // safe
}
