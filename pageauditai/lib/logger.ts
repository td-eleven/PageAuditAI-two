/**
 * Central server-side logging. Avoids dumping raw errors (stack) in production UI;
 * use `message` + optional `code` in structured logs. Redacts common secret patterns.
 */

const SENSITIVE_KEY = /password|secret|token|authorization|cookie|apikey|api_key|credential/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function redactForLog(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(process.env.NODE_ENV !== "production" ? { stack: value.stack } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactForLog(v);
      }
    }
    return out;
  }
  return value;
}

function format(scope: string, message: string, meta?: unknown): string {
  if (meta === undefined) return `${scope} ${message}`;
  try {
    return `${scope} ${message} ${JSON.stringify(redactForLog(meta))}`;
  } catch {
    return `${scope} ${message}`;
  }
}

export const log = {
  info(scope: string, message: string, meta?: unknown) {
    console.info(format(scope, message, meta));
  },
  warn(scope: string, message: string, meta?: unknown) {
    console.warn(format(scope, message, meta));
  },
  error(scope: string, message: string, meta?: unknown) {
    console.error(format(scope, message, meta));
  },
};
