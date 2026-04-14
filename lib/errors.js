export function fail(message, type = 'system_error', status = 500) {
  const err = new Error(message);
  err.type = type;
  err.status = status;
  return err;
}

export function sendError(res, error) {
  const status = error.status || 500;
  const type = error.type || 'system_error';
  const message = error.message || 'Unexpected error';
  return res.status(status).json({ error: true, type, message });
}

export async function withRetry(fn, retries = 2, delayMs = 200) {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
