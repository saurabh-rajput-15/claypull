import React from 'react';
import {
  GitPullRequest,
  Search,
  ExternalLink,
  Server,
  Cloud,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Star,
  Copy,
  Check,
  Split,
  Zap,
  ArrowRight,
  Terminal,
  Cpu,
  AlertCircle,
  Download,
  Target,
  FileText,
} from 'lucide-react';
import type {
  ModelProvider,
  PipelineStage,
  SkillLevel,
  AnalysisResult,
  ModelComparisonResult,
} from '../types';
import { generateMarkdownReport, generateComparisonReport, downloadMarkdown } from '../export';

interface Preset {
  label: string;
  provider: ModelProvider;
  endpoint: string;
  model: string;
  needsKey: boolean;
}

interface LandingPageProps {
  repoUrl: string;
  setRepoUrl: (val: string) => void;
  level: SkillLevel;
  setLevel: (val: SkillLevel) => void;
  provider: ModelProvider;
  setProvider: (val: ModelProvider) => void;
  endpoint: string;
  setEndpoint: (val: string) => void;
  model: string;
  setModel: (val: string) => void;
  apiKey: string;
  setApiKey: (val: string) => void;
  ghToken: string;
  setGhToken: (val: string) => void;
  appMode: 'single' | 'compare';
  setAppMode: (val: 'single' | 'compare') => void;
  providerB: ModelProvider;
  setProviderB: (val: ModelProvider) => void;
  endpointB: string;
  setEndpointB: (val: string) => void;
  modelB: string;
  setModelB: (val: string) => void;
  apiKeyB: string;
  setApiKeyB: (val: string) => void;
  stage: PipelineStage;
  message: string;
  error: string | null;
  result: AnalysisResult | null;
  comparisonResult: ModelComparisonResult | null;
  ollamaModels: string[];
  loadingModels: boolean;
  refreshModels: () => void;
  handleAnalyze: () => void;
  checkedSteps: Record<string, boolean>;
  toggleStep: (issueNum: number, stepIdx: number) => void;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  applyPreset: (preset: Preset) => void;
  presets: Preset[];
  sampleRepos: string[];
  navigateToDashboard: () => void;
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'fetching', label: 'Fetch' },
  { key: 'summarizing', label: 'Summarize' },
  { key: 'ranking', label: 'Rank' },
  { key: 'planning', label: 'Plan' },
  { key: 'done', label: 'Done' },
];

