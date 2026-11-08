/** A thin client for https://brasilapi.com.br with a timeout and readable errors. */

import { USER_AGENT } from "./version.js";

export const BASE_URL = "https://brasilapi.com.br/api";
export const TIMEOUT_MS = 10_000;

export type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export class BrasilApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BrasilApiError";
  }
}

export async function getJson(
  path: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${BASE_URL}${path}`, {
      signal: controller.signal,
      // BrasilAPI sits behind a firewall that refuses anonymous default agents; say who we are.
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "message" in body ? String(body.message) : "";
      if (response.status === 404) throw new BrasilApiError(detail || "Not found", 404);
      if (response.status === 429) {
        throw new BrasilApiError("BrasilAPI rate limit reached, try again in a moment", 429);
      }
      throw new BrasilApiError(
        `BrasilAPI answered ${response.status}${detail ? `: ${detail}` : ""}`,
        response.status,
      );
    }
    return body;
  } catch (error) {
    if (error instanceof BrasilApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BrasilApiError(`BrasilAPI did not answer within ${TIMEOUT_MS / 1000}s`);
    }
    throw new BrasilApiError(`Could not reach BrasilAPI: ${describe(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

/** "fetch failed" alone says nothing; the reason (DNS, TLS, refused) is in the cause. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code;
    return `${error.message} (${code ? `${code}: ` : ""}${cause.message})`;
  }
  return error.message;
}
