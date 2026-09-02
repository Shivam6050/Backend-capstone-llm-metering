import React from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import { UsageSummary } from '../types';

interface ActivityHistoryProps {
  usage: UsageSummary | null;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ usage }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/80 shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Recent Usage Activity
          </h3>
        </div>
        <span className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time Idempotent Metering</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 bg-slate-900/60 font-semibold">
              <th className="py-2.5 px-3">Activity</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Units</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60 text-slate-200 font-medium">
            <tr>
              <td className="py-3 px-3 font-semibold text-slate-100">AI Response Generation</td>
              <td className="py-3 px-3 text-slate-400">Tokens Metered</td>
              <td className="py-3 px-3">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Processed
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-indigo-300 font-bold">
                {usage?.used.tokens.total.toLocaleString() || 0} tokens
              </td>
            </tr>
            <tr>
              <td className="py-3 px-3 font-semibold text-slate-100">API Gateway Calls</td>
              <td className="py-3 px-3 text-slate-400">HTTP Requests</td>
              <td className="py-3 px-3">
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Processed
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-indigo-300 font-bold">
                {usage?.used.apiCalls.toLocaleString() || 0} requests
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
