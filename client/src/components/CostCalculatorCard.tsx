import React from 'react';
import { DollarSign, Info } from 'lucide-react';
import { UsageSummary } from '../types';

interface CostCalculatorCardProps {
  usage: UsageSummary | null;
}

export const CostCalculatorCard: React.FC<CostCalculatorCardProps> = ({ usage }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/80 shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Integer Money Math & Cost Engine (Probe 5)
          </h3>
        </div>
        <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
          Zero Floats · Integer Micro-cents
        </span>
      </div>

      {/* Monthly Total Cost Highlight */}
      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 block">Total Monthly Cost</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {usage?.cost.formattedUsd || '$0.0000'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 block">Micro-cents Precision</span>
          <span className="text-sm font-bold font-mono text-slate-200">
            {(usage?.cost.totalMicroCents || 0).toLocaleString()} µ¢
          </span>
        </div>
      </div>

      {/* Rate Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 bg-slate-900/60 font-semibold">
              <th className="py-2.5 px-3">Token Category</th>
              <th className="py-2.5 px-3">Rate / 1k Tokens</th>
              <th className="py-2.5 px-3">Rule / Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 text-slate-200 font-medium">
            <tr>
              <td className="py-2.5 px-3 font-semibold text-slate-100">Standard API Call</td>
              <td className="py-2.5 px-3 font-mono text-indigo-300">100 µ¢ / call</td>
              <td className="py-2.5 px-3 text-slate-400">$0.0001 per API call</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-semibold text-slate-100">Fresh Input Tokens</td>
              <td className="py-2.5 px-3 font-mono text-indigo-300">250 µ¢ / 1k</td>
              <td className="py-2.5 px-3 text-slate-400">$2.50 per 1M tokens</td>
            </tr>
            <tr className="bg-emerald-950/30">
              <td className="py-2.5 px-3 font-semibold text-emerald-300 flex items-center space-x-1.5">
                <span>Cached Input Tokens</span>
                <span className="bg-emerald-900 text-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-bold border border-emerald-700">50% Off</span>
              </td>
              <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">125 µ¢ / 1k</td>
              <td className="py-2.5 px-3 text-emerald-300 font-medium">$1.25 per 1M tokens (Discounted)</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-semibold text-slate-100">Standard Output Tokens</td>
              <td className="py-2.5 px-3 font-mono text-indigo-300">1,000 µ¢ / 1k</td>
              <td className="py-2.5 px-3 text-slate-400">$10.00 per 1M tokens</td>
            </tr>
            <tr className="bg-indigo-950/30">
              <td className="py-2.5 px-3 font-semibold text-indigo-300">Reasoning Tokens</td>
              <td className="py-2.5 px-3 font-mono text-indigo-300 font-bold">1,000 µ¢ / 1k</td>
              <td className="py-2.5 px-3 text-indigo-200 font-medium">Billed as Output tokens rate</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span>All rates are pinned in <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 border border-slate-700">pricing.config.ts</code> and verified deterministically by automated unit tests.</span>
      </div>
    </div>
  );
};
