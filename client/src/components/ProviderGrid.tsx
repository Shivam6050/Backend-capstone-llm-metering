import React from 'react';
import { ProviderCard } from './ProviderCard';
import { MultiProviderSummary } from '../types';
import { Layers, DollarSign, Sparkles } from 'lucide-react';

interface ProviderGridProps {
  summary: MultiProviderSummary | null;
  loading: boolean;
}

export const ProviderGrid: React.FC<ProviderGridProps> = ({ summary, loading }) => {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-slate-800 h-48 rounded-xl border border-slate-700"></div>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/80 p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-700 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Multi-Provider Subscriptions & Tokens</h2>
            <p className="text-xs text-slate-400">
              Live token allowances & remaining balances across ChatGPT, Claude, Groq, DeepSeek, and Gemini
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 font-medium block">Aggregated AI Spend</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              {summary.totalMonthlySpendUsd}
            </span>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 font-medium block">Total Tokens Metered</span>
            <span className="text-base font-bold text-slate-100 font-mono">
              {summary.totalTokensUsedAcrossProviders.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Provider Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {summary.providers.map((provider) => (
          <ProviderCard key={provider.providerId} provider={provider} />
        ))}
      </div>
    </div>
  );
};
