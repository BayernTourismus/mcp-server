#!/usr/bin/env node
import express from "express";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { validateConfig } from "./lib/config";
import { createMcpServer } from "./lib/create-server";

validateConfig();

const app = express();
app.use(express.json());

// Trust proxy headers (needed for correct IP when behind Railway/Render/nginx)
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 60,                    // 60 requests per IP per minute
  standardHeaders: "draft-7", // Return RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "bayerncloud-mcp", version: "2.0.0" });
});

// Stateless: new server + transport per request — no session state on server
app.post("/mcp", limiter, async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  res.on("finish", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
    console.error("Request error:", (err as Error).message);
  }
});

// SSE upgrade and DELETE (session close) — required by MCP spec even in stateless mode
app.get("/mcp", limiter, async (req, res) => {
  res.status(405).json({ error: "SSE sessions not supported in stateless mode. Use POST /mcp." });
});

app.delete("/mcp", (_req, res) => {
  res.status(200).json({ message: "Session closed." });
});

const port = parseInt(process.env.PORT ?? "3000");
app.listen(port, () => {
  console.log(`BayernCloud MCP server (HTTP) listening on port ${port}`);
  console.log(`  POST /mcp   — MCP endpoint`);
  console.log(`  GET  /health — health check`);
});
