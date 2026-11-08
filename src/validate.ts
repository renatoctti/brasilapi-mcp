/**
 * Offline checks for CNPJ and CPF, so an agent can reject a typo before calling the network.
 *
 * CNPJ follows the registry's alphanumeric format: 12 characters from 0-9 and A-Z followed by two
 * numeric check digits. Every number issued before the change is a special case of it, because
 * the value of a character is its ASCII code minus 48 (so "7" is 7 and "A" is 17).
 */

const CNPJ_FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Removes the punctuation people type ("11.222.333/0001-81") and upper-cases letters. */
export function normalizeCnpj(input: string): string {
  return input.replace(/[.\-/\s]/g, "").toUpperCase();
}

export function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function cnpjCheckDigit(chars: string, weights: number[]): number {
  const sum = [...chars].reduce((acc, ch, i) => acc + (ch.charCodeAt(0) - 48) * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(input: string): boolean {
  const cnpj = normalizeCnpj(input);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  if (/^(.)\1+$/.test(cnpj)) return false;
  const first = cnpjCheckDigit(cnpj.slice(0, 12), CNPJ_FIRST_WEIGHTS);
  const second = cnpjCheckDigit(cnpj.slice(0, 12) + first, CNPJ_SECOND_WEIGHTS);
  return cnpj.slice(12) === `${first}${second}`;
}

function cpfCheckDigit(digits: string): number {
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (digits.length + 1 - i), 0);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const first = cpfCheckDigit(cpf.slice(0, 9));
  const second = cpfCheckDigit(cpf.slice(0, 9) + first);
  return cpf.slice(9) === `${first}${second}`;
}

export function formatCnpj(input: string): string {
  const c = normalizeCnpj(input);
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
