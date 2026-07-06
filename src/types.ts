export interface BotConfig {
  name: string;
  persona: string;
  customSystemInstruction: string;
  googleSearchGrounding: boolean;
  commandPrefix: string;
  welcomeChannelEnabled: boolean;
  welcomeChannelName: string;
  toxicityFilterEnabled: boolean;
  spamFilterEnabled: boolean;
  nsfwFilterEnabled: boolean;
}

export interface DiscordMessage {
  id: string;
  username: string;
  avatarColor: string;
  isBot?: boolean;
  isAI?: boolean;
  content: string;
  timestamp: string;
  groundingSources?: Array<{ title: string; uri: string }>;
}

export interface QueueTrack {
  id: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  addedBy: string;
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "SPAM_SCAM" | "TOXICITY" | "NSFW";
}

export interface HostSpec {
  id: string;
  name: string;
  icon: string;
  cost: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  pros: string[];
  cons: string[];
  verdict: string;
  setupInstructions: string[];
}
