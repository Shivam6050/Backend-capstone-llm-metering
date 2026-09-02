import { Router, Request, Response } from 'express';
import { handleMcpRequest, MCP_TOOLS } from '../services/mcpServer';
import { verifyToken } from '../services/authService';

const mcpRouter = Router();

mcpRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    server: 'flyrank-mcp-server',
    version: '2.0.0',
    protocolVersion: '2024-11-05',
    endpoint: '/mcp',
    supportedMethods: ['initialize', 'tools/list', 'tools/call'],
    availableTools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
    integrationGuide: {
      claudeDesktop: {
        mcpServers: {
          flyrank: {
            url: req.protocol + '://' + (req.get('host') || 'localhost:3000') + '/mcp',
          },
        },
      },
    },
  });
});

mcpRouter.post('/', async (req: Request, res: Response) => {
  let userId: string | undefined;

  // Extract optional authentication token if client passed Bearer token or cookie
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      userId = payload.userId;
    }
  }

  const response = await handleMcpRequest(req.body, userId);
  return res.status(200).json(response);
});

export { mcpRouter };
