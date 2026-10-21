import os
import re


def get_upstream_status_code(exc: Exception) -> int | None:
    for attribute in ("status_code", "code"):
        value = getattr(exc, attribute, None)
        if isinstance(value, int) and 100 <= value <= 599:
            return value

    match = re.search(
        r"^\s*(?:HTTP(?: status)?\s+|(?:error )?code:\s*)?" r"(429|503)\b",
        str(exc),
        flags=re.IGNORECASE,
    )
    return int(match.group(1)) if match else None


def get_sanitized_error_message(
    exc: Exception,
    *,
    sensitive_values: tuple[str, ...] = (),
) -> str:
    message = getattr(exc, "message", None)

    if not isinstance(message, str) or not message.strip():
        return "Upstream request failed"

    api_key = os.getenv("GROQ_API_KEY")

    for sensitive_value in (api_key, *sensitive_values):
        if sensitive_value:
            message = re.sub(
                re.escape(sensitive_value),
                "[REDACTED]",
                message,
                flags=re.IGNORECASE,
            )

    message = re.sub(
        r"AIza[0-9A-Za-z_-]{20,}",
        "[REDACTED_API_KEY]",
        message,
    )
    message = re.sub(
        r"(?i)(api[_-]?key|key|authorization|access[_-]?token|"
        r"token|password|secret)(\s*[:=]\s*)(?:Bearer\s+)?"
        r"([^,\s;&]+)",
        r"\1\2[REDACTED]",
        message,
    )

    return message[:1000]
