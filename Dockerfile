# ── Stage 1: install production deps ─────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests only — maximises layer cache hits on rebuilds
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ── Stage 2: lean runtime image ───────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Non-root least-privilege user
RUN addgroup -S mcp && adduser -S mcp -G mcp

WORKDIR /app

# Copy only runtime artefacts; chown in one layer (no extra layer cost)
COPY --from=deps --chown=mcp:mcp /app/node_modules ./node_modules
COPY --chown=mcp:mcp package.json ./
COPY --chown=mcp:mcp src/           ./src/

USER mcp

ENV NODE_ENV=production \
    MCP_TRANSPORT=http  \
    PORT=3000           \
    HOST=0.0.0.0

EXPOSE 3000

# wget is available in node:20-alpine; curl is not
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["node", "src/index.js"]
