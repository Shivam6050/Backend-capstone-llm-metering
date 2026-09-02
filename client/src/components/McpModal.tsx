import React, { useState } from 'react';
import { Cpu, X, Copy, Check, Terminal, Play, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpModal: React.FC<McpModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testMethod, setTestMethod] = useState<string>('get_llm_usage');
  const [testOutput, setTestOutput] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentHost = window.location.origin;
  const mcpUrl = currentHost + '/mcp';

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        flyrank: {
          url: mcpUrl,
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        flyrank: {
          type: 'sse',
          url: mcpUrl,
        },
      },
    },
    null,
    2
  );

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleRunTest = async () => {
    setTestLoading(true);
    setTestOutput(null);
    try {
      let rpcBody: any = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: testMethod,
          arguments: {},
        },
      };

      if (testMethod === 'estimate_prompt_cost') {
        rpcBody.params.arguments = {
          provider: 'openai',
          inputTokens: 1500,
          cachedInputTokens: 500,
          outputTokens: 400,
          reasoningTokens: 100,
        };
      }

      const res = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBody),
      });
      const data = await res.json();
      setTestOutput(data);
    } catch (err: any) {
      setTestOutput({ error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel border-glow-top rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">Model Context Protocol (MCP) Server</h2>
                <span className="flex items-center space-x-1 text-[10px] font-mono font-semibold text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>ONLINE</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">Connect Claude Desktop, Cursor, Antigravity, and AI Agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs text-zinc-300 font-mono">
          {/* Server Endpoint Banner */}
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5 truncate pr-2">
              <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider block">Live MCP Endpoint</span>
              <code className="text-white font-mono text-xs">{mcpUrl}</code>
            </div>
            <button
              onClick={() => handleCopy(mcpUrl, 'endpoint')}
              className="flex items-center space-x-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-2.5 py-1.5 rounded text-xs transition-colors flex-shrink-0"
            >
              {copiedSection === 'endpoint' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedSection === 'endpoint' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Quick Connect Snippets */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>1-Click IDE Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Claude Desktop Config */}
              <div className="bg-zinc-950 rounded-lg p-3.5 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-xs">Claude Desktop</span>
                  <button
                    onClick={() => handleCopy(claudeConfig, 'claude')}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 transition-colors"
                  >
                    {copiedSection === 'claude' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'claude' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">Paste in claude_desktop_config.json:</p>
                <pre className="bg-zinc-900 p-2.5 rounded text-[11px] text-zinc-300 overflow-x-auto border border-zinc-800">
                  {claudeConfig}
                </pre>
              </div>

              {/* Cursor Settings */}
              <div className="bg-zinc-950 rounded-lg p-3.5 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-xs">Cursor / Windsurf</span>
                  <button
                    onClick={() => handleCopy(cursorConfig, 'cursor')}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1 transition-colors"
                  >
                    {copiedSection === 'cursor' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSection === 'cursor' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">Paste in .cursor/mcp.json:</p>
                <pre className="bg-zinc-900 p-2.5 rounded text-[11px] text-zinc-300 overflow-x-auto border border-zinc-800">
                  {cursorConfig}
                </pre>
              </div>
            </div>
          </div>

          {/* Exposed MCP Tools List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Available MCP Tools for AI Agents</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { name: 'get_llm_usage', desc: 'Queries metered tokens, quotas, burn velocity, and days to exhaustion across OpenAI, Claude, Groq, DeepSeek, Gemini.' },
                { name: 'sync_provider_usage', desc: 'Triggers live telemetry fetch directly from upstream LLM provider APIs with user API keys.' },
                { name: 'meter_llm_tokens', desc: 'Direct MCP tool for AI agents to automatically meter generated prompt tokens into FlyRank.' },
                { name: 'estimate_prompt_cost', desc: 'Calculates exact USD integer micro-cents for input, cached, output, and reasoning tokens.' },
                { name: 'list_supported_llms', desc: 'Returns all supported providers, models, context limits, and token pricing rates.' },
              ].map((t) => (
                <div key={t.name} className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex items-start space-x-2.5">
                  <code className="text-white font-semibold text-[11px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 flex-shrink-0">
                    {t.name}
                  </code>
                  <span className="text-zinc-400 text-[11px] leading-relaxed">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive MCP Test Console */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Play className="w-3.5 h-3.5 text-white" />
                <span>Test MCP Tools in Real-Time</span>
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono flex-1"
              >
                <option value="get_llm_usage">get_llm_usage (Live Token Metrics)</option>
                <option value="list_supported_llms">list_supported_llms (Pricing & Limits)</option>
                <option value="estimate_prompt_cost">estimate_prompt_cost (Cost Math)</option>
                <option value="sync_provider_usage">sync_provider_usage (Upstream Telemetry)</option>
              </select>

              <button
                onClick={handleRunTest}
                disabled={testLoading}
                className="bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded text-xs transition-colors flex items-center space-x-1.5 shadow-sm flex-shrink-0"
              >
                {testLoading ? <span>Testing...</span> : <span>Run Call</span>}
              </button>
            </div>

            {testOutput && (
              <div className="bg-zinc-950 rounded-lg p-3.5 border border-zinc-800 space-y-1.5">
                <span className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider block">MCP Protocol JSON-RPC Response:</span>
                <pre className="text-[11px] text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto">
                  {JSON.stringify(testOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-6 py-3 flex-shrink-0 bg-zinc-950/50 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open MCP 2024-11-05 Specification Compliant</span>
          </span>
          <button
            onClick={onClose}
            className="bg-white hover:bg-zinc-200 text-black text-xs font-semibold py-2 px-4 rounded shadow-sm transition-colors uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
