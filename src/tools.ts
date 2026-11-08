/** The five tools, as plain functions: they validate, call BrasilAPI and shape the answer. */

import { BrasilApiError, getJson, type FetchLike } from "./brasilapi.js";
import { formatCnpj, isValidCnpj, isValidCpf, normalizeCnpj, onlyDigits } from "./validate.js";

type Json = Record<string, any>;

/** What a tool returns: a payload for the model, or a message explaining why there is none. */
export type ToolResult = { ok: true; data: unknown } | { ok: false; message: string };

const fail = (message: string): ToolResult => ({ ok: false, message });

async function call(path: string, fetchImpl?: FetchLike): Promise<ToolResult & { raw?: unknown }> {
  try {
    const raw = await getJson(path, fetchImpl);
    return { ok: true, data: raw, raw };
  } catch (error) {
    if (error instanceof BrasilApiError) return fail(error.message);
    throw error;
  }
}

export function validateCnpj(input: string): ToolResult {
  const valid = isValidCnpj(input);
  return {
    ok: true,
    data: { valid, normalized: normalizeCnpj(input), formatted: valid ? formatCnpj(input) : null },
  };
}

export function validateCpf(input: string): ToolResult {
  return { ok: true, data: { valid: isValidCpf(input) } };
}

export async function lookupCnpj(
  input: string,
  includePartners: boolean,
  fetchImpl?: FetchLike,
): Promise<ToolResult> {
  if (!isValidCnpj(input)) {
    return fail(`"${input}" is not a valid CNPJ: the format or the check digits are wrong.`);
  }
  const response = await call(`/cnpj/v1/${normalizeCnpj(input)}`, fetchImpl);
  if (!response.ok) return response;
  const c = response.raw as Json;
  const partners: Json[] = Array.isArray(c.qsa) ? c.qsa : [];
  return {
    ok: true,
    data: {
      cnpj: c.cnpj,
      razaoSocial: c.razao_social,
      nomeFantasia: c.nome_fantasia || null,
      situacaoCadastral: {
        descricao: c.descricao_situacao_cadastral,
        desde: c.data_situacao_cadastral,
        motivo: c.descricao_motivo_situacao_cadastral,
      },
      tipo: c.descricao_identificador_matriz_filial,
      dataInicioAtividade: c.data_inicio_atividade,
      naturezaJuridica: c.natureza_juridica,
      porte: c.porte,
      capitalSocial: c.capital_social,
      cnaePrincipal: { codigo: c.cnae_fiscal, descricao: c.cnae_fiscal_descricao },
      endereco: {
        logradouro: [c.descricao_tipo_de_logradouro, c.logradouro].filter(Boolean).join(" "),
        numero: c.numero,
        complemento: c.complemento || null,
        bairro: c.bairro,
        municipio: c.municipio,
        uf: c.uf,
        cep: c.cep,
      },
      contato: { telefone: c.ddd_telefone_1 || null, email: c.email || null },
      regime: { optanteSimples: c.opcao_pelo_simples, mei: c.opcao_pelo_mei },
      totalSocios: partners.length,
      socios: includePartners
        ? partners.map((p) => ({
            nome: p.nome_socio,
            qualificacao: p.qualificacao_socio,
            entradaNaSociedade: p.data_entrada_sociedade,
            faixaEtaria: p.faixa_etaria,
            documento: p.cnpj_cpf_do_socio, // the registry already masks CPFs: ***123456**
          }))
        : undefined,
    },
  };
}

export async function lookupCep(input: string, fetchImpl?: FetchLike): Promise<ToolResult> {
  const cep = onlyDigits(input);
  if (cep.length !== 8) return fail(`"${input}" is not a CEP: it needs 8 digits.`);
  const response = await call(`/cep/v2/${cep}`, fetchImpl);
  if (!response.ok) return response;
  const a = response.raw as Json;
  return {
    ok: true,
    data: {
      cep: a.cep,
      logradouro: a.street || null,
      bairro: a.neighborhood || null,
      cidade: a.city,
      estado: a.state,
      codigoIbge: a.ibge?.city ?? null,
      coordenadas: a.location?.coordinates ?? null,
    },
  };
}

export async function listHolidays(year: number, fetchImpl?: FetchLike): Promise<ToolResult> {
  const response = await call(`/feriados/v1/${year}`, fetchImpl);
  if (!response.ok) return response;
  return { ok: true, data: response.raw };
}
