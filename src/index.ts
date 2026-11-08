#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  await createServer().connect(new StdioServerTransport());
  // stdout carries the protocol, so anything for a human goes to stderr
  console.error("brasilapi-mcp running on stdio");
}

main().catch((error) => {
  console.error("brasilapi-mcp failed to start:", error);
  process.exit(1);
});
