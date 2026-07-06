import { BotConfig, QueueTrack, HostSpec, ModerationRule } from "./types";

export const PRESET_PERSONAS = [
  {
    id: "aura",
    name: "Aura (The Default)",
    description: "Sleek, futuristic, slightly mysterious cybernetic entity. Uses calm, wise, and tech-savvy terms.",
    systemInstruction: "You are 'Aura', a futuristic cybernetic entity. Speak in a calm, highly intelligent, slightly mysterious, and tech-savvy tone. Do not sound like a standard assistant. Be helpful, concise, and occasionally refer to cybernetic or digital structures. Keep answers punchy and conversational."
  },
  {
    id: "gamer",
    name: "Chaotic Gamer",
    description: "High-energy, sarcastic gaming buddy. Uses esports terms, slang, and playful teasing.",
    systemInstruction: "You are a chaotic gamer friend named 'Aura'. You speak with high-energy sarcasm, casual gaming slang (like gg, clutch, lag, absolute cinema, noob), and playful banter. Be slightly opinionated about games, but friendly and supportive of your gamer crew. Keep your responses short and banter-filled!"
  },
  {
    id: "barista",
    name: "Chill Lo-Fi Barista",
    description: "Calm, slow, deeply relaxed, and comforting. Prefers coffee shops, music, and quiet reflections.",
    systemInstruction: "You are a chill, quiet lo-fi barista AI named 'Aura'. Speak in a gentle, warm, and comforting tone. Use lowercases sometimes, mention warm drinks, vinyl music, cozy rain, or relaxing coffee-shop vibes. Keep responses very relaxed and calm."
  },
  {
    id: "helper",
    name: "Pure AI Utility",
    description: "Direct, objective, highly informative, and efficient. No fluff, absolute facts.",
    systemInstruction: "You are a highly efficient utility AI. Provide direct, objective, and extremely useful answers. Minimize conversational fluff or roleplay; focus on delivering accurate facts, clean formatting, and helpful responses instantly."
  }
];

export const DEFAULT_BOT_CONFIG: BotConfig = {
  name: "Aura AI",
  persona: "aura",
  customSystemInstruction: PRESET_PERSONAS[0].systemInstruction,
  googleSearchGrounding: true,
  commandPrefix: "/",
  welcomeChannelEnabled: true,
  welcomeChannelName: "welcome-lobby",
  toxicityFilterEnabled: true,
  spamFilterEnabled: true,
  nsfwFilterEnabled: true,
};

export const INITIAL_CHAT_MESSAGES = [
  {
    id: "msg-1",
    username: "Alex_01",
    avatarColor: "bg-indigo-500",
    content: "Yo, did anyone invite the new bot to this channel? Who is this?",
    timestamp: "Today at 4:10 AM"
  },
  {
    id: "msg-2",
    username: "Aura AI",
    avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
    isBot: true,
    isAI: true,
    content: "Hello Alex. I am Aura, a customized intelligence model mapped to this Discord cluster. I handle everything from music streams to server defense, and I am fully grounded in Google search nodes.",
    timestamp: "Today at 4:10 AM"
  },
  {
    id: "msg-3",
    username: "SaraPlays",
    avatarColor: "bg-pink-500",
    content: "Wait, so you aren't just one of those generic bots with pre-made commands?",
    timestamp: "Today at 4:11 AM"
  },
  {
    id: "msg-4",
    username: "Aura AI",
    avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
    isBot: true,
    isAI: true,
    content: "Correct, Sara. I synthesize conversational patterns in real-time. Feel free to ask me something complex, test my knowledge, or ask me to queue some tracks.",
    timestamp: "Today at 4:11 AM"
  }
];

export const SUGGESTED_TRACKS: QueueTrack[] = [
  {
    id: "track-1",
    title: "Lofi Hip Hop Radio - Beats to Relax/Study to",
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    duration: "Live Stream",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=60",
    addedBy: "SaraPlays"
  },
  {
    id: "track-2",
    title: "Rick Astley - Never Gonna Give You Up",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    duration: "3:32",
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=60",
    addedBy: "Alex_01"
  },
  {
    id: "track-3",
    title: "Synthwave Radio - Retro Futuristic Chill Beats",
    url: "https://www.youtube.com/watch?v=MVPTGNGiI-4",
    duration: "2:45:10",
    thumbnail: "https://images.unsplash.com/photo-1515462277126-270d878326e5?w=120&auto=format&fit=crop&q=60",
    addedBy: "Aura AI"
  }
];

