import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, AlertOctagon, Cpu } from 'lucide-react';
import { ProviderUsageDetail } from '../types';

interface ProviderCardProps {
  provider: ProviderUsageDetail;
}

const PROVIDER_THEMES: Record<string, { iconColor: string; badgeBg: string; border: string }> = {
  openai: { iconColor: 'text-emerald-400', badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800', border: 'border-emerald-800/60' },
  claude: { iconColor: 'text-amber-400', badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800', border: 'border-amber-800/60' },
  groq: { iconColor: 'text-orange-400', badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-800', border: 'border-orange-800/60' },
  deepseek: { iconColor: 'text-blue-400', badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-800', border: 'border-blue-800/60' },
  gemini: { iconColor: 'text-indigo-400', badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-800', border: 'border-indigo-800/60' },
};

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  const theme = PROVIDER_THEMES[provider.providerId] || PROVIDER_THEMES.openai;

  return (
    <div className={`bg-slate-800/90 rounded-xl border ${theme.border} p-5 shadow-md space-y-4 hover:border-slate-600 transition-all`}>
      {/* Top Header: Provider Name & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
            <Cpu className={`w-4 h-4 ${theme.iconColor}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">{provider.name}</h3>
            <p className="text-[11px] text-slate-400 font-mono">{provider.model}</p>
          </div>
        </div>

        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${theme.badgeBg}`}>
          {provider.planName}
        </span>
      </div>

      {/* Token Allowance Progress Bar */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
          <span className="text-slate-300">Token Allowance</span>
          <span className="text-slate-100 font-mono font-bold">
            {provider.tokensUsed.toLocaleString()} / {provider.monthlyTokensLimit.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              provider.percentUtilized >= 100
                ? 'bg-red-500'
                : provider.percentUtilized >= 80
                ? 'bg-amber-500'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${provider.percentUtilized}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center mt-2 text-[11px] font-medium">
          <span className="text-slate-400">{provider.percentUtilized}% used</span>
          <span className="text-emerald-400 font-bold font-mono">
            {provider.tokensRemaining.toLocaleString()} tokens left
          </span>
        </div>
      </div>

      {/* Footer: Spend & Status */}
      <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] text-slate-400 block">Monthly Spend</span>
          <span className="font-bold text-slate-100 font-mono text-sm">{provider.formattedUsd}</span>
        </div>

        <div>
          {provider.status === 'active' && (
            <span className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Available</span>
            </span>
          )}
          {provider.status === 'near_limit' && (
            <span className="flex items-center space-x-1 text-[11px] font-semibold text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Near Limit</span>
            </span>
          )}
          {provider.status === 'limit_reached' && (
            <span className="flex items-center space-x-1 text-[11px] font-semibold text-red-400">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Limit Exceeded</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
