// Device secrets never enter localStorage. IndexedDB stores a non-extractable wrapping key.
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ca-v2-device", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("keys");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
async function get(key: string) {
  const db = await database();
  try {
    return await new Promise<any>((resolve, reject) => {
      const tx = db.transaction("keys", "readonly"),
        r = tx.objectStore("keys").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
async function put(key: string, value: unknown) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function rememberIdentity(account: string, identity: unknown) {
  let key: CryptoKey = await get("wrapping:" + account);
  if (!key) {
    key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    await put("wrapping:" + account, key);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    aad = new TextEncoder().encode(account),
    ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad },
      key,
      new TextEncoder().encode(JSON.stringify(identity)),
    );
  await put("identity:" + account, { iv, ciphertext });
}
export async function readIdentity(account: string) {
  const key = await get("wrapping:" + account),
    record = await get("identity:" + account);
  if (!key || !record) return null;
  const bytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: record.iv,
      additionalData: new TextEncoder().encode(account),
    },
    key,
    record.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function clearDevice() {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
