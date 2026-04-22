export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  nodeId?: string;
  metadata?: {
    progressUpdate?: { nodeId: string; newProgress: number; reason: string };
    newInsight?: string;
    nextHook?: string;
    abilities?: { skill: string; confidence: string }[];
  };
}

export interface ChatSession {
  nodeId: string;
  nodeName: string;
  messages: ChatMessage[];
  startedAt: string;
  lastActiveAt: string;
}
