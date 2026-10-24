import React, { useState } from 'react';
import {
  GitPullRequest,
  Search,
  ExternalLink,
  Server,
  Cloud,
  CheckCircle,
  Sparkles,
  Layers,
  Star,
  Copy,
  Check,
  Split,
  Zap,
  LayoutDashboard,
  Target,
  FileCode2,
  Cpu,
  Settings,
  ArrowLeft,
  Clock,
  ShieldAlert,
  Download,
  Terminal,
  Activity,
  FileText,
} from 'lucide-react';
import type {
  AnalysisResult,
  ModelComparisonResult,
  ModelProvider,
  PipelineStage,
  SkillLevel,
  MCPTarget,
  RankedIssue,
} from '../types';
import { generateMasterPrompts } from '../masterPrompts';
import { CLAYPULL_MCP_TOOLS, getMCPClientConfig } from '../mcp';
import { generateMarkdownReport, downloadMarkdown } from '../export';

interface Preset {
  label: string;
  provider: ModelProvider;
  endpoint: string;
  model: string;
  needsKey: boolean;
}

interface DashboardProps {
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
  stage: PipelineStage;
  message: string;
  error: string | null;
  result: AnalysisResult | null;
  comparisonResult: ModelComparisonResult | null;
  handleAnalyze: () => void;
  checkedSteps: Record<string, boolean>;
  toggleStep: (issueNum: number, stepIdx: number) => void;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => void;
  presets: Preset[];
  sampleRepos: string[];
  navigateToLanding: () => void;
}

type DashboardTab = 'overview' | 'issues' | 'prompts' | 'mcp' | 'compare' | 'settings';

const CARD_COLORS = ['emerald', 'teal', 'amber', 'coral', 'indigo'] as const;

