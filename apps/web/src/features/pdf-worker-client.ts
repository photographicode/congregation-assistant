export function runPDF(
  method: string,
  snapshot: unknown,
  args: unknown[],
  options: {
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
  } = {},
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pdf.worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      worker.terminate();
      options.signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(new DOMException("Generation cancelled", "AbortError"));
    };
    if (options.signal?.aborted) {
      abort();
      return;
    }
    options.signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) => {
      if (event.data.progress !== undefined) {
        options.onProgress?.(event.data.progress);
        return;
      }
      finish();
      if (event.data.error) reject(Error(event.data.error));
      else resolve(event.data.bytes);
    };
    worker.onerror = (event) => {
      finish();
      reject(Error(event.message || "PDF worker failed"));
    };
    worker.postMessage({ method, snapshot, args });
  });
}
