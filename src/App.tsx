import { useState } from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Music, 
  ShieldAlert, 
  FileCode, 
  Server, 
  Sparkles, 
  Activity, 
  ArrowRight,
  Globe,
  Settings2,
  HelpCircle,
  Cpu,
  Lock
} from "lucide-react";

import { DEFAULT_BOT_CONFIG, PRESET_PERSONAS } from "./data";
import { BotConfig } from "./types";

// Import custom sub-modules
import DiscordChat from "./components/DiscordChat";
import MusicSimulator from "./components/MusicSimulator";
import AutoModSimulator from "./components/AutoModSimulator";
import SpecificationViewer from "./components/SpecificationViewer";
import HostingGuide from "./components/HostingGuide";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "music" | "admin" | "code" | "hosting">("dashboard");
  const [botConfig, setBotConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);

  // Helper to update config parameters
  const updateConfig = (key: keyof BotConfig, value: any) => {
    setBotConfig((prev) => {
      const updated = { ...prev, [key]: value };
      
      // If persona is changed, update the customSystemInstruction automatically
      if (key === "persona") {
        const found = PRESET_PERSONAS.find((p) => p.id === value);
        if (found) {
          updated.customSystemInstruction = found.systemInstruction;
        }
      }
      return updated;
    });
  };

  return (
    <div className="h-screen w-screen bg-[#020203] text-gray-100 flex font-sans overflow-hidden">
      
      {/* ----------------- SIDEBAR ----------------- */}
      <aside className="w-72 bg-[#08080a] border-r border-white/5 flex flex-col p-6 select-none shrink-0">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-wider text-white block">Helen AI</span>
            <span className="text-[10px] text-cyan-400/80 uppercase font-mono tracking-widest font-bold">Blueprint Suite</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest px-2.5 mb-2">
            Workspace
          </div>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            Not-a-Bot AI Chat
          </button>

          <button
            onClick={() => setActiveTab("music")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "music"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Music className="w-4 h-4 shrink-0" />
            Music Engine
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "admin"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Admin Control
          </button>

          <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest px-2.5 pt-6 mb-2 block">
            Deployment & Setup
          </div>

          <button
            onClick={() => setActiveTab("code")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileCode className="w-4 h-4 shrink-0" />
            Integrator Code
          </button>

          <button
            onClick={() => setActiveTab("hosting")}
            className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all cursor-pointer ${
              activeTab === "hosting"
                ? "bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Server className="w-4 h-4 shrink-0" />
            Hosting Suites
          </button>
        </nav>

        {/* Global Config Sidebar panel (Quick adjust) */}
        <div className="mt-auto bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gray-400">
            <span>Runtime Settings</span>
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          
          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">Bot Name Tag</label>
              <input
                type="text"
                value={botConfig.name}
                onChange={(e) => updateConfig("name", e.target.value)}
                className="w-full bg-[#111116] border border-white/10 rounded px-2.5 py-1 text-white outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 block mb-1">AI Persona Pattern</label>
              <select
                value={botConfig.persona}
                onChange={(e) => updateConfig("persona", e.target.value)}
                className="w-full bg-[#111116] border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-cyan-500/50 text-xs"
              >
                <option value="aura">Aura (Futuristic cyber)</option>
                <option value="gamer">Chaotic Gamer (Banter)</option>
                <option value="chill">Chill Barista (Lofi)</option>
                <option value="helper">Pure AI Utility (Direct)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-400">Google Grounding</span>
              <input
                type="checkbox"
                checked={botConfig.googleSearchGrounding}
                onChange={(e) => updateConfig("googleSearchGrounding", e.target.checked)}
                className="accent-cyan-400 w-3.5 h-3.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <div className="pt-4 border-t border-white/5 mt-4">
          <div className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-widest font-mono">Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            <span className="text-xs text-gray-300 font-mono">Simulation Environment</span>
          </div>
        </div>
      </aside>

      {/* ----------------- MAIN VIEWPORTS ----------------- */}
      <main className="flex-1 p-8 flex flex-col relative overflow-hidden">
        
        {/* Immersive glow elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        {/* Navigation Header */}
        <header className="flex justify-between items-start mb-6 shrink-0 select-none">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 font-display tracking-tight">
              {activeTab === "dashboard" && "Bot Blueprint Suite"}
              {activeTab === "chat" && "Gemini Conversational Hub"}
              {activeTab === "music" && "High-Performance Music Streamer"}
              {activeTab === "admin" && "Autonomous Admin Panel"}
              {activeTab === "code" && "System Integration Codes"}
              {activeTab === "hosting" && "Production Hosting Matrix"}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === "dashboard" && "Architectural blueprints and quick metrics for your custom Google Gemini bot."}
              {activeTab === "chat" && `Interact live with ${botConfig.name}'s conversational model context and search grounding.`}
              {activeTab === "music" && "Extract and stream YouTube audio nodes over voice socket adapters."}
              {activeTab === "admin" && "AI-powered server defense, chat toxicity checkers, and personalized onboarding."}
              {activeTab === "code" && "Copy ready-to-run code components for discord.js v14 and Google GenAI."}
              {activeTab === "hosting" && "A comparative guide to free cloud VPS nodes, specifications, and setups."}
            </p>
          </div>

          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/10 text-xs text-cyan-300 flex items-center gap-2 font-mono">
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            SPECIFICATION v1.0.8
          </div>
        </header>

        {/* ----------------- RENDER CONTENTS ----------------- */}
        <div className="flex-1 overflow-hidden">
          
          {/* A. DASHBOARD VIEWPORT */}
          {activeTab === "dashboard" && (
            <div className="h-full overflow-y-auto space-y-8 pr-1 custom-scrollbar">
              
              {/* Three bento spec summaries */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-[#0c0c12]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl"></div>
                  <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Not-a-Bot AI Chat
                  </h3>
                  <ul className="text-xs space-y-2 text-gray-300 font-mono">
                    <li className="flex justify-between"><span>• Engine model:</span> <span className="text-white">gemini-3.5-flash</span></li>
                    <li className="flex justify-between"><span>• Google Grounding:</span> <span className={botConfig.googleSearchGrounding ? "text-cyan-300" : "text-gray-500"}>{botConfig.googleSearchGrounding ? "Enabled" : "Disabled"}</span></li>
                    <li className="flex justify-between"><span>• Persona Preset:</span> <span className="text-purple-400 font-bold">{botConfig.persona.toUpperCase()}</span></li>
                    <li className="flex justify-between"><span>• Context length:</span> <span className="text-white">8 Message Buffer</span></li>
                  </ul>
                  <button 
                    onClick={() => setActiveTab("chat")}
                    className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] text-gray-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Launch Chat Sandbox <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-[#0c0c12]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl"></div>
                  <h3 className="text-purple-400 text-xs uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" />
                    Music Delivery Node
                  </h3>
                  <ul className="text-xs space-y-2 text-gray-300 font-mono">
                    <li className="flex justify-between"><span>• Core adapter:</span> <span className="text-white">@discordjs/voice</span></li>
                    <li className="flex justify-between"><span>• Extract engine:</span> <span className="text-purple-300">play-dl</span></li>
                    <li className="flex justify-between"><span>• Voice encoding:</span> <span className="text-white">Opus Stereo 128kbps</span></li>
                    <li className="flex justify-between"><span>• Queue caching:</span> <span className="text-white">In-Memory Stateful</span></li>
                  </ul>
                  <button 
                    onClick={() => setActiveTab("music")}
                    className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] text-gray-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Open Music Console <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-[#0c0c12]/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:border-green-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-2xl"></div>
                  <h3 className="text-green-400 text-xs uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Autonomous Sentinel
                  </h3>
                  <ul className="text-xs space-y-2 text-gray-300 font-mono">
                    <li className="flex justify-between"><span>• Scam block:</span> <span className="text-green-300">AI Classification</span></li>
                    <li className="flex justify-between"><span>• Chat toxicity:</span> <span className="text-white">Gemini Sentiment</span></li>
                    <li className="flex justify-between"><span>• Spam buffer:</span> <span className="text-white">Anti-Raid Event</span></li>
                    <li className="flex justify-between"><span>• Onboarding:</span> <span className="text-purple-300">Custom AI Banners</span></li>
                  </ul>
                  <button 
                    onClick={() => setActiveTab("admin")}
                    className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] text-gray-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    Launch Moderation Panel <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>

              {/* Central Blueprint details / Architecture */}
              <div className="bg-[#0c0c12]/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-white/5 px-6 py-3.5 flex justify-between items-center border-b border-white/10">
                  <span className="text-xs font-mono text-gray-400 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    ARCHITECTURE_DIAGRAM.MD
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                  </div>
                </div>
                
                <div className="p-6 space-y-5 text-sm leading-relaxed text-gray-300">
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Continuous WebSocket Hybrid Architecture
                  </h3>
                  
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Aura operates as a stateful client connecting directly to the **Discord Gateway** via WebSockets. When user events (like voice state updates or channel messages) are dispatched, the bot evaluates the request through modular threads. If AI conversationalism is triggered, a proxy client invokes Google Gemini server-side nodes. For audio requests, raw streams are parsed by **play-dl** on the container environment, buffered through Opus encoders, and played via voice socket pipelines.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <strong className="text-white text-xs block mb-1">⚡ Dynamic Grounding Protocol</strong>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Rather than using hardcoded databases, the bot integrates Google's Search Grounding API directly. Gemini automatically assesses whether a query warrants real-time validation and fetches validated search chunks to construct its answers.
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <strong className="text-white text-xs block mb-1">🎵 Rate-Limit Resilience Node</strong>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        By avoiding standard YouTube scrapers, the play-dl integration intercepts YouTube's server checks, allowing high-speed stream buffering even under shared IP environments common to free hosting servers.
                      </p>
                    </div>
                  </div>

                  <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl flex items-center justify-between text-xs mt-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <span className="text-gray-300">
                        Ready to view and copy integration code? Jump directly to the modules list.
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab("code")}
                      className="text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Get Source Codes <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Free hosting comparison teaser */}
              <div className="bg-[#0c0c12]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-purple-400" />
                    Looking for a free hosting platform?
                  </h4>
                  <p className="text-xs text-gray-400">
                    We compare Railway, Fly.io, Hugging Face, and Render, with instructions and terminal command copy buttons.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("hosting")}
                  className="bg-[#11111a] hover:bg-white/5 border border-white/10 text-xs text-cyan-400 font-bold py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                >
                  View Hosting Suite <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* B. AI CONVERSATIONAL SANDBOX VIEWPORT */}
          {activeTab === "chat" && (
            <DiscordChat config={botConfig} />
          )}

          {/* C. MUSIC SIMULATOR VIEWPORT */}
          {activeTab === "music" && (
            <MusicSimulator />
          )}

          {/* D. ADMIN SENTINEL VIEWPORT */}
          {activeTab === "admin" && (
            <AutoModSimulator />
          )}

          {/* E. SPECIFICATION CODE VIEWPORT */}
          {activeTab === "code" && (
            <SpecificationViewer />
          )}

          {/* F. HOSTING MATRIX VIEWPORT */}
          {activeTab === "hosting" && (
            <HostingGuide />
          )}

        </div>

      </main>
    </div>
  );
}
