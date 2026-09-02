import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface SubscriptionItem {
  id: string;
  providerName: string;
  planName: string;
  monthlyTokenAllowance: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUtilized: number;
}

interface UsageAnalyticsGraphProps {
  subscriptions: SubscriptionItem[];
}

export const UsageAnalyticsGraph: React.FC<UsageAnalyticsGraphProps> = ({ subscriptions }) => {
  if (!subscriptions || subscriptions.length === 0) return null;

  const maxAllowance = Math.max(...subscriptions.map((s) => s.monthlyTokenAllowance), 1);

  return (
    <div className="glass-panel rounded-xl p-6 space-y-5 card-3d-hover border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Token Allowance & Usage Analytics
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-700 font-medium flex items-center space-x-1">
          <TrendingUp className="w-3 h-3 text-zinc-400" />
          <span>Real-time Utilization</span>
        </span>
      </div>

      {/* Visual Bar Chart */}
      <div className="space-y-4 pt-1">
        {subscriptions.map((sub) => {
          const usedWidth = Math.min(100, Math.round((sub.tokensUsed / sub.monthlyTokenAllowance) * 100));
          const barScaleWidth = Math.max(10, Math.round((sub.monthlyTokenAllowance / maxAllowance) * 100));

          return (
            <div key={sub.id} className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-white flex items-center space-x-2">
                  <span className="text-white font-mono font-bold">{sub.providerName}</span>
                  <span className="text-[11px] text-zinc-400 font-normal">({sub.planName})</span>
                </span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  <strong className="text-white">{sub.tokensUsed.toLocaleString()}</strong> / {sub.monthlyTokenAllowance.toLocaleString()} ({usedWidth}%)
                </span>
              </div>

              {/* Stacked Visual Bar */}
              <div className="w-full bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                <div
                  className="h-3.5 rounded bg-zinc-900 relative overflow-hidden flex items-center transition-all duration-500"
                  style={{ width: `${barScaleWidth}%` }}
                >
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      usedWidth >= 100
                        ? 'bg-red-400'
                        : usedWidth >= 80
                        ? 'bg-amber-300'
                        : 'bg-white'
                    }`}
                    style={{ width: `${usedWidth}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
