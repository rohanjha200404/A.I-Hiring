import { decryptRSA, decryptAES } from '../utils/crypto.util.js';

export const decryptRequest = (req, res, next) => {
  // If the request body contains hybrid encrypted data
  if (req.body && req.body.encryptedPayload && req.body.encryptedAesKey && req.body.encryptedIv) {
    try {
      const { encryptedPayload, encryptedAesKey, encryptedIv } = req.body;

      // 1. Decrypt AES Key and IV using Backend's RSA Private Key
      const aesKeyHex = decryptRSA(encryptedAesKey);
      const ivHex = decryptRSA(encryptedIv);

      // 2. Decrypt the actual payload using the decrypted AES Key and IV
      const decryptedBody = decryptAES(encryptedPayload, aesKeyHex, ivHex);

      // 3. Replace req.body with the decrypted JSON
      req.body = decryptedBody;
      next();
    } catch (error) {
      console.error('Decryption error:', error);
      return res.status(400).json({ message: 'Failed to decrypt request payload' });
    }
  } else {
    // Pass through if not encrypted (or handle strictly by throwing error)
    next();
  }
};
