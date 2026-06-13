// Central fetch wrapper. Every API call in src/api/* goes through apiFetch so
// the base URL, Authorization header, error mapping and 401 handling live in
// exactly one place. Components never import this directly — they use the
// functions in auth.ts / sounds.ts.

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const TOKEN_STORAGE_KEY = 'soundboard.token';
export const USERNAME_STORAGE_KEY = 'soundboard.username';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USERNAME_STORAGE_KEY);
}

/**
 * The backend speaks several error dialects:
 *  - RFC 7807 ProblemDetail: { type, title, status, detail, ... }
 *  - simple wrapper:         { error: "..." }   (rate limit, password gate, enums)
 *  - login failure (400):    { username, token: "", message: "..." }
 *  - bean validation:        { fieldName: "message", ... }
 * Normalise all of them to a single human-readable string.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return fallback;
  }
  if (typeof body !== 'object' || body === null) return fallback;

  const obj = body as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.detail === 'string') return obj.detail;
  if (typeof obj.message === 'string') return obj.message;

  // Bean-validation map: field -> message. Join the messages.
  const values = Object.values(obj).filter((v) => typeof v === 'string' && v !== '');
  if (values.length > 0) return values.join('. ');
  return fallback;
}

function handleUnauthorized(): void {
  clearStoredAuth();
  // Hard redirect rather than router navigation: apiFetch is plain TS with no
  // access to React context, and a full reload guarantees all in-memory state
  // (auth context, blob URLs) is dropped along with the dead token.
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown; // JSON-serialised when present
  /** Skip the Authorization header (login/register). */
  anonymous?: boolean;
  /** Query parameters; null/undefined/'' entries are omitted. */
  params?: Record<string, string | number | boolean | null | undefined>;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(BASE_URL + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function rawFetch(path: string, options: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {};
  if (!options.anonymous) {
    const token = getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // Network-level failure: backend down, DNS, CORS. fetch rejects without a status.
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    if (response.status === 401 && !options.anonymous) {
      handleUnauthorized();
    }
    throw new ApiError(response.status, message);
  }
  return response;
}

/** Fetch and parse a JSON response. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawFetch(path, options);
  return (await response.json()) as T;
}

/**
 * Send a request for its side effect only (e.g. PATCH) and discard the body.
 * Use this for mutations where the response shape is unknown or empty — the
 * caller updates local state from what it sent, not from the response.
 */
export async function apiSend(path: string, options: RequestOptions = {}): Promise<void> {
  await rawFetch(path, options);
}

/** Fetch binary content (audio download) as a Blob. */
export async function apiFetchBlob(path: string): Promise<Blob> {
  const response = await rawFetch(path);
  return await response.blob();
}
