import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { USER_AGENT, VERSION } from "../src/version.js";
import { CNPJ_ANSWER, fakeFetch } from "./helpers.js";

async function connect(routes: Parameters<typeof fakeFetch>[0] = {}) {
  const { fetch, calls } = fakeFetch(routes);
  const server = createServer(fetch);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return { client, calls };
}

function text(result: unknown): string {
  return (result as { content: { type: string; text: string }[] }).content[0].text;
}

test("the server lists its five tools, each with a description", async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "list_holidays",
    "lookup_cep",
    "lookup_cnpj",
    "validate_cnpj",
    "validate_cpf",
  ]);
  assert.ok(tools.every((t) => (t.description ?? "").length > 40));
});

test("validate_cnpj answers over the protocol without any request", async () => {
  const { client, calls } = await connect();
  const result = await client.callTool({
    name: "validate_cnpj",
    arguments: { cnpj: "11.222.333/0001-81" },
  });
  assert.deepEqual(JSON.parse(text(result)), {
    valid: true,
    normalized: "11222333000181",
    formatted: "11.222.333/0001-81",
  });
  assert.equal(calls.length, 0);
});

test("lookup_cnpj returns the company, and an error flag for a bad number", async () => {
  const { client } = await connect({ "/cnpj/v1/00000000000191": [200, CNPJ_ANSWER] });
  const ok = await client.callTool({
    name: "lookup_cnpj",
    arguments: { cnpj: "00.000.000/0001-91", include_partners: false },
  });
  assert.equal(ok.isError, undefined);
  assert.equal(JSON.parse(text(ok)).razaoSocial, "BANCO DO BRASIL SA");

  const bad = await client.callTool({ name: "lookup_cnpj", arguments: { cnpj: "123" } });
  assert.equal(bad.isError, true);
  assert.match(text(bad), /not a valid CNPJ/);
});

test("a year outside the range is refused by the schema", async () => {
  const { client } = await connect();
  const result = await client.callTool({ name: "list_holidays", arguments: { year: 1800 } });
  assert.equal(result.isError, true);
});

test("the version in the code matches package.json", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(VERSION, pkg.version);
  assert.ok(USER_AGENT.includes(VERSION));
});
