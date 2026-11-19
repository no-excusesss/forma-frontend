export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
  ) {
    super(messages.join("\n"));
    this.name = "ApiError";
  }
}
export type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/$/, "");
export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers:
        hasBody && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: !hasBody
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(0, [
      "We couldn’t connect to the marketplace. Please check your connection and try again.",
    ]);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message;
    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.filter((v): v is string => typeof v === "string")
        : [
            typeof message === "string"
              ? message
              : `Request failed (${response.status})`,
          ],
    );
  }
  return data as T;
}
export const segment = (value: string | number) =>
  encodeURIComponent(String(value));
export function queryString(query: object) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null)
      params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
}
export async function optional<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    return await api<T>(path, { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
export function changedFields<T extends object>(
  values: T,
  initial: Partial<T>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => value !== initial[key as keyof T],
    ),
  ) as Partial<T>;
}
