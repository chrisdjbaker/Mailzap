/**
 * Builds a minimal `fetch`-compatible Response stub for use with a mocked
 * `global.fetch`. Supports the subset of the Response API exercised by
 * `gmailFetch`: `ok`, `status`, `statusText`, `headers.get`, `text`, `json`,
 * and `clone`.
 */
export function mockResponse(
  body: unknown,
  opts: { status?: number; contentType?: string } = {},
): Response {
  const { status = 200, contentType = "application/json" } = opts;
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: `status ${status}`,
    headers: {
      get: (h: string) =>
        h.toLowerCase() === "content-type" ? contentType : null,
    },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(typeof body === "string" ? JSON.parse(text) : body),
    clone: () => mockResponse(body, opts),
  } as unknown as Response;
}
