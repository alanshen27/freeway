import { env, features } from "./env";

async function reachableImage(url: string): Promise<boolean> {
  if (!url.startsWith("http")) return true;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Freeway/1.0" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Find a stock image via SERP. Returns null when nothing usable is found. */
export async function findStockImage(query: string): Promise<string | null> {
  if (!features.serp) return null;
  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_images");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", env.serpKey);
    const res = await fetch(url, { next: { revalidate: 60 * 60 } });
    const json = (await res.json()) as {
      images_results?: { original?: string; thumbnail?: string }[];
    };
    for (const hit of json.images_results ?? []) {
      const candidate = hit.original ?? hit.thumbnail;
      if (candidate && (await reachableImage(candidate))) return candidate;
    }
  } catch {
    /* SERP unavailable */
  }
  return null;
}
