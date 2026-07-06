import React, { useState, useEffect, useRef } from "react";
import { QueueTrack } from "../types";
import { SUGGESTED_TRACKS } from "../data";
import { Play, Pause, SkipForward, Music, Trash2, Plus, Volume2, Disc, Link2 } from "lucide-react";

export default function MusicSimulator() {
  const [queue, setQueue] = useState<QueueTrack[]>(SUGGESTED_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(75);
  const [trackProgress, setTrackProgress] = useState<number>(45); // simulated progress in seconds
  const [customUrl, setCustomUrl] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionLog, setExtractionLog] = useState<string[]>([]);
  
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  const activeTrack = queue[currentTrackIndex] || null;

  // Convert seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Convert duration string like "3:32" to seconds
  const durationToSeconds = (durationStr: string): number => {
    if (durationStr === "Live Stream") return 3600; // 1 hour for live stream
    const parts = durationStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 180;
  };

  useEffect(() => {
    if (isPlaying && activeTrack) {
      const maxSeconds = durationToSeconds(activeTrack.duration);
      progressTimer.current = setInterval(() => {
        setTrackProgress((prev) => {
          if (prev >= maxSeconds) {
            // Auto skip to next track
            handleSkip();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (progressTimer.current) clearInterval(progressTimer.current);
    }

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [isPlaying, currentTrackIndex, queue]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkip = () => {
    if (queue.length === 0) return;
    setTrackProgress(0);
    setCurrentTrackIndex((prev) => (prev + 1) % queue.length);
    setIsPlaying(true);
  };

  const handleClearQueue = () => {
    setQueue([]);
    setCurrentTrackIndex(0);
    setTrackProgress(0);
    setIsPlaying(false);
  };

  const handleRemoveTrack = (index: number) => {
    if (index === currentTrackIndex) {
      handleSkip();
    }
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    setQueue(newQueue);
    
    if (index < currentTrackIndex && currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
    }
  };

  const simulateExtraction = (url: string, title?: string) => {
    setIsExtracting(true);
    setExtractionLog([]);
    
    const logs = [
      "🔗 Initializing connection to YouTube streaming nodes...",
      "🛡️ play-dl: Executing stream extractor module...",
      "⚡ Resolving video metadata and formats manifest...",
      "✅ Metadata fetched successfully!",
      "🎵 Extracting audio packet stream (opus, 128kbps stereo)...",
      "🎙️ Creating Discord voice resources and starting audio feed..."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setExtractionLog((prev) => [...prev, log]);
        if (index === logs.length - 1) {
          // Finish extraction
          setTimeout(() => {
            const newTrack: QueueTrack = {
              id: `track-${Date.now()}`,
              title: title || "Custom Audio Stream",
              url: url,
              duration: "4:15",
              thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop&q=60",
              addedBy: "ServerOwner"
            };
            setQueue((prev) => [...prev, newTrack]);
            setIsExtracting(false);
            setCustomUrl("");
            if (queue.length === 0) {
              setCurrentTrackIndex(0);
              setTrackProgress(0);
              setIsPlaying(true);
            }
          }, 400);
        }
      }, (index + 1) * 300);
    });
  };

  const handleAddCustomTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let title = "YouTube Audio Stream";
    if (customUrl.includes("youtube.com/watch?v=dQw4w9WgXcQ") || customUrl.includes("youtu.be/dQw4w9WgXcQ")) {
      title = "Rick Astley - Never Gonna Give You Up";
    } else if (customUrl.includes("list=")) {
      title = "Curated Music Playlist Stream";
    }

    simulateExtraction(customUrl, title);
  };

  const handleAddPresetTrack = (track: QueueTrack) => {
    simulateExtraction(track.url, track.title);
  };

  const activeDurationSeconds = activeTrack ? durationToSeconds(activeTrack.duration) : 1;
  const progressPercent = activeTrack ? Math.min(100, (trackProgress / activeDurationSeconds) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Playback Control Panel */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Core Audio Player Card */}
        <div className="bg-[#0c0c12]/90 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px] pointer-events-none"></div>

          {/* Active status */}
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-yellow-500 animate-pulse"}`}></span>
              <span className="text-xs uppercase tracking-widest font-mono text-gray-400">
                {isPlaying ? "Voice Node: Streaming Audio" : "Voice Node: Paused"}
              </span>
            </div>
            <div className="text-xs font-mono text-cyan-400">
              Latency: 12ms | Quality: Stereo @ 128kbps
            </div>
          </div>

          {/* Album art & Metadata */}
          {activeTrack ? (
            <div className="my-8 flex flex-col sm:flex-row items-center gap-6">
              {/* CD Visual Spinning */}
              <div className="relative shrink-0">
                <img
                  src={activeTrack.thumbnail}
                  alt={activeTrack.title}
                  className={`w-32 h-32 rounded-full border-4 border-white/10 object-cover shadow-2xl ${isPlaying ? "animate-[spin_10s_linear_infinite]" : ""}`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-[#0c0c12] rounded-full border border-white/20 flex items-center justify-center shadow-inner">
                    <Disc className="w-4 h-4 text-cyan-400 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Title, artist, duration */}
              <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white tracking-tight truncate" title={activeTrack.title}>
                  {activeTrack.title}
                </h2>
                <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1">
                  <span className="text-purple-400">Added by:</span> {activeTrack.addedBy}
                </p>
                <div className="text-xs bg-white/5 border border-white/10 text-cyan-300 inline-block px-2.5 py-1 rounded-full mt-2 font-mono">
                  {activeTrack.duration === "Live Stream" ? "LIVE STREAM" : `Duration: ${activeTrack.duration}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="my-12 flex flex-col items-center justify-center text-center space-y-3 py-10">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-white">Audio Queue Empty</h3>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Use the side panels or paste a link below to extract an audio stream and join the channel.
                </p>
              </div>
            </div>
          )}

          {/* Progress slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-gray-400">
              <span>{activeTrack ? formatTime(trackProgress) : "0:00"}</span>
              <span>{activeTrack ? activeTrack.duration : "0:00"}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-300 shadow-[0_0_8px_#22d3ee]"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Audio controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5 mt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                disabled={!activeTrack}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 disabled:opacity-30 flex items-center justify-center text-white shadow-lg transition-opacity"
              >
                {isPlaying && activeTrack ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button
                onClick={handleSkip}
                disabled={queue.length <= 1}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 flex items-center justify-center text-white transition-colors"
                title="Skip song"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearQueue}
                disabled={queue.length === 0}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 disabled:opacity-30 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Volume bar */}
            <div className="flex items-center gap-3 w-full sm:w-48">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-cyan-400 h-1.5 rounded-lg bg-white/10 outline-none cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-400 w-8 text-right">{volume}%</span>
            </div>
          </div>
        </div>

        {/* Custom Stream Extractor Panel */}
        <div className="bg-[#0c0c12]/90 border border-white/10 rounded-2xl p-5 shadow-2xl">
          <h3 className="text-white text-sm font-bold flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-cyan-400" />
            Direct Stream Extractor (play-dl Integration)
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Paste any YouTube video or livestream link to extract and stream live high-quality audio packet streams.
          </p>

          <form onSubmit={handleAddCustomTrack} className="flex gap-2">
            <input
              type="url"
              required
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Paste YouTube or Soundcloud link... (e.g. https://www.youtube.com/watch?v=...)"
              className="flex-1 bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/10 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isExtracting}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-800 text-[#020203] font-bold text-xs px-4 rounded-xl flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Queue Stream
            </button>
          </form>

          {isExtracting && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                play-dl Audio Node Extraction Log
              </div>
              <div className="space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono text-[10px] text-gray-400 max-h-40 overflow-y-auto">
                {extractionLog.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playlist / Queue Sidebar */}
      <div className="flex flex-col bg-[#0c0c12]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl h-full">
        <div className="bg-white/5 px-5 py-4 border-b border-white/10">
          <h3 className="font-bold text-white text-sm flex items-center justify-between">
            <span>Server Queue ({queue.length})</span>
            <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
              VOICE ACTIVE
            </span>
          </h3>
        </div>

        {/* Current list of songs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {queue.map((track, idx) => (
            <div
              key={track.id}
              onClick={() => {
                setCurrentTrackIndex(idx);
                setTrackProgress(0);
                setIsPlaying(true);
              }}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group relative ${
                idx === currentTrackIndex
                  ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10"
              }`}
            >
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${idx === currentTrackIndex ? "text-cyan-400" : "text-white"}`}>
                  {track.title}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                  <span>By {track.addedBy}</span>
                  <span className="font-mono">{track.duration}</span>
                </div>
              </div>

              {/* Hover Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTrack(idx);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 bg-red-950/40 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-[#020203] text-red-400 transition-all absolute right-2.5 top-1/2 -translate-y-1/2"
                title="Remove from queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {queue.length === 0 && (
            <div className="text-center py-10 text-xs text-gray-500">
              No tracks in voice stream queue.
            </div>
          )}
        </div>

        {/* Preset suggestions to quickly queue */}
        <div className="bg-[#07070a] border-t border-white/5 p-4">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono mb-2">
            Click to Sim Queue Track Presets
          </div>
          <div className="space-y-1.5">
            {SUGGESTED_TRACKS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleAddPresetTrack(t)}
                className="w-full text-left p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[11px] text-gray-300 flex justify-between items-center transition-colors"
              >
                <span className="truncate pr-3 font-medium">🎵 {t.title}</span>
                <span className="font-mono shrink-0 bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{t.duration}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
