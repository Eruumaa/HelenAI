import React, { useState } from "react";
import { MODERATION_RULES } from "../data";
import { Shield, Sparkles, UserPlus, AlertTriangle, CheckCircle, ShieldAlert, Zap, BookOpen } from "lucide-react";

export default function AutoModSimulator() {
  // Moderation states
  const [moderationText, setModerationText] = useState("");
  const [isModAnalyzing, setIsModAnalyzing] = useState(false);
  const [modResult, setModResult] = useState<any>(null);
  const [modError, setModError] = useState<string | null>(null);

  // Welcome banner states
  const [welcomeUser, setWelcomeUser] = useState("ProGamer99");
  const [welcomeBio, setWelcomeBio] = useState("I play CS2, construct mechanical keyboards, and listen to Synthwave 24/7!");
  const [welcomePersona, setWelcomePersona] = useState("gamer");
  const [isWelcomeGenerating, setIsWelcomeGenerating] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(
    "Welcome **ProGamer99** to the server! 🎮 We saw you enjoy mechanical keyboards and Synthwave — head over to #lofi-beats and share your setup specs. GG!"
  );
  const [welcomeError, setWelcomeError] = useState<string | null>(null);

  const presetModMessages = [
    {
      label: "Phishing Scam",
      text: "OMG guys! Get FREE DISCORD NITRO instantly, just click here: http://nitro-scam-generator.ru/claim_free"
    },
    {
      label: "Toxic Aggression",
      text: "You are the worst gamer I have ever seen. Go uninstall the game immediately, you absolute trash."
    },
    {
      label: "Safe Server Query",
      text: "Does anyone know what time the guild event starts tonight? I want to make sure I am online."
    }
  ];

  const handleModerateMessage = async (e?: React.FormEvent, textToUse?: string) => {
    if (e) e.preventDefault();
    const finalVal = textToUse || moderationText;
    if (!finalVal.trim()) return;

    if (!textToUse) {
      setModerationText(finalVal);
    }
    
    setIsModAnalyzing(true);
    setModResult(null);
    setModError(null);

    try {
      const res = await fetch("/api/automod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalVal })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to analyze message");
      }

      const data = await res.json();
      setModResult(data);
    } catch (err: any) {
      console.error(err);
      setModError(err.message || "Failed to contact Gemini moderation module.");
    } finally {
      setIsModAnalyzing(false);
    }
  };

  const handleGenerateWelcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!welcomeUser.trim()) return;

    setIsWelcomeGenerating(true);
    setWelcomeMessage(null);
    setWelcomeError(null);

    try {
      const res = await fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: welcomeUser,
          bio: welcomeBio,
          personaType: welcomePersona
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to compile welcome banner");
      }

      const data = await res.json();
      setWelcomeMessage(data.message);
    } catch (err: any) {
      console.error(err);
      setWelcomeError(err.message || "Welcome module failed to compile banner.");
    } finally {
      setIsWelcomeGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
      
      {/* 1. Automated Auto-Mod Shield */}
      <div className="flex flex-col gap-6">
        <div className="bg-[#0c0c12]/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Sentinel AI Auto-Moderator</h3>
                  <p className="text-xs text-gray-400">Scan messages instantly for scams, toxicity, or explicit elements.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-green-500/20 text-green-300 border border-green-500/40 px-2 py-0.5 rounded">
                SECURE
              </span>
            </div>

            {/* Moderation rules statuses */}
            <div className="space-y-2.5 mb-6">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">Active Moderation Nodes</div>
              {MODERATION_RULES.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300">
                  <div>
                    <div className="font-bold text-white">{rule.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{rule.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
                    <span className="text-[10px] font-mono text-green-400">ACTIVE</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Test input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white block">Test Moderation Engine</label>
              
              <div className="flex flex-wrap gap-2 mb-2">
                {presetModMessages.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setModerationText(preset.text);
                      handleModerateMessage(undefined, preset.text);
                    }}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => handleModerateMessage(e)} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={moderationText}
                  onChange={(e) => setModerationText(e.target.value)}
                  placeholder="Enter custom test message... (e.g. malicious links, aggressive text)"
                  className="flex-1 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isModAnalyzing}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 disabled:opacity-30 text-white font-bold text-xs px-5 rounded-xl flex items-center gap-1 transition-opacity shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                >
                  {isModAnalyzing ? "Analyzing..." : "Analyze"}
                </button>
              </form>
            </div>
          </div>

          {/* Results panel */}
          <div className="mt-6 pt-5 border-t border-white/5">
            {isModAnalyzing && (
              <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs text-cyan-400 font-mono">Running sentiment matrix and scan nodes...</span>
              </div>
            )}

            {modResult && (
              <div className={`p-5 rounded-xl border ${modResult.isFlagged ? "bg-red-950/20 border-red-500/30" : "bg-green-950/20 border-green-500/30"} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {modResult.isFlagged ? (
                      <ShieldAlert className="w-5 h-5 text-red-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    <span className={`text-sm font-bold ${modResult.isFlagged ? "text-red-400" : "text-green-400"}`}>
                      {modResult.isFlagged ? "FLAGGED FOR MODERATION" : "MESSAGE PERMITTED"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    Confidence: {(modResult.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-mono">Classification</span>
                    <span className="text-white font-bold mt-1 inline-block bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {modResult.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-mono">Engine Verdict</span>
                    <span className={`font-bold mt-1 inline-block px-2 py-0.5 rounded ${modResult.isFlagged ? "bg-red-500/10 text-red-300" : "bg-green-500/10 text-green-300"}`}>
                      {modResult.isFlagged ? "Auto-Delete & Alert" : "Send stream to channel"}
                    </span>
                  </div>
                </div>

                {modResult.reason && (
                  <p className="text-xs text-gray-300 leading-relaxed pt-2 border-t border-white/5">
                    <strong className="text-white">Reason: </strong> {modResult.reason}
                  </p>
                )}
              </div>
            )}

            {modError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-xs">
                {modError}
              </div>
            )}

            {!modResult && !isModAnalyzing && !modError && (
              <div className="text-center py-6 text-xs text-gray-500 border border-dashed border-white/10 rounded-xl">
                Ready for testing. Enter or click a preset message to trigger Auto-Mod analysis.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Personalized Welcome Greetings */}
      <div className="flex flex-col gap-6">
        <div className="bg-[#0c0c12]/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Aura Personalized Welcomer</h3>
                  <p className="text-xs text-gray-400">Generate fully custom, AI-written welcome embeddings based on member bios.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded">
                DOCKER ACTIVE
              </span>
            </div>

            <form onSubmit={handleGenerateWelcome} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold">New Member Username</label>
                  <input
                    type="text"
                    required
                    value={welcomeUser}
                    onChange={(e) => setWelcomeUser(e.target.value)}
                    placeholder="e.g. ProGamer99"
                    className="w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold">Welcomer Bot Persona</label>
                  <select
                    value={welcomePersona}
                    onChange={(e) => setWelcomePersona(e.target.value)}
                    className="w-full bg-[#11111a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                  >
                    <option value="aura">Aura (Futuristic cyber)</option>
                    <option value="gamer">Chaotic Gamer (Sarcastic esports)</option>
                    <option value="chill">Chill Barista (Gentle warm)</option>
                    <option value="tech">Pure AI Utility (Sleek sci-fi)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-bold">Custom Bio / Interests (Input to see personalized AI formatting!)</label>
                <textarea
                  value={welcomeBio}
                  onChange={(e) => setWelcomeBio(e.target.value)}
                  placeholder="e.g. Enjoys mechanical keyboards, playing Valorant, lo-fi beats, anime, coding..."
                  rows={2}
                  className="w-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isWelcomeGenerating || !welcomeUser.trim()}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all hover:border-cyan-500/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                {isWelcomeGenerating ? "Drafting Welcome Embedding..." : "Compile Personalized Welcome Banner"}
              </button>
            </form>
          </div>

          {/* Simulated Discord Embed */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-2.5">
              Live Discord Welcomer Embed Output
            </div>

            {welcomeMessage && (
              <div className="bg-[#11111c] border-l-4 border-purple-500 rounded-lg p-5 shadow-inner">
                <div className="flex gap-4">
                  {/* Default avatar circle with image or letter */}
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md">
                    W
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Welcomer AI</span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 rounded uppercase tracking-widest font-mono">
                        EMBED
                      </span>
                      <span className="text-[10px] text-gray-500">Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>

                    <div className="text-xs text-gray-300 leading-relaxed bg-[#0a0a0f] p-3.5 rounded-lg border border-white/5 font-mono">
                      {welcomeMessage}
                    </div>

                    <div className="text-[10px] text-gray-400 italic">
                      💡 Tip: Copy the message syntax! The bot will format it using Discord Markdown dynamically.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isWelcomeGenerating && (
              <div className="bg-white/5 border border-white/10 p-10 rounded-xl flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs text-purple-400 font-mono">Drafting customized context structures...</span>
              </div>
            )}

            {welcomeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl text-xs">
                {welcomeError}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
