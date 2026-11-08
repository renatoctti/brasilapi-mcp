import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCnpj, isValidCnpj, isValidCpf, normalizeCnpj } from "../src/validate.js";

test("a numeric CNPJ is valid with or without punctuation", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11222333000181"), true);
  assert.equal(isValidCnpj("00.000.000/0001-91"), true);
});

test("a CNPJ with a wrong check digit, wrong size or repeated characters is invalid", () => {
  assert.equal(isValidCnpj("11.222.333/0001-82"), false);
  assert.equal(isValidCnpj("1122233300018"), false);
  assert.equal(isValidCnpj("00000000000000"), false);
  assert.equal(isValidCnpj(""), false);
  assert.equal(isValidCnpj("11.222.333/0001-8A"), false);
});

test("an alphanumeric CNPJ is valid when its check digits match", () => {
  assert.equal(isValidCnpj("12.ABC.345/01DE-35"), true);
  assert.equal(isValidCnpj("12abc34501de35"), true);
  assert.equal(isValidCnpj("12.ABC.345/01DE-36"), false);
});

test("normalizing removes punctuation and upper-cases letters", () => {
  assert.equal(normalizeCnpj(" 12.abc.345/01de-35 "), "12ABC34501DE35");
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
});

test("a CPF is valid when its check digits match", () => {
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(isValidCpf("11144477735"), true);
});

test("a CPF with a wrong digit, wrong size or repeated digits is invalid", () => {
  assert.equal(isValidCpf("529.982.247-26"), false);
  assert.equal(isValidCpf("5299822472"), false);
  assert.equal(isValidCpf("111.111.111-11"), false);
});
