// Small safety rails for public endpoints that spend API credits.
const hits = new Map<string, number[]>();

/** true when this IP has made fewer than `max` calls of `kind` in the last hour (per server instance) */
export function allow(req: Request, kind: string, max: number): boolean {
  if (process.env.NODE_ENV === "development") return true; // local runs (the bench) are not public traffic
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}

/** refuse addresses that point inside a network instead of at a public website */
export function publicHost(url: string): boolean {
  const h = new URL(url).hostname.toLowerCase();
  if (process.env.NODE_ENV === "development" && h === "localhost") return true; // local testing only
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
  if (h.includes(":")) return false; // raw IPv6
  return true;
}

export const oops = (message: string, status = 400) => Response.json({ error: message }, { status });
