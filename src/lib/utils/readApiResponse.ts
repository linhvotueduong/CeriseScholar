export async function readApiResponse<T extends { error?: string }>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  const text = (await res.text()).trim();
  return {
    error: text || "The server returned an unexpected response. Please try again.",
  } as T;
}
