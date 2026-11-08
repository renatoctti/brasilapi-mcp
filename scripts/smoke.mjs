// Starts the built server over stdio and calls every tool against the real BrasilAPI.
// Run it after `npm run build`:  npm run smoke
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  env: { ...process.env }, // the SDK passes only a short allow-list unless told otherwise
  args: [fileURLToPath(new URL("../dist/src/index.js", import.meta.url))],
});
const client = new Client({ name: "smoke", version: "0.0.0" });
await client.connect(transport);

const show = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content[0].text;
  const body = text.length > 500 ? `${text.slice(0, 500)}\n...` : text;
  console.log(`\n# ${name} ${JSON.stringify(args)} isError=${Boolean(result.isError)}\n${body}`);
};

console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "));
await show("validate_cnpj", { cnpj: "00.000.000/0001-91" });
await show("lookup_cnpj", { cnpj: "00.000.000/0001-91", include_partners: false });
await show("lookup_cnpj", { cnpj: "11.222.333/0001-81" });
await show("lookup_cep", { cep: "01001-000" });
await show("list_holidays", { year: 2026 });
await client.close();
