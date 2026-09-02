import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { AddSubscriptionModal } from './components/AddSubscriptionModal';
import { McpModal } from './components/McpModal';
import { UsageAnalyticsGraph } from './components/UsageAnalyticsGraph';
import { CostDistributionChart } from './components/CostDistributionChart';
import { ExhaustionPredictorCard } from './components/ExhaustionPredictorCard';
import { BillableSimulator } from './components/BillableSimulator';
import { BrandLogo } from './components/BrandLogos';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfServiceModal } from './components/TermsOfServiceModal';
import { ThreeHeroToken } from './components/ThreeHeroToken';
import { Trash2, Zap, ShieldCheck, Layers, CheckCircle2, Terminal, Shield, CreditCard, Activity, RefreshCw } from 'lucide-react';

interface Subscription {
  id: string;
  providerId: string;
  providerName: string;
  planName: string;
  monthlyCostUsd: string;
  monthlyCostConverted: string;
  currencySymbol: string;
  monthlyCostCents: number;
  monthlyTokenAllowance: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUtilized: number;
  hasApiKey?: boolean;
  lastSyncedAt?: string | null;
  syncStatus?: string | null;
  balanceCents?: number | null;
  balanceUsd?: string | null;
  prediction?: any;
  renewalDate: string;
}

interface UserSubsData {
  userId: string;
  currency: string;
  totalMonthlySpendUsd: string;
  totalMonthlySpendConverted: string;
  totalTokensAllowance: number;
  totalTokensUsed: number;
  totalTokensRemaining: number;
  exhaustionPredictions: any[];
  subscriptions: Subscription[];
}

