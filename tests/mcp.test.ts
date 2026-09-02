import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { handleMcpRequest, MCP_TOOLS } from '../src/services/mcpServer';

describe('Model Context Protocol (MCP) Server', () => {
  it('should expose GET /mcp with server info and tools list', async () => {
    const res = await request(app).get('/mcp');
    expect(res.status).toBe(200);
    expect(res.body.server).toBe('flyrank-mcp-server');
    expect(res.body.version).toBe('2.0.0');
    expect(res.body.protocolVersion).toBe('2024-11-05');
    expect(Array.isArray(res.body.availableTools)).toBe(true);
    expect(res.body.availableTools.length).toBeGreaterThanOrEqual(4);
  });

  it('should handle MCP JSON-RPC initialize method', async () => {
    const rpcReq = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'claude-desktop', version: '1.0' },
      },
    };

    const res = await handleMcpRequest(rpcReq);
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(1);
    expect(res.result.serverInfo.name).toBe('flyrank-mcp-server');
    expect(res.result.capabilities.tools).toBeDefined();
  });

  it('should handle MCP JSON-RPC tools/list method', async () => {
    const rpcReq = {
      jsonrpc: '2.0' as const,
      id: 2,
      method: 'tools/list',
    };

    const res = await handleMcpRequest(rpcReq);
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(2);
    expect(Array.isArray(res.result.tools)).toBe(true);
    const toolNames = res.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('get_llm_usage');
    expect(toolNames).toContain('sync_provider_usage');
    expect(toolNames).toContain('meter_llm_tokens');
    expect(toolNames).toContain('estimate_prompt_cost');
  });

  it('should handle MCP tools/call for estimate_prompt_cost', async () => {
    const rpcReq = {
      jsonrpc: '2.0' as const,
      id: 3,
      method: 'tools/call',
      params: {
        name: 'estimate_prompt_cost',
        arguments: {
          provider: 'openai',
          inputTokens: 1000,
          outputTokens: 500,
        },
      },
    };

    const res = await handleMcpRequest(rpcReq);
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(3);
    expect(res.result.content).toBeDefined();
    const data = JSON.parse(res.result.content[0].text);
    expect(data.provider).toBe('openai');
    expect(data.totalTokens).toBe(1500);
    expect(data.costMicroCents).toBeGreaterThan(0);
  });

  it('should handle MCP tools/call for list_supported_llms', async () => {
    const rpcReq = {
      jsonrpc: '2.0' as const,
      id: 4,
      method: 'tools/call',
      params: {
        name: 'list_supported_llms',
      },
    };

    const res = await handleMcpRequest(rpcReq);
    expect(res.result.content).toBeDefined();
    const data = JSON.parse(res.result.content[0].text);
    expect(data.providers).toBeDefined();
    expect(data.syncCapabilities).toBeDefined();
    expect(data.syncCapabilities.deepseek).toContain('balance');
  });

  it('should reject unknown MCP method with -32601', async () => {
    const rpcReq = {
      jsonrpc: '2.0' as const,
      id: 99,
      method: 'non_existent_method',
    };

    const res = await handleMcpRequest(rpcReq);
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32601);
  });
});
