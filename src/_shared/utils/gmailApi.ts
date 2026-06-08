import { sleep } from "./utils";

export const GMAIL_API_BASE = "https://www.googleapis.com/gmail/v1/users/me";

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 32000;

/**
 * Determines whether a failed Gmail API response should be retried.
 *
 * Gmail returns 403 both for permanent errors (e.g. insufficient permissions)
 * and for transient quota errors (`rateLimitExceeded`, `userRateLimitExceeded`).
 * Only the transient variants — plus 429 and 5xx — are worth retrying.
 *
 * @param status - The HTTP status code of the response.
 * @param body - The parsed JSON error body, if available.
 * @returns `true` if the request should be retried, otherwise `false`.
 */
function isRetryable(status: number, body: unknown): boolean {
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  if (status === 403) {
    const reasons = new Set([
      "rateLimitExceeded",
      "userRateLimitExceeded",
      "backendError",
    ]);
    const errors = (body as { error?: { errors?: { reason?: string }[] } })
      ?.error?.errors;
    return Boolean(errors?.some((e) => e.reason && reasons.has(e.reason)));
  }
  return false;
}

/**
 * Performs an authenticated Gmail API request with bounded, exponential-backoff
 * retries for transient failures (429, retryable 403, 5xx).
 *
 * Unlike the previous ad-hoc retry loops, this helper caps the number of
 * attempts so a persistent error can never hang the UI indefinitely, and it
 * throws a descriptive error (rather than silently returning bad data) when a
 * request ultimately fails.
 *
 * @param path - A path relative to {@link GMAIL_API_BASE} (e.g. `/messages`) or a full URL.
 * @param token - The OAuth 2.0 access token.
 * @param init - Optional `fetch` init overrides (method, body, extra headers).
 * @returns The parsed JSON response body.
 * @throws If the request fails after exhausting retries, or with a non-retryable status.
 */
export async function gmailFetch<T = unknown>(
  path: string,
  token: chrome.identity.GetAuthTokenResult,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GMAIL_API_BASE}${path}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (response.ok) {
      // 204 No Content (e.g. trash/modify) has no body.
      if (response.status === 204) return undefined as T;
      const text = await response.text();
      if (!text) return undefined as T;
      // The batch endpoint returns multipart/mixed text, not JSON.
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return text as T;
      return JSON.parse(text) as T;
    }

    let body: unknown = null;
    try {
      body = await response.clone().json();
    } catch {
      // Non-JSON error body; ignore.
    }

    if (attempt < MAX_RETRIES && isRetryable(response.status, body)) {
      const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      const jitter = Math.floor(Math.random() * 250); // avoid thundering herd
      console.warn(
        `Gmail API ${response.status} on ${url}; retry ${attempt + 1}/${MAX_RETRIES} in ${backoff + jitter}ms`,
      );
      await sleep(backoff + jitter);
      continue;
    }

    const message =
      (body as { error?: { message?: string } })?.error?.message ||
      response.statusText;
    throw new Error(`Gmail API ${response.status}: ${message}`);
  }

  // Unreachable: the loop either returns or throws.
  throw new Error("Gmail API request failed after exhausting retries.");
}

// Gmail's batch endpoint accepts at most 100 sub-requests per call.
export const GMAIL_BATCH_LIMIT = 100;
const BATCH_ENDPOINT = "https://gmail.googleapis.com/batch/gmail/v1";
const BOUNDARY = "mailzap_batch_boundary";

/**
 * Issues many Gmail GET requests as a single multipart/batch HTTP call.
 *
 * This collapses up to {@link GMAIL_BATCH_LIMIT} individual metadata fetches
 * into one round-trip, which is the main lever for speeding up the initial
 * sender scan. Results are returned in the same order as `paths`; a sub-request
 * that fails (or returns a non-2xx status) yields `null` for that slot so a
 * single bad message can't abort the whole scan.
 *
 * @param paths - Gmail API paths relative to `/gmail/v1/users/me` (e.g. `/messages/abc?format=metadata`).
 * @param token - The OAuth 2.0 access token.
 * @returns An array of parsed JSON bodies (or `null`), aligned with `paths`.
 */
export async function gmailBatchGet<T = unknown>(
  paths: string[],
  token: chrome.identity.GetAuthTokenResult,
): Promise<(T | null)[]> {
  if (paths.length === 0) return [];
  if (paths.length > GMAIL_BATCH_LIMIT) {
    throw new Error(
      `gmailBatchGet: ${paths.length} requests exceeds the ${GMAIL_BATCH_LIMIT}-request batch limit.`,
    );
  }

  const body =
    paths
      .map(
        (path, i) =>
          `--${BOUNDARY}\r\n` +
          `Content-Type: application/http\r\n` +
          `Content-ID: <item-${i}>\r\n\r\n` +
          `GET /gmail/v1/users/me${path}\r\n`,
      )
      .join("") + `--${BOUNDARY}--`;

  const responseText = await gmailFetch<string>(BATCH_ENDPOINT, token, {
    method: "POST",
    headers: { "Content-Type": `multipart/mixed; boundary=${BOUNDARY}` },
    body,
  });

  return parseBatchResponse<T>(responseText, paths.length);
}

/**
 * Parses a Gmail multipart/mixed batch response into an ordered array of JSON
 * bodies, matching each part back to its request via the `Content-ID` echo.
 *
 * @param text - The raw multipart response body.
 * @param expected - The number of sub-responses expected (length of the result array).
 * @returns An array of parsed bodies (or `null` for missing/failed parts).
 */
export function parseBatchResponse<T = unknown>(
  text: string,
  expected: number,
): (T | null)[] {
  const results: (T | null)[] = new Array(expected).fill(null);
  if (!text) return results;

  // The outer boundary is announced on the first line as e.g. "--batch_xyz".
  const boundary = text.trimStart().split("\r\n", 1)[0].trim();
  if (!boundary.startsWith("--")) return results;

  for (const part of text.split(boundary)) {
    const idMatch = part.match(/Content-ID:\s*<response-item-(\d+)>/i);
    if (!idMatch) continue;
    const index = Number(idMatch[1]);
    if (index >= expected) continue;

    // The JSON payload is the last brace-delimited block in the part.
    const start = part.indexOf("{");
    const end = part.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      results[index] = JSON.parse(part.slice(start, end + 1)) as T;
    } catch {
      // Leave as null on parse failure.
    }
  }

  return results;
}
