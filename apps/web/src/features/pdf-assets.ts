export async function pdfAssets(path: string) {
  const url =
    import.meta.env.BASE_URL +
    "assets/" +
    path +
    "?v=" +
    import.meta.env.VITE_BUILD_HASH;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(
      "ca-v3:" +
        import.meta.env.BASE_URL +
        ":" +
        import.meta.env.VITE_BUILD_HASH.slice(0, 16),
    );
    const saved = await cache.match(url);
    if (saved) return new Uint8Array(await saved.arrayBuffer());
  } catch {}
  const response = await fetch(url);
  if (!response.ok)
    throw Error("PDF assets are unavailable. Connect once and try again.");
  try {
    await cache?.put(url, response.clone());
  } catch {}
  return new Uint8Array(await response.arrayBuffer());
}
