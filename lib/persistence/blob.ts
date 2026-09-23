import { del, get, list, put } from "@vercel/blob";

const developmentStore = new Map<string, unknown>();

function useMemoryStore(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.BLOB_READ_WRITE_TOKEN;
}

export async function readPrivateJson<T>(path: string): Promise<T | undefined> {
  if (useMemoryStore()) {
    const value = developmentStore.get(path);
    return value === undefined ? undefined : structuredClone(value as T);
  }

  const result = await get(path, { access: "private", useCache: false });
  if (!result) return undefined;
  if (!result.stream) throw new Error(`Unable to read persisted state (${result.statusCode}).`);
  return (await new Response(result.stream).json()) as T;
}

export async function writePrivateJson<T>(path: string, value: T): Promise<void> {
  if (useMemoryStore()) {
    developmentStore.set(path, structuredClone(value));
    return;
  }

  await put(path, JSON.stringify(value), {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

export async function deletePrivateJson(path: string): Promise<void> {
  if (useMemoryStore()) {
    developmentStore.delete(path);
    return;
  }
  await del(path);
}

export async function readLatestPrivateJsonUnderPrefix<T>(prefix: string): Promise<T | undefined> {
  if (useMemoryStore()) return undefined;
  const result = await list({ prefix, limit: 100 });
  const latest = result.blobs
    .slice()
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
  return latest ? readPrivateJson<T>(latest.pathname) : undefined;
}
