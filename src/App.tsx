import { useState, useEffect, useCallback } from 'react';
import type {
  LLMConfig,
  ModelProvider,
  PipelineStage,
  SkillLevel,
  AnalysisResult,
  FetchedRepoData,
  ModelComparisonResult,
} from './types';
import { fetchRepoData } from './github';
import { listOllamaModels } from './llm';
import { runPipeline, runModelComparison } from './pipeline';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import './index.css';

interface Preset {
  label: string;
  provider: ModelProvider;
  endpoint: string;
  model: string;
  needsKey: boolean;
}

const PRESETS: Preset[] = [
  {
    label: 'Local Ollama (Gemma 4)',
    provider: 'ollama-local',
    endpoint: 'http://localhost:11434',
    model: 'gemma4:e4b',
    needsKey: false,
  },
  {
    label: 'Local Ollama (Qwen 2.5 Coder)',
    provider: 'ollama-local',
    endpoint: 'http://localhost:11434',
    model: 'qwen2.5-coder:7b',
    needsKey: false,
  },
  {
    label: 'Local Ollama (Llama 3.2)',
    provider: 'ollama-local',
    endpoint: 'http://localhost:11434',
    model: 'llama3.2:latest',
    needsKey: false,
  },
  {
    label: 'Groq Cloud (Llama 3.3 70B)',
    provider: 'custom-endpoint',
    endpoint: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    needsKey: true,
  },
  {
    label: 'OpenRouter (Qwen 2.5 Coder 32B)',
    provider: 'custom-endpoint',
    endpoint: 'https://openrouter.ai/api/v1',
    model: 'qwen/qwen-2.5-coder-32b-instruct',
    needsKey: true,
  },
  {
    label: 'OpenAI (GPT-4o mini)',
    provider: 'custom-endpoint',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
  },
  {
    label: 'Offline Demo (No Setup Needed)',
    provider: 'mock-demo',
    endpoint: '',
    model: 'gemma4-mock:e4b',
    needsKey: false,
  },
];

const SAMPLE_REPOS = [
  'facebook/react',
  'pallets/flask',
  'fastapi/fastapi',
  'astral-sh/uv',
  'tailwindlabs/tailwindcss',
];

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or restricted storage
  }
}