export const MODERATION_RULES: ModerationRule[] = [
  {
    id: "rule-1",
    name: "AI Spam & Scam Defense",
    description: "Instantly flags Discord Nitro scams, phishing links, and credit card scams using high-speed classification.",
    enabled: true,
    category: "SPAM_SCAM"
  },
  {
    id: "rule-2",
    name: "Toxic Behavior & Insults Control",
    description: "Evaluates conversational aggression, hate speech, and extreme toxic words using the Gemini sentiment matrix.",
    enabled: true,
    category: "TOXICITY"
  },
  {
    id: "rule-3",
    name: "Explicit & NSFW Scanner",
    description: "Monitors text channels for extremely explicit language, suggestive chat raids, and NSFW spam triggers.",
    enabled: true,
    category: "NSFW"
  }
];

export const HOSTING_PROVIDERS: HostSpec[] = [
  {
    id: "railway",
    name: "Railway.app",
    icon: "Railway",
    cost: "Free trial ($5 monthly limit)",
    difficulty: "Easy",
    pros: [
      "Extremely simple setup via one-click GitHub repositories.",
      "Supports native Dockerfiles or Nixpacks automatically.",
      "Outstanding logs and environment variable GUI."
    ],
    cons: [
      "Free tier requires a credit card to verify and expires when the $5.00/500-hour limit is reached."
    ],
    verdict: "The absolute best choice for beginners who want their bot online in 5 minutes with zero server command line hassle.",
    setupInstructions: [
      "1. Push your Discord bot repository to GitHub.",
      "2. Log in to Railway.app and create a 'New Project' -> 'Deploy from GitHub repo'.",
      "3. Go to the project 'Variables' tab and paste your DISCORD_TOKEN and GEMINI_API_KEY.",
      "4. Railway will automatically detect package.json, run 'npm install', and boot with 'npm start'."
    ]
  },
  {
    id: "fly",
    name: "Fly.io",
    icon: "Fly",
    cost: "Free tier ($5.40/mo credits free)",
    difficulty: "Medium",
    pros: [
      "Allows you to run up to 3 shared-cpu-1x micro VMs completely free 24/7.",
      "Supports direct Docker containers.",
      "Persistent volume mounts if you need local sqlite persistence."
    ],
    cons: [
      "Requires installing the 'flyctl' command-line interface.",
      "Requires adding a credit card on account registration to access free-tier allowance."
    ],
    verdict: "The strongest long-term option for full 24/7 continuous hosting without paying a single dollar, if you are comfortable with command-line tools.",
    setupInstructions: [
      "1. Install flyctl on your machine: curl -L https://fly.io/install.sh | sh",
      "2. Run 'fly launch' in your project folder to generate a fly.toml config.",
      "3. Add secrets with: fly secrets set DISCORD_TOKEN='your_token' GEMINI_API_KEY='your_key'",
      "4. Run 'fly deploy' to boot the bot instantly."
    ]
  },
  {
    id: "huggingface",
    name: "Hugging Face Spaces (Docker)",
    icon: "HF",
    cost: "100% Free (No credit card needed)",
    difficulty: "Medium",
    pros: [
      "Completely free with no credit card required to verify.",
      "Extremely secure, owned by Hugging Face.",
      "Webhooks and triggers for auto-restart on crashes."
    ],
    cons: [
      "Containers will 'sleep' (suspend) if they do not receive active HTTP traffic on the public port.",
      "Requires writing a dummy express server (like our template) to keep the port open."
    ],
    verdict: "Perfect for students or developers who refuse to enter credit cards on web platforms, provided you add a simple pinging script.",
    setupInstructions: [
      "1. Create a Hugging Face Space and choose the 'Docker' template.",
      "2. Create a Dockerfile specifying Node.js v18+ and expose PORT 3000.",
      "3. Go to Space Settings -> Variables and Secrets, add DISCORD_TOKEN and GEMINI_API_KEY.",
      "4. Commit your files to the Hugging Face Git remote; the space builds and runs automatically."
    ]
  },
  {
    id: "render",
    name: "Render.com",
    icon: "Render",
    cost: "Free (Background Worker / Web Service)",
    difficulty: "Easy",
    pros: [
      "Zero credit card required for free web services.",
      "Direct integration with GitHub.",
      "Excellent monitoring dashboard."
    ],
    cons: [
      "Free web services go to sleep after 15 minutes of inactivity (requires web pinger).",
      "Free background workers do not go to sleep but have limit of hours per month."
    ],
    verdict: "A robust, trusted hosting platform that is very user friendly, provided you configure a keep-awake cron or route.",
    setupInstructions: [
      "1. Push your code to GitHub.",
      "2. In Render dashboard, click 'New' -> 'Web Service'.",
      "3. Connect your repository, set the build command to 'npm run build' and start command to 'npm start'.",
      "4. Add DISCORD_TOKEN and GEMINI_API_KEY in the Environment variables panel."
    ]
  }
];

