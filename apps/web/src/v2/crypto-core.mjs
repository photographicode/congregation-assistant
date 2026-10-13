import sodium from "libsodium-wrappers-sumo";
import { aad } from "./model.mjs";
export async function ready() {
  await sodium.ready;
  return sodium;
}
export async function identity() {
  await ready();
  const box = sodium.crypto_box_keypair(),
    sign = sodium.crypto_sign_keypair();
  return {
    encryptionPublic: sodium.to_base64(box.publicKey),
    encryptionPrivate: sodium.to_base64(box.privateKey),
    signingPublic: sodium.to_base64(sign.publicKey),
    signingPrivate: sodium.to_base64(sign.privateKey),
    signature: sodium.to_base64(
      sodium.crypto_sign_detached(box.publicKey, sign.privateKey),
    ),
  };
}
export async function scopeKey() {
  await ready();
  return sodium.to_base64(sodium.randombytes_buf(32));
}
export async function encryptRecord(key, value, meta) {
  await ready();
  const nonce = sodium.randombytes_buf(24);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    JSON.stringify(value),
    aad(meta),
    null,
    nonce,
    sodium.from_base64(key),
  );
  return {
    version: 1,
    meta,
    nonce: sodium.to_base64(nonce),
    ciphertext: sodium.to_base64(ciphertext),
  };
}
export async function decryptRecord(key, record, lastRevision = 0) {
  await ready();
  if (
    record?.version !== 1 ||
    !Number.isSafeInteger(record.meta?.revision) ||
    record.meta.revision < 1
  )
    throw Error("Invalid encrypted record");
  if (record.meta.revision < lastRevision)
    throw Error("Older revision received. Possible replay.");
  const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    sodium.from_base64(record.ciphertext),
    aad(record.meta),
    sodium.from_base64(record.nonce),
    sodium.from_base64(key),
  );
  return JSON.parse(sodium.to_string(plain));
}
export async function sealKey(key, publicKey) {
  await ready();
  return sodium.to_base64(
    sodium.crypto_box_seal(
      sodium.from_base64(key),
      sodium.from_base64(publicKey),
    ),
  );
}
export async function unsealKey(envelope, id) {
  await ready();
  if (typeof envelope !== "string" || envelope.length > 1024)
    throw Error("Invalid key envelope");
  return sodium.to_base64(
    sodium.crypto_box_seal_open(
      sodium.from_base64(envelope),
      sodium.from_base64(id.encryptionPublic),
      sodium.from_base64(id.encryptionPrivate),
    ),
  );
}
export async function recoveryBackup(phrase, value) {
  await ready();
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES),
    nonce = sodium.randombytes_buf(24);
  const key = sodium.crypto_pwhash(
    32,
    phrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  try {
    return {
      version: 1,
      salt: sodium.to_base64(salt),
      nonce: sodium.to_base64(nonce),
      ciphertext: sodium.to_base64(
        sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
          JSON.stringify(value),
          "CA recovery v1",
          null,
          nonce,
          key,
        ),
      ),
    };
  } finally {
    sodium.memzero(key);
  }
}
export async function restoreRecovery(phrase, backup) {
  await ready();
  if (backup?.version !== 1) throw Error("Unsupported recovery backup");
  const key = sodium.crypto_pwhash(
    32,
    phrase,
    sodium.from_base64(backup.salt),
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
  try {
    return JSON.parse(
      sodium.to_string(
        sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          sodium.from_base64(backup.ciphertext),
          "CA recovery v1",
          sodium.from_base64(backup.nonce),
          key,
        ),
      ),
    );
  } finally {
    sodium.memzero(key);
  }
}