export default function App() {
  // ── Client-side Routing (/ or /dashboard) ──
  const [currentRoute, setCurrentRoute] = useState<'/' | '/dashboard'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/dashboard') || window.location.hash === '#dashboard') {
        return '/dashboard';
      }
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/dashboard') || window.location.hash === '#dashboard') {
        setCurrentRoute('/dashboard');
      } else {
        setCurrentRoute('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: '/' | '/dashboard') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', route);
    }
  };

  // ── Mode: Single Model vs Model Comparison ──
  const [appMode, setAppMode] = useState<'single' | 'compare'>('single');

  // ── Config State (Model A / Primary) ──
  const [repoUrl, setRepoUrl] = useState(() => getStored('claypull_repo', ''));
  const [level, setLevel] = useState<SkillLevel>(() => getStored('claypull_level', 'beginner'));
  const [provider, setProvider] = useState<ModelProvider>(() => getStored('claypull_provider', 'ollama-local'));
  const [endpoint, setEndpoint] = useState(() => getStored('claypull_endpoint', 'http://localhost:11434'));
  const [model, setModel] = useState(() => getStored('claypull_model', 'gemma4:e4b'));
  const [apiKey, setApiKey] = useState(() => getStored('claypull_apikey', ''));
  const [ghToken, setGhToken] = useState(() => getStored('claypull_ghtoken', ''));

  // Sync to localStorage
  useEffect(() => { setStored('claypull_repo', repoUrl); }, [repoUrl]);
  useEffect(() => { setStored('claypull_level', level); }, [level]);
  useEffect(() => { setStored('claypull_provider', provider); }, [provider]);
  useEffect(() => { setStored('claypull_endpoint', endpoint); }, [endpoint]);
  useEffect(() => { setStored('claypull_model', model); }, [model]);
  useEffect(() => { setStored('claypull_apikey', apiKey); }, [apiKey]);
  useEffect(() => { setStored('claypull_ghtoken', ghToken); }, [ghToken]);

  // ── Config State (Model B for Comparison) ──
  const [providerB, setProviderB] = useState<ModelProvider>('ollama-local');
  const [endpointB, setEndpointB] = useState('http://localhost:11434');
  const [modelB, setModelB] = useState('llama3.2:latest');
  const [apiKeyB, setApiKeyB] = useState('');

  // ── Runtime State ──
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(() => getStored('claypull_result', null));
  const [comparisonResult, setComparisonResult] = useState<ModelComparisonResult | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Sync analysis result
  useEffect(() => {
    if (result) {
      setStored('claypull_result', result);
    }
  }, [result]);

  // ── Interactive Checklist State ──
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>(() =>
    getStored('claypull_checked_steps', {}),
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setStored('claypull_checked_steps', checkedSteps);
  }, [checkedSteps]);

  const toggleStep = (issueNum: number, stepIdx: number) => {
    const key = `${issueNum}-${stepIdx}`;
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const applyPreset = (preset: Preset) => {
    setProvider(preset.provider);
    setEndpoint(preset.endpoint);
    setModel(preset.model);
  };

  const refreshModels = useCallback(async () => {
    setLoadingModels(true);
    const models = await listOllamaModels(endpoint);
    setOllamaModels(models);
    if (models.length > 0) {
      if (models.includes('gemma4:e4b')) {
        setModel('gemma4:e4b');
      } else {
        const anyGemma = models.find((m) => m.toLowerCase().includes('gemma'));
        if (anyGemma) {
          setModel(anyGemma);
        } else if (!models.includes(model)) {
          setModel(models[0]);
        }
      }
    }
    setLoadingModels(false);
  }, [endpoint, model]);

  useEffect(() => {
    if (provider === 'ollama-local') {
      refreshModels();
    }
  }, [provider, refreshModels]);

  const handleAnalyze = useCallback(async () => {
    if (!repoUrl.trim()) return;

    setError(null);
    setResult(null);
    setComparisonResult(null);
    setStage('fetching');
    setMessage('Connecting to GitHub…');

    try {
      const repoData: FetchedRepoData = await fetchRepoData(
        repoUrl,
        ghToken || undefined,
        (msg) => setMessage(msg),
      );

      if (repoData.issues.length === 0) {
        setStage('done');
        setResult({
          repo: {
            purpose: repoData.meta.description,
            stack: [repoData.meta.language],
            setupSteps: [],
            contributionRules: [],
          },
          issues: [],
          latencyMs: 0,
          modelUsed: model,
        });
        setMessage('Complete — but no beginner-labeled issues were found in this repo.');
        return;
      }

      const configA: LLMConfig = { provider, model, endpoint, apiKey: apiKey || undefined };

      if (appMode === 'single') {
        const analysisResult = await runPipeline(
          repoData,
          level,
          configA,
          (s, msg) => {
            setStage(s as PipelineStage);
            setMessage(msg);
          },
        );

        setResult(analysisResult);
        setStage('done');
        setMessage(`Analysis complete in ${((analysisResult.latencyMs || 0) / 1000).toFixed(2)}s!`);
      } else {
        const configB: LLMConfig = {
          provider: providerB,
          model: modelB,
          endpoint: endpointB,
          apiKey: apiKeyB || undefined,
        };

        const comparison = await runModelComparison(
          repoData,
          level,
          configA,
          configB,
          (m, s, msg) => {
            setStage(s as PipelineStage);
            setMessage(`[Model ${m}] ${msg}`);
          },
        );

        setComparisonResult(comparison);
        setStage('done');
        setMessage('Model comparison completed successfully!');
      }
    } catch (err) {
      setStage('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  }, [repoUrl, level, provider, model, endpoint, apiKey, ghToken, appMode, providerB, modelB, endpointB, apiKeyB]);

  if (currentRoute === '/dashboard') {
    return (
      <Dashboard
        repoUrl={repoUrl}
        setRepoUrl={setRepoUrl}
        level={level}
        setLevel={setLevel}
        provider={provider}
        setProvider={setProvider}
        endpoint={endpoint}
        setEndpoint={setEndpoint}
        model={model}
        setModel={setModel}
        apiKey={apiKey}
        setApiKey={setApiKey}
        ghToken={ghToken}
        setGhToken={setGhToken}
        stage={stage}
        message={message}
        error={error}
        result={result}
        comparisonResult={comparisonResult}
        handleAnalyze={handleAnalyze}
        checkedSteps={checkedSteps}
        toggleStep={toggleStep}
        copiedKey={copiedKey}
        copyToClipboard={copyToClipboard}
        presets={PRESETS}
        sampleRepos={SAMPLE_REPOS}
        navigateToLanding={() => navigateTo('/')}
      />
    );
  }

  return (
    <LandingPage
      repoUrl={repoUrl}
      setRepoUrl={setRepoUrl}
      level={level}
      setLevel={setLevel}
      provider={provider}
      setProvider={setProvider}
      endpoint={endpoint}
      setEndpoint={setEndpoint}
      model={model}
      setModel={setModel}
      apiKey={apiKey}
      setApiKey={setApiKey}
      ghToken={ghToken}
      setGhToken={setGhToken}
      appMode={appMode}
      setAppMode={setAppMode}
      providerB={providerB}
      setProviderB={setProviderB}
      endpointB={endpointB}
      setEndpointB={setEndpointB}
      modelB={modelB}
      setModelB={setModelB}
      apiKeyB={apiKeyB}
      setApiKeyB={setApiKeyB}
      stage={stage}
      message={message}
      error={error}
      result={result}
      comparisonResult={comparisonResult}
      ollamaModels={ollamaModels}
      loadingModels={loadingModels}
      refreshModels={refreshModels}
      handleAnalyze={handleAnalyze}
      checkedSteps={checkedSteps}
      toggleStep={toggleStep}
      copiedKey={copiedKey}
      copyToClipboard={copyToClipboard}
      applyPreset={applyPreset}
      presets={PRESETS}
      sampleRepos={SAMPLE_REPOS}
      navigateToDashboard={() => navigateTo('/dashboard')}
    />
  );
}