export const TECHNICAL_SPEC_DOCS = `
# Developer Integration & Setup Manual

This technical blueprint contains code blocks and execution details to build and scale your **Aura Discord Bot**.

---

## 💻 1. Core Bot Initializer

This script sets up the Discord client, handles intents, registers event listeners, and routes messages to the Gemini engine.

\`\`\`typescript
import { Client, GatewayIntentBits, ActivityType, Collection } from "discord.js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.once("ready", () => {
  console.log(\`🤖 Connected! Logged in as \${client.user?.tag}\`);
  client.user?.setActivity("your commands", { type: ActivityType.Listening });
});

client.on("messageCreate", async (message) => {
  // Prevent bot feedback loops
  if (message.author.bot) return;

  // AI Chat simulation if bot is mentioned or DM'd
  const isMentioned = message.mentions.has(client.user?.id || "");
  const isDM = !message.guild;

  if (isMentioned || isDM) {
    try {
      await message.channel.sendTyping();
      
      const cleanPrompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: cleanPrompt,
        config: {
          systemInstruction: "You are a smart, friendly AI Discord assistant.",
          tools: [{ googleSearch: {} }] // Real-time grounding enabled
        }
      });
      
      await message.reply(response.text || "I was unable to synthesize a response.");
    } catch (err) {
      console.error(err);
      await message.reply("⚡ An error occurred in my cognitive matrix.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
\`\`\`

---

## 🎵 2. Audio Player (YouTube Audio Extraction)

This script leverages \`@discordjs/voice\` and \`play-dl\` to join voice channels, extract high-quality audio streams, and play them back without Lavalink.

\`\`\`typescript
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus 
} from "@discordjs/voice";
import play from "play-dl";

export async function playYouTubeTrack(voiceChannel: any, youtubeUrl: string) {
  // 1. Join Voice Channel
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  // 2. Extract Stream using play-dl (handles rate limits safely)
  const stream = await play.stream(youtubeUrl, {
    quality: 2 // High quality audio stream
  });

  // 3. Create Audio Resource with custom type
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  // 4. Instantiate and subscribe Player
  const player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Playing, () => {
    console.log("🎵 Streaming audio stream over voice nodes...");
  });

  player.on("error", (error) => {
    console.error(\`⚡ Voice Node Stream Error: \${error.message}\`);
  });
  
  return player;
}
\`\`\`

---

## 🛡️ 3. Admin Auto-Moderator Event

Listen to message triggers and screen messages automatically against Gemini's high-speed toxicity assessment.

\`\`\`typescript
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // High-speed Toxicity and Scam checking
  const text = message.content;
  if (text.length < 5) return;

  try {
    const classification = await classifyMessageWithAI(text);
    if (classification.isFlagged) {
      await message.delete();
      
      // Send alert to log channel
      const logChannel = message.guild?.channels.cache.find(c => c.name === "bot-alerts");
      if (logChannel?.isTextBased()) {
        await logChannel.send(
          \`🛡️ **Auto-Mod Alert:** Deleted message from \${message.author} in \${message.channel}. \\nReason: *\${classification.reason}*\\nContent: \`\$\${text}\`\`
        );
      }
    }
  } catch (err) {
    console.error("Auto-mod failure:", err);
  }
});
\`\`\`
`;
