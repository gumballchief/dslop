// Where published sites live: Vercel Blob in production, a temp folder when running locally without a Blob token.
import { put, head } from "@vercel/blob";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const localDir = path.join(os.tmpdir(), "unslop-sites");
const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function saveSite(id: string, html: string) {
  if (useBlob()) {
    await put(`sites/${id}.html`, html, { access: "public", contentType: "text/html; charset=utf-8", addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, `${id}.html`), html);
}

export async function loadSite(id: string): Promise<string | null> {
  if (!/^[a-z0-9-]{4,40}$/.test(id)) return null;
  if (useBlob()) {
    try {
      const meta = await head(`sites/${id}.html`);
      const res = await fetch(meta.url, { cache: "no-store" });
      return res.ok ? await res.text() : null;
    } catch { return null; }
  }
  const f = path.join(localDir, `${id}.html`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}
