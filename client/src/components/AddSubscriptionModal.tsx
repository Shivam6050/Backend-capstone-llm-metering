import React, { useState } from 'react';
import { PlusCircle, X, DollarSign, Layers, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogos';

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

const PRESET_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', defaultPlan: 'ChatGPT Plus', defaultCost: 20, defaultTokens: 2000000 },
  { id: 'claude', name: 'Anthropic', defaultPlan: 'Claude Pro', defaultCost: 20, defaultTokens: 1500000 },
  { id: 'groq', name: 'Groq Cloud', defaultPlan: 'Pay-as-you-go', defaultCost: 0, defaultTokens: 5000000 },
  { id: 'deepseek', name: 'DeepSeek AI', defaultPlan: 'Developer API', defaultCost: 0, defaultTokens: 10000000 },
  { id: 'gemini', name: 'Google Gemini', defaultPlan: 'Gemini Advanced', defaultCost: 20, defaultTokens: 4000000 },
  { id: 'custom', name: 'Custom AI Provider', defaultPlan: 'Pro Tier', defaultCost: 15, defaultTokens: 1000000 },
];

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onAdded,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PROVIDERS[0]);
  const [customName, setCustomName] = useState('');
  const [planName, setPlanName] = useState(PRESET_PROVIDERS[0].defaultPlan);
  const [monthlyCostUsd, setMonthlyCostUsd] = useState(PRESET_PROVIDERS[0].defaultCost);
  const [monthlyTokenAllowance, setMonthlyTokenAllowance] = useState(PRESET_PROVIDERS[0].defaultTokens);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_PROVIDERS[0]) => {
    setSelectedPreset(preset);
    setPlanName(preset.defaultPlan);
    setMonthlyCostUsd(preset.defaultCost);
    setMonthlyTokenAllowance(preset.defaultTokens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const providerName = selectedPreset.id === 'custom' ? (customName || 'Custom Provider') : selectedPreset.name;

    try {
      const res = await fetch('/api/v1/user/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedPreset.id,
          providerName,
          planName,
          monthlyCostUsd: Number(monthlyCostUsd),
          monthlyTokenAllowance: Number(monthlyTokenAllowance),
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onAdded();
        onClose();
      } else {
        setErrorMsg(data.message || 'Failed to add subscription');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel border-glow-top rounded-2xl max-w-lg w-full p-7 shadow-2xl space-y-6 relative overflow-hidden border border-zinc-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white shadow-sm">
            <PlusCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Connect AI Provider
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto font-mono">
            Track token quotas and billable metrics for this LLM
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/30 border border-red-800/50 rounded p-3 text-xs text-red-300 font-mono font-medium">
            {errorMsg}
          </div>
        )}

        {/* Provider Selector Grid */}
        <div>
          <label className="block text-xs font-mono font-semibold text-zinc-300 mb-2">
            Select Provider:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_PROVIDERS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded border flex flex-col items-center justify-center space-y-1.5 transition-all text-xs font-mono font-semibold ${
                  selectedPreset.id === preset.id
                    ? 'bg-white text-black border-white shadow-sm scale-[1.02]'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                <BrandLogo providerId={preset.id} className="w-5 h-5 text-current" />
                <span className="text-[11px] truncate w-full text-center">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedPreset.id === 'custom' && (
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1">
                Custom Provider Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                placeholder="e.g., Mistral AI / Cohere"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1">
              Plan / Tier Name
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
              placeholder="e.g., Pay-as-you-go"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1">
                Monthly Spend ($ USD)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyCostUsd}
                onChange={(e) => setMonthlyCostUsd(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1">
                Monthly Token Allowance
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={monthlyTokenAllowance}
                onChange={(e) => setMonthlyTokenAllowance(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>
          </div>

          {/* Optional API Key for Live Real-Time Sync */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-mono font-semibold text-zinc-300">
                Provider API Key <span className="text-zinc-500 font-normal">(Optional · for Real-Time Sync)</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">🔒 AES-256-GCM Encrypted</span>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              placeholder="sk-... or API key for live quota/balance sync"
            />
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              Enables live balance fetching and quota telemetry from official upstream APIs (DeepSeek, Groq, OpenRouter, OpenAI, Gemini).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-mono text-xs font-semibold py-3 px-4 rounded shadow-sm transition-all duration-200 active:scale-95 uppercase tracking-wider"
          >
            {loading ? (
              <span>Connecting Provider...</span>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Save & Start Tracking</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
