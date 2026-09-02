import React, { useState } from 'react';
import { Key, ExternalLink, Shield, Lock, FileText, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogos';

interface ApiKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider?: (providerId: string) => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

interface ProviderGuide {
  id: string;
  name: string;
  consoleUrl: string;
  keyPrefix: string;
  features: string[];
  steps: string[];
  tips: string;
}

const PROVIDER_GUIDES: ProviderGuide[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    consoleUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk- or sk-proj-',
    features: ['Live API Connection Verification', 'ChatGPT & Model Usage Tracking', 'Custom Spending Alerts'],
    steps: [
      'Navigate to OpenAI Platform Console at platform.openai.com/api-keys.',
      'Sign in or register your OpenAI developer account.',
      'Click the "+ Create new secret key" button in the API keys tab.',
      'Assign a descriptive name (e.g., "FlyRank Gateway") and copy the secret key starting with sk-.',
      'Paste the key in LLM Meter to enable live real-time model quota telemetry.',
    ],
    tips: 'Set hard spending limits in OpenAI Billing > Usage Limits to prevent unexpected overages.',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
    features: ['Claude 3.5 Sonnet & Opus Telemetry', 'Workspace Key Management', 'Quota Exhaustion Prediction'],
    steps: [
      'Go to the Anthropic Console at console.anthropic.com/settings/keys.',
      'Log in with your Anthropic developer account.',
      'Select your target Workspace and click "Create Key".',
      'Give your key a name and copy the secret string starting with sk-ant-.',
      'Paste it into LLM Meter for encrypted telemetry and cost analysis.',
    ],
    tips: 'Anthropic recommends creating dedicated API keys per environment (Development vs Production).',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    consoleUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    features: ['High-Speed LPU Quota Telemetry', 'Real-Time Rate-Limit Token Sync', 'Free Tier Capacity Monitoring'],
    steps: [
      'Visit Groq Cloud Console at console.groq.com/keys.',
      'Sign in with your Google or GitHub account.',
      'Click "Create API Key" and specify a key label.',
      'Copy your Groq API key starting with gsk_.',
      'Paste into LLM Meter to track live remaining token capacity per minute.',
    ],
    tips: 'Groq provides generous free tier rate limits. FlyRank auto-syncs remaining token quotas in real time.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    features: ['Real-Time Live Balance Sync ($USD)', 'V3 & R1 Reasoning Token Tracking', 'Automatic Balance Sync'],
    steps: [
      'Access DeepSeek Platform at platform.deepseek.com/api_keys.',
      'Log in to your DeepSeek account.',
      'Click "Create API key" and copy the secret token.',
      'Paste into LLM Meter to activate live balance monitoring.',
    ],
    tips: 'FlyRank queries DeepSeek User Balance API to display your exact remaining USD account credit.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIzaSy',
    features: ['Google AI Studio Quota Sync', 'Gemini 1.5 Pro & Flash Telemetry', 'Project Quota Verification'],
    steps: [
      'Open Google AI Studio at aistudio.google.com/app/apikey.',
      'Sign in with your Google Account.',
      'Click "Create API key" and select an existing GCP project or create a new one.',
      'Copy the API key starting with AIzaSy.',
      'Paste into LLM Meter to synchronize model availability.',
    ],
    tips: 'Free tier keys in Google AI Studio have per-minute quotas. FlyRank helps you avoid rate-limit errors.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    consoleUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-',
    features: ['Multi-LLM Aggregator Balance Sync', 'Credit Limit Tracking', 'Unified Model Usage Telemetry'],
    steps: [
      'Go to OpenRouter Key Management at openrouter.ai/keys.',
      'Sign in and click "Create Key".',
      'Set an optional credit limit for the key.',
      'Copy the key starting with sk-or-.',
      'Paste into LLM Meter for unified multi-provider balance sync.',
    ],
    tips: 'OpenRouter allows setting per-key credit limits to strictly cap your maximum potential spend.',
  },
];

