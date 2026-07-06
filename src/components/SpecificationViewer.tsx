import { useState } from "react";
import { Copy, Check, FileCode, Terminal, HelpCircle, ArrowRight } from "lucide-react";

interface CodePreset {
  name: string;
  filename: string;
  description: string;
  code: string;
  language: string;
}

export default function SpecificationViewer() {
  const [copied, setCopied] = useState(false);

  const presets: CodePreset[] = [
    {
      name: "1. Core Bot Initializer",
      filename: "src/index.ts",
      description: "Registers Gateway intents, establishes discord connection listeners, and hooks message mentions to call the Gemini API conversational engine.",
      language: "typescript",
      code: `import { Client, GatewayIntentBits, ActivityType } from "discord.js";
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

// Initialize official Google GenAI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

client.once("ready", () => {
  console.log(\`🤖 Logged in as \${client.user?.tag}!\`);
  client.user?.setActivity("your chat!", { type: ActivityType.Listening });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Bot responds if mentioned directly or messaged in DMs
  const isMentioned = message.mentions.has(client.user?.id || "");
  const isDM = !message.guild;

  if (isMentioned || isDM) {
    try {
      await message.channel.sendTyping();
      
      // Clean mention tag out of prompt
      const cleanPrompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: cleanPrompt,
        config: {
          systemInstruction: "You are a smart, friendly AI Discord assistant called Aura.",
          tools: [{ googleSearch: {} }] // Dynamic Google Search Grounding!
        }
      });
      
      await message.reply(response.text || "Matrix response returned blank.");
    } catch (err) {
      console.error("AI Error:", err);
      await message.reply("⚡ Sorry, my neural processor encountered an error.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);`
    },
    {
      name: "2. Audio Streaming play-dl Node",
      filename: "src/music.ts",
      description: "Bypasses standard YouTube extraction failures by utilizing play-dl and @discordjs/voice to play direct streams without external Lavalink servers.",
      language: "typescript",
      code: `import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus 
} from "@discordjs/voice";
import play from "play-dl";

export async function playYouTubeTrack(voiceChannel: any, youtubeUrl: string) {
  // Establish connection to voice channel
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  // Extract high quality stream packet
  const stream = await play.stream(youtubeUrl, {
    quality: 2 // Audio-only high performance manifest
  });

  // Inject stream as Opus encoder resource
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  const player = createAudioPlayer();
  player.play(resource);
  
  // Attach connection subscription
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Playing, () => {
    console.log("🎵 Channel stream is active!");
  });

  player.on("error", (error) => {
    console.error(\`⚡ Voice Error: \${error.message}\`);
  });
  
  return player;
}`
    },
    {
      name: "3. Sentinel AI Auto-Mod",
      filename: "src/automod.ts",
      description: "Applies cost-effective sentiment checks using Gemini-3.5-Flash to flag toxic users or scam hyperlinks on server channels.",
      language: "typescript",
      code: `import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function checkSafety(messageContent: string) {
  const prompt = \`Analyze this Discord message. Classify for moderation.
Check for scams, severe toxicity, hate speech, or explicit triggers.
Respond with JSON block ONLY. Use keys: "isFlagged": boolean, "reason": "string"\`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [prompt, messageContent],
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return parsed; // returns { isFlagged: boolean, reason: string }
  } catch (err) {
    console.error("AutoMod classification error:", err);
    return { isFlagged: false, reason: "" };
  }
}`
    },
    {
      name: "4. Dependencies Manifest",
      filename: "package.json",
      description: "The package.json structure containing all critical voice encoders, discord websocket tools, and official AI models.",
      language: "json",
      code: `{
  "name": "discord-ai-music-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc"
  },
  "dependencies": {
    "discord.js": "^14.15.3",
    "@discordjs/voice": "^0.17.0",
    "play-dl": "^1.9.7",
    "libsodium-wrappers": "^0.7.13",
    "@google/genai": "^2.4.0",
    "dotenv": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "@types/node": "^20.12.12"
  }
}`
    }
  ];

  const [activePreset, setActivePreset] = useState<CodePreset>(presets[0]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activePreset.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full">
      {/* Sidebar Selector */}
      <div className="xl:col-span-1 flex flex-col gap-4">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-1">
          Active Code Modules
        </div>
        <div className="space-y-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setActivePreset(preset)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activePreset.name === preset.name
                  ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-white"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-gray-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activePreset.name === preset.name ? "bg-cyan-500/10 text-cyan-400" : "bg-white/5 text-gray-500"}`}>
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold font-sans">{preset.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{preset.filename}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Discord Client Requirements Warning */}
        <div className="bg-[#11111a] border border-white/5 rounded-2xl p-4 mt-2 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Gateway Intents Check
          </h4>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Ensure that inside your <strong>Discord Developer Console</strong>, you have toggled <strong>Message Content Intent</strong>, <strong>Guild Members Intent</strong>, and <strong>Presence Intent</strong> to <strong>ON</strong>. If those toggle nodes are disabled, your bot client will fail to start and throw authorization errors.
          </p>
        </div>
      </div>

      {/* Code Editor Frame */}
      <div className="xl:col-span-3 flex flex-col bg-[#0c0c12]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-full">
        {/* Fake Terminal Tab Header */}
        <div className="bg-[#11111a] px-6 py-4 flex items-center justify-between border-b border-b-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 bg-red-500/70 rounded-full"></span>
              <span className="w-3 h-3 bg-yellow-500/70 rounded-full"></span>
              <span className="w-3 h-3 bg-green-500/70 rounded-full"></span>
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2">
              {activePreset.filename}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Module</span>
              </>
            )}
          </button>
        </div>

        {/* Description */}
        <div className="p-4 bg-white/5 border-b border-b-white/5 text-xs text-gray-300">
          <span className="font-bold text-cyan-400">Description:</span> {activePreset.description}
        </div>

        {/* Real Code Workspace */}
        <div className="flex-1 overflow-auto p-6 font-mono text-xs text-cyan-300 bg-black/40 custom-scrollbar leading-relaxed">
          <pre className="whitespace-pre">{activePreset.code}</pre>
        </div>
      </div>
    </div>
  );
}
