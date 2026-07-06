import { useState } from "react";
import { HOSTING_PROVIDERS } from "../data";
import { HostSpec } from "../types";
import { Server, ThumbsUp, ThumbsDown, BookOpen, ExternalLink, HelpCircle, AlertCircle, Copy, Check } from "lucide-react";

export default function HostingGuide() {
  const [selectedProvider, setSelectedProvider] = useState<HostSpec>(HOSTING_PROVIDERS[0]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyInstruction = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
      
      {/* Provider Selector Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-3">
        <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest px-1">
          Free Hosting Platforms
        </div>
        <div className="space-y-2">
          {HOSTING_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedProvider.id === provider.id
                  ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-white"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10 text-gray-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedProvider.id === provider.id ? "bg-cyan-500/10 text-cyan-400" : "bg-white/5 text-gray-500"}`}>
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold font-sans">{provider.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{provider.cost}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick FAQ / Info banner */}
        <div className="bg-[#11111a] border border-white/5 rounded-2xl p-4 mt-4 space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            General Hosting Rule
          </h4>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Discord bots are <strong>continuous websocket nodes</strong>. Traditional serverless hosts (like standard Vercel or Netlify) <strong>cannot</strong> host them because they operate via transient serverless functions that shut down after 10-15 seconds. You MUST use container or VM hosting that supports persistent node instances.
          </p>
        </div>
      </div>

      {/* Provider Details Pane */}
      <div className="lg:col-span-3 flex flex-col bg-[#0c0c12]/90 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto custom-scrollbar h-full justify-between">
        <div className="space-y-6">
          
          {/* Header metadata */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-5">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {selectedProvider.name} Setup Guide
              </h2>
              <p className="text-xs text-cyan-400 mt-1 font-mono">
                Cost Profile: {selectedProvider.cost}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Difficulty:</span>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                selectedProvider.difficulty === "Easy"
                  ? "bg-green-500/10 text-green-300 border-green-500/20"
                  : selectedProvider.difficulty === "Medium"
                  ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                  : "bg-red-500/10 text-red-300 border-red-500/20"
              }`}>
                {selectedProvider.difficulty}
              </span>
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-green-950/10 border border-green-500/10 space-y-2">
              <h4 className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5" />
                Key Advantages
              </h4>
              <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                {selectedProvider.pros.map((pro, idx) => (
                  <li key={idx}>{pro}</li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 rounded-xl bg-red-950/10 border border-red-500/10 space-y-2">
              <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <ThumbsDown className="w-3.5 h-3.5" />
                Limitations
              </h4>
              <ul className="text-xs text-gray-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                {selectedProvider.cons.map((con, idx) => (
                  <li key={idx}>{con}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Verdict summary */}
          <div className="bg-[#11111d] p-4 rounded-xl border border-white/5 text-xs text-gray-300 leading-relaxed">
            <strong className="text-white font-sans text-xs">Architect's Verdict: </strong>
            {selectedProvider.verdict}
          </div>

          {/* Deployment Step-by-Step checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Deployment Checklist & commands
            </h4>
            
            <div className="space-y-2.5">
              {selectedProvider.setupInstructions.map((step, idx) => (
                <div key={idx} className="flex gap-4 p-3.5 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-colors items-center justify-between">
                  <span className="text-xs text-gray-300 font-mono flex-1 leading-relaxed">{step}</span>
                  <button
                    onClick={() => handleCopyInstruction(step.replace(/^\d+\.\s*/, ""), idx)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-gray-400 hover:text-white transition-colors"
                    title="Copy command/step"
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom alert panel about rate limiting & common bot problems */}
        <div className="mt-8 pt-5 border-t border-white/5 bg-amber-500/5 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-300">⚠️ YouTube Streaming Node Rate Limits (429 Errors)</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              When hosting audio stream bots on shared platforms like Railway, Fly, or Render, you may occasionally run into <strong>429 Too Many Requests</strong> issues from YouTube because thousands of other developers share the same host IP block.
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <strong>The Fix:</strong> Use <code>play-dl</code>'s custom cookie mapping or install a self-hosted residential proxy pool. Alternatively, configure the bot to fallback to Soundcloud stream nodes, which do not enforce strict IP bans.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