const STAGE_ORDER: PipelineStage[] = ['fetching', 'summarizing', 'ranking', 'planning', 'done'];
const CARD_COLORS = ['pink', 'teal', 'lavender', 'peach', 'ochre'] as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  repoUrl,
  setRepoUrl,
  level,
  setLevel,
  provider,
  setProvider,
  endpoint,
  setEndpoint,
  model,
  setModel,
  apiKey,
  setApiKey,
  ghToken,
  setGhToken,
  appMode,
  setAppMode,
  providerB,
  setProviderB,
  endpointB,
  setEndpointB,
  modelB,
  setModelB,
  apiKeyB,
  setApiKeyB,
  stage,
  message,
  error,
  result,
  comparisonResult,
  ollamaModels,
  loadingModels,
  refreshModels,
  handleAnalyze,
  checkedSteps,
  toggleStep,
  copiedKey,
  copyToClipboard,
  applyPreset,
  presets,
  sampleRepos,
  navigateToDashboard,
}) => {
  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error';

  return (
    <>
      {/* ════════════════════════════════
          Top Navigation
          ════════════════════════════════ */}
      <nav className="top-nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <GitPullRequest size={20} />
          </div>
          <span className="nav-wordmark">FirstPR</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#analyze" className="nav-link">Analyze</a>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              setRepoUrl('facebook/react');
              applyPreset(presets[5]); // Demo
            }}
          >
            Try Demo
          </button>
          <button
            type="button"
            className="nav-link dashboard-nav-cta"
            onClick={navigateToDashboard}
          >
            <Cpu size={14} />
            AI IDE Dashboard
            <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      <div className="app">
        {/* ════════════════════════════════
            Hero Band
            ════════════════════════════════ */}
        <section className="hero-band">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot" />
              Local Ollama · Cloud Models · MCP IDE Integration
            </div>
            <h1 className="hero-title">
              Your first pull request starts here
            </h1>
            <p className="hero-subtitle">
              Paste a GitHub repo URL, pick your skill level, and our open-weight AI model
              identifies the best beginner-friendly issues, creates master prompts for Claude
              Code & Antigravity, and connects directly via MCP to your AI editor.
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn-primary"
                onClick={navigateToDashboard}
              >
                <Cpu size={16} />
                Open AI IDE Dashboard
              </button>
              <a href="#analyze" className="btn-secondary" style={{ textDecoration: 'none' }}>
                <Search size={16} />
                Analyze a repo
              </a>
            </div>
          </div>

          <div className="hero-illustration">
            <div className="clay-sun" />
            <div className="hero-illustration-inner">
              <div className="clay-mountains">
                <div className="mountain mountain-1" />
                <div className="mountain mountain-2" />
                <div className="mountain mountain-3" />
              </div>
              <span className="clay-mascot">🧑‍💻</span>
              <span className="hero-illustration-label">From lost in code… to first PR</span>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            How It Works — Feature Cards
            ════════════════════════════════ */}
        <section className="how-it-works" id="how-it-works">
          <h2 className="how-it-works-title">How FirstPR works</h2>
          <p className="how-it-works-sub">
            Three AI-powered stages turn any GitHub repo into a personalized contribution roadmap.
          </p>
          <div className="feature-cards-grid">
            <div className="feature-card fc-peach">
              <div className="feature-card-icon">
                <Layers size={24} />
              </div>
              <h3>1. Repo Ingestion & Friction Score</h3>
              <p>
                Fetches README, CONTRIBUTING guidelines, directory tree, and open issues.
                Calculates setup friction index, testability, and filters assigned tickets.
              </p>
            </div>
            <div className="feature-card fc-lavender">
              <div className="feature-card-icon">
                <Sparkles size={24} />
              </div>
              <h3>2. AI Matching & Blast Radius</h3>
              <p>
                Scores fit for your skill level, assesses code blast radius, and picks the top 3
                isolated issues where newcomers can make a safe, high-impact fix.
              </p>
            </div>
            <div className="feature-card fc-mint">
              <div className="feature-card-icon">
                <Terminal size={24} />
              </div>
              <h3>3. Master Prompts & MCP Server</h3>
              <p>
                Generate 1-click master prompts tailored for Claude Code, Antigravity, Cursor, and Codex,
                or connect FirstPR directly to your IDE as a native Model Context Protocol (MCP) server.
              </p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            Analyze & Configuration Panel
            ════════════════════════════════ */}
        <section id="analyze" style={{ paddingTop: 'var(--spacing-section)' }}>
          {/* Mode Selector */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="mode-tab-bar">
              <button
                type="button"
                className={`mode-tab ${appMode === 'single' ? 'active' : ''}`}
                onClick={() => setAppMode('single')}
                disabled={isRunning}
              >
                <Sparkles size={14} />
                Single Model Analysis
              </button>
              <button
                type="button"
                className={`mode-tab ${appMode === 'compare' ? 'active' : ''}`}
                onClick={() => setAppMode('compare')}
                disabled={isRunning}
              >
                <Split size={14} />
                Model Comparison (FR-21)
              </button>
            </div>
          </div>

          <div className="config-panel">
            {/* Repository Input */}
            <div className="config-section">
              <div className="config-section-title">
                <Search size={13} />
                Repository
              </div>
              <div className="config-row">
                <div className="field field-full">
                  <label htmlFor="repo-url">GitHub Repository URL or owner/repo</label>
                  <input
                    id="repo-url"
                    type="text"
                    placeholder="e.g. facebook/react or https://github.com/facebook/react"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isRunning}
                  />
                  {/* Sample Repo Chips */}
                  <div className="repo-chips">
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', alignSelf: 'center' }}>Quick Try:</span>
                    {sampleRepos.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        className="repo-chip"
                        onClick={() => setRepoUrl(sample)}
                        disabled={isRunning}
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="config-row" style={{ marginTop: 16 }}>
                <div className="field">
                  <label htmlFor="skill-level">Contributor Skill Level</label>
                  <select
                    id="skill-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as SkillLevel)}
                    disabled={isRunning}
                  >
                    <option value="beginner">🌱 Beginner (First open source contribution)</option>
                    <option value="intermediate">🌿 Intermediate (Comfortable with git & codebases)</option>
                    <option value="advanced">🌳 Advanced (Architecture, deep refactoring)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="gh-token">GitHub Token (optional, raises rate limit)</label>
                  <input
                    id="gh-token"
                    type="password"
                    placeholder="ghp_... (60 req/hr without, 5000 req/hr with)"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>

            {/* AI Model Configuration (Model A) */}
            <div className="config-section">
              <div className="config-section-title">
                <Sparkles size={13} />
                {appMode === 'compare' ? 'Model A Configuration' : 'AI Model Configuration'}
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--color-muted)' }}>Quick Model Presets:</label>
                <div className="preset-chips">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`preset-chip ${model === p.model && provider === p.provider ? 'active' : ''}`}
                      onClick={() => applyPreset(p)}
                      disabled={isRunning}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Provider Type</label>
                <div className="provider-toggle">
                  <button
                    type="button"
                    className={provider === 'ollama-local' ? 'active' : ''}
                    onClick={() => {
                      setProvider('ollama-local');
                      setEndpoint('http://localhost:11434');
                      setModel('qwen2.5-coder:7b');
                    }}
                    disabled={isRunning}
                  >
                    <Server size={14} />
                    Local Ollama
                  </button>
                  <button
                    type="button"
                    className={provider === 'ollama-cloud' ? 'active' : ''}
                    onClick={() => {
                      setProvider('ollama-cloud');
                      setEndpoint('https://ollama.com');
                      setModel('qwen2.5-coder:7b');
                    }}
                    disabled={isRunning}
                  >
                    <Cloud size={14} />
                    Ollama Cloud
                  </button>
                  <button
                    type="button"
                    className={provider === 'custom-endpoint' ? 'active' : ''}
                    onClick={() => {
                      setProvider('custom-endpoint');
                      setEndpoint('https://api.groq.com/openai/v1');
                      setModel('llama-3.3-70b-versatile');
                    }}
                    disabled={isRunning}
                  >
                    <Sparkles size={14} />
                    Cloud API
                  </button>
                  <button
                    type="button"
                    className={provider === 'mock-demo' ? 'active' : ''}
                    onClick={() => {
                      setProvider('mock-demo');
                      setEndpoint('');
                      setModel('qwen2.5-coder-mock:7b');
                    }}
                    disabled={isRunning}
                  >
                    <Zap size={14} />
                    Instant Demo
                  </button>
                </div>
              </div>

              {provider !== 'mock-demo' && (
                <div className="config-row">
                  <div className="field">
                    <label htmlFor="endpoint">Endpoint URL</label>
                    <input
                      id="endpoint"
                      type="text"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      disabled={isRunning}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="model-name">
                      Model Name
                      {provider === 'ollama-local' && (
                        <button
                          type="button"
                          className="detect-btn"
                          onClick={refreshModels}
                          disabled={loadingModels || isRunning}
                        >
                          <RefreshCw size={10} />
                          {loadingModels ? 'Detecting…' : 'Detect'}
                        </button>
                      )}
                    </label>
                    {ollamaModels.length > 0 && provider === 'ollama-local' ? (
                      <select
                        id="model-name"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={isRunning}
                      >
                        {ollamaModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="model-name"
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        disabled={isRunning}
                      />
                    )}
                  </div>
                </div>
              )}

              {(provider === 'custom-endpoint' || provider === 'ollama-cloud') && (
                <div className="config-row" style={{ marginTop: 12 }}>
                  <div className="field field-full">
                    <label htmlFor="api-key">API Key / Bearer Token</label>
                    <input
                      id="api-key"
                      type="password"
                      placeholder="sk-... or gsk_..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Model B Configuration (Comparison Mode Only) */}
            {appMode === 'compare' && (
              <div className="config-section" style={{ borderTop: '1px solid var(--color-hairline)', paddingTop: 16 }}>
                <div className="config-section-title">
                  <Split size={13} />
                  Model B Configuration (To Compare Side-by-Side)
                </div>

                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Provider Type</label>
                  <div className="provider-toggle">
                    <button
                      type="button"
                      className={providerB === 'ollama-local' ? 'active' : ''}
                      onClick={() => {
                        setProviderB('ollama-local');
                        setEndpointB('http://localhost:11434');
                        setModelB('llama3.2:latest');
                      }}
                      disabled={isRunning}
                    >
                      <Server size={14} />
                      Local Ollama
                    </button>
                    <button
                      type="button"
                      className={providerB === 'custom-endpoint' ? 'active' : ''}
                      onClick={() => {
                        setProviderB('custom-endpoint');
                        setEndpointB('https://api.openai.com/v1');
                        setModelB('gpt-4o-mini');
                      }}
                      disabled={isRunning}
                    >
                      <Cloud size={14} />
                      Cloud API
                    </button>
                    <button
                      type="button"
                      className={providerB === 'mock-demo' ? 'active' : ''}
                      onClick={() => {
                        setProviderB('mock-demo');
                        setEndpointB('');
                        setModelB('llama3.2-mock:3b');
                      }}
                      disabled={isRunning}
                    >
                      <Zap size={14} />
                      Mock Model
                    </button>
                  </div>
                </div>

                {providerB !== 'mock-demo' && (
                  <div className="config-row">
                    <div className="field">
                      <label htmlFor="endpoint-b">Endpoint URL</label>
                      <input
                        id="endpoint-b"
                        type="text"
                        value={endpointB}
                        onChange={(e) => setEndpointB(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="model-b">Model Name</label>
                      <input
                        id="model-b"
                        type="text"
                        value={modelB}
                        onChange={(e) => setModelB(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                )}

                {providerB === 'custom-endpoint' && (
                  <div className="config-row" style={{ marginTop: 12 }}>
                    <div className="field field-full">
                      <label htmlFor="api-key-b">API Key (Model B)</label>
                      <input
                        id="api-key-b"
                        type="password"
                        placeholder="sk-..."
                        value={apiKeyB}
                        onChange={(e) => setApiKeyB(e.target.value)}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="actions-row">
              <button
                type="button"
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={isRunning || !repoUrl.trim()}
                style={{ height: 48, padding: '0 32px', fontSize: 15 }}
              >
                {isRunning ? (
                  <>
                    <span className="spinner" /> Analyzing with {model}…
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    {appMode === 'single' ? 'Analyze Repository' : 'Compare Models on Repo'}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════
            Progress Bar
            ════════════════════════════════ */}
        {stage !== 'idle' && stage !== 'error' && (
          <div className="progress-bar">
            <div className="progress-stages">
              {STAGES.map((s, idx) => {
                const currentIdx = STAGE_ORDER.indexOf(stage);
                const stageIdx = STAGE_ORDER.indexOf(s.key);
                const isDone = stageIdx < currentIdx || stage === 'done';
                const isActive = s.key === stage && stage !== 'done';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                    {idx > 0 && (
                      <div className={`progress-connector ${isDone ? 'done' : ''}`} />
                    )}
                    <div className={`progress-stage ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <span className="stage-dot" />
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {message && <div className="progress-message">{message}</div>}
          </div>
        )}

        {/* ════════════════════════════════
            Error Banner
            ════════════════════════════════ */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ════════════════════════════════
            Results: Single Model Analysis
            ════════════════════════════════ */}
        {result && appMode === 'single' && (
          <div className="results">
            <div className="export-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'var(--color-primary)', color: 'white' }}
                onClick={navigateToDashboard}
              >
                <Cpu size={14} /> Open in Studio Dashboard & Master Prompts →
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const md = generateMarkdownReport(result);
                  downloadMarkdown(md, `firstpr-${repoUrl.replace(/[/\\:]/g, '-')}.md`);
                }}
              >
                <Download size={14} /> Export Markdown Report
              </button>
            </div>

            {/* Repo Overview Card */}
            <div className="repo-card">
              <div className="repo-card-header">
                <div className="repo-card-title">
                  <a
                    href={`https://github.com/${repoUrl.replace(/^https?:\/\/github\.com\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📦 {repoUrl.replace(/^https?:\/\/github\.com\//, '')}
                    <ExternalLink size={14} style={{ marginLeft: 6, verticalAlign: 'middle', opacity: 0.3 }} />
                  </a>
                </div>
              </div>
              <p className="repo-purpose">{result.repo.purpose}</p>

              <div className="tag-list" style={{ marginBottom: 24 }}>
                {result.repo.stack.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>

              <div className="repo-details">
                {result.repo.setupSteps.length > 0 && (
                  <div className="repo-detail-section">
                    <h4>Setup Steps</h4>
                    <ul>
                      {result.repo.setupSteps.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.repo.contributionRules.length > 0 && (
                  <div className="repo-detail-section">
                    <h4>Contribution Rules</h4>
                    <ul>
                      {result.repo.contributionRules.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Issue Cards */}
            {result.issues.length === 0 ? (
              <div className="no-issues-banner">
                <h3>No matching issues found</h3>
                <p>
                  This repo doesn't currently have open issues labeled for beginners, or suitable issues
                  are already assigned. Try another repository or check back later!
                </p>
              </div>
            ) : (
              <>
                <h2 className="issues-header">
                  <Target size={28} />
                  Recommended Issues & Plans
                </h2>
                <p className="issues-subheader">
                  These issues were analyzed and ranked for a <strong>{level}</strong> contributor.
                  Each issue includes verified file locations, step-by-step guidance, and interactive tracking.
                </p>

                <div className="issue-cards-grid">
                  {result.issues.map((issue, idx) => {
                    const colorClass = `issue-card-${CARD_COLORS[idx % CARD_COLORS.length]}`;
                    const steps = issue.plan.length > 0 ? issue.plan : [
                      `Fork repository ${repoUrl} on GitHub`,
                      `Clone fork locally`,
                      `Create branch fix-issue-${issue.number}`,
                      `Implement proposed fix`,
                      `Run tests`,
                      `Open Pull Request`,
                    ];
                    const completedCount = steps.filter((_, i) => checkedSteps[`${issue.number}-${i}`]).length;
                    const progressPercent = Math.round((completedCount / steps.length) * 100);

                    const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
                    const repoBaseName = cleanRepo.split('/')[1] || 'repo';
                    const gitCommands = `git clone https://github.com/${cleanRepo}.git\ncd ${repoBaseName}\ngit checkout -b fix/issue-${issue.number}`;

                    return (
                      <div key={issue.number} className={`issue-card ${colorClass}`}>
                        <div className="issue-card-header">
                          <div className="issue-rank">{idx + 1}</div>
                          <div className="issue-title-group">
                            <div className="issue-title">
                              <a href={issue.url} target="_blank" rel="noopener noreferrer">
                                {issue.title}
                                <ExternalLink size={12} style={{ marginLeft: 6, verticalAlign: 'middle', opacity: 0.4 }} />
                              </a>
                            </div>
                            <div className="issue-number">#{issue.number}</div>
                          </div>
                          <div className="fit-score">
                            <CheckCircle size={14} />
                            {Math.round(issue.fitScore * 100)}% fit
                          </div>
                        </div>

                        <div className="issue-body">
                          {/* Why */}
                          <div>
                            <div className="issue-section-title">
                              <Star size={11} />
                              Why this issue?
                            </div>
                            <div className="why-badge">{issue.whyThisOne}</div>
                          </div>

                          {/* Explanation */}
                          <div>
                            <div className="issue-section-title">
                              <FileText size={11} />
                              Explanation
                            </div>
                            <p className="issue-explanation">{issue.plainExplanation}</p>
                          </div>

                          {/* Files */}
                          {issue.filesToTouch.length > 0 && (
                            <div>
                              <div className="issue-section-title">
                                <FileText size={11} />
                                Files to touch
                              </div>
                              <ul className="files-list">
                                {issue.filesToTouch.map((f, i) => (
                                  <li key={i} className="file-item">
                                    <span className="file-path">{f.path}</span>
                                    <span className={`file-badge ${f.verified ? 'verified' : 'guess'}`}>
                                      {f.verified ? '✓ verified' : '? guess'}
                                    </span>
                                    <span className="file-reason">{f.reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Interactive Checklist */}
                          <div>
                            <div className="issue-section-title">
                              <GitPullRequest size={11} />
                              Interactive Fork-to-PR Checklist
                            </div>

                            <div className="interactive-checklist">
                              <div className="checklist-header">
                                <span>{completedCount} of {steps.length} steps completed</span>
                                <span>{progressPercent}%</span>
                              </div>
                              <div className="checklist-progress-bar-wrap">
                                <div
                                  className="checklist-progress-bar-fill"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>

                              {steps.map((step, i) => {
                                const isChecked = !!checkedSteps[`${issue.number}-${i}`];
                                return (
                                  <div
                                    key={i}
                                    className={`checklist-item ${isChecked ? 'completed' : ''}`}
                                    onClick={() => toggleStep(issue.number, i)}
                                  >
                                    <div className="checklist-checkbox">
                                      {isChecked && <Check size={12} />}
                                    </div>
                                    <span>{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Git Commands */}
                          <div>
                            <div className="issue-section-title">
                              <Copy size={11} />
                              Quick Git Commands
                            </div>
                            <div className="git-command-box">
                              <button
                                type="button"
                                className="git-copy-btn"
                                onClick={() => copyToClipboard(gitCommands, `git-${issue.number}`)}
                              >
                                {copiedKey === `git-${issue.number}` ? (
                                  <>
                                    <Check size={11} /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} /> Copy Commands
                                  </>
                                )}
                              </button>
                              <code>{gitCommands}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            Results: Model Comparison (FR-21)
            ════════════════════════════════ */}
        {comparisonResult && appMode === 'compare' && (
          <div className="results">
            <div className="export-bar">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const md = generateComparisonReport(comparisonResult);
                  downloadMarkdown(md, `firstpr-comparison-${repoUrl.replace(/[/\\:]/g, '-')}.md`);
                }}
              >
                <Download size={14} /> Export Comparison Report
              </button>
            </div>

            <div className="comparison-summary-card">
              <h2 className="title-lg" style={{ marginBottom: 8 }}>
                ⚖️ Side-by-Side Model Benchmark
              </h2>
              <p className="body-sm" style={{ color: 'var(--color-muted)' }}>
                Comparing model performance and issue selection criteria across the same repository.
              </p>

              <div className="comparison-stats-grid">
                <div className="comparison-stat-tile">
                  <span className="title">Model Identifier</span>
                  <div className="values">
                    <span style={{ color: 'var(--color-brand-pink)' }}>{comparisonResult.modelA.config.model}</span>
                    <span style={{ color: 'var(--color-brand-teal)' }}>{comparisonResult.modelB.config.model}</span>
                  </div>
                </div>

                <div className="comparison-stat-tile">
                  <span className="title">End-to-End Latency</span>
                  <div className="values">
                    <span>{(comparisonResult.modelA.latencyMs / 1000).toFixed(2)}s</span>
                    <span>{(comparisonResult.modelB.latencyMs / 1000).toFixed(2)}s</span>
                  </div>
                </div>

                <div className="comparison-stat-tile">
                  <span className="title">Issues Identified</span>
                  <div className="values">
                    <span>{comparisonResult.modelA.result.issues.length}</span>
                    <span>{comparisonResult.modelB.result.issues.length}</span>
                  </div>
                </div>

                <div className="comparison-stat-tile">
                  <span className="title">Average Fit Score</span>
                  <div className="values">
                    <span>
                      {Math.round(
                        (comparisonResult.modelA.result.issues.reduce((acc, i) => acc + i.fitScore, 0) /
                          (comparisonResult.modelA.result.issues.length || 1)) *
                          100,
                      )}%
                    </span>
                    <span>
                      {Math.round(
                        (comparisonResult.modelB.result.issues.reduce((acc, i) => acc + i.fitScore, 0) /
                          (comparisonResult.modelB.result.issues.length || 1)) *
                          100,
                      )}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            CTA Band (pre-footer)
            ════════════════════════════════ */}
        <section className="cta-band">
          <div className="cta-decoration cta-dec-1" />
          <div className="cta-decoration cta-dec-2" />
          <div className="cta-decoration cta-dec-3" />
          <h2>Ready to open your first pull request?</h2>
          <p>Paste any open-source GitHub repository URL above or launch our AI IDE Studio.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={navigateToDashboard}
          >
            <Cpu size={16} />
            Launch Studio Dashboard
          </button>
        </section>
      </div>

      {/* ════════════════════════════════
          Footer (warm cream canvas)
          ════════════════════════════════ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-name">
              <GitPullRequest size={20} />
              FirstPR
            </div>
            <p className="footer-brand-desc">
              Open-source contribution coach. Built for Hacktoberfest Hack Day Dhule × ARIF.
              Runs entirely locally on open-weight models or cloud endpoints.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#analyze">Analyze</a></li>
              <li><button type="button" onClick={navigateToDashboard} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Studio Dashboard</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>AI IDE Tools</h4>
            <ul>
              <li><span>Claude Code Master Prompt</span></li>
              <li><span>Google Antigravity</span></li>
              <li><span>Model Context Protocol (MCP)</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Project</h4>
            <ul>
              <li><span>MIT License</span></li>
              <li><span>No tracking or telemetry</span></li>
              <li><span>100% Client-side</span></li>
            </ul>
          </div>
        </div>

        {/* Footer mountain decoration */}
        <div className="footer-mountains">
          <div className="footer-mtn footer-mtn-1" />
          <div className="footer-mtn footer-mtn-2" />
          <div className="footer-mtn footer-mtn-3" />
          <div className="footer-mtn footer-mtn-4" />
        </div>
      </footer>
    </>
  );
};
