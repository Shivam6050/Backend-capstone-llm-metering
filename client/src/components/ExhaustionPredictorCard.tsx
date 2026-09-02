import React from 'react';
import { Flame } from 'lucide-react';

interface Prediction {
  subscriptionId: string;
  providerName: string;
  monthlyTokenAllowance: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUtilized: number;
  dailyVelocityTokens: number;
  estimatedDaysRemaining: number | null;
  predictedExhaustionDate: string | null;
  alertLevel: 'NORMAL' | 'WARNING_80' | 'CRITICAL_90' | 'EXHAUSTED_100';
  recommendation: string;
}

interface ExhaustionPredictorCardProps {
  predictions: Prediction[];
}

export const ExhaustionPredictorCard: React.FC<ExhaustionPredictorCardProps> = ({ predictions }) => {
  if (!predictions || predictions.length === 0) return null;

  return (
    <div className="glass-panel border-glow-top rounded-xl p-6 space-y-4 shadow-xl card-3d-hover border border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Predictive Quota Burn Alerts
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              Daily velocity & exhaustion forecasting before hitting rate limits
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700">
          Burn Forecaster
        </span>
      </div>

      <div className="space-y-3">
        {predictions.map((p) => (
          <div
            key={p.subscriptionId}
            className={`p-4 rounded border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
              p.alertLevel === 'EXHAUSTED_100'
                ? 'bg-red-950/30 border-red-800/50 text-red-300'
                : p.alertLevel === 'CRITICAL_90'
                ? 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
            }`}
          >
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">{p.providerName}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                  {p.percentUtilized}% utilized
                </span>
                {p.predictedExhaustionDate && (
                  <span className="text-[10px] font-medium text-amber-300">
                    Depletion: {new Date(p.predictedExhaustionDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">{p.recommendation}</p>
            </div>

            <div className="text-left sm:text-right flex-shrink-0 font-mono">
              <span className="text-[10px] text-zinc-500 block font-semibold uppercase tracking-wider">Burn Rate</span>
              <span className="font-semibold text-white text-sm">
                {p.dailyVelocityTokens.toLocaleString()} <span className="text-xs font-normal text-zinc-500">tokens/day</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