export const Dashboard: React.FC<DashboardProps> = ({
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
  stage,
  message,
  error,
  result,
  comparisonResult,
  handleAnalyze,
  checkedSteps,
  toggleStep,
  copiedKey,
  copyToClipboard,
  sampleRepos,
  navigateToLanding,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedIssueIdx, setSelectedIssueIdx] = useState<number>(0);
  const [mcpTarget, setMcpTarget] = useState<MCPTarget>('antigravity');

  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error';
  const cleanRepo = repoUrl.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '') || 'No Repository Selected';

  const currentIssue: RankedIssue | undefined = result?.issues?.[selectedIssueIdx] || result?.issues?.[0];
  const masterPrompts = currentIssue && result ? generateMasterPrompts(repoUrl, result, currentIssue) : [];

  return (
    <div className="dashboard-layout">
      {/* ════════════════════════════════
          Sidebar
          ════════════════════════════════ */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand" onClick={navigateToLanding} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo">
            <GitPullRequest size={20} />
          </div>
          <div>
            <div className="sidebar-title">ClayPull Studio</div>
            <div className="sidebar-subtitle">AI IDE & Contributor Hub</div>
          </div>
        </div>

        {/* Active Repo Capsule */}
        <div className="sidebar-repo-pill">
          <span className="dot" />
          <span className="name" title={cleanRepo}>{cleanRepo}</span>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={16} />
            <span>Overview & Intelligence</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            <Target size={16} />
            <span>Triaged Issues ({result?.issues?.length || 0})</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            <FileCode2 size={16} />
            <span>Master Prompt Studio</span>
            <span className="sidebar-badge">Claude/AGY</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            <Cpu size={16} />
            <span>MCP Server Hub</span>
            <span className="sidebar-badge">IDE Link</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <Split size={16} />
            <span>Model Comparison</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Model & API Config</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {result && (
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={() => {
                const md = generateMarkdownReport(result);
                downloadMarkdown(md, `claypull-${cleanRepo.replace(/[/\\:]/g, '-')}.md`);
              }}
            >
              <Download size={14} />
              Export Report .md
            </button>
          )}

          <button
            type="button"
            className="sidebar-action-btn"
            onClick={navigateToLanding}
          >
            <ArrowLeft size={14} />
            Return to Landing Page
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════
          Main Dashboard Content
          ════════════════════════════════ */}
      <main className="dashboard-main">
        {/* Top Header Bar */}
        <header className="dashboard-header">
          <div className="header-search-bar">
            <Search size={16} style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Enter GitHub owner/repo or URL (e.g. facebook/react)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div className="header-controls">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as SkillLevel)}
              disabled={isRunning}
              className="header-select"
            >
              <option value="beginner">🌱 Beginner</option>
              <option value="intermediate">🌿 Intermediate</option>
              <option value="advanced">🌳 Advanced</option>
            </select>

            <button
              type="button"
              className="btn-primary header-run-btn"
              onClick={handleAnalyze}
              disabled={isRunning || !repoUrl.trim()}
            >
              {isRunning ? (
                <>
                  <span className="spinner" /> Analyzing…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Analyze
                </>
              )}
            </button>
          </div>
        </header>

        {/* Sample Repos Row */}
        <div className="dashboard-repo-chips">
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Quick Repos:</span>
          {sampleRepos.map((s) => (
            <button
              key={s}
              type="button"
              className={`dashboard-chip ${repoUrl === s ? 'active' : ''}`}
              onClick={() => setRepoUrl(s)}
              disabled={isRunning}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Status / Message Alert */}
        {message && isRunning && (
          <div className="dashboard-alert info">
            <Activity size={16} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="dashboard-alert error">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ════════════════════════════════
            Tab 1: Overview & Deep Intelligence
            ════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="dashboard-view">
            {!result ? (
              <div className="empty-state-box">
                <Layers size={40} />
                <h3>No Repository Analyzed Yet</h3>
                <p>Enter a GitHub repository above or select a Quick Repo, then click <strong>Analyze</strong>.</p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    setRepoUrl('pallets/flask');
                    handleAnalyze();
                  }}
                >
                  <Zap size={15} /> Analyze pallets/flask
                </button>
              </div>
            ) : (
              <div className="dashboard-grid">
                {/* Friction & Setup Metrics */}
                <div className="intel-cards-row">
                  <div className="intel-card">
                    <div className="intel-card-header">
                      <span>Setup Friction Index</span>
                      <Activity size={16} color="var(--color-brand-coral)" />
                    </div>
                    <div className="intel-card-value">
                      {result.repo.intelligence?.frictionScore || 3} / 10
                    </div>
                    <div className="intel-card-label">
                      Rating: <strong>{result.repo.intelligence?.frictionLabel || 'Effortless'}</strong>
                    </div>
                  </div>

                  <div className="intel-card">
                    <div className="intel-card-header">
                      <span>Maintainer Velocity</span>
                      <Clock size={16} color="var(--color-brand-ochre)" />
                    </div>
                    <div className="intel-card-value" style={{ fontSize: 16 }}>
                      {result.repo.intelligence?.maintainerVelocity || 'Active · ~48h turnaround'}
                    </div>
                    <div className="intel-card-label">
                      Welcoming Score: <strong>{result.repo.intelligence?.welcomeScore || 92}%</strong>
                    </div>
                  </div>

                  <div className="intel-card">
                    <div className="intel-card-header">
                      <span>Test Framework</span>
                      <Terminal size={16} color="var(--color-brand-mint)" />
                    </div>
                    <div className="intel-card-value" style={{ fontSize: 18 }}>
                      {result.repo.intelligence?.testFramework || 'Vitest / Jest'}
                    </div>
                    <div className="intel-card-label">
                      Complexity: <strong>{result.repo.intelligence?.setupComplexity || 'One-Command'}</strong>
                    </div>
                  </div>
                </div>

                {/* Repo Overview Main Card */}
                <div className="repo-card" style={{ marginBottom: 24 }}>
                  <div className="repo-card-header">
                    <div className="repo-card-title">
                      <a href={`https://github.com/${cleanRepo}`} target="_blank" rel="noopener noreferrer">
                        📦 {cleanRepo}
                        <ExternalLink size={14} style={{ marginLeft: 6, opacity: 0.4 }} />
                      </a>
                    </div>
                    {result.latencyMs && (
                      <span className="model-latency-pill">
                        <Clock size={12} /> {(result.latencyMs / 1000).toFixed(2)}s via {result.modelUsed || model}
                      </span>
                    )}
                  </div>

                  <p className="repo-purpose">{result.repo.purpose}</p>

                  <div className="tag-list" style={{ marginBottom: 20 }}>
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

                {/* Quick Action banner to Master Prompts */}
                <div className="cta-band" style={{ padding: '32px 24px' }}>
                  <h3>🪄 Ready to solve these issues with AI?</h3>
                  <p>Generate surgical prompts for Claude Code, Google Antigravity, or Cursor.</p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setActiveTab('prompts')}
                    style={{ marginTop: 12 }}
                  >
                    <FileCode2 size={16} /> Open Master Prompt Studio
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            Tab 2: Triaged Issues & PR Plans
            ════════════════════════════════ */}
        {activeTab === 'issues' && (
          <div className="dashboard-view">
            {!result || result.issues.length === 0 ? (
              <div className="empty-state-box">
                <Target size={40} />
                <h3>No Issues Triaged</h3>
                <p>Run analysis on a repository to find and rank beginner-friendly issues.</p>
              </div>
            ) : (
              <div className="issue-cards-grid">
                {result.issues.map((issue, idx) => {
                  const colorClass = `issue-card-${CARD_COLORS[idx % CARD_COLORS.length]}`;
                  const steps = issue.plan.length > 0 ? issue.plan : [
                    `Fork repository ${cleanRepo} on GitHub`,
                    `Clone fork locally: git clone ...`,
                    `Create branch: git checkout -b fix-issue-${issue.number}`,
                    `Implement changes in target files`,
                    `Run tests: npm test`,
                    `Submit Pull Request referencing #${issue.number}`,
                  ];
                  const completedCount = steps.filter((_, i) => checkedSteps[`${issue.number}-${i}`]).length;
                  const progressPercent = Math.round((completedCount / steps.length) * 100);
                  const gitCommands = `git clone https://github.com/${cleanRepo}.git\ncd ${cleanRepo.split('/')[1] || 'repo'}\ngit checkout -b fix/issue-${issue.number}`;

                  return (
                    <div key={issue.number} className={`issue-card ${colorClass}`}>
                      <div className="issue-card-header">
                        <div className="issue-rank">{idx + 1}</div>
                        <div className="issue-title-group">
                          <div className="issue-title">
                            <a href={issue.url} target="_blank" rel="noopener noreferrer">
                              {issue.title}
                              <ExternalLink size={12} style={{ marginLeft: 6, opacity: 0.4 }} />
                            </a>
                          </div>
                          <div className="issue-number">#{issue.number}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {issue.blastRadius && (
                            <span className="file-badge verified">
                              {issue.blastRadius}
                            </span>
                          )}
                          <div className="fit-score">
                            <CheckCircle size={14} />
                            {Math.round(issue.fitScore * 100)}% fit
                          </div>
                        </div>
                      </div>

                      <div className="issue-body">
                        <div>
                          <div className="issue-section-title">
                            <Star size={11} /> Why this issue?
                          </div>
                          <div className="why-badge">{issue.whyThisOne}</div>
                        </div>

                        <div>
                          <div className="issue-section-title">
                            <FileText size={11} /> Explanation
                          </div>
                          <p className="issue-explanation">{issue.plainExplanation}</p>
                        </div>

                        {issue.filesToTouch.length > 0 && (
                          <div>
                            <div className="issue-section-title">
                              <FileText size={11} /> Files to touch
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

                        {/* Interactive PR Checklist */}
                        <div>
                          <div className="issue-section-title">
                            <GitPullRequest size={11} /> Interactive Fork-to-PR Checklist
                          </div>
                          <div className="interactive-checklist">
                            <div className="checklist-header">
                              <span>{completedCount} of {steps.length} steps completed</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="checklist-progress-bar-wrap">
                              <div className="checklist-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
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

                        {/* Git Commands & Master Prompt Shortcut */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                          <div className="git-command-box">
                            <button
                              type="button"
                              className="git-copy-btn"
                              onClick={() => copyToClipboard(gitCommands, `git-db-${issue.number}`)}
                            >
                              {copiedKey === `git-db-${issue.number}` ? (
                                <>
                                  <Check size={11} /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> Copy Git Setup
                                </>
                              )}
                            </button>
                            <code>{gitCommands}</code>
                          </div>

                          <button
                            type="button"
                            className="btn-primary"
                            style={{ height: '100%', padding: '0 16px', fontSize: 13 }}
                            onClick={() => {
                              setSelectedIssueIdx(idx);
                              setActiveTab('prompts');
                            }}
                          >
                            <FileCode2 size={14} /> Master Prompt →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            Tab 3: Master Prompt Studio (Separate per Repo + Issue)
            ════════════════════════════════ */}
        {activeTab === 'prompts' && (
          <div className="dashboard-view">
            {!result || !currentIssue ? (
              <div className="empty-state-box">
                <FileCode2 size={40} />
                <h3>No Analyzed Issue Selected</h3>
                <p>Run analysis on a repo first, then select an issue to generate tailored Master Prompts.</p>
              </div>
            ) : (
              <div>
                <div className="studio-issue-selector">
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)' }}>Target Issue:</span>
                  {result.issues.map((iss, idx) => (
                    <button
                      key={iss.number}
                      type="button"
                      className={`studio-issue-tab ${selectedIssueIdx === idx ? 'active' : ''}`}
                      onClick={() => setSelectedIssueIdx(idx)}
                    >
                      #{iss.number} ({iss.title.slice(0, 32)}…)
                    </button>
                  ))}
                </div>

                <div className="studio-intro-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Sparkles size={18} color="#4f46e5" />
                    <h3 style={{ fontSize: 18, fontWeight: 600 }}>Master Prompts for #{currentIssue.number}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                    Deeply structured, tool-specific instructions ready to copy into your preferred AI agent.
                    Includes repo rules, verified target files, step-by-step logic, and verification criteria.
                  </p>
                </div>

                <div className="prompts-grid">
                  {masterPrompts.map((mp) => {
                    const isCopied = copiedKey === `prompt-${mp.id}`;
                    return (
                      <div key={mp.id} className="prompt-card">
                        <div className="prompt-card-header">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <h4 style={{ fontSize: 16, fontWeight: 600 }}>{mp.title}</h4>
                              <span className="prompt-agent-badge">{mp.badge}</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
                              {mp.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="btn-primary"
                            style={{ height: 36, padding: '0 16px', fontSize: 12 }}
                            onClick={() => copyToClipboard(mp.cliCommand || mp.prompt, `prompt-${mp.id}`)}
                          >
                            {isCopied ? (
                              <>
                                <Check size={13} /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={13} /> Copy {mp.cliCommand ? 'CLI Command' : 'Prompt'}
                              </>
                            )}
                          </button>
                        </div>

                        {mp.cliCommand && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 4 }}>
                              ONE-CLICK TERMINAL COMMAND:
                            </div>
                            <div className="code-snippet-box">
                              <code>{mp.cliCommand}</code>
                            </div>
                          </div>
                        )}

                        <div className="prompt-text-box">
                          <pre>{mp.prompt}</pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            Tab 4: MCP Server & AI-IDE Hub
            ════════════════════════════════ */}
        {activeTab === 'mcp' && (
          <div className="dashboard-view">
            <div className="studio-intro-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Cpu size={20} color="var(--color-brand-teal)" />
                <h3 style={{ fontSize: 20, fontWeight: 600 }}>Model Context Protocol (MCP) Server Hub</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                Connect ClayPull directly to <strong>Google Antigravity IDE</strong>, <strong>Claude Desktop</strong>,
                <strong>Cursor</strong>, or <strong>Windsurf</strong>. ClayPull exposes native tools over stdio JSON-RPC so
                AI agents can analyze repositories and triage issues on demand.
              </p>
            </div>

            {/* Target IDE Switcher */}
            <div className="mcp-target-tabs">
              {(['antigravity', 'claude_desktop', 'cursor', 'windsurf'] as MCPTarget[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`mcp-tab-btn ${mcpTarget === t ? 'active' : ''}`}
                  onClick={() => setMcpTarget(t)}
                >
                  {t === 'antigravity'
                    ? 'Google Antigravity'
                    : t === 'claude_desktop'
                    ? 'Claude Desktop'
                    : t === 'cursor'
                    ? 'Cursor IDE'
                    : 'Windsurf'}
                </button>
              ))}
            </div>

            {/* Config Box */}
            <div className="mcp-config-display">
              <div className="mcp-config-header">
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Configuration Snippet for {mcpTarget.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  type="button"
                  className="git-copy-btn"
                  onClick={() => copyToClipboard(getMCPClientConfig(mcpTarget), `mcp-${mcpTarget}`)}
                >
                  {copiedKey === `mcp-${mcpTarget}` ? (
                    <>
                      <Check size={12} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Config
                    </>
                  )}
                </button>
              </div>

              <pre className="mcp-code-block">
                <code>{getMCPClientConfig(mcpTarget)}</code>
              </pre>
            </div>

            {/* MCP Exposed Tools List */}
            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 16 }}>
              🛠️ Tools Provided by ClayPull MCP Server
            </h3>

            <div className="mcp-tools-grid">
              {CLAYPULL_MCP_TOOLS.map((tool) => (
                <div key={tool.name} className="mcp-tool-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="mcp-tool-name">{tool.name}</span>
                    <span className="file-badge verified">stdio tool</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-body)', marginBottom: 12 }}>
                    {tool.description}
                  </p>
                  <pre className="mcp-param-preview">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            Tab 5: Side-by-Side Model Comparison
            ════════════════════════════════ */}
        {activeTab === 'compare' && (
          <div className="dashboard-view">
            {!comparisonResult ? (
              <div className="empty-state-box">
                <Split size={40} />
                <h3>No Model Comparison Run</h3>
                <p>To compare models side-by-side (FR-21), switch to "Model Comparison" mode on the Landing Page or Settings, and analyze a repo.</p>
              </div>
            ) : (
              <div>
                <div className="comparison-summary-card">
                  <h3 className="title-md" style={{ marginBottom: 8 }}>⚖️ Model Benchmark Comparison</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-muted)' }}>
                    Comparative execution of {comparisonResult.modelA.config.model} vs {comparisonResult.modelB.config.model}.
                  </p>

                  <div className="comparison-stats-grid">
                    <div className="comparison-stat-tile">
                      <span className="title">Model A Latency</span>
                      <div className="values">{(comparisonResult.modelA.latencyMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className="comparison-stat-tile">
                      <span className="title">Model B Latency</span>
                      <div className="values">{(comparisonResult.modelB.latencyMs / 1000).toFixed(2)}s</div>
                    </div>
                    <div className="comparison-stat-tile">
                      <span className="title">Issues Matched</span>
                      <div className="values">
                        {comparisonResult.modelA.result.issues.length} vs {comparisonResult.modelB.result.issues.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="comparison-side-by-side">
                  <div>
                    <div className="comparison-col-header">
                      <span>Model A: {comparisonResult.modelA.config.model}</span>
                      <span>{(comparisonResult.modelA.latencyMs / 1000).toFixed(2)}s</span>
                    </div>
                    {comparisonResult.modelA.result.issues.map((i) => (
                      <div key={i.number} className="issue-card issue-card-indigo" style={{ marginBottom: 12 }}>
                        <h4>#{i.number} - {i.title}</h4>
                        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-muted)' }}>{i.plainExplanation}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="comparison-col-header">
                      <span>Model B: {comparisonResult.modelB.config.model}</span>
                      <span>{(comparisonResult.modelB.latencyMs / 1000).toFixed(2)}s</span>
                    </div>
                    {comparisonResult.modelB.result.issues.map((i) => (
                      <div key={i.number} className="issue-card issue-card-emerald" style={{ marginBottom: 12 }}>
                        <h4>#{i.number} - {i.title}</h4>
                        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-muted)' }}>{i.plainExplanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            Tab 6: Settings
            ════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="dashboard-view">
            <div className="config-panel" style={{ maxWidth: 800 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
                ⚙️ Model Provider & API Settings
              </h3>

              <div className="field" style={{ marginBottom: 16 }}>
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
                  >
                    <Server size={14} /> Local Ollama
                  </button>
                  <button
                    type="button"
                    className={provider === 'ollama-cloud' ? 'active' : ''}
                    onClick={() => {
                      setProvider('ollama-cloud');
                      setEndpoint('https://ollama.com');
                      setModel('qwen2.5-coder:7b');
                    }}
                  >
                    <Cloud size={14} /> Ollama Cloud
                  </button>
                  <button
                    type="button"
                    className={provider === 'custom-endpoint' ? 'active' : ''}
                    onClick={() => {
                      setProvider('custom-endpoint');
                      setEndpoint('https://api.groq.com/openai/v1');
                      setModel('llama-3.3-70b-versatile');
                    }}
                  >
                    <Sparkles size={14} /> Cloud API
                  </button>
                  <button
                    type="button"
                    className={provider === 'mock-demo' ? 'active' : ''}
                    onClick={() => {
                      setProvider('mock-demo');
                      setEndpoint('');
                      setModel('qwen2.5-coder-mock:7b');
                    }}
                  >
                    <Zap size={14} /> Demo Mode
                  </button>
                </div>
              </div>

              <div className="config-row">
                <div className="field">
                  <label>Endpoint URL</label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Model Name</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="config-row" style={{ marginTop: 12 }}>
                <div className="field field-full">
                  <label>Cloud API Key / Bearer Token</label>
                  <input
                    type="password"
                    placeholder="sk-... or gsk_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div className="config-row" style={{ marginTop: 12 }}>
                <div className="field field-full">
                  <label>GitHub Personal Access Token (Optional)</label>
                  <input
                    type="password"
                    placeholder="ghp_... (raises rate limit from 60 to 5000 requests/hr)"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