export function App() {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string>('USD');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  const [syncingSubs, setSyncingSubs] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const [subsData, setSubsData] = useState<UserSubsData | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [lastResponse, setLastResponse] = useState<{ status: number; body: any } | null>(null);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        fetchUserSubscriptions(currentCurrency);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const fetchUserSubscriptions = async (currency: string = 'USD') => {
    setLoadingSubs(true);
    try {
      const res = await fetch(`/api/v1/user/subscriptions?currency=${currency}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSubsData(data.data);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserSubscriptions(currentCurrency);
    }
  }, [currentCurrency]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    setUser(null);
    setSubsData(null);
  };

  // Execute Proxy Gateway Request (Method 2)
  const handleExecuteAction = async (params: {
    provider: string;
    prompt: string;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
  }) => {
    setLoadingAction(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': `idem_gw_${Date.now()}`,
      };

      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider: params.provider,
          prompt: params.prompt,
          inputTokens: params.inputTokens,
          cachedInputTokens: params.cachedInputTokens,
          outputTokens: params.outputTokens,
          reasoningTokens: params.reasoningTokens,
        }),
      });

      const body = await res.json();
      setLastResponse({ status: res.status, body });
      await fetchUserSubscriptions(currentCurrency);
      return body;
    } catch (err: any) {
      setLastResponse({
        status: 500,
        body: { success: false, error: 'CLIENT_ERROR', message: err.message },
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this subscription?')) return;
    try {
      const res = await fetch(`/api/v1/user/subscriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchUserSubscriptions(currentCurrency);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleSyncAll = async () => {
    setSyncingSubs(true);
    try {
      const res = await fetch('/api/v1/user/subscriptions/sync-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUserSubscriptions(currentCurrency);
      }
    } catch (err) {
      console.error('Sync all error:', err);
    } finally {
      setSyncingSubs(false);
    }
  };

  const handleSyncSingle = async (subId: string) => {
    try {
      const res = await fetch(`/api/v1/user/subscriptions/${subId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUserSubscriptions(currentCurrency);
      } else {
        alert(data.message || 'Sync failed');
      }
    } catch (err: any) {
      alert(`Sync error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans relative overflow-x-hidden selection:bg-primary-container/30 selection:text-white">
      {/* Navigation Header */}
      <Header
        user={user}
        currentCurrency={currentCurrency}
        onCurrencyChange={setCurrentCurrency}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAddSub={() => setIsAddSubOpen(true)}
        onOpenMcp={() => setIsMcpOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Canvas */}
      <main className="flex-grow pt-16 relative overflow-hidden z-10">
        {!user ? (
          /* Unauthenticated Landing View with Original Content & Monochrome Titanium Theme */
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
            {/* Hero Section with 3D Token Wireframe */}
            <div className="glass-panel border-glow-top rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-2xl hero-gradient border border-zinc-800">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6 z-20">
                  <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span>Production-Ready Multi-LLM Metering Architecture</span>
                  </div>

                  <div className="space-y-4">
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                      Unified AI Billing & <br />
                      <span className="text-zinc-400 font-medium">Token Gateway Intelligence</span>
                    </h1>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                      Monitor token allowances, live remaining balances, multi-currency costs, and predictive exhaustion dates across all your LLMs in one unified dashboard.
                    </p>
                  </div>

                  {/* Supported Provider Badges */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {[
                      { id: 'openai', label: 'OpenAI (GPT-4o)' },
                      { id: 'claude', label: 'Claude 3.5 Sonnet' },
                      { id: 'groq', label: 'Groq (Llama 3)' },
                      { id: 'deepseek', label: 'DeepSeek V3/R1' },
                      { id: 'gemini', label: 'Google Gemini 2.0' },
                    ].map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center space-x-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded text-xs font-mono text-zinc-300 shadow-sm"
                      >
                        <BrandLogo providerId={p.id} className="w-4 h-4 text-zinc-300" />
                        <span>{p.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Call to Action */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="w-full sm:w-auto bg-white text-black font-mono text-xs font-semibold px-8 py-3.5 rounded hover:bg-zinc-200 transition-all duration-200 active:scale-95 text-center uppercase tracking-wider shadow-sm"
                    >
                      Get Started · Create Free Account
                    </button>
                  </div>
                </div>

                {/* 3D Wireframe Token */}
                <div className="relative w-full h-[350px] lg:h-[450px] flex items-center justify-center">
                  <ThreeHeroToken />
                </div>
              </div>
            </div>

            {/* Feature Grid Highlights with Original Copy */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel rounded-xl p-6 space-y-3 card-3d-hover border border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Proxy Gateway Metering</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Tokens are measured precisely per API request via <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">/api/v1/generate</code>. No synthetic numbers or fake sync buttons.
                </p>
              </div>

              <div className="glass-panel rounded-xl p-6 space-y-3 card-3d-hover border border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Quota Burn Prediction</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Smart linear regression forecasting warns you days before token depletion to prevent production rate limits and service outages.
                </p>
              </div>

              <div className="glass-panel rounded-xl p-6 space-y-3 card-3d-hover border border-zinc-800">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono">Multi-Currency Engine</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  Real-time ISO currency conversions across USD, EUR, GBP, JPY, CAD, AUD, and INR for global engineering and finance teams.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8">

            {/* Smart Quota Exhaustion Alerts */}
            {subsData && subsData.exhaustionPredictions && subsData.exhaustionPredictions.length > 0 && (
              <ExhaustionPredictorCard predictions={subsData.exhaustionPredictions} />
            )}

            {/* Graphs Row */}
            {subsData && subsData.subscriptions.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UsageAnalyticsGraph subscriptions={subsData.subscriptions} />
                <CostDistributionChart
                  subscriptions={subsData.subscriptions}
                  totalMonthlySpendUsd={subsData.totalMonthlySpendConverted}
                />
              </div>
            )}

            {/* Gateway Playground & Subscriptions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Secure Gateway Studio */}
              <BillableSimulator
                onExecuteAction={handleExecuteAction}
                loading={loadingAction}
                lastResponse={lastResponse}
              />

              {/* Tracked Subscriptions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-zinc-300" />
                    <span>Tracked AI Provider Subscriptions</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSyncAll}
                      disabled={syncingSubs}
                      className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded transition-colors shadow-sm disabled:opacity-50"
                      title="Fetch real-time usage metrics and balances directly from upstream LLM provider APIs"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingSubs ? 'animate-spin text-white' : 'text-zinc-400'}`} />
                      <span>{syncingSubs ? 'Syncing...' : 'Sync Real-Time'}</span>
                    </button>
                    <button
                      onClick={() => (user ? setIsAddSubOpen(true) : setIsAuthOpen(true))}
                      className="text-xs font-mono font-semibold text-white hover:text-zinc-300 transition-colors bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded border border-zinc-700"
                    >
                      + Track Provider
                    </button>
                  </div>
                </div>

                {loadingSubs && !subsData ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2].map((i) => (
                      <div key={i} className="glass-panel h-36 rounded-xl border border-zinc-800"></div>
                    ))}
                  </div>
                ) : subsData && subsData.subscriptions.length > 0 ? (
                  <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
                    {subsData.subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="glass-panel rounded-xl p-5 space-y-4 relative group transition-all duration-200 card-3d-hover border border-zinc-800"
                      >
                        <div className="absolute top-4 right-4 flex items-center space-x-1.5">
                          <button
                            onClick={() => handleSyncSingle(sub.id)}
                            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Sync live usage from upstream API"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub.id)}
                            className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
                            title="Remove subscription"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-sm">
                            <BrandLogo providerId={sub.providerId} className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-white">{sub.providerName}</h4>
                              {sub.syncStatus === 'SYNCED' ? (
                                <span className="inline-flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                                  LIVE
                                </span>
                              ) : sub.hasApiKey ? (
                                <span className="inline-flex items-center text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700 px-1.5 py-0.2 rounded">
                                  KEY LINKED
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded">
                                  MANUAL
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">{sub.planName}</span>
                          </div>
                        </div>

                        {/* Live Telemetry Info Bar if available */}
                        {sub.balanceUsd && (
                          <div className="bg-zinc-950 p-2 rounded border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-400">Upstream Account Balance:</span>
                            <span className="text-emerald-400 font-bold">{sub.balanceUsd}</span>
                          </div>
                        )}

                        {/* Token Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-zinc-400">Tokens Metered</span>
                            <span className="text-white font-mono font-semibold">
                              {sub.tokensUsed.toLocaleString()} / {sub.monthlyTokenAllowance.toLocaleString()}
                            </span>
                          </div>

                          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                sub.percentUtilized >= 100
                                  ? 'bg-red-400'
                                  : sub.percentUtilized >= 80
                                  ? 'bg-amber-300'
                                  : 'bg-white'
                              }`}
                              style={{ width: `${Math.min(sub.percentUtilized, 100)}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-[11px] font-mono pt-0.5">
                            <span className="text-zinc-400">{sub.percentUtilized}% utilized</span>
                            <span className="text-zinc-200 font-semibold">
                              {sub.tokensRemaining.toLocaleString()} tokens remaining
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Plan Cost:</span>
                          <span className="font-semibold text-white">
                            {sub.monthlyCostConverted} / mo
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel p-8 rounded-xl text-center text-zinc-400 space-y-3 border border-zinc-800">
                    <p className="text-xs font-mono">No AI subscriptions connected yet.</p>
                    <button
                      onClick={() => (user ? setIsAddSubOpen(true) : setIsAuthOpen(true))}
                      className="inline-flex items-center space-x-1.5 bg-white text-black font-mono text-xs font-semibold px-4 py-2 rounded hover:bg-zinc-200 transition-all shadow-sm"
                    >
                      <span>+ Track Your First AI Model</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Monochrome Titanium Status Footer ─────────────────────────────────────────────── */}
      <footer className="w-full z-40 py-3.5 px-4 sm:px-8 bg-[#000000]/90 backdrop-blur-md border-t border-zinc-800 text-xs font-mono flex flex-wrap justify-between items-center gap-3">
        <div className="text-zinc-200 font-semibold flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-zinc-300 inline-block animate-pulse"></span>
          <span>SYSTEM_STABLE // v2.0.0</span>
        </div>

        <div className="flex flex-wrap items-center space-x-4 sm:space-x-6 text-zinc-500">
          <span>Status: <strong className="text-zinc-200">Operational</strong></span>
          <span className="hidden sm:inline">Uptime: <strong className="text-zinc-200">99.99%</strong></span>
          <span className="hidden md:inline">Latency: <strong className="text-zinc-200">12ms</strong></span>
          <span>·</span>
          <button
            onClick={() => setIsPrivacyOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Privacy Policy
          </button>
          <span>·</span>
          <button
            onClick={() => setIsTermsOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            Terms of Service
          </button>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => {
          setUser(u);
          fetchUserSubscriptions(currentCurrency);
        }}
        onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />

      <AddSubscriptionModal
        isOpen={isAddSubOpen}
        onClose={() => setIsAddSubOpen(false)}
        onAdded={() => fetchUserSubscriptions(currentCurrency)}
      />

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <McpModal isOpen={isMcpOpen} onClose={() => setIsMcpOpen(false)} />
    </div>
  );
}
