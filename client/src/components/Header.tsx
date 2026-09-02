import React from 'react';
import { User, LogOut, LogIn, PlusCircle, Bell, Settings, Key } from 'lucide-react';
import { CurrencySelector } from './CurrencySelector';
import { ExportButtons } from './ExportButtons';

interface HeaderProps {
  user: { id: string; name: string; email: string } | null;
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
  onOpenAuth: () => void;
  onOpenAddSub: () => void;
  onOpenMcp: () => void;
  onOpenApiKeyGuide?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentCurrency,
  onCurrencyChange,
  onOpenAuth,
  onOpenAddSub,
  onOpenMcp,
  onOpenApiKeyGuide,
  onLogout,
}) => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#000000]/85 backdrop-blur-xl border-b border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
      <div className="flex justify-between items-center h-16 px-4 sm:px-8 w-full max-w-[1440px] mx-auto">
        {/* Brand Logo & Original Tagline */}
        <div className="flex items-center space-x-3.5">
          <a href="#" className="flex items-center space-x-2.5 group">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                  FlyRank <span className="text-zinc-400 font-normal">AI Gateway</span>
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1 animate-pulse"></span>
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono hidden sm:block">
                Multi-LLM Token Metering & Usage Intelligence
              </p>
            </div>
          </a>
        </div>

        {/* User Controls & Global Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* API Key Guide Button */}
          {onOpenApiKeyGuide && (
            <button
              onClick={onOpenApiKeyGuide}
              className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 text-xs font-mono font-semibold transition-all shadow-sm"
              title="LLM API Key Access Guide & Security Terms"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">API Key Guide</span>
            </button>
          )}

          {/* MCP Server Button */}
          <button
            onClick={onOpenMcp}
            className="flex items-center space-x-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 text-xs font-mono font-semibold transition-all shadow-sm"
            title="Open Model Context Protocol (MCP) Server Configuration"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>MCP Server</span>
          </button>

          <CurrencySelector
            currentCurrency={currentCurrency}
            onCurrencyChange={onCurrencyChange}
          />

          {user && <ExportButtons />}

          {user ? (
            <>
              <button
                onClick={onOpenAddSub}
                className="bg-white text-black px-3.5 py-1.5 rounded font-mono text-xs font-semibold hover:bg-zinc-200 transition-all duration-200 active:scale-95 flex items-center space-x-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Track Provider</span>
              </button>

              <div className="flex items-center space-x-2 bg-zinc-900/90 px-2.5 py-1 rounded border border-zinc-800">
                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-mono text-zinc-300 hidden sm:inline">{user.name}</span>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900/90 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-white text-black px-4 py-2 rounded font-mono text-xs font-semibold hover:bg-zinc-200 transition-all duration-200 active:scale-95 flex items-center space-x-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
