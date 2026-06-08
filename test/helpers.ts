/**
 * Installs a minimal in-memory `chrome.storage.local` on `globalThis.chrome`,
 * supporting the `get`/`set` shapes used across the codebase (string key,
 * string-array keys, and the promise form). Returns the backing store object.
 */
export function mockChromeStorage(
  initial: Record<string, unknown> = {},
): Record<string, unknown> {
  const store: Record<string, unknown> = { ...initial };

  const get = (keys?: string | string[]) => {
    let result: Record<string, unknown> = {};
    if (keys === undefined) {
      result = { ...store };
    } else if (typeof keys === "string") {
      if (keys in store) result[keys] = store[keys];
    } else {
      for (const k of keys) if (k in store) result[k] = store[k];
    }
    return Promise.resolve(result);
  };

  const set = (items: Record<string, unknown>) => {
    Object.assign(store, items);
    return Promise.resolve();
  };

  (globalThis as { chrome?: unknown }).chrome = {
    storage: { local: { get, set } },
  };

  return store;
}

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
