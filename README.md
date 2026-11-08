# brasilapi-mcp

An [MCP](https://modelcontextprotocol.io) server that gives AI assistants Brazilian public data through [BrasilAPI](https://brasilapi.com.br): company registry lookups by CNPJ (including partners), addresses by CEP, offline CNPJ/CPF validation and national holidays.

It was built from experience with company due-diligence (KYC) workflows, where an agent has to check that a company exists, is active and who its partners are, and must not trust a number that fails its check digits. It is an independent project and is not affiliated with BrasilAPI or the Receita Federal.

## Tools

| Tool | What it does | Network |
|---|---|---|
| `lookup_cnpj` | Legal name, registration status, main activity, address, size, tax regime and partners (QSA) of a company. Accepts CNPJ with or without punctuation, numeric or alphanumeric. | BrasilAPI |
| `validate_cnpj` | Checks format and check digits, numeric and alphanumeric CNPJ. | none |
| `validate_cpf` | Checks format and check digits of a CPF. Nothing is stored or sent. | none |
| `lookup_cep` | Street, neighborhood, city, state, IBGE code and coordinates for a CEP. | BrasilAPI |
| `list_holidays` | National holidays of a year, with weekdays. | BrasilAPI |

`lookup_cnpj` rejects a number with wrong check digits before making any request, so a typo costs nothing and never reaches the API. Partner CPFs come masked by the registry (`***123456**`); the server does not unmask or store anything.

Example, `lookup_cnpj` with `include_partners: false`:

```json
{
  "cnpj": "00000000000191",
  "razaoSocial": "BANCO DO BRASIL SA",
  "situacaoCadastral": { "descricao": "ATIVA", "desde": "2005-11-03", "motivo": "SEM MOTIVO" },
  "tipo": "MATRIZ",
  "naturezaJuridica": "Sociedade de Economia Mista",
  "cnaePrincipal": { "codigo": 6422100, "descricao": "Bancos múltiplos, com carteira comercial" },
  "endereco": { "municipio": "BRASILIA", "uf": "DF", "cep": "70040912", "...": "..." },
  "totalSocios": 41
}
```

## Install

Requires Node 20 or newer.

Claude Code:

```bash
claude mcp add brasilapi -- npx -y brasilapi-mcp
```

Claude Desktop, Cursor and other clients that read an `mcpServers` block:

```json
{
  "mcpServers": {
    "brasilapi": {
      "command": "npx",
      "args": ["-y", "brasilapi-mcp"]
    }
  }
}
```

From source:

```bash
git clone https://github.com/renatoctti/brasilapi-mcp
cd brasilapi-mcp
npm install
npm run build
node dist/src/index.js   # speaks MCP over stdio
```

## Notes

- **Data source.** BrasilAPI is a free community service that aggregates public data. It has rate limits, and the server reports a 429 in plain words instead of retrying. Each request has a 10 second timeout.
- **Identification.** BrasilAPI sits behind a firewall that refuses requests from anonymous default HTTP agents, so every request carries `User-Agent: brasilapi-mcp/<version> (+repo url)`.
- **Alphanumeric CNPJ.** Since 2026 the Receita Federal issues CNPJs with letters. The validator follows the published check-digit rule (the value of a character is its ASCII code minus 48). Whether a lookup finds the company depends on BrasilAPI having it.
- **Freshness.** Registry data can be days behind the Receita Federal. Treat it as a first check, not as a certificate.
- **No state.** The server keeps nothing between calls and writes no logs of the numbers you ask about; the only output on stderr is a start-up line.

## Development

```bash
npm test        # builds, then runs the unit and protocol tests (no network)
npm run smoke   # starts the built server over stdio and calls every tool on the real API
```

The tests cover the check-digit rules (numeric and alphanumeric CNPJ, CPF), the reshaping of each answer, the error paths (not found, rate limit, unreachable) and the server itself through an in-memory MCP client, with a fake `fetch` standing in for BrasilAPI.

## License

MIT
