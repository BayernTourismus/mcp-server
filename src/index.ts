#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./lib/config";
import { createMcpServer } from "./lib/create-server";

validateConfig();

const server = createMcpServer();

process.on("SIGTERM", () => console.error("SIGTERM: staying alive"));

const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => console.error("BayernCloud MCP server (stdio) connected"))
  .catch((err: Error) => {
    console.error(`Connection error: ${err.message}`);
    process.exit(1);
  });
