import type { FetchLike } from "../src/brasilapi.js";

export interface Recorded {
  url: string;
  headers?: Record<string, string>;
}

/** A fetch that answers from a table of path → [status, body] and records what was asked. */
export function fakeFetch(routes: Record<string, [number, unknown]>): {
  fetch: FetchLike;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, headers: init?.headers });
    const path = url.replace("https://brasilapi.com.br/api", "");
    const hit = routes[path];
    if (!hit) throw new Error(`unexpected request ${path}`);
    const [status, body] = hit;
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetch, calls };
}

/** The fields of the CNPJ answer that the tool reads, with made-up partners. */
export const CNPJ_ANSWER = {
  cnpj: "00000000000191",
  razao_social: "BANCO DO BRASIL SA",
  nome_fantasia: "DIRECAO GERAL",
  descricao_situacao_cadastral: "ATIVA",
  data_situacao_cadastral: "2005-11-03",
  descricao_motivo_situacao_cadastral: "SEM MOTIVO",
  descricao_identificador_matriz_filial: "MATRIZ",
  data_inicio_atividade: "1966-08-01",
  natureza_juridica: "Sociedade de Economia Mista",
  porte: "DEMAIS",
  capital_social: 120000000000,
  cnae_fiscal: 6422100,
  cnae_fiscal_descricao: "Bancos múltiplos, com carteira comercial",
  descricao_tipo_de_logradouro: "QUADRA",
  logradouro: "SAUN QUADRA 5 BLOCO B",
  numero: "SN",
  complemento: "",
  bairro: "ASA NORTE",
  municipio: "BRASILIA",
  uf: "DF",
  cep: "70040912",
  ddd_telefone_1: "6134939002",
  email: null,
  opcao_pelo_simples: false,
  opcao_pelo_mei: false,
  qsa: [
    {
      nome_socio: "MARIA EXEMPLO",
      qualificacao_socio: "Diretor",
      data_entrada_sociedade: "2023-05-17",
      faixa_etaria: "Entre 41 a 50 anos",
      cnpj_cpf_do_socio: "***123456**",
    },
    {
      nome_socio: "JOSE EXEMPLO",
      qualificacao_socio: "Presidente",
      data_entrada_sociedade: "2022-01-10",
      faixa_etaria: "Entre 51 a 60 anos",
      cnpj_cpf_do_socio: "***654321**",
    },
  ],
};

export const CEP_ANSWER = {
  cep: "01001000",
  state: "SP",
  city: "São Paulo",
  neighborhood: "Sé",
  street: "Praça da Sé",
  ibge: { city: "3550308", state: "35" },
  location: { type: "Point", coordinates: { longitude: "-46.63611", latitude: "-23.5475" } },
};
