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

      // Enable CORS for all origins, headers, and methods
      app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', '*'],
        exposedHeaders: ['mcp-session-id', 'Content-Type'],
      }));

      // Health checks
      app.get('/healthz', (_req, res) => res.status(200).send('ok'));

      // Root endpoint: return ok for plain browser/health checks, or handle MCP if Accept header is MCP
      app.get('/', (req, res, next) => {
        const accept = req.headers['accept'] || '';
        if (!accept.includes('text/event-stream') && !accept.includes('application/json')) {
          res.status(200).send('ok');
          return;
        }
        next();
      });

      // Handle MCP requests (Streamable HTTP POST & SSE GET) on /, /mcp, and /sse
      app.all(['/', '/mcp', '/sse'], async (req, res) => {
        // Ensure rawHeaders has acceptable Accept header for MCP spec
        const accept = req.headers['accept'] || '';
        if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
          req.rawHeaders.push('Accept', 'application/json, text/event-stream');
        }
        await transport.handleRequest(req, res);
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