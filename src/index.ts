import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
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

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main();