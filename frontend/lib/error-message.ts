export async function getErrorMessage(response: Response): Promise<string> {
  if (response.status === 502 || response.status === 503) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }

  try {
    const body: unknown = await response.json();

    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = body.detail;

      if (
        typeof detail === "object" &&
        detail !== null &&
        !Array.isArray(detail)
      ) {
        if ("code" in detail && detail.code === "DAILY_QUOTA_EXCEEDED") {
          return "You've used your daily resume generation. Try again tomorrow.";
        }
      }

      if (typeof detail === "string") {
        if (response.status === 429) {
          return "You're sending requests too quickly. Please wait a minute and try again.";
        }
        return detail;
      }

      if (Array.isArray(detail)) {
        return detail
          .map((item: unknown) =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof item.msg === "string"
              ? item.msg
              : "",
          )
          .filter(Boolean)
          .join(" ");
      }
    }

    if (response.status === 429) {
      return "Too many requests. Please wait a minute and try again.";
    }
  } catch {
    // Fall through to the generic error below.
  }
return "Something went wrong. Please try again.";
}

export function getClientError(cause: unknown, fallback: string): string {
  if (cause instanceof TypeError) {
    return "We can’t reach our servers. Check your connection and try again.";
  }

return fallback;
}
