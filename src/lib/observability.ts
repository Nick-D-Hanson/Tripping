type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

type TimedResult<T> = {
  durationMs: number;
  result: T;
};

export function getClientIp(headersLike: Headers) {
  const forwardedFor = headersLike.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headersLike.get("x-real-ip") || "unknown";
}

export function getRequestId(headersLike: Headers) {
  return headersLike.get("x-request-id") || crypto.randomUUID();
}

function writeLog(level: LogLevel, event: string, payload: LogPayload) {
  const entry = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}

export function logInfo(event: string, payload: LogPayload = {}) {
  writeLog("info", event, payload);
}

export function logWarn(event: string, payload: LogPayload = {}) {
  writeLog("warn", event, payload);
}

export function logError(event: string, payload: LogPayload = {}) {
  writeLog("error", event, payload);
}

export async function timeAsync<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
  const startedAt = performance.now();
  const result = await fn();
  return {
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    result,
  };
}
