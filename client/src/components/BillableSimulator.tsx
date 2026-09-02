import React, { useState } from 'react';
import { Send, RefreshCw, CheckCircle2, AlertOctagon, CreditCard, Cpu, ShieldCheck, Terminal } from 'lucide-react';
import { BrandLogo } from './BrandLogos';

interface BillableSimulatorProps {
  onExecuteAction: (params: {
    provider: string;
    prompt: string;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
  }) => Promise<any>;
  loading: boolean;
  lastResponse: {
    status: number;
    body: any;
  } | null;
}

export const BillableSimulator: React.FC<BillableSimulatorProps> = ({
  onExecuteAction,
  loading,
  lastResponse,
}) => {
  const [provider, setProvider] = useState('openai');
  const [prompt, setPrompt] = useState('Analyze financial log patterns and highlight strategic optimization opportunities.');
  const [inputTokens, setInputTokens] = useState(1000);
  const [cachedInputTokens, setCachedInputTokens] = useState(500);
  const [outputTokens, setOutputTokens] = useState(200);
  const [reasoningTokens, setReasoningTokens] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecuteAction({
      provider,
      prompt,
      inputTokens: Number(inputTokens),
      cachedInputTokens: Number(cachedInputTokens),
      outputTokens: Number(outputTokens),
      reasoningTokens: Number(reasoningTokens),
    });
  };

  return (
    <div className="glass-panel rounded-xl p-6 space-y-5 card-3d-hover border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <Terminal className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Proxy Gateway Studio
          </h3>
        </div>
        <span className="text-[11px] font-mono font-semibold text-zinc-300 bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-700">
          Method 2 · Live Metering
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selector */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-2 flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>Target AI Provider / Model:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'openai', label: 'OpenAI' },
              { id: 'claude', label: 'Claude' },
              { id: 'groq', label: 'Groq' },
              { id: 'deepseek', label: 'DeepSeek' },
              { id: 'gemini', label: 'Gemini' },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded border font-mono text-xs font-semibold transition-all duration-200 ${
                  provider === p.id
                    ? 'bg-white text-black border-white shadow-sm scale-[1.02]'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <BrandLogo providerId={p.id} className="w-3.5 h-3.5 text-current" />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">
            Prompt Payload
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded p-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-all resize-none font-mono"
            placeholder="Type prompt payload..."
            required
          />
        </div>

        {/* Token Counts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-zinc-400">
              Fresh Input
            </label>
            <input
              type="number"
              min="0"
              value={inputTokens}
              onChange={(e) => setInputTokens(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-zinc-300">
              Cached (50% Off)
            </label>
            <input
              type="number"
              min="0"
              value={cachedInputTokens}
              onChange={(e) => setCachedInputTokens(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-zinc-400">
              Output
            </label>
            <input
              type="number"
              min="0"
              value={outputTokens}
              onChange={(e) => setOutputTokens(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-semibold text-zinc-300">
              Reasoning
            </label>
            <input
              type="number"
              min="0"
              value={reasoningTokens}
              onChange={(e) => setReasoningTokens(Number(e.target.value))}
              className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-mono text-xs font-semibold py-3 px-4 rounded shadow-sm transition-all duration-200 active:scale-95 uppercase tracking-wider"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Execute Gateway Request ({provider.toUpperCase()})</span>
            </>
          )}
        </button>
      </form>

      {/* Output Response */}
      {lastResponse && (
        <div className="mt-4 pt-4 border-t border-outline-variant space-y-3">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-semibold text-on-surface-variant">Gateway Response</span>
            {lastResponse.status === 200 && (
              <span className="flex items-center space-x-1 text-xs font-bold text-secondary-fixed bg-secondary-fixed/10 px-2.5 py-0.5 rounded border border-secondary-fixed/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>200 OK — Metered</span>
              </span>
            )}
            {lastResponse.status === 429 && (
              <span className="flex items-center space-x-1 text-xs font-bold text-tertiary-fixed-dim bg-tertiary-fixed-dim/10 px-2.5 py-0.5 rounded border border-tertiary-fixed-dim/30">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>429 Quota Exceeded</span>
              </span>
            )}
            {lastResponse.status === 402 && (
              <span className="flex items-center space-x-1 text-xs font-bold text-error bg-error/10 px-2.5 py-0.5 rounded border border-error/30">
                <CreditCard className="w-3.5 h-3.5" />
                <span>402 Payment Required</span>
              </span>
            )}
          </div>

          {lastResponse.status === 200 && lastResponse.body?.data && (
            <div className="bg-surface-container-lowest rounded p-4 border border-outline-variant space-y-3 text-xs">
              <p className="text-on-surface leading-relaxed font-mono">
                {lastResponse.body.data.result?.generatedText}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-outline-variant text-[11px] text-outline font-mono">
                <span>Provider: <strong className="text-primary-container uppercase">{lastResponse.body.data.provider}</strong></span>
                <span>Tokens Metered: <strong className="text-on-surface">{lastResponse.body.data.metrics?.totalTokens}</strong></span>
                <span>Cost: <strong className="text-secondary-fixed">{lastResponse.body.data.cost?.usd}</strong></span>
              </div>
            </div>
          )}

          {lastResponse.status !== 200 && (
            <div className="bg-surface-container-lowest rounded p-4 border border-outline-variant text-xs text-on-surface-variant font-mono">
              <p className="font-semibold text-error mb-1">{lastResponse.body?.error || 'Action Refused'}</p>
              <p className="text-on-surface-variant">{lastResponse.body?.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
