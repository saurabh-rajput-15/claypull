import React from 'react';
import {
  GitFork,
  GitBranch,
  FileCode2,
  CheckCircle2,
  Terminal,
  Send,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { FileToTouch } from '../types';

interface VisualFlowchartProps {
  repoName: string;
  issueNumber: number;
  blastRadius?: 'Low / Isolated' | 'Moderate' | 'Core Architecture';
  verifiedFiles: FileToTouch[];
  testFramework?: string;
}

export const VisualFlowchart: React.FC<VisualFlowchartProps> = ({
  repoName,
  issueNumber,
  blastRadius = 'Low / Isolated',
  verifiedFiles,
  testFramework = 'Test Suite',
}) => {
  const cleanRepo = repoName.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const repoSlug = cleanRepo.split('/')[1] || cleanRepo;
  const primaryTarget = verifiedFiles[0]?.path || 'src/target.ts';

  const isLow = blastRadius === 'Low / Isolated';
  const radiusColor = isLow ? 'var(--color-brand-emerald)' : 'var(--color-brand-ochre)';

  return (
    <div className="visual-flowchart-container">
      <div className="flowchart-header">
        <div className="flowchart-title">
          <GitBranch size={15} color="var(--color-brand-indigo)" />
          <span>Interactive Fork-to-PR Architectural Roadmap</span>
        </div>
        <div
          className="flowchart-radius-badge"
          style={{
            borderColor: radiusColor,
            color: isLow ? '#065f46' : '#92400e',
            backgroundColor: isLow ? '#ecfdf5' : '#fef3c7',
          }}
        >
          {isLow ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
          <span>Blast Radius: {blastRadius}</span>
        </div>
      </div>

      {/* ── Visual Node Sequence ── */}
      <div className="flowchart-nodes-wrapper">
        {/* Node 1: Fork */}
        <div className="flow-node">
          <div className="flow-node-icon" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>
            <GitFork size={16} />
          </div>
          <div className="flow-node-content">
            <span className="flow-node-step">Step 1</span>
            <div className="flow-node-label">Fork & Clone</div>
            <code className="flow-node-code">git clone .../{repoSlug}</code>
          </div>
        </div>

        {/* Connector 1 */}
        <div className="flow-connector">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M0 10H22M22 10L14 4M22 10L14 16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Node 2: Branch */}
        <div className="flow-node">
          <div className="flow-node-icon" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
            <GitBranch size={16} />
          </div>
          <div className="flow-node-content">
            <span className="flow-node-step">Step 2</span>
            <div className="flow-node-label">Feature Branch</div>
            <code className="flow-node-code">fix/issue-{issueNumber}</code>
          </div>
        </div>

        {/* Connector 2 */}
        <div className="flow-connector">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M0 10H22M22 10L14 4M22 10L14 16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Node 3: Target File (Surgical Edit) */}
        <div className="flow-node highlight">
          <div className="flow-node-icon" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
            <FileCode2 size={16} />
          </div>
          <div className="flow-node-content">
            <span className="flow-node-step">Step 3 · Surgical Target</span>
            <div className="flow-node-label" title={primaryTarget}>
              {primaryTarget.split('/').pop()}
              <span className="verified-pill">✓ tree</span>
            </div>
            <code className="flow-node-code" title={primaryTarget}>{primaryTarget}</code>
          </div>
        </div>

        {/* Connector 3 */}
        <div className="flow-connector">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M0 10H22M22 10L14 4M22 10L14 16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Node 4: Test Suite */}
        <div className="flow-node">
          <div className="flow-node-icon" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
            <Terminal size={16} />
          </div>
          <div className="flow-node-content">
            <span className="flow-node-step">Step 4</span>
            <div className="flow-node-label">Test Verification</div>
            <code className="flow-node-code">{testFramework}</code>
          </div>
        </div>

        {/* Connector 4 */}
        <div className="flow-connector">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M0 10H22M22 10L14 4M22 10L14 16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Node 5: Pull Request */}
        <div className="flow-node">
          <div className="flow-node-icon" style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}>
            <Send size={16} />
          </div>
          <div className="flow-node-content">
            <span className="flow-node-step">Step 5</span>
            <div className="flow-node-label">Pull Request</div>
            <code className="flow-node-code">resolves #{issueNumber}</code>
          </div>
        </div>
      </div>

      {/* ── Blast Radius Hierarchy Map ── */}
      <div className="blast-radius-map">
        <div className="map-badge">
          <CheckCircle2 size={13} color="var(--color-brand-emerald)" />
          <span>Blast Radius Boundary: Changes contained strictly within <strong>{verifiedFiles.length} verified file{verifiedFiles.length === 1 ? '' : 's'}</strong></span>
        </div>
        <div className="map-files-chips">
          {verifiedFiles.map((f, i) => (
            <span key={i} className="map-file-chip">
              <code>{f.path}</code>
              <span className="chip-verified">✓ verified</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
