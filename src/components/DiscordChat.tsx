import React, { useState, useRef, useEffect } from "react";
import { BotConfig, DiscordMessage } from "../types";
import { Send, Globe, Sparkles, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

interface DiscordChatProps {
  config: BotConfig;
}

export default function DiscordChat({ config }: DiscordChatProps) {
  const [messages, setMessages] = useState<DiscordMessage[]>([
    {
      id: "msg-1",
      username: "Alex_01",
      avatarColor: "bg-indigo-500",
      content: "Yo, did anyone invite the new bot to this channel? Who is this?",
      timestamp: "Today at 4:10 AM"
    },
    {
      id: "msg-2",
      username: config.name,
      avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
      isBot: true,
      isAI: true,
      content: `Hello Alex. I am ${config.name}, a customized intelligence model mapped to this Discord cluster. I handle everything from music streams to server defense, and I am fully grounded in Google search nodes.`,
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
      username: config.name,
      avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
      isBot: true,
      isAI: true,
      content: "Correct, Sara. I synthesize conversational patterns in real-time. Feel free to ask me something complex, test my knowledge, or ask me to queue some tracks.",
      timestamp: "Today at 4:11 AM"
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg: DiscordMessage = {
      id: `user-msg-${Date.now()}`,
      username: "ServerOwner",
      avatarColor: "bg-emerald-500",
      content: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);
    setErrorMessage(null);

    try {
      // Build a simplified history for API, matching the role schema of model
      const historyPayload = messages
        .filter(m => m.id !== "msg-1" && m.id !== "msg-3") // skip general banter to keep prompt focused
        .map(m => ({
          role: m.isAI ? "model" : "user",
          content: m.content
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: historyPayload.slice(-8), // Send last 8 turns of context
          systemInstruction: config.customSystemInstruction,
          enableSearch: config.googleSearchGrounding
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to contact Gemini matrix");
      }

      const data = await response.json();
      
      // Map grounding sources if present
      let groundingSources: Array<{ title: string; uri: string }> | undefined = undefined;
      const metadata = data.grounding;
      if (metadata && metadata.groundingChunks) {
        groundingSources = metadata.groundingChunks
          .map((chunk: any) => {
            if (chunk.web && chunk.web.title && chunk.web.uri) {
              return { title: chunk.web.title, uri: chunk.web.uri };
            }
            return null;
          })
          .filter(Boolean) as Array<{ title: string; uri: string }>;
      }

      // Simulated natural human typing delay
      setTimeout(() => {
        const botMsg: DiscordMessage = {
          id: `bot-msg-${Date.now()}`,
          username: config.name,
          avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
          isBot: true,
          isAI: true,
          content: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          groundingSources: groundingSources
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, Math.min(1500, Math.max(500, data.text.length * 8)));

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Connection to Gemini engine dropped. Check your API Key.");
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "msg-reset-1",
        username: config.name,
        avatarColor: "bg-gradient-to-tr from-cyan-400 to-purple-600",
        isBot: true,
        isAI: true,
        content: `Cognitive cache cleared. System instruction set to: "${config.name}". Ready for input.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Discord Channel Header */}
      <div className="bg-[#11111a] px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              # ai-sandbox-testing
              <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                SIMULATION
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Interactive workspace for {config.name}. Test conversational style and search grounding in real-time.
            </div>
          </div>
        </div>
        
        <button
          onClick={handleResetChat}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5 transition-colors"
          title="Reset conversation memory"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear Chat Cache
        </button>
      </div>

      {/* Main chat log */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-4 group hover:bg-white/[0.01] -mx-6 px-6 py-1 rounded transition-colors">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg ${msg.avatarColor}`}>
              {msg.username.substring(0, 2).toUpperCase()}
            </div>

            {/* Message Body */}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white hover:underline cursor-pointer">
                  {msg.isBot ? config.name : msg.username}
                </span>
                
                {msg.isBot && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1 py-0.5 rounded">
                    BOT
                  </span>
                )}
                
                {msg.isAI && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 py-0.5 rounded flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI
                  </span>
                )}

                <span className="text-[11px] text-gray-500">
                  {msg.timestamp}
                </span>
              </div>

              {/* Message Content */}
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {msg.content}
              </div>

              {/* Google Search Grounding Section */}
              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                    <Globe className="w-3.5 h-3.5" />
                    Google Search Grounded Nodes:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingSources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] bg-white/5 hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/40 text-gray-300 hover:text-cyan-300 px-2.5 py-1 rounded transition-colors max-w-xs truncate block"
                        title={source.title}
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 -mx-6 px-6 py-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 animate-pulse">
              AI
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{config.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1 py-0.5 rounded flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </span>
                <span className="text-xs text-gray-500">typing...</span>
              </div>
              <div className="flex items-center gap-1.5 py-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Gemini Connection Interrupted</div>
              <p className="text-xs text-red-300/80 mt-1">{errorMessage}</p>
              <div className="text-xs mt-2 text-white font-medium">
                👉 Ensure you have loaded your <span className="font-mono bg-red-900/40 px-1 py-0.5 rounded">GEMINI_API_KEY</span> in the Secrets panel on AI Studio (top right settings or secrets menu).
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 bg-[#0f0f18] border-t border-white/5 flex gap-3">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isTyping}
          placeholder={isTyping ? `Waiting for ${config.name} response...` : `Type a message... (Mention me or ask any fact to test Google grounding!)`}
          className="flex-1 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={isTyping || !inputMessage.trim()}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 disabled:opacity-30 text-white rounded-xl px-5 flex items-center justify-center transition-opacity shadow-[0_0_15px_rgba(34,211,238,0.2)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
