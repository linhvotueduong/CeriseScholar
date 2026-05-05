const UNEXPECTED_RESPONSE_ERROR =
  "The server returned an unexpected response. Please try again.";

export async function readApiResponse<T extends { error?: string }>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  const text = (await res.text()).trim();
  const preview = text.slice(0, 500);
  const unsafeToShow =
    contentType.includes("text/html") ||
    text.length > 500 ||
    /^<!doctype/i.test(preview) ||
    /^<html/i.test(preview) ||
    /<body|<script|<style/i.test(preview) ||
    /backend call failure|bad gateway|application error|internal server error/i.test(preview);

  return {
    error: !text || unsafeToShow ? UNEXPECTED_RESPONSE_ERROR : text,
  } as T;
}
