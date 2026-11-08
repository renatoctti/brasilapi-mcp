import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FetchLike } from "./brasilapi.js";
import {
  listHolidays,
  lookupCep,
  lookupCnpj,
  validateCnpj,
  validateCpf,
  type ToolResult,
} from "./tools.js";
import { VERSION } from "./version.js";

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: true } as const;
const OFFLINE = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

function reply(result: ToolResult) {
  if (!result.ok) {
    return { content: [{ type: "text" as const, text: result.message }], isError: true };
  }
  return { content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }] };
}

export function createServer(fetchImpl?: FetchLike): McpServer {
  const server = new McpServer({ name: "brasilapi-mcp", version: VERSION });

  server.registerTool(
    "lookup_cnpj",
    {
      title: "Look up a company by CNPJ",
      description:
        "Public registry data for a Brazilian company (Receita Federal, via BrasilAPI): legal name, " +
        "registration status, main activity, address, size, tax regime and partners (QSA). " +
        "Accepts a CNPJ with or without punctuation, including the alphanumeric format. " +
        "Partner CPFs come masked by the registry. Use it to check that a company exists and is active.",
      inputSchema: {
        cnpj: z.string().describe('CNPJ, for example "00.000.000/0001-91" or "00000000000191"'),
        include_partners: z
          .boolean()
          .optional()
          .describe("Include the partners list (default true); false keeps the answer short"),
      },
      annotations: READ_ONLY,
    },
    async ({ cnpj, include_partners }) =>
      reply(await lookupCnpj(cnpj, include_partners ?? true, fetchImpl)),
  );

  server.registerTool(
    "validate_cnpj",
    {
      title: "Validate a CNPJ offline",
      description:
        "Checks the format and the check digits of a CNPJ (numeric or alphanumeric) without any " +
        "network call. A valid number is not proof that the company exists: use lookup_cnpj for that.",
      inputSchema: { cnpj: z.string().describe("CNPJ with or without punctuation") },
      annotations: OFFLINE,
    },
    async ({ cnpj }) => reply(validateCnpj(cnpj)),
  );

  server.registerTool(
    "validate_cpf",
    {
      title: "Validate a CPF offline",
      description:
        "Checks the format and the check digits of a CPF without any network call. " +
        "The number is not stored or sent anywhere.",
      inputSchema: { cpf: z.string().describe('CPF, for example "529.982.247-25"') },
      annotations: OFFLINE,
    },
    async ({ cpf }) => reply(validateCpf(cpf)),
  );

  server.registerTool(
    "lookup_cep",
    {
      title: "Look up an address by CEP",
      description:
        "Street, neighborhood, city, state, IBGE city code and coordinates for a Brazilian postal " +
        "code (CEP), via BrasilAPI.",
      inputSchema: { cep: z.string().describe('CEP, for example "01001-000" or "01001000"') },
      annotations: READ_ONLY,
    },
    async ({ cep }) => reply(await lookupCep(cep, fetchImpl)),
  );

  server.registerTool(
    "list_holidays",
    {
      title: "List Brazilian national holidays",
      description:
        "National holidays of a year with their dates and weekdays, via BrasilAPI. Useful for " +
        "business-day and deadline calculations.",
      inputSchema: {
        year: z.number().int().min(1900).max(2199).describe("Four-digit year, for example 2026"),
      },
      annotations: READ_ONLY,
    },
    async ({ year }) => reply(await listHolidays(year, fetchImpl)),
  );

  return server;
}
