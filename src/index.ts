import express from 'express';
import cors from 'cors';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

async function main() {
  const port = process.env.PORT;

  if (port) {
    // Cloud / HTTP mode (Gemini Spark Streamable HTTP & SSE)
    try {
      const server = await createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode for maximum compatibility
        enableJsonResponse: true, // Return direct application/json responses for HTTP clients like Gemini
      });
      await server.connect(transport);

      const app = express();

      // In-memory log of recent requests for debugging
      const recentRequests: Array<{
        timestamp: string;
        method: string;
        path: string;
        headers: Record<string, any>;
      }> = [];

      app.use((req, _res, next) => {
        recentRequests.unshift({
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.originalUrl || req.url,
          headers: req.headers,
        });
        if (recentRequests.length > 50) recentRequests.pop();
        console.error(`[REQUEST] ${req.method} ${req.originalUrl || req.url}`);
        next();
      });

      // Enable CORS for all origins, headers, and methods
      app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'HEAD'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', '*'],
        exposedHeaders: ['mcp-session-id', 'Content-Type'],
      }));

      // Health and debugging endpoints
      app.get('/healthz', (_req, res) => res.status(200).send('ok'));
      app.get('/debug-requests', (_req, res) => res.status(200).json(recentRequests));

      // MCP discovery endpoints (RFC draft & Google/client discovery)
      app.get(['/.well-known/mcp.json', '/.well-known/mcp'], (_req, res) => {
        res.status(200).json({
          name: 'skylight-mcp',
          version: '2.0.0',
          description: 'Skylight Calendar & Photo Frame MCP Server',
          transport: {
            type: 'streamable-http',
            url: '/mcp',
          },
        });
      });

      // Handle HEAD requests on any path with 200 OK (for Go-http-client / Google probes)
      app.use((req, res, next) => {
        if (req.method === 'HEAD') {
          res.status(200).end();
          return;
        }
        next();
      });

      // Handle MCP requests (Streamable HTTP POST & SSE GET) on /, /mcp, /sse, and trailing slash variants
      app.all(['/', '/mcp', '/mcp/', '/sse', '/sse/'], async (req, res) => {
        // If GET request without explicit text/event-stream accept header, return instant 200 OK JSON
        if (req.method === 'GET' && !req.headers['accept']?.includes('text/event-stream')) {
          res.status(200).json({
            status: 'ok',
            name: 'skylight-mcp',
            version: '2.0.0',
            transport: 'streamable-http',
            endpoint: req.path,
          });
          return;
        }

        // For POST or SSE GET: ensure Accept and Content-Type headers satisfy MCP specification
        const accept = req.headers['accept'] || '';
        if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
          req.headers['accept'] = 'application/json, text/event-stream';
          req.rawHeaders.push('Accept', 'application/json, text/event-stream');
        }
        if (req.method === 'POST' && (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json'))) {
          req.headers['content-type'] = 'application/json';
          req.rawHeaders.push('Content-Type', 'application/json');
        }
        await transport.handleRequest(req, res);
      });

      // Catch-all fallback for any other requests to return 200 OK
      app.use((req, res) => {
        res.status(200).json({
          status: 'ok',
          name: 'skylight-mcp',
          version: '2.0.0',
          endpoint: req.path,
        });
      });

      const serverPort = parseInt(port, 10) || 8000;
      app.listen(serverPort, '0.0.0.0', () => {
        console.error(`[Skylight MCP] HTTP server listening on 0.0.0.0:${serverPort} (/mcp, /sse, /)`);
      });
    } catch (error: any) {
      console.error('[Skylight MCP] Fatal HTTP startup error:', error);
      process.exit(1);
    }
  } else {
    // Local CLI / stdio mode
    try {
      const server = await createServer();
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('[Skylight MCP] Server initialized and listening on stdio transport.');
    } catch (error: any) {
      console.error('[Skylight MCP] Fatal startup error:', error);
      process.exit(1);
    }
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main();