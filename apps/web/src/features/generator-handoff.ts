// Opens a request's boundary file in the territory generator. The generator page says "ready" to the window
// that opened it; only then is the file sent, and only to the generator's own origin.
import { generatorUrl } from "./territory-site";

export type Handoff = { name: string; congregation: string; bytes: Uint8Array };
const READY = "tm-generator-ready";
const IMPORT = "tm-import";
const NAMES = "tm-names";
const WAIT_MS = 60_000;

/**
 * Call straight from a click: the window opens at once (so pop-up blockers allow it) while `load` fetches the file.
 * Resolves once the file is handed over; rejects if the window is blocked, the file fails to load, or the
 * generator never says it is ready.
 */
export function openInGenerator(load: () => Promise<Handoff>): Promise<void> {
  return sendToGenerator(load, ({ name, congregation, bytes }) => {
    const copy = bytes.slice().buffer;
    return [{ type: IMPORT, name, congregation, bytes: copy }, [copy]];
  });
}

export type Names = { congregation: string; names: { number: string; locality: string; points: { name: string; lng: number; lat: number }[]; note: string }[] };
/** Opens the generator and gives it the names a congregation wrote for its territories. */
export const openNamesInGenerator = (load: () => Promise<Names>) => sendToGenerator(load, (n) => [{ type: NAMES, ...n }, []]);

function sendToGenerator<T>(load: () => Promise<T>, message: (data: T) => [unknown, Transferable[]]): Promise<void> {
  const url = generatorUrl();
  const origin = new URL(url).origin;
  const win = window.open(url, "tm-generator");
  if (!win) return Promise.reject(Error("The generator window was blocked. Allow pop-ups for this site and try again."));
  const file = load();
  file.catch(() => undefined); // reported below, once the generator is ready or the wait ends
  return new Promise<void>((resolve, reject) => {
    const listener = (e: MessageEvent) => {
      if (e.source !== win || e.origin !== origin || (e.data as { type?: unknown } | null)?.type !== READY) return;
      stop();
      file.then(
        (data) => {
          const [payload, transfer] = message(data);
          win.postMessage(payload, origin, transfer);
          win.focus();
          resolve();
        },
        (failure: Error) => {
          win.close();
          reject(failure);
        },
      );
    };
    const timer = setTimeout(() => {
      stop();
      reject(Error("The generator did not open in time. Try again."));
    }, WAIT_MS);
    function stop() {
      clearTimeout(timer);
      removeEventListener("message", listener);
    }
    addEventListener("message", listener);
  });
}
