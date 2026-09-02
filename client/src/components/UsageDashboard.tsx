import React from 'react';
import { CreditCard, RefreshCw, AlertTriangle, CheckCircle, DollarSign, BarChart3, Sparkles } from 'lucide-react';
import { UsageSummary } from '../types';

interface UsageDashboardProps {
  usage: UsageSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onUpgradeCheckout: () => void;
}

export const UsageDashboard: React.FC<UsageDashboardProps> = ({
  usage,
  loading,
  onRefresh,
  onUpgradeCheckout,
}) => {
  if (loading && !usage) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400 text-sm">
        No subscription found for this account.
      </div>
    );
  }

  const apiCallsPercent = Math.min(100, Math.round((usage.used.apiCalls / usage.limits.apiCalls) * 100));
  const tokensPercent = Math.min(100, Math.round((usage.used.tokens.total / usage.limits.tokens) * 100));
  const isLapsed = usage.status === 'past_due' || usage.status === 'canceled' || usage.status === 'unpaid';

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-slate-800 rounded-xl border border-slate-700/80 p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-slate-100">{usage.plan} Subscription</h2>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1.5 ${
                  usage.status === 'active'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                }`}
              >
                {usage.status === 'active' ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="capitalize">{usage.status.replace('_', ' ')}</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Billing cycle: {new Date(usage.periodStart).toLocaleDateString()} — {new Date(usage.periodEnd).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              className="p-2 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {usage.plan === 'Free' && (
              <button
                onClick={onUpgradeCheckout}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Upgrade to Pro ($29/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* Lapsed Notice */}
        {isLapsed && (
          <div className="mt-4 bg-amber-950/60 border border-amber-800/80 rounded-lg p-3.5 flex items-start space-x-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-300">Payment Required</p>
              <p className="text-amber-200/90 mt-0.5">
                Your subscription is currently past due. Please update payment details or upgrade to continue service.
              </p>
            </div>
          </div>
        )}

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Current Usage Charges</span>
            </div>
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {usage.cost.formattedUsd}
            </span>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium mb-1">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>API Requests</span>
            </div>
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {usage.used.apiCalls.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Tokens Metered</span>
            </div>
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {usage.used.tokens.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quota Progress Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* API Calls Quota */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="font-semibold text-slate-300">Monthly API Quota</span>
              <span className="font-bold text-slate-100 font-mono">
                {usage.used.apiCalls.toLocaleString()} / {usage.limits.apiCalls.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  apiCallsPercent >= 100 ? 'bg-red-500' : apiCallsPercent >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${apiCallsPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
              <span>{apiCallsPercent}% used</span>
              <span>{usage.limits.apiCalls - usage.used.apiCalls} remaining</span>
            </div>
          </div>

          {/* AI Tokens Quota */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80">
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="font-semibold text-slate-300">Monthly Token Allowance</span>
              <span className="font-bold text-slate-100 font-mono">
                {usage.used.tokens.total.toLocaleString()} / {usage.limits.tokens.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  tokensPercent >= 100 ? 'bg-red-500' : tokensPercent >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${tokensPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
              <span>{tokensPercent}% used</span>
              <span>{(usage.limits.tokens - usage.used.tokens.total).toLocaleString()} remaining</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
