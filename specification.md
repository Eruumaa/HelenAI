# Discord AI Bot Specification & Architecture

This document outlines the architecture, components, and implementation roadmap for your AI-powered Discord bot. It integrates **YouTube Music Playback**, **Admin Automation**, and a human-like **AI Chat Personality** powered by Google Gemini.

---

## 1. Core Architecture Overview

The bot is designed as a continuous, stateful Node.js application. It connects directly to the Discord Gateway via WebSockets and communicates with Google Gemini and music streaming providers via HTTPS.

```
+-------------------------------------------------------------+
|                        DISCORD USER                         |
+-------------------------------------------------------------+
                               |
                               | (Gateway Events / Commands)
                               v
+-------------------------------------------------------------+
|                      DISCORD BOT ENGINE                     |
|                      (Node.js / ESM)                        |
+-------------------------------------------------------------+
      |                        |                        |
      | (Text Processing)      | (Voice Connection)     | (Admin Operations)
      v                        v                        v
+------------+           +------------+           +------------+
| GEMINI AI  |           | AUDIO STAGE|           | AUTOMATION |
| ENGINE     |           | (play-dl)  |           | ENGINE     |
+------------+           +------------+           +------------+
      |                        |                        |
      | (Search / Gen)         | (Stream Extraction)    | (Audit Logs /
      v                        v                        v  Auto-Mod)
+------------+           +------------+           +------------+
| Google     |           | YouTube /  |           | Server     |
| Search     |           | Soundcloud |           | Database   |
+------------+           +------------+           +------------+
```

---

## 2. Key Modules & Specifications

### Module A: The "Not-a-Bot" AI Conversationalist
* **Goal**: Provide a highly convincing, intelligent, and context-aware conversational partner.
* **Technology**: `@google/genai` SDK using the **Gemini 3.5 Flash** model (`gemini-3.5-flash`).
* **Key Features**:
  1. **Google Search Grounding**: Enabled dynamically for queries needing real-time web facts (e.g., *"What is the weather today in Tokyo?"*, *"Who won the match last night?"*).
  2. **Short-Term Memory**: A rolling conversational buffer (per-channel or per-user) caching the last 15-20 messages to maintain dialogue continuity.
  3. **Human Persona Ingestion**: A strict system instruction prompt defining the bot's tone, quirks, slang, humor, and boundaries to make it sound incredibly lifelike.
  4. **Proactive Typing**: Simulate human delay by showing the `typing...` state in Discord proportional to the length of the AI's response.

### Module B: High-Performance Music Player
* **Goal**: Play songs seamlessly from YouTube, Spotify, and Soundcloud links via Discord Voice channels.
* **Technology**: `@discordjs/voice`, `@discordjs/opus`, and `play-dl` (highly recommended over standard `ytdl-core` due to YouTube rate-limiting bypass).
* **Key Features**:
  1. **Dynamic Queue System**: Standard music commands: `/play`, `/skip`, `/queue`, `/pause`, `/resume`, `/stop`, `/nowplaying`.
  2. **Link Parser**: Automatically detect and resolve YouTube videos, playlists, Spotify tracks, and search keywords.
  3. **Network Resilience**: Automatic reconnection and error handling for packet loss or voice socket disconnects.

### Module C: Smart Admin & Moderation Automation
* **Goal**: Automate routine server management, welcome new members, and filter spam.
* **Technology**: Native `discord.js` event handlers paired with light, fast Gemini-powered classification.
* **Key Features**:
  1. **AI-Powered Auto-Mod**: Evaluate flagged messages for toxic language, scams, or malicious links using a high-speed, cost-effective call to Gemini.
  2. **Spam Prevention**: Rate-limit users sending messages too quickly (anti-raid thresholds).
  3. **Event Logs**: Detailed channel tracking of deleted messages, edited messages, and member joins/leaves.
  4. **Welcome Engine**: Generate a unique, personalized AI-written welcome greeting when a user joins the server.

---

## 3. Recommended Tech Stack

| Component | Technology / Library | Why It Was Chosen |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+ or v20+) | Industry standard for Discord bots; largest ecosystem. |
| **Language** | TypeScript | Strong typing prevents common payload and API mistakes. |
| **Discord Library** | `discord.js` (v14) | Robust, stable, and fully supports modern slash commands. |
| **AI Integration** | `@google/genai` (v2.4.0+) | The modern, official Google SDK optimized for Gemini models. |
| **Audio Playback** | `play-dl` + `@discordjs/voice` | Best-in-class YouTube stream extraction without requiring external Java-based Lavalink instances. |
| **Local Cache** | `keyv` or simple SQLite | Excellent for storing conversation history and server configs. |

---

## 4. Implementation Step-by-Step

### Step 1: Discord Application Setup
1. Visit the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application** and add a **Bot** user.
3. Enable the following **Privileged Gateway Intents**:
   - `Presence Intent`
   - `Server Members Intent`
   - `Message Content Intent` (Crucial for AI chat to read messages)
4. Generate an invite link under the **OAuth2** tab with scopes `bot` and `applications.commands` and admin permissions.

### Step 2: Environment Setup
Create a `.env` file containing your secret keys:
```env
DISCORD_TOKEN="your_discord_bot_token_here"
GEMINI_API_KEY="your_google_gemini_api_key_here"
CLIENT_ID="your_discord_client_id_here"
```

### Step 3: Server-Side Gemini Wrapper (`ai.ts`)
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

/**
 * Generates a response with dynamic Google Search grounding for real-time info.
 */
export async function getAIResponse(prompt: string, history: Array<{ role: string; text: string }>, systemPrompt: string) {
  // Format history to the expected structures
  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));
  
  // Append current prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: contents,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ googleSearch: {} }], // Automatically searches Google when needed!
    }
  });

  return response.text;
}
```

---

## 5. Deployment & Production Best Practices

- **Sharding**: Only required once your bot is in 1,000+ servers. Keep it simple in a single process initially.
- **YouTube IP Bans**: Extracting audio directly from YouTube can sometimes trigger `429 Too Many Requests` when hosted on shared cloud hosting providers. If this occurs, switch to a self-hosted **Lavalink** server using residential proxies or configure custom cookies in `play-dl`.
- **API Rate Limits**: Wrap Gemini calls in a debouncer or add user rate limits in Discord to prevent spamming your API key budget.