export const ApiKeyGuideModal: React.FC<ApiKeyGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectProvider,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [activeProviderId, setActiveProviderId] = useState('openai');

  if (!isOpen) return null;

  const currentGuide = PROVIDER_GUIDES.find((g) => g.id === activeProviderId) || PROVIDER_GUIDES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel border-glow-top rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-800 relative overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 flex-shrink-0 bg-zinc-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shadow-sm">
              <Key className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                LLM API Key Access Guide & Security Policy
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Step-by-step instructions to get keys + AES-256-GCM security terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1 text-xs text-zinc-300 font-mono leading-relaxed">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">
              Select LLM Provider:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PROVIDER_GUIDES.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setActiveProviderId(guide.id)}
                  className={`p-2 rounded border flex flex-col items-center justify-center space-y-1 transition-all text-xs font-mono font-semibold ${
                    activeProviderId === guide.id
                      ? 'bg-white text-black border-white shadow-md scale-105'
                      : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <BrandLogo providerId={guide.id} className="w-4 h-4 text-current" />
                  <span className="text-[10px] truncate w-full text-center">{guide.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Provider Step-by-Step Card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <BrandLogo providerId={currentGuide.id} className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{currentGuide.name} API Key Setup</h3>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Expected Prefix: <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 border border-zinc-800">{currentGuide.keyPrefix}</code>
                  </span>
                </div>
              </div>

              <a
                href={currentGuide.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded text-xs font-mono font-bold transition-all active:scale-95 shadow-sm"
              >
                <span>Open {currentGuide.name} Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Features Supported */}
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Supported Real-Time Features:
              </span>
              <div className="flex flex-wrap gap-2">
                {currentGuide.features.map((feat, i) => (
                  <span key={i} className="inline-flex items-center space-x-1 bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Step-by-Step List */}
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Step-by-Step Access Instructions:
              </span>
              <ol className="space-y-2 font-mono text-xs">
                {currentGuide.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-300 leading-normal">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Pro Tip Alert */}
            <div className="bg-amber-950/20 border border-amber-800/40 rounded p-3 text-amber-300 text-xs flex items-start space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Security & Budget Tip:</strong> {currentGuide.tips}
              </div>
            </div>

            {/* Connect Shortcut */}
            {onSelectProvider && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectProvider(currentGuide.id);
                    onClose();
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold py-2.5 px-4 rounded shadow-sm transition-all duration-200 uppercase tracking-wider flex items-center justify-center space-x-2"
                >
                  <span>Connect {currentGuide.name} Now →</span>
                </button>
              </div>
            )}
          </div>

          {/* Security & Terms Policy Awareness Banner */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Security & Compliance Policy Awareness</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded space-y-1">
                <div className="flex items-center space-x-1.5 text-zinc-200 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AES-256-GCM Encryption</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  All provider API keys are encrypted at rest using AES-256-GCM hardware encryption with random Initialization Vectors (IV). Plain-text keys are never stored or printed in log files.
                </p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded space-y-1">
                <div className="flex items-center space-x-1.5 text-zinc-200 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zero Third-Party Sharing</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Your keys are exclusively used to query official upstream provider APIs for live balance & quota telemetry. LLM Meter never sells or shares your keys with third parties.
                </p>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800">
              <span>By connecting API keys, you agree to adhere to provider terms of service.</span>
              <div className="flex items-center space-x-3 text-white font-semibold">
                {onOpenTerms && (
                  <button type="button" onClick={onOpenTerms} className="hover:underline flex items-center space-x-1">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    <span>Terms of Service</span>
                  </button>
                )}
                {onOpenPrivacy && (
                  <button type="button" onClick={onOpenPrivacy} className="hover:underline flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-zinc-400" />
                    <span>Privacy Policy</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-3.5 flex-shrink-0 bg-zinc-950/80">
          <button
            onClick={onClose}
            className="w-full bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold py-2.5 px-4 rounded shadow-sm transition-colors uppercase tracking-wider"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
