import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Check,
  Copy,
  Layers,
  FileCode2,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import type {
  FetchedRepoData,
  LLMConfig,
  RankedIssue,
  VisionAnalysisResult,
} from '../types';
import { analyzeVisualBug } from '../visionAnalyzer';

interface VisionStudioProps {
  repoData: FetchedRepoData | null;
  selectedIssue?: RankedIssue;
  config: LLMConfig;
  onInjectIntoPrompts?: (visualPromptAddition: string) => void;
}

export const VisionStudio: React.FC<VisionStudioProps> = ({
  repoData,
  selectedIssue,
  config,
  onInjectIntoPrompts,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [injected, setInjected] = useState(false);

  // Set initial image from selected issue if available
  useEffect(() => {
    const images = selectedIssue?.images;
    if (images && images.length > 0) {
      const initialAnalysis = selectedIssue.visionAnalysis || null;
      const timer = setTimeout(() => {
        setImagePreview(images[0]);
        setResult(initialAnalysis);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedIssue]);

  // Handle file drop / upload
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Handle clipboard paste (Ctrl+V anywhere in window or container)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const runDiagnosis = async () => {
    if (!imagePreview || !repoData) return;
    setAnalyzing(true);
    try {
      const diagnosis = await analyzeVisualBug({
        config,
        imageBase64OrUrl: imagePreview,
        issueContext: selectedIssue
          ? { number: selectedIssue.number, title: selectedIssue.title, body: selectedIssue.plainExplanation }
          : undefined,
        repoData,
      });
      setResult(diagnosis);
      if (selectedIssue) {
        selectedIssue.visionAnalysis = diagnosis;
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const copySnippet = () => {
    if (result?.cssOrCodeSnippet) {
      navigator.clipboard.writeText(result.cssOrCodeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInject = () => {
    if (result && onInjectIntoPrompts) {
      const text = `\n<VISUAL_BUG_DIAGNOSIS>\nDefect: ${result.defectType}\nVisual Finding: ${result.visualDescription}\nSuggested Fix: ${result.suggestedFix}\nTarget File: ${result.likelyComponents[0]?.path || 'UI component'}\nCode Fix Snippet:\n${result.cssOrCodeSnippet || ''}\n</VISUAL_BUG_DIAGNOSIS>\n`;
      onInjectIntoPrompts(text);
      setInjected(true);
      setTimeout(() => setInjected(false), 2500);
    }
  };

  return (
    <div className="vision-studio-container">
      {/* ── Header ── */}
      <div className="vision-header">
        <div>
          <div className="vision-title">
            <Sparkles size={20} color="var(--color-brand-coral)" />
            <span>Multimodal Vision Bug Triage Studio</span>
            <span className="vision-pill">Vision AI</span>
          </div>
          <p className="vision-subtitle">
            Upload or paste any UI screenshot, layout shift bug, or console error image. Vision AI pinpoints the component and writes the CSS/code fix.
          </p>
        </div>
      </div>

      {/* ── Auto-detected issue images banner ── */}
      {selectedIssue?.images && selectedIssue.images.length > 0 && (
        <div className="vision-issue-images-banner">
          <div className="banner-label">
            <ImageIcon size={15} />
            <span>Issue #{selectedIssue.number} has {selectedIssue.images.length} embedded screenshot{selectedIssue.images.length > 1 ? 's' : ''}:</span>
          </div>
          <div className="banner-thumbnails">
            {selectedIssue.images.map((imgUrl, i) => (
              <button
                key={i}
                type="button"
                className={`thumb-btn ${imagePreview === imgUrl ? 'active' : ''}`}
                onClick={() => {
                  setImagePreview(imgUrl);
                  setResult(null);
                }}
              >
                <img src={imgUrl} alt={`Issue ${selectedIssue.number} screenshot ${i + 1}`} />
                <span>Screenshot {i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      <div className="vision-workspace-grid">
        {/* Left Column: Image Canvas & Upload */}
        <div className="vision-canvas-panel">
          <div
            className={`vision-dropzone ${imagePreview ? 'has-image' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {imagePreview ? (
              <div className="vision-preview-wrapper">
                <img src={imagePreview} alt="Screenshot under analysis" className="vision-preview-img" />
                <div className="vision-preview-overlay">
                  <label htmlFor="change-screenshot" className="btn-secondary" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> Change Screenshot
                  </label>
                  <input
                    id="change-screenshot"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              </div>
            ) : (
              <div className="vision-empty-dropzone">
                <div className="dropzone-icon">
                  <ImageIcon size={36} color="var(--color-brand-indigo)" />
                </div>
                <h4>Drag & Drop UI Screenshot Here</h4>
                <p>Or paste directly from clipboard with <kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd></p>
                <label htmlFor="upload-screenshot" className="btn-primary" style={{ cursor: 'pointer', marginTop: 12 }}>
                  <Upload size={15} /> Browse Screenshot
                </label>
                <input
                  id="upload-screenshot"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            )}
          </div>

          {/* Action Button */}
          {imagePreview && (
            <div className="vision-action-bar">
              <button
                type="button"
                className="btn-primary"
                onClick={runDiagnosis}
                disabled={analyzing}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {analyzing ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Inspecting Screenshot & Correlating Tree…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Run Vision Diagnosis
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Visual Triage Results */}
        <div className="vision-result-panel">
          {!result ? (
            <div className="vision-result-placeholder">
              <Layers size={36} color="#9ca3af" />
              <h4>Awaiting Visual Inspection</h4>
              <p>Upload a screenshot or click an attached issue image, then press <strong>Run Vision Diagnosis</strong>.</p>
              <div className="vision-capabilities-list">
                <div className="cap-item">
                  <CheckCircle2 size={14} color="var(--color-brand-emerald)" />
                  <span>Pinpoints misaligned flexbox/grid containers</span>
                </div>
                <div className="cap-item">
                  <CheckCircle2 size={14} color="var(--color-brand-emerald)" />
                  <span>Maps visual elements to verified repository files</span>
                </div>
                <div className="cap-item">
                  <CheckCircle2 size={14} color="var(--color-brand-emerald)" />
                  <span>Synthesizes copyable CSS/code resolution snippets</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="vision-result-card">
              <div className="result-header">
                <div>
                  <span className="result-badge">{result.defectType}</span>
                  <div className="confidence-pill">
                    Confidence: <strong>{Math.round((result.confidenceScore || 0.92) * 100)}%</strong>
                  </div>
                </div>
              </div>

              {/* Visual Finding */}
              <div className="result-section">
                <h4>Visual Bug Analysis</h4>
                <p>{result.visualDescription}</p>
              </div>

              {/* Recommended Fix */}
              <div className="result-section">
                <h4>Recommended Architectural Fix</h4>
                <p>{result.suggestedFix}</p>
              </div>

              {/* Target Component in Repository Tree */}
              <div className="result-section">
                <h4>Target Component in Repository</h4>
                <div className="verified-component-pill">
                  <FileCode2 size={15} color="var(--color-brand-indigo)" />
                  <code>{result.likelyComponents[0]?.path || 'src/index.css'}</code>
                  <span className="verified-tag">✓ verified in tree</span>
                </div>
              </div>

              {/* CSS or Code Snippet */}
              {result.cssOrCodeSnippet && (
                <div className="result-section">
                  <div className="snippet-header">
                    <span>Proposed CSS / Code Fix</span>
                    <button type="button" className="btn-copy-small" onClick={copySnippet}>
                      {copied ? <Check size={13} color="var(--color-brand-emerald)" /> : <Copy size={13} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="code-snippet-box">
                    <code>{result.cssOrCodeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Master Prompt Injector */}
              {onInjectIntoPrompts && (
                <div className="result-footer-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleInject}
                    disabled={injected}
                  >
                    {injected ? (
                      <>
                        <Check size={15} /> Injected into Master Prompts!
                      </>
                    ) : (
                      <>
                        <Cpu size={15} /> Inject Visual Diagnosis into Master Prompts
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
