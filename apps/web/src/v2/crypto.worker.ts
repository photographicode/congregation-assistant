import * as operations from "./crypto-core.mjs";
self.onmessage = async (event: MessageEvent) => {
  const { id, operation, args } = event.data;
  try {
    const allowed = [
      "identity",
      "scopeKey",
      "encryptRecord",
      "decryptRecord",
      "sealKey",
      "unsealKey",
      "recoveryBackup",
      "restoreRecovery",
    ];
    if (!allowed.includes(operation)) throw Error("Unknown crypto operation");
    const fn = (operations as Record<string, Function>)[operation];
    self.postMessage({ id, result: await fn(...args) });
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error
          ? error.message
          : "Cryptographic operation failed",
    });
  }
};
