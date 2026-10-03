import CryptoJS from 'crypto-js';
import JSEncrypt from 'jsencrypt';

export const encryptPayload = (payload, rsaPublicKey) => {
  // 1. Generate AES Key and IV (hex strings)
  const aesKeyHex = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 256-bit key
  const ivHex = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);     // 128-bit iv

  // 2. Encrypt the payload using AES-256-CBC
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(payload),
    CryptoJS.enc.Hex.parse(aesKeyHex),
    {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  const encryptedPayloadBase64 = encrypted.toString();

  // 3. Encrypt the AES Key and IV using the RSA Public Key
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(rsaPublicKey);
  
  const encryptedAesKey = encryptor.encrypt(aesKeyHex);
  const encryptedIv = encryptor.encrypt(ivHex);

  if (!encryptedAesKey || !encryptedIv) {
    throw new Error('RSA Encryption failed. Check public key.');
  }

  // 4. Return the hybrid encrypted package
  return {
    encryptedPayload: encryptedPayloadBase64,
    encryptedAesKey,
    encryptedIv
  };
};
