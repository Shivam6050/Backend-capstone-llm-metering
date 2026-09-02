import React from 'react';
import { PieChart } from 'lucide-react';

interface SubscriptionItem {
  id: string;
  providerName: string;
  planName: string;
  monthlyCostUsd: string;
  monthlyCostCents: number;
}

interface CostDistributionChartProps {
  subscriptions: SubscriptionItem[];
  totalMonthlySpendUsd: string;
}

const COLOR_PALETTE = [
  'bg-white',
  'bg-zinc-300',
  'bg-zinc-400',
  'bg-zinc-500',
  'bg-zinc-600',
  'bg-zinc-700',
];

export const CostDistributionChart: React.FC<CostDistributionChartProps> = ({
  subscriptions,
  totalMonthlySpendUsd,
}) => {
  if (!subscriptions || subscriptions.length === 0) return null;

  const totalCents = subscriptions.reduce((sum, s) => sum + s.monthlyCostCents, 0);

  return (
    <div className="glass-panel rounded-xl p-6 space-y-5 card-3d-hover border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <PieChart className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Monthly Budget Allocation
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">Cost Distribution</span>
      </div>

      {/* Multi-segment Cost Bar */}
      <div className="space-y-3">
        <div className="w-full bg-zinc-950 h-4 rounded-lg overflow-hidden flex border border-zinc-800 p-0.5">
          {subscriptions.map((sub, index) => {
            const percent = totalCents > 0 ? Math.round((sub.monthlyCostCents / totalCents) * 100) : 0;
            if (percent === 0) return null;

            return (
              <div
                key={sub.id}
                className={`h-full ${COLOR_PALETTE[index % COLOR_PALETTE.length]} first:rounded-l last:rounded-r transition-all duration-300 shadow-sm`}
                style={{ width: `${percent}%` }}
                title={`${sub.providerName}: ${sub.monthlyCostUsd} (${percent}%)`}
              ></div>
            );
          })}
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          {subscriptions.map((sub, index) => {
            const percent = totalCents > 0 ? Math.round((sub.monthlyCostCents / totalCents) * 100) : 0;

            return (
              <div key={sub.id} className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${COLOR_PALETTE[index % COLOR_PALETTE.length]} flex-shrink-0 shadow-sm`}></span>
                  <span className="font-semibold text-zinc-300 truncate text-[11px]">{sub.providerName}</span>
                </div>
                <span className="text-white ml-2 font-bold text-[11px]">{sub.monthlyCostUsd}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
