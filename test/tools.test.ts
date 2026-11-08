import assert from "node:assert/strict";
import { test } from "node:test";
import { listHolidays, lookupCep, lookupCnpj } from "../src/tools.js";
import { CEP_ANSWER, CNPJ_ANSWER, fakeFetch } from "./helpers.js";

const CNPJ_PATH = "/cnpj/v1/00000000000191";

test("an invalid CNPJ is rejected without calling the network", async () => {
  const { fetch, calls } = fakeFetch({});
  const result = await lookupCnpj("11.222.333/0001-82", true, fetch);
  assert.equal(result.ok, false);
  assert.equal(calls.length, 0);
});

test("the CNPJ answer is reshaped, with the partners and their masked documents", async () => {
  const { fetch, calls } = fakeFetch({ [CNPJ_PATH]: [200, CNPJ_ANSWER] });
  const result = await lookupCnpj("00.000.000/0001-91", true, fetch);
  assert.equal(result.ok, true);
  const data = (result as { data: any }).data;
  assert.equal(data.razaoSocial, "BANCO DO BRASIL SA");
  assert.equal(data.situacaoCadastral.descricao, "ATIVA");
  assert.equal(data.endereco.logradouro, "QUADRA SAUN QUADRA 5 BLOCO B");
  assert.equal(data.endereco.complemento, null);
  assert.equal(data.totalSocios, 2);
  assert.deepEqual(data.socios[0], {
    nome: "MARIA EXEMPLO",
    qualificacao: "Diretor",
    entradaNaSociedade: "2023-05-17",
    faixaEtaria: "Entre 41 a 50 anos",
    documento: "***123456**",
  });
  assert.equal(calls.length, 1);
});

test("the partners can be left out and are still counted", async () => {
  const { fetch } = fakeFetch({ [CNPJ_PATH]: [200, CNPJ_ANSWER] });
  const data = ((await lookupCnpj("00000000000191", false, fetch)) as { data: any }).data;
  assert.equal(data.socios, undefined);
  assert.equal(data.totalSocios, 2);
});

test("every request says who is calling", async () => {
  const { fetch, calls } = fakeFetch({ [CNPJ_PATH]: [200, CNPJ_ANSWER] });
  await lookupCnpj("00000000000191", true, fetch);
  assert.match(calls[0].headers?.["user-agent"] ?? "", /^brasilapi-mcp\/\d+\.\d+\.\d+ \(\+https:/);
});

test("a company that is not in the registry is reported with the service's message", async () => {
  const { fetch } = fakeFetch({ [CNPJ_PATH]: [404, { message: "CNPJ não encontrado" }] });
  const result = await lookupCnpj("00000000000191", true, fetch);
  assert.deepEqual(result, { ok: false, message: "CNPJ não encontrado" });
});

test("a rate limit and an unreachable service are reported in plain words", async () => {
  const limited = fakeFetch({ [CNPJ_PATH]: [429, {}] });
  const result = await lookupCnpj("00000000000191", true, limited.fetch);
  assert.equal(result.ok, false);
  assert.match((result as { message: string }).message, /rate limit/);

  const down = await lookupCnpj("00000000000191", true, fakeFetch({}).fetch);
  assert.equal(down.ok, false);
  assert.match((down as { message: string }).message, /Could not reach BrasilAPI/);
});

test("a CEP needs eight digits and is reshaped", async () => {
  const { fetch, calls } = fakeFetch({ "/cep/v2/01001000": [200, CEP_ANSWER] });
  assert.equal((await lookupCep("0100", fetch)).ok, false);
  assert.equal(calls.length, 0);
  const data = ((await lookupCep("01001-000", fetch)) as { data: any }).data;
  assert.equal(data.logradouro, "Praça da Sé");
  assert.equal(data.cidade, "São Paulo");
  assert.equal(data.codigoIbge, "3550308");
});

test("holidays are asked for by year", async () => {
  const holidays = [{ date: "2026-01-01", name: "Confraternização mundial", type: "national" }];
  const { fetch, calls } = fakeFetch({ "/feriados/v1/2026": [200, holidays] });
  const result = await listHolidays(2026, fetch);
  assert.deepEqual(result, { ok: true, data: holidays });
  assert.equal(calls[0].url, "https://brasilapi.com.br/api/feriados/v1/2026");
});
