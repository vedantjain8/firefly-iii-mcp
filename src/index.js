/**
 * Firefly III MCP Server
 *
 * Transports:
 *   HTTP Streamable (MCP 2025-03-26) — default for Docker/remote deployments.
 *   stdio                            — set MCP_TRANSPORT=stdio for Claude Desktop.
 *
 * The HTTP transport uses the stateless pattern: every POST creates a fresh
 * transport + server pair, so no session state leaks between requests.
 * handleRequest() receives the already-parsed JSON body to avoid double-read.
 */

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import http from 'node:http';

import { TOOLS, TOOL_MAP } from './tools.js';

// ─── server factory ──────────────────────────────────────────────────────────
// Called once per connection (stdio) or per request (HTTP stateless).

function createServer() {
  const server = new Server(
    { name: 'firefly-iii-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  // Allow filtering tools via ALLOWED_TAGS (e.g. "accounts,categories,transactions")
  const allowedTags = process.env.ALLOWED_TAGS
    ? process.env.ALLOWED_TAGS.split(',').map(t => t.trim().toLowerCase())
    : null;

  const activeTools = allowedTags
    ? TOOLS.filter(t => allowedTags.some(tag => t.name === tag || t.name.startsWith(`${tag}_`)))
    : TOOLS;

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: activeTools.map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;

    const toolDef = activeTools.find(t => t.name === name);
    if (!toolDef) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown or disabled tool: ${name}`);
    }

    console.error(`[firefly-mcp] Tool Called: ${name}`);

    const handler = toolDef.handler;

    try {
      const result = await handler(args);
      return {
        content: [{
          type: 'text',
          text: result == null
            ? '(empty response)'
            : typeof result === 'string'
              ? result
              : JSON.stringify(result, (k, v) => (k === 'links' || k === 'meta' ? undefined : v)),
        }],
      };
    } catch (err) {
      // Surface Firefly API errors as non-fatal MCP tool errors
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ─── transport ───────────────────────────────────────────────────────────────

const MCP_TRANSPORT = (process.env.MCP_TRANSPORT || 'http').toLowerCase();

if (MCP_TRANSPORT === 'stdio') {
  // ── stdio — for Claude Desktop / CLI ─────────────────────────────────────
  const server = createServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write(`[firefly-mcp] stdio ready — ${TOOLS.length} tools\n`);

} else {
  // ── HTTP Streamable — for Docker / remote ─────────────────────────────────
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  const httpServer = http.createServer(async (req, res) => {

    // ── health check ──────────────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', tools: TOOLS.length }));
      return;
    }

    // ── MCP endpoint ──────────────────────────────────────────────────────
    if (req.url === '/mcp' || req.url === '/') {
      // Stateless: new server + transport per request (spec-compliant)
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
      });
      const server = createServer();
      await server.connect(transport);

      // Parse body before handing to transport (avoids stream double-read)
      let body;
      if (req.method === 'POST') {
        body = await new Promise((resolve, reject) => {
          let raw = '';
          req.on('data', chunk => { raw += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
          });
          req.on('error', reject);
        });
      }

      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  httpServer.listen(PORT, HOST, () => {
    process.stderr.write(
      `[firefly-mcp] HTTP Streamable ready — ` +
      `http://${HOST}:${PORT}/mcp — ${TOOLS.length} tools\n`,
    );
  });

  // Graceful shutdown
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      httpServer.close(() => process.exit(0));
    });
  }
}
