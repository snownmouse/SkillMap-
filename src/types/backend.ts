export type { SkillTreeData, SkillNode, SkillEdge, Category, TimelineEvent } from './skillTree';

export type LLMProvider = 'gemini' | 'deepseek' | 'siliconflow' | 'qwen' | 'ark' | 'custom' | 'dummy';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface GenerateTreeRequest {
  major: string;
  career: string;
  level: 'zero' | 'basic' | 'intermediate' | 'advanced';
  weeklyHours: number;
  notes: string;
  existingSkills?: string[];
  selectedPathId?: string;
  selectedCareer?: string;
}

export interface ChatRequest {
  treeId: string;
  nodeId: string;
  message: string;
}

export interface AbilityRecord {
  skill: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  nodeId?: string;
  discoveredAt: string;
}

export interface ChatResponse {
  reply: string;
  progressUpdate?: { nodeId: string; newProgress: number; reason: string };
  newInsight?: string;
  nextHook?: string;
  timelineEvent?: { type: string; summary: string };
  abilities?: AbilityRecord[];
}

export interface CareerPathStep {
  career: string;
  description: string;
  duration: string;
}

export interface CareerPath {
  id: string;
  name: string;
  description: string;
  steps: CareerPathStep[];
  fitScore: number;
}

export interface CareerPlanResponse {
  targetCareer: string;
  paths: CareerPath[];
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  color: string;
  totalNodes: number;
  completedNodes: number;
  progress: number;
}

export interface ProfileResponse {
  treeId: string;
  career: string;
  summary: string;
  overallProgress: number;
  totalNodes: number;
  completedNodes: number;
  inProgressNodes: number;
  availableNodes: number;
  lockedNodes: number;
  categoryBreakdown: CategoryBreakdown[];
  strengths: { id: string; name: string; progress: number }[];
  weaknesses: { id: string; name: string; progress: number }[];
  recentTimeline: { date: string; type: string; summary: string; nodeId?: string; details?: Record<string, unknown> }[];
  generatedAt: string;
  lastUpdated: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface GenerationTask {
  id: string;
  status: TaskStatus;
  treeId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreeRecord {
  id: string;
  userId: string;
  career: string;
  treeData: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRecord {
  id: string;
  treeId: string;
  nodeId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: string;
  createdAt: string;
}

export type LLMFunctionType = 'career_plan' | 'tree_generate' | 'node_chat' | 'global_chat';

export interface LLMFunctionConfig {
  model: string | undefined;
  apiType: 'chat' | 'responses';
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  webSearch?: boolean;
  maxTokens: number;
  temperature: number;
}
