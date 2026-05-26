# Firefly III MCP Server

**⚠️ Disclaimer: This project is fully vibe coded, use it at your own risk.**

A production-ready [Model Context Protocol](https://modelcontextprotocol.io) server exposing **100% of the Firefly III REST API v1** as MCP tools.

- **211 tools** — every endpoint covered
- **HTTP Streamable transport** — default, for remote / Docker deployments
- **stdio transport** — for Claude Desktop (`MCP_TRANSPORT=stdio`)
- Zero external HTTP dependencies — native `fetch` only
- Multi-stage Alpine Docker image (~50 MB)
- Non-root container user

---

## Quick start

### 1 — Build

You can use the following script to build the image from anywhere:

```bash
#!/bin/sh
# Run this script from any directory — it always builds from the correct location.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[firefly-mcp] Building from: $SCRIPT_DIR"
docker build --network=host -t firefly-iii-mcp "$SCRIPT_DIR"
echo "[firefly-mcp] Build complete. Image: firefly-iii-mcp"
```

### 2 — Run (HTTP mode, default)

```bash
docker run \
  -p 3000:3000 \
  -e FIREFLY_URL=https://your-firefly.example.com \
  -e FIREFLY_TOKEN=your_personal_access_token \
  --network mcp \
  firefly-iii-mcp
```

MCP endpoint: `http://localhost:3000/mcp`  
Health check: `http://localhost:3000/health`

### 3 — Run (stdio mode, Claude Desktop)

```bash
docker run -i --rm \
  -e MCP_TRANSPORT=stdio \
  -e FIREFLY_URL=https://your-firefly.example.com \
  -e FIREFLY_TOKEN=your_personal_access_token \
  firefly-iii-mcp
```

---

## Claude Desktop config

**stdio** (simplest, no port needed):

```json
{
  "mcpServers": {
    "firefly": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "MCP_TRANSPORT=stdio",
        "-e", "FIREFLY_URL=https://your-firefly.example.com",
        "-e", "FIREFLY_TOKEN=your_personal_access_token",
        "firefly-iii-mcp"
      ]
    }
  }
}
```

**HTTP Streamable** (if you keep the container running separately):

```json
{
  "mcpServers": {
    "firefly": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

---

## Docker Compose

```bash
cp .env.example .env   # fill in FIREFLY_URL + FIREFLY_TOKEN
docker compose up -d

# Optional: also spin up a local Firefly III instance
docker compose --profile dev up -d
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `FIREFLY_URL` | — | **Required.** Base URL of your Firefly III instance |
| `FIREFLY_TOKEN` | — | **Required.** Personal Access Token |
| `ALLOWED_TAGS` | — | Comma-separated list of prefixes to enable (e.g. `accounts,transactions,categories`). If not set, all tools are enabled. |
| `MCP_TRANSPORT` | `http` | `http` or `stdio` |
| `PORT` | `3000` | HTTP listen port |
| `HOST` | `0.0.0.0` | HTTP bind address |

### Getting a Personal Access Token

1. Log in → **Profile** (top-right) → **OAuth** tab
2. Under *Personal Access Tokens* click **Create new token**
3. Copy the token (shown once only)

---

## API coverage

| Module | Tools |
|---|---|
| About / Cron | 3 |
| Accounts | 8 |
| Attachments | 7 |
| Autocomplete | 17 |
| Available Budgets | 5 |
| Bills | 8 |
| Budgets + Limits | 15 |
| Categories | 7 |
| Configuration | 3 |
| Currencies | 14 |
| Data (export / bulk / purge) | 12 |
| Exchange Rates | 1 |
| Insight | 24 |
| Link Types + Transaction Links | 11 |
| Object Groups | 6 |
| Piggy Banks | 7 |
| Preferences | 4 |
| Recurrences | 6 |
| Rules + Rule Groups | 14 |
| Search | 2 |
| Summary | 1 |
| Tags | 7 |
| Transactions + Journals | 8 |
| Users (admin) | 5 |
| Webhooks + Messages + Attempts | 13 |
| **Total** | **211** |

---

## Architecture

```
src/
├── index.js   — MCP server, dual transport (HTTP Streamable + stdio)
├── client.js  — Thin fetch wrapper (get/post/put/del/binary + array QS)
└── tools.js   — All 211 tool definitions + O(1) dispatch map
```

### Key design decisions

- **`client.js`** strips `null`/`undefined` query params and serialises arrays as `key[]=val` (required by Firefly III insight endpoints).
- **`tools.js`** uses valid JSON Schema `{ type, description }` property descriptors — not a custom format. `required` fields are in the top-level array, not inside property objects.
- **HTTP transport** is stateless: each POST request creates a fresh `Server` + `StreamableHTTPServerTransport` pair. Body is pre-parsed to avoid stream double-read.
- **stdio transport** creates a single long-lived server — correct for process-per-client CLI usage.
