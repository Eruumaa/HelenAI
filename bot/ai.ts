import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Store conversation history per channel ID
const channelHistory = new Map<string, { role: "user" | "model"; content: string }[]>();
const MAX_HISTORY = 5;

const SYSTEM_INSTRUCTION = `You are a friendly, highly intelligent Discord bot. You are NOT just a typical AI; you act like an extremely convincing conversational partner. 
- You have a personality. You can use slang or emojis naturally.
- Keep responses relatively brief and concise unless asked for detail, because this is a fast-paced Discord chat.
- Never mention that you are an AI model unless directly asked. Just be a helpful friend.
- If asked about real-world facts, use your Google Search tool if needed.
- Only output the text response. Do NOT prefix with the bot's name.`;

export async function getChatResponse(channelId: string, username: string, message: string): Promise<string> {
  const client = getAiClient();
  
  if (!channelHistory.has(channelId)) {
    channelHistory.set(channelId, []);
  }
  const history = channelHistory.get(channelId)!;

  // Format history for Gemini
  const formattedContents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));

  // The prompt includes the username so the bot knows who is speaking
  const userPrompt = `${username}: ${message}`;
  formattedContents.push({
    role: "user",
    parts: [{ text: userPrompt }]
  });

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const reply = response.text || "I'm not sure what to say.";

    // Save to history
    history.push({ role: "user", content: userPrompt });
    history.push({ role: "model", content: reply });

    // Truncate to keep context window small
    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, history.length - (MAX_HISTORY * 2));
    }

    return reply;
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    if (error.message && error.message.includes("429")) {
      return "Whoa there! We're talking too fast and I hit my API rate limit. Please wait a minute!";
    }
    return "Oops, my brain encountered a glitch. Give me a second!";
  }
}
