// ── LLM Configuration ──

export type ModelProvider = 'ollama-local' | 'ollama-cloud' | 'custom-endpoint' | 'mock-demo' | 'deep-heuristic';

export interface LLMConfig {
  provider: ModelProvider;
  model: string;
  /** Endpoint URL (e.g. http://localhost:11434, https://ollama.com, https://api.groq.com/openai/v1) */
  endpoint: string;
  /** API key for cloud or custom endpoints */
  apiKey?: string;
}

export interface ModelComparisonResult {
  modelA: {
    config: LLMConfig;
    result: AnalysisResult;
    latencyMs: number;
  };
  modelB: {
    config: LLMConfig;
    result: AnalysisResult;
    latencyMs: number;
  };
}

// ── GitHub Data ──

export interface RepoMeta {
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  topics: string[];
  defaultBranch: string;
  htmlUrl: string;
}

export interface RepoFile {
  path: string;
  type: 'file' | 'dir';
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  commentCount: number;
  assignee: string | null;
  updatedAt: string;
  htmlUrl: string;
  hasPR: boolean;
  images?: string[];
}

export interface FetchedRepoData {
  meta: RepoMeta;
  readme: string;
  contributing: string;
  tree: RepoFile[];
  issues: GitHubIssue[];
}

// ── Vision Bug Analysis ──

export interface VisionAnalysisResult {
  defectType: string; // e.g. "Alignment / Layout Shift", "Console Stack Trace", "Color Contrast", "Broken Asset"
  visualDescription: string;
  suggestedFix: string;
  likelyComponents: FileToTouch[];
  cssOrCodeSnippet?: string;
  confidenceScore?: number;
}

// ── Pipeline Output & Deep Intelligence ──

export interface DeepRepoIntelligence {
  frictionScore: number; // 1 (frictionless) to 10 (complex)
  frictionLabel: 'Effortless' | 'Moderate' | 'High Setup Effort';
  maintainerVelocity: string;
  testFramework: string;
  setupComplexity: 'One-Command' | 'Multi-Step' | 'Containerized';
  hotspotDirectories: string[];
  welcomeScore: number; // percentage welcoming newcomers
}

export interface RepoSummary {
  purpose: string;
  stack: string[];
  setupSteps: string[];
  contributionRules: string[];
  intelligence?: DeepRepoIntelligence;
}

export interface FileToTouch {
  path: string;
  reason: string;
  verified: boolean;
}

export interface RankedIssue {
  number: number;
  title: string;
  url: string;
  fitScore: number;
  whyThisOne: string;
  plainExplanation: string;
  filesToTouch: FileToTouch[];
  plan: string[];
  effort: string;
  risks: string[];
  blastRadius?: 'Low / Isolated' | 'Moderate' | 'Core Architecture';
  estimatedDiffLines?: string;
  images?: string[];
  visionAnalysis?: VisionAnalysisResult;
}

export interface AnalysisResult {
  repo: RepoSummary;
  issues: RankedIssue[];
  latencyMs?: number;
  modelUsed?: string;
}

// ── Master Prompts for AI Coding Agents ──

export type AIAgentTarget =
  | 'claude-code'
  | 'antigravity'
  | 'codex-copilot'
  | 'cursor'
  | 'windsurf'
  | 'aider';

export interface MasterPrompt {
  id: AIAgentTarget;
  title: string;
  badge: string;
  description: string;
  cliCommand?: string;
  prompt: string;
}

// ── Model Context Protocol (MCP) ──

export type MCPTarget = 'antigravity' | 'claude_desktop' | 'cursor' | 'windsurf';

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ── Pipeline Stage Tracking ──

export type PipelineStage = 'idle' | 'fetching' | 'summarizing' | 'ranking' | 'planning' | 'done' | 'error';

export interface PipelineState {
  stage: PipelineStage;
  message: string;
  result: AnalysisResult | null;
  error: string | null;
}

// ── Skill Level ──

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
